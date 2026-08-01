import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres client.
 *
 * The connection string is read from the server environment only and is never
 * bundled into the browser. If no database is configured the app still works
 * completely; every tracking call simply becomes a no-op. That is deliberate:
 * the study tools should never break because a database is missing.
 */

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

export const dbConfigured = Boolean(connectionString);

export const sql = dbConfigured ? neon(connectionString as string) : null;

/** Only these page names are ever written to the database. */
export const ALLOWED_PAGES = [
  "home",
  "chapter",
  "lesson",
  "practice",
  "test-review",
  "flashcards",
  "formula",
  "tutor",
] as const;

/** Only these test names are ever written to the database. */
export const ALLOWED_TESTS = ["t1", "t2", "cum", "practice"] as const;

/**
 * A real UUID, not merely "a string". The old version of this site accepted any
 * string up to 100 characters, which let anyone flood the visitors table with
 * junk rows.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isAllowed<T extends readonly string[]>(v: unknown, list: T): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

/** Clamp a number into a sane range, returning null for anything unusable. */
export function boundedInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Timing-safe string comparison for the admin passphrase.
 *
 * Over serverless HTTP a timing attack is impractical anyway, but comparing in
 * constant time costs nothing and removes the question entirely.
 */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
