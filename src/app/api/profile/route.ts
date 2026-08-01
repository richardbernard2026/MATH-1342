import {
  sql,
  dbConfigured,
  isValidUuid,
  cleanFirstName,
  sameOrigin,
  ensureSchema,
  safeErrorMessage,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create, update, or load a study profile.
 *
 * The browser generates a uuid once and keeps it in localStorage; that uuid is
 * what links a returning visitor back to their row. Sending a firstName creates
 * the profile or renames it. Sending only the uuid loads everything.
 *
 * Returns the profile plus all progress in one round trip, so the dashboard
 * renders from a single request.
 */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }
    if (!dbConfigured || !sql) {
      // No database configured: the app still runs, just without sync.
      return Response.json({ ok: true, synced: false, profile: null });
    }

    const body = await req.json().catch(() => null);
    const uuid = body?.uuid;
    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    await ensureSchema();

    const name = body?.firstName !== undefined ? cleanFirstName(body.firstName) : undefined;

    // If a name was supplied, create or rename. Otherwise just touch last_seen.
    if (name) {
      await sql`
        INSERT INTO profiles (uuid, first_name)
        VALUES (${uuid}, ${name})
        ON CONFLICT (uuid) DO UPDATE
          SET first_name = EXCLUDED.first_name, last_seen = now()
      `;
    } else if (name === null) {
      return Response.json({ ok: false, error: "invalid name" }, { status: 400 });
    } else {
      await sql`UPDATE profiles SET last_seen = now() WHERE uuid = ${uuid}`;
    }

    const rows = await sql`
      SELECT id, first_name, created_at FROM profiles WHERE uuid = ${uuid} LIMIT 1
    `;
    const profile = rows[0];
    if (!profile) {
      // Known uuid but no profile yet: the browser should ask for a name.
      return Response.json({ ok: true, synced: true, profile: null });
    }

    const [sections, practice, exams] = await Promise.all([
      sql`SELECT section_id, viewed, guided_completed, guided_first_try, guided_steps, explained
          FROM section_progress WHERE profile_id = ${profile.id}`,
      sql`SELECT chapter, attempted, correct FROM practice_stats WHERE profile_id = ${profile.id}`,
      sql`SELECT scope, score, total, seconds, breakdown, created_at
          FROM exam_results WHERE profile_id = ${profile.id}
          ORDER BY created_at DESC LIMIT 25`,
    ]);

    return Response.json({
      ok: true,
      synced: true,
      profile: {
        firstName: profile.first_name,
        createdAt: profile.created_at,
      },
      sections,
      practice,
      exams,
    });
  } catch (err) {
    console.error("[profile]", safeErrorMessage(err));
    // The site is usable without sync, so report this as "not synced" rather
    // than an error. A student mid-problem should not see a failure banner
    // because a database is having a bad minute.
    return Response.json({ ok: true, synced: false, profile: null });
  }
}
