import {
  sql,
  dbConfigured,
  isValidUuid,
  isAllowed,
  boundedInt,
  sameOrigin,
  profileIdFor,
  ALLOWED_SECTIONS,
  ALLOWED_SCOPES,
  ensureSchema,
  safeErrorMessage,
  strictInt,
  cleanClientId,
  pastTimestamp,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record study activity against a profile.
 *
 * One endpoint, four kinds of event, so the client has a single place to post
 * to. Every identifier is checked against a fixed allowlist, so nothing
 * arbitrary reaches the database no matter what is sent.
 *
 * Writes are best-effort: if the profile does not exist or the database is not
 * configured, the call succeeds quietly rather than surfacing an error to a
 * student in the middle of a problem.
 */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }
    if (!dbConfigured || !sql) {
      return Response.json({ ok: true, recorded: false });
    }

    const body = await req.json().catch(() => null);
    const uuid = body?.uuid;
    const kind = body?.kind;

    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    await ensureSchema();

    const profileId = await profileIdFor(uuid);
    if (!profileId) {
      // No profile yet: nothing to attach progress to.
      return Response.json({ ok: true, recorded: false });
    }

    /* ------------------------------------------------------------ section */
    if (kind === "section") {
      const sectionId = body?.sectionId;
      if (!isAllowed(sectionId, ALLOWED_SECTIONS)) {
        return Response.json({ ok: false, error: "invalid section" }, { status: 400 });
      }
      const viewed = body?.viewed === true;
      const guidedCompleted = body?.guidedCompleted === true;
      const explained = body?.explained === true;
      const firstTry = boundedInt(body?.guidedFirstTry, 0, 20);
      const steps = boundedInt(body?.guidedSteps, 0, 20);

      await sql`
        INSERT INTO section_progress
          (profile_id, section_id, viewed, guided_completed, guided_first_try, guided_steps, explained)
        VALUES
          (${profileId}, ${sectionId}, ${viewed}, ${guidedCompleted}, ${firstTry}, ${steps}, ${explained})
        ON CONFLICT (profile_id, section_id) DO UPDATE SET
          viewed           = section_progress.viewed OR EXCLUDED.viewed,
          guided_completed = section_progress.guided_completed OR EXCLUDED.guided_completed,
          explained        = section_progress.explained OR EXCLUDED.explained,
          guided_first_try = COALESCE(GREATEST(section_progress.guided_first_try, EXCLUDED.guided_first_try), EXCLUDED.guided_first_try, section_progress.guided_first_try),
          guided_steps     = COALESCE(EXCLUDED.guided_steps, section_progress.guided_steps),
          updated_at       = now()
      `;
      return Response.json({ ok: true, recorded: true });
    }

    /* ----------------------------------------------------------- practice */
    if (kind === "practice") {
      const chapter = boundedInt(body?.chapter, 1, 6);
      const correct = body?.correct === true ? 1 : 0;
      if (chapter === null) {
        return Response.json({ ok: false, error: "invalid chapter" }, { status: 400 });
      }
      await sql`
        INSERT INTO practice_stats (profile_id, chapter, attempted, correct)
        VALUES (${profileId}, ${chapter}, 1, ${correct})
        ON CONFLICT (profile_id, chapter) DO UPDATE SET
          attempted  = practice_stats.attempted + 1,
          correct    = practice_stats.correct + ${correct},
          updated_at = now()
      `;
      return Response.json({ ok: true, recorded: true });
    }

    /* --------------------------------------------------------------- exam */
    if (kind === "exam") {
      const scope = body?.scope;
      if (!isAllowed(scope, ALLOWED_SCOPES)) {
        return Response.json({ ok: false, error: "invalid scope" }, { status: 400 });
      }
      const score = boundedInt(body?.score, 0, 200);
      const total = boundedInt(body?.total, 0, 200);
      const seconds = boundedInt(body?.seconds, 0, 86400);
      // total must be at least 1: a zero-question exam would divide by zero
      // everywhere a percentage is computed from these rows.
      if (score === null || total === null || total < 1 || score > total) {
        return Response.json({ ok: false, error: "invalid score" }, { status: 400 });
      }

      // Rebuild the breakdown from scratch rather than trusting the payload
      // shape, so only clean numbers reach the JSONB column.
      const raw = body?.breakdown ?? {};
      const breakdown: Record<string, { correct: number; total: number }> = {};
      for (const ch of [1, 2, 3, 4, 5, 6]) {
        const entry = raw?.[ch];
        if (!entry) continue;
        const c = boundedInt(entry.correct, 0, 200);
        const t = boundedInt(entry.total, 0, 200);
        if (c !== null && t !== null && t > 0) breakdown[ch] = { correct: c, total: t };
      }

      // client_id makes this write repeatable: a retry, a double click, or a
      // later backfill carrying the same attempt all collapse to one row.
      const clientId = cleanClientId(body?.clientId);
      await sql`
        INSERT INTO exam_results (profile_id, scope, score, total, seconds, breakdown, client_id)
        VALUES (${profileId}, ${scope}, ${score}, ${total}, ${seconds},
                ${JSON.stringify(breakdown)}::jsonb, ${clientId})
        ON CONFLICT (profile_id, client_id) WHERE client_id IS NOT NULL DO NOTHING
      `;
      return Response.json({ ok: true, recorded: true });
    }

    /* ----------------------------------------------------------- backfill */
    /**
     * Reconcile a browser's whole cached state against the database.
     *
     * This is the only mechanism for recovering work done while the database
     * was unreachable, or before a name had been entered. It replaces an
     * earlier design that also replayed a queue of individual events; having
     * two mechanisms describing the same events meant a practice counter could
     * be incremented once by the replay and again by the reconcile.
     *
     * Every statement is idempotent, so running this twice — two tabs, a
     * retry, a reload — cannot change the result:
     *  - sections OR-merge, taking the larger of any count
     *  - practice takes the row with more attempts wholesale, never adding
     *  - exams carry a browser-minted client_id with a unique index behind it,
     *    so a repeat is a no-op rather than a duplicate row
     *
     * The whole thing runs as one transaction, so a timeout partway through
     * leaves nothing half-written for a retry to trip over.
     */
    if (kind === "backfill") {
      const queries = [];

      const sections = Array.isArray(body?.sections) ? body.sections.slice(0, 40) : [];
      for (const s of sections) {
        if (!isAllowed(s?.sectionId, ALLOWED_SECTIONS)) continue;
        queries.push(sql`
          INSERT INTO section_progress
            (profile_id, section_id, viewed, guided_completed, guided_first_try, guided_steps, explained)
          VALUES
            (${profileId}, ${s.sectionId}, ${s.viewed === true}, ${s.guidedCompleted === true},
             ${strictInt(s.guidedFirstTry, 0, 20)}, ${strictInt(s.guidedSteps, 0, 20)}, ${s.explained === true})
          ON CONFLICT (profile_id, section_id) DO UPDATE SET
            viewed           = section_progress.viewed OR EXCLUDED.viewed,
            guided_completed = section_progress.guided_completed OR EXCLUDED.guided_completed,
            explained        = section_progress.explained OR EXCLUDED.explained,
            guided_first_try = GREATEST(section_progress.guided_first_try, EXCLUDED.guided_first_try),
            guided_steps     = GREATEST(section_progress.guided_steps, EXCLUDED.guided_steps),
            updated_at       = now()
        `);
      }

      const practice = Array.isArray(body?.practice) ? body.practice.slice(0, 6) : [];
      for (const p of practice) {
        const chapter = strictInt(p?.chapter, 1, 6);
        const attempted = strictInt(p?.attempted, 0, 100000);
        const correct = strictInt(p?.correct, 0, 100000);
        if (chapter === null || attempted === null || correct === null) continue;
        if (correct > attempted) continue;
        // Take the whole row from whichever side has more attempts. Merging
        // the two columns independently with GREATEST could synthesise a pair
        // that never existed — 10 attempts from one side, 4 correct from the
        // other — and quietly inflate the accuracy the dashboard reports.
        queries.push(sql`
          INSERT INTO practice_stats (profile_id, chapter, attempted, correct)
          VALUES (${profileId}, ${chapter}, ${attempted}, ${correct})
          ON CONFLICT (profile_id, chapter) DO UPDATE SET
            attempted  = CASE WHEN EXCLUDED.attempted > practice_stats.attempted
                              THEN EXCLUDED.attempted ELSE practice_stats.attempted END,
            correct    = CASE WHEN EXCLUDED.attempted > practice_stats.attempted
                              THEN EXCLUDED.correct   ELSE practice_stats.correct   END,
            updated_at = now()
        `);
      }

      const exams = Array.isArray(body?.exams) ? body.exams.slice(0, 25) : [];
      for (const e of exams) {
        if (!isAllowed(e?.scope, ALLOWED_SCOPES)) continue;
        // No client_id means we cannot tell a repeat from a new attempt, so
        // skip it rather than risk duplicating someone's exam history.
        const clientId = cleanClientId(e?.clientId);
        if (!clientId) continue;

        const score = boundedInt(e?.score, 0, 200);
        const total = boundedInt(e?.total, 0, 200);
        const seconds = boundedInt(e?.seconds, 0, 86400);
        if (score === null || total === null || total < 1 || score > total) continue;

        // Keep the original timestamp where the browser has one, so restored
        // history does not collapse into a single instant.
        const createdAt = pastTimestamp(e?.createdAt);

        const rawB = e?.breakdown ?? {};
        const bd: Record<string, { correct: number; total: number }> = {};
        for (const ch of [1, 2, 3, 4, 5, 6]) {
          const entry = rawB?.[ch];
          if (!entry) continue;
          const c = boundedInt(entry.correct, 0, 200);
          const t = boundedInt(entry.total, 0, 200);
          if (c !== null && t !== null && t > 0) bd[ch] = { correct: c, total: t };
        }

        queries.push(sql`
          INSERT INTO exam_results
            (profile_id, scope, score, total, seconds, breakdown, client_id, created_at)
          VALUES
            (${profileId}, ${e.scope}, ${score}, ${total}, ${seconds},
             ${JSON.stringify(bd)}::jsonb, ${clientId}, COALESCE(${createdAt}::timestamptz, now()))
          ON CONFLICT (profile_id, client_id) WHERE client_id IS NOT NULL DO NOTHING
        `);
      }

      if (queries.length) await sql.transaction(queries);
      return Response.json({ ok: true, recorded: true, wrote: queries.length });
    }

    return Response.json({ ok: false, error: "unknown kind" }, { status: 400 });
  } catch (err) {
    console.error("[progress]", safeErrorMessage(err));
    return Response.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
