import { sql, dbConfigured, isValidUuid, isAllowed, boundedInt, ALLOWED_PAGES } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records that a visitor spent time on a page.
 *
 * Hardened compared to the original version of this endpoint:
 *  - the UUID must actually be a UUID, not just any string
 *  - the page name must be one of a fixed allowlist, so nothing arbitrary
 *    (and nothing resembling markup) can ever reach the database
 *  - seconds is clamped to a sane range
 *  - the request must come from this site's own origin
 *
 * If no database is configured the endpoint quietly succeeds and does nothing.
 */
export async function POST(req: Request) {
  try {
    if (!dbConfigured || !sql) {
      return Response.json({ ok: true, recorded: false });
    }

    // Reject cross-origin writes. Does not stop a determined script, but it
    // stops casual abuse from other sites.
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.endsWith(host)) {
      return Response.json({ ok: false, error: "bad origin" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const uuid = body?.uuid;
    const page = body?.page;
    const seconds = boundedInt(body?.seconds, 0, 86400);

    if (!isValidUuid(uuid)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }
    if (!isAllowed(page, ALLOWED_PAGES)) {
      return Response.json({ ok: false, error: "invalid page" }, { status: 400 });
    }
    if (seconds === null) {
      return Response.json({ ok: false, error: "invalid duration" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO visitors (uuid) VALUES (${uuid})
      ON CONFLICT (uuid) DO UPDATE SET uuid = EXCLUDED.uuid
      RETURNING id
    `;
    const visitorId = rows[0]?.id;
    if (!visitorId) return Response.json({ ok: false }, { status: 500 });

    await sql`
      INSERT INTO page_visits (visitor_id, page, seconds)
      VALUES (${visitorId}, ${page}, ${seconds})
    `;

    // Deliberately does not return the visitor's sequential id. The old version
    // leaked the total visitor count to anyone who posted a fresh UUID.
    return Response.json({ ok: true, recorded: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
