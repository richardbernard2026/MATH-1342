import { neon } from "@neondatabase/serverless";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Neon Postgres client and shared request validation.
 *
 * The connection string is read from the server environment only and never
 * reaches the browser. If no database is configured the app still works
 * completely; every write becomes a no-op and the site falls back to
 * browser-local progress. That is deliberate: study tools should never break
 * because a database is unreachable.
 */

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

export const dbConfigured = Boolean(connectionString);
export const sql = dbConfigured ? neon(connectionString as string) : null;

/** Exam scopes that may be written to exam_results. */
export const ALLOWED_SCOPES = ["t1", "t2", "cum"] as const;

/** Valid section ids, so section_progress can never hold junk. */
export const ALLOWED_SECTIONS = [
  "1.1", "1.2",
  "2.1", "2.2", "2.3",
  "3.1", "3.2", "3.3", "3.4",
  "4.1", "4.2", "4.3",
  "5.1", "5.2", "5.3",
  "6.1", "6.2", "6.3",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isAllowed<T extends readonly string[]>(v: unknown, list: T): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

export function boundedInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Clean a submitted first name.
 *
 * Strips control characters and angle brackets, collapses whitespace, and caps
 * the length. React escapes on render so this is not the XSS defence, but
 * keeping the stored value tidy means the admin dashboard and greetings never
 * show anything bizarre, and it prevents someone entering a 5000-character
 * "name" to bloat the table.
 */
export function cleanFirstName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v
    // Turn tabs and newlines into spaces FIRST, so a pasted "Mary<tab>Jane"
    // becomes "Mary Jane" instead of the words jammed together.
    .replace(/[\t\n\r]+/g, " ")
    // Then strip the remaining control characters and angle brackets.
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (cleaned.length < 1) return null;
  return cleaned;
}

/**
 * Constant-time comparison for the admin passphrase.
 *
 * Both sides are hashed to a fixed 32 bytes first. Comparing the raw strings
 * would have to bail out early on a length mismatch, which leaks the length of
 * the real passphrase through response timing; hashing removes that signal
 * because every digest is the same size.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Reject cross-origin writes.
 *
 * The host is compared exactly. An `endsWith` check would let
 * `https://evilstatlab.vercel.app` past a host of `statlab.vercel.app`, and
 * neighbouring subdomains on a shared hosting domain are freely registerable.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true; // non-browser clients send no Origin
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Best available client address.
 *
 * `x-forwarded-for` is a client-settable header: anything the caller sends is
 * placed FIRST and the proxy appends the real address after it. So the first
 * entry is attacker-controlled and the last is not. Vercel's `x-real-ip` is set
 * by the edge and cannot be spoofed, so prefer it.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

/**
 * Look up a profile id from a browser uuid, creating nothing.
 * Returns null when the profile does not exist yet.
 */
export async function profileIdFor(uuid: string): Promise<number | null> {
  if (!sql) return null;
  const rows = await sql`SELECT id FROM profiles WHERE uuid = ${uuid} LIMIT 1`;
  return rows[0]?.id ?? null;
}

/**
 * Simple per-instance rate limiter, used on the admin login.
 *
 * Serverless instances are recycled and requests fan out across them, so this
 * is a speed bump rather than a guarantee. The real defence is a long random
 * ADMIN_SECRET. Expired buckets are swept on write so the map cannot grow
 * without bound over the life of a warm instance.
 */
const buckets = new Map<string, { count: number; first: number }>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size > 500) {
    for (const [k, v] of buckets) {
      if (now - v.first > windowMs) buckets.delete(k);
    }
  }

  const rec = buckets.get(key);
  if (!rec || now - rec.first > windowMs) {
    buckets.set(key, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
