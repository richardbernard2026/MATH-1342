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

/* ----------------------------------------------------------------- schema */

/**
 * Create the tables if they are not there yet.
 *
 * Requiring someone to paste schema.sql into the Neon console before anything
 * works is a step that is easy to forget and gives no useful error when you do
 * — every endpoint just returns 500 because `profiles` does not exist. The DDL
 * is idempotent, so running it on first use costs one cheap round trip per cold
 * instance and removes that failure mode entirely.
 *
 * The promise is cached, so concurrent requests on the same instance wait on a
 * single attempt rather than racing. A failure is not cached: the next request
 * retries rather than being stuck forever on one bad moment.
 */
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id          SERIAL PRIMARY KEY,
        uuid        TEXT UNIQUE NOT NULL,
        first_name  TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT now(),
        last_seen   TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS section_progress (
        id                SERIAL PRIMARY KEY,
        profile_id        INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        section_id        TEXT NOT NULL,
        viewed            BOOLEAN DEFAULT false,
        guided_completed  BOOLEAN DEFAULT false,
        guided_first_try  INTEGER,
        guided_steps      INTEGER,
        explained         BOOLEAN DEFAULT false,
        updated_at        TIMESTAMPTZ DEFAULT now(),
        UNIQUE (profile_id, section_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS practice_stats (
        id          SERIAL PRIMARY KEY,
        profile_id  INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        chapter     INTEGER NOT NULL,
        attempted   INTEGER DEFAULT 0,
        correct     INTEGER DEFAULT 0,
        updated_at  TIMESTAMPTZ DEFAULT now(),
        UNIQUE (profile_id, chapter)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS exam_results (
        id          SERIAL PRIMARY KEY,
        profile_id  INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        scope       TEXT NOT NULL,
        score       INTEGER NOT NULL,
        total       INTEGER NOT NULL CHECK (total > 0),
        seconds     INTEGER,
        breakdown   JSONB,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_uuid    ON profiles(uuid)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_section_profile  ON section_progress(profile_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_practice_profile ON practice_stats(profile_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_profile     ON exam_results(profile_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_created     ON exam_results(created_at)`;
  })();

  schemaReady.catch(() => {
    schemaReady = null; // let the next request try again
  });

  return schemaReady;
}

/* ------------------------------------------------------------- diagnostics */

/**
 * Turn a thrown value into something safe to write to the server log.
 *
 * Connection errors can carry the full connection string, password and all, so
 * anything resembling `scheme://user:password@host` is redacted before it is
 * ever written down. Vercel's logs are not a place to leak a database password.
 */
export function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return raw.replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s]*@/gi, "$1***@").slice(0, 500);
}

/**
 * Does this error mean "the tables are not there"?
 *
 * Postgres 42P01 is undefined_table. Worth naming specifically so the UI can
 * say what is actually wrong instead of a generic failure.
 */
export function isMissingTable(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === "42P01") return true;
  return /relation .* does not exist/i.test(safeErrorMessage(err));
}

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
