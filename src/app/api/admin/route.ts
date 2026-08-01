import { sql, dbConfigured, safeEqual, rateLimited, clientIp } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin data endpoint.
 *
 * Authentication is a shared passphrase checked SERVER-SIDE, which is the part
 * that actually matters. The dashboard's URL is not a secret and was never doing
 * any real work; it is simply /admin-1342.
 *
 * Fails closed: if ADMIN_SECRET is not set, nothing is ever returned.
 *
 * On what this returns: profiles now carry a first name, so this is personal
 * data about real classmates rather than anonymous counters. It stays read-only,
 * capped in size, and never includes IP addresses or device identifiers.
 */
export async function POST(req: Request) {
  try {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) {
      return Response.json(
        { ok: false, error: "Admin access is not configured." },
        { status: 503 }
      );
    }

    // Two buckets: one per address, and one global. The per-address bucket is
    // the useful signal; the global one means that even if someone rotates
    // addresses (or spoofs a forwarded header) they cannot turn this instance
    // into a fast guessing oracle.
    const ip = clientIp(req);
    if (rateLimited(`admin:${ip}`, 8, 60_000) || rateLimited("admin:*", 30, 60_000)) {
      return Response.json(
        { ok: false, error: "Too many attempts. Wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const secret = typeof body?.secret === "string" ? body.secret : "";

    if (!safeEqual(secret, expected)) {
      return Response.json({ ok: false, error: "Incorrect passphrase." }, { status: 401 });
    }

    if (!dbConfigured || !sql) {
      return Response.json({ ok: true, dbConfigured: false, people: [], exams: [], chapters: [] });
    }

    // One row per student, with their progress rolled up.
    const people = await sql`
      SELECT
        p.id,
        p.first_name,
        p.created_at,
        p.last_seen,
        COALESCE(sp.viewed, 0)::int    AS sections_viewed,
        COALESCE(sp.guided, 0)::int    AS guided_done,
        COALESCE(ps.attempted, 0)::int AS practice_attempted,
        COALESCE(ps.correct, 0)::int   AS practice_correct,
        COALESCE(ex.n, 0)::int         AS exams_taken
      FROM profiles p
      LEFT JOIN (
        SELECT profile_id,
               COUNT(*) FILTER (WHERE viewed)           AS viewed,
               COUNT(*) FILTER (WHERE guided_completed) AS guided
        FROM section_progress GROUP BY profile_id
      ) sp ON sp.profile_id = p.id
      LEFT JOIN (
        SELECT profile_id, SUM(attempted) AS attempted, SUM(correct) AS correct
        FROM practice_stats GROUP BY profile_id
      ) ps ON ps.profile_id = p.id
      LEFT JOIN (
        SELECT profile_id, COUNT(*) AS n FROM exam_results GROUP BY profile_id
      ) ex ON ex.profile_id = p.id
      ORDER BY p.last_seen DESC NULLS LAST
      LIMIT 300
    `;

    const exams = await sql`
      SELECT e.id, e.scope, e.score, e.total, e.seconds, e.created_at, p.first_name
      FROM exam_results e
      JOIN profiles p ON p.id = e.profile_id
      ORDER BY e.created_at DESC
      LIMIT 300
    `;

    // Where the class as a whole struggles, from aggregate practice accuracy.
    const chapters = await sql`
      SELECT chapter, SUM(attempted)::int AS attempted, SUM(correct)::int AS correct
      FROM practice_stats
      GROUP BY chapter
      ORDER BY chapter
    `;

    return Response.json({ ok: true, dbConfigured: true, people, exams, chapters });
  } catch {
    // Deliberately vague: does not name env vars or the hosting provider.
    return Response.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
