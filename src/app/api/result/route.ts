import { sql, dbConfigured, isValidUuid, isAllowed, boundedInt, ALLOWED_TESTS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records one completed test-review attempt.
 *
 * Same hardening as /api/track: real UUID, allowlisted test name, every numeric
 * field clamped. Scores are bounded to 0-100 so a fabricated payload cannot
 * poison the averages on the dashboard.
 */
export async function POST(req: Request) {
  try {
    if (!dbConfigured || !sql) {
      return Response.json({ ok: true, recorded: false });
    }

    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.endsWith(host)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const uuid = body?.uuid;
    const test = body?.test;

    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }
    if (!isAllowed(test, ALLOWED_TESTS)) {
      return Response.json({ ok: false, error: "invalid test" }, { status: 400 });
    }

    const score = boundedInt(body?.score, 0, 100);
    const total = boundedInt(body?.total, 0, 100);
    const seconds = boundedInt(body?.seconds, 0, 86400);

    if (score === null || total === null) {
      return Response.json({ ok: false, error: "invalid score" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO visitors (uuid) VALUES (${uuid})
      ON CONFLICT (uuid) DO UPDATE SET uuid = EXCLUDED.uuid
      RETURNING id
    `;
    const visitorId = rows[0]?.id;
    if (!visitorId) return Response.json({ ok: false }, { status: 500 });

    // Per-chapter breakdown, each clamped independently.
    const b = body?.breakdown ?? {};
    const ch = (n: number) => boundedInt(b?.[n]?.correct, 0, 100);
    const chT = (n: number) => boundedInt(b?.[n]?.total, 0, 100);

    await sql`
      INSERT INTO results (
        visitor_id, test, mock_score, mock_total, mock_time_seconds,
        ch1_score, ch1_total, ch2_score, ch2_total, ch3_score, ch3_total
      ) VALUES (
        ${visitorId}, ${test}, ${score}, ${total}, ${seconds},
        ${ch(1)}, ${chT(1)}, ${ch(2)}, ${chT(2)}, ${ch(3)}, ${chT(3)}
      )
    `;

    return Response.json({ ok: true, recorded: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
