import { sql, dbConfigured, safeEqual } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin data endpoint.
 *
 * Authentication is a shared passphrase checked SERVER-SIDE, which is the part
 * that actually matters. The dashboard's URL is not a secret and was never
 * doing any real work; it is now simply /admin-1342.
 *
 * Fails closed: if ADMIN_SECRET is not set, nothing is ever returned.
 */

/**
 * Crude in-memory throttle. Serverless instances are recycled, so this is not
 * airtight, but it removes the ability to fire thousands of guesses a minute at
 * a single warm instance. The real defence is a long random ADMIN_SECRET.
 */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  try {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) {
      return Response.json(
        { ok: false, error: "Admin access is not configured." },
        { status: 503 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
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
      return Response.json({ ok: true, results: [], visits: [], dbConfigured: false });
    }

    const results = await sql`
      SELECT r.id, r.test, r.mock_score, r.mock_total, r.mock_time_seconds, r.created_at
      FROM results r
      ORDER BY r.created_at DESC
      LIMIT 500
    `;

    const visits = await sql`
      SELECT p.id, p.page, p.seconds, p.created_at
      FROM page_visits p
      ORDER BY p.created_at DESC
      LIMIT 500
    `;

    const totals = await sql`SELECT COUNT(*)::int AS n FROM visitors`;

    return Response.json({
      ok: true,
      dbConfigured: true,
      visitorCount: totals[0]?.n ?? 0,
      results,
      visits,
    });
  } catch {
    // Deliberately vague: does not name env vars or the hosting provider.
    return Response.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
