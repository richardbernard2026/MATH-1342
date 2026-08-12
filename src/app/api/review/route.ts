import {
  sql,
  dbConfigured,
  isValidUuid,
  isAllowed,
  boundedInt,
  strictInt,
  sameOrigin,
  clientIp,
  rateLimited,
  profileIdFor,
  ALLOWED_ITEM_KINDS,
  ensureSchema,
  safeErrorMessage,
  isMissingTable,
} from "@/lib/db";
import type { ItemKind, ReviewState } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Spaced-repetition state, one row per person per item.
 *
 * GET  /api/review?uuid=...   every stored ReviewState for that profile
 * POST /api/review            { uuid, items: ReviewState[] }, upserted
 *
 * The browser is the source of truth here, not the server. localStorage holds
 * the working copy and this endpoint is a backup that survives a cleared
 * browser or a second device. So every failure path returns 200 with
 * `synced: false` rather than an error: a student answering questions must
 * never see the session break because the database is having a bad minute.
 *
 * Writes are idempotent. The unique key is (profile_id, item_kind, item_id),
 * and a conflict keeps whichever side has more attempts, so replaying the same
 * sync, or syncing from two tabs at once, cannot invent or lose progress.
 */

/** How many items one POST may carry. Above this the payload is rejected. */
const MAX_ITEMS = 200;

/** Longest item id accepted. Real ids are short; this only stops abuse. */
const MAX_ID_LEN = 64;

/**
 * How many correct days one item may carry.
 *
 * The retirement criterion is 3 or 4 separate days and the whole run to the
 * exam is a few weeks, so anything past this is either a bug or someone
 * hand-editing localStorage to bloat the row.
 */
const MAX_CORRECT_DAYS = 60;

/* ------------------------------------------------------------ validation */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_RE = /[\u0000-\u001F\u007F]/;

/**
 * An ISO calendar date, or null.
 *
 * The regex is not enough on its own: "2026-02-31" matches it and is not a
 * date. Round-tripping through Date catches that, because Postgres would
 * reject it later anyway and a 500 out of a DATE cast is a poor error message.
 */
function isoDate(v: unknown): string | null {
  if (typeof v !== "string" || !DATE_RE.test(v)) return null;
  const d = new Date(v + "T12:00:00Z");
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === v ? v : null;
}

/** An item id: non-empty, short, and free of control characters. */
function cleanItemId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < 1 || s.length > MAX_ID_LEN) return null;
  if (CONTROL_RE.test(s)) return null;
  return s;
}

type CleanItem = {
  kind: ItemKind;
  id: string;
  streak: number;
  correctDays: string[];
  attempts: number;
  corrects: number;
  sureWrong: boolean;
  dueOn: string | null;
  lastSeen: string | null;
  retired: boolean;
};

/**
 * Rebuild one item from scratch rather than trusting the submitted shape.
 *
 * Returns a reason on failure so the client gets something it can act on
 * instead of a bare 400. Nothing is clamped into range: a streak of 9999 is a
 * broken client, and quietly storing 200 instead would write a fact nobody
 * stated.
 */
function cleanItem(raw: unknown): { item: CleanItem } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "item is not an object" };
  const r = raw as Record<string, unknown>;

  if (!isAllowed(r.kind, ALLOWED_ITEM_KINDS)) return { error: "invalid item kind" };
  const id = cleanItemId(r.id);
  if (id === null) return { error: "invalid item id" };

  const streak = strictInt(r.streak, 0, 200);
  const attempts = strictInt(r.attempts, 0, 100000);
  const corrects = strictInt(r.corrects, 0, 100000);
  if (streak === null || attempts === null || corrects === null) {
    return { error: "invalid counters" };
  }
  if (corrects > attempts) return { error: "corrects exceeds attempts" };

  if (!Array.isArray(r.correctDays)) return { error: "invalid correctDays" };
  if (r.correctDays.length > MAX_CORRECT_DAYS) return { error: "too many correct days" };
  const correctDays: string[] = [];
  for (const d of r.correctDays) {
    const iso = isoDate(d);
    if (iso === null) return { error: "invalid correctDays" };
    // Distinct dates is the whole point of the field, so collapse repeats
    // rather than letting a duplicated day count twice toward retirement.
    if (!correctDays.includes(iso)) correctDays.push(iso);
  }

  const hasDue = r.dueOn !== null && r.dueOn !== undefined;
  const dueOn = hasDue ? isoDate(r.dueOn) : null;
  if (hasDue && dueOn === null) return { error: "invalid dueOn" };

  const hasSeen = r.lastSeen !== null && r.lastSeen !== undefined;
  const lastSeen = hasSeen ? isoDate(r.lastSeen) : null;
  if (hasSeen && lastSeen === null) return { error: "invalid lastSeen" };

  return {
    item: {
      kind: r.kind,
      id,
      streak,
      correctDays,
      attempts,
      corrects,
      sureWrong: r.sureWrong === true,
      dueOn,
      lastSeen,
      retired: r.retired === true,
    },
  };
}

/** Shape a database row back into the ReviewState the browser works with. */
function rowToState(row: Record<string, unknown>): ReviewState {
  const days = row.correct_days;
  return {
    kind: row.item_kind as ItemKind,
    id: String(row.item_id),
    streak: boundedInt(row.streak, 0, 200) ?? 0,
    correctDays: Array.isArray(days) ? days.filter((d): d is string => typeof d === "string") : [],
    attempts: boundedInt(row.attempts, 0, 100000) ?? 0,
    corrects: boundedInt(row.corrects, 0, 100000) ?? 0,
    sureWrong: row.sure_wrong === true,
    dueOn: typeof row.due_on === "string" ? row.due_on : null,
    lastSeen: typeof row.last_seen === "string" ? row.last_seen : null,
    retired: row.retired === true,
  };
}

/* -------------------------------------------------------------------- GET */

export async function GET(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }
    if (rateLimited(`review-get:${clientIp(req)}`, 60, 60_000)) {
      return Response.json(
        { ok: false, error: "Too many requests. Wait a minute and try again." },
        { status: 429 }
      );
    }
    if (!dbConfigured || !sql) {
      // No database configured: the app still runs from localStorage alone.
      return Response.json({ ok: true, synced: false, items: [] });
    }

    const uuid = new URL(req.url).searchParams.get("uuid");
    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    await ensureSchema();

    const profileId = await profileIdFor(uuid);
    if (!profileId) {
      // Known browser, no profile row yet. Nothing stored, which is not an
      // error: the name gate simply has not been filled in.
      return Response.json({ ok: true, synced: true, items: [] });
    }

    // The DATE columns are formatted in SQL rather than handed back as
    // timestamps and re-serialised in JavaScript. A Date crossing JSON turns
    // into an instant with a timezone attached, and "2026-08-21" read back in
    // the wrong zone becomes the 20th.
    const rows = await sql`
      SELECT item_kind, item_id, streak, correct_days, attempts, corrects, sure_wrong,
             to_char(due_on,    'YYYY-MM-DD') AS due_on,
             to_char(last_seen, 'YYYY-MM-DD') AS last_seen,
             retired
      FROM review_state
      WHERE profile_id = ${profileId}
      LIMIT 2000
    `;

    return Response.json({ ok: true, synced: true, items: rows.map(rowToState) });
  } catch (err) {
    console.error("[review:get]", safeErrorMessage(err));
    if (isMissingTable(err)) {
      return Response.json({ ok: true, synced: false, items: [], reason: "no tables yet" });
    }
    // Degrade rather than fail. The browser has its own copy.
    return Response.json({ ok: true, synced: false, items: [] });
  }
}

/* ------------------------------------------------------------------- POST */

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }
    if (rateLimited(`review-post:${clientIp(req)}`, 60, 60_000)) {
      return Response.json(
        { ok: false, error: "Too many requests. Wait a minute and try again." },
        { status: 429 }
      );
    }
    if (!dbConfigured || !sql) {
      // 200, not 500. There is nothing wrong with the request; this deployment
      // simply has no database, and the browser keeps its own copy.
      return Response.json({
        ok: true,
        synced: false,
        recorded: false,
        wrote: 0,
        reason: "No database is configured. Review progress is kept in this browser only.",
      });
    }

    const body = await req.json().catch(() => null);
    const uuid = body?.uuid;
    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const rawItems = body?.items;
    if (!Array.isArray(rawItems)) {
      return Response.json({ ok: false, error: "items must be an array" }, { status: 400 });
    }
    // Rejected, not truncated. Silently dropping the tail of a sync would lose
    // work without anyone finding out; the client chunks its payload instead.
    if (rawItems.length > MAX_ITEMS) {
      return Response.json(
        { ok: false, error: `too many items, limit is ${MAX_ITEMS}` },
        { status: 400 }
      );
    }

    const items: CleanItem[] = [];
    const seen = new Set<string>();
    for (const raw of rawItems) {
      const checked = cleanItem(raw);
      if ("error" in checked) {
        return Response.json({ ok: false, error: checked.error }, { status: 400 });
      }
      // One statement per key. Two rows for the same item in one transaction
      // would make the upsert fail with "cannot affect row a second time".
      const key = `${checked.item.kind}:${checked.item.id}`;
      if (seen.has(key)) {
        return Response.json({ ok: false, error: "duplicate item" }, { status: 400 });
      }
      seen.add(key);
      items.push(checked.item);
    }

    await ensureSchema();

    const profileId = await profileIdFor(uuid);
    if (!profileId) {
      // No profile row to attach this to. The browser keeps its copy and will
      // send it again once a name has been entered.
      return Response.json({ ok: true, synced: true, recorded: false, wrote: 0 });
    }

    if (!items.length) {
      return Response.json({ ok: true, synced: true, recorded: true, wrote: 0 });
    }

    // Take the whole row from whichever side has more attempts, the same rule
    // practice_stats uses. Merging the columns independently could synthesise a
    // state that never existed, say 10 attempts from one side paired with a
    // streak from the other, and the scheduler would then plan around a history
    // nobody actually has. Ties keep the stored row, which is what makes a
    // replayed sync a genuine no-op.
    //
    // sure_wrong is the one field that is never unset. It records that an error
    // was once made with confidence, which stays true whichever row wins, and
    // it is what raises the retirement bar from three days to four.
    const queries = [];
    for (const i of items) {
      queries.push(sql`
        INSERT INTO review_state
          (profile_id, item_kind, item_id, streak, correct_days, attempts, corrects,
           sure_wrong, due_on, last_seen, retired)
        VALUES
          (${profileId}, ${i.kind}, ${i.id}, ${i.streak}, ${JSON.stringify(i.correctDays)}::jsonb,
           ${i.attempts}, ${i.corrects}, ${i.sureWrong}, ${i.dueOn}::date, ${i.lastSeen}::date,
           ${i.retired})
        ON CONFLICT (profile_id, item_kind, item_id) DO UPDATE SET
          streak       = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.streak       ELSE review_state.streak       END,
          correct_days = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.correct_days ELSE review_state.correct_days END,
          corrects     = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.corrects     ELSE review_state.corrects     END,
          due_on       = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.due_on       ELSE review_state.due_on       END,
          last_seen    = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.last_seen    ELSE review_state.last_seen    END,
          retired      = CASE WHEN EXCLUDED.attempts > review_state.attempts
                              THEN EXCLUDED.retired      ELSE review_state.retired      END,
          attempts     = GREATEST(review_state.attempts, EXCLUDED.attempts),
          sure_wrong   = review_state.sure_wrong OR EXCLUDED.sure_wrong,
          updated_at   = now()
      `);
    }

    // One transaction, so a timeout partway through leaves nothing half
    // written for the next sync to trip over.
    await sql.transaction(queries);

    return Response.json({ ok: true, synced: true, recorded: true, wrote: queries.length });
  } catch (err) {
    console.error("[review:post]", safeErrorMessage(err));
    if (isMissingTable(err)) {
      return Response.json({
        ok: true,
        synced: false,
        recorded: false,
        wrote: 0,
        reason: "The database has no tables yet. Run schema.sql in the Neon SQL editor.",
      });
    }
    return Response.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
