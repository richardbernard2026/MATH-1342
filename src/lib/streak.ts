/**
 * The study streak.
 *
 * Not a scheduling input. Nothing in scheduler.ts reads this and nothing should:
 * a streak measures showing up, and the queue is built from what you can recall.
 * It is here because showing up is the step that fails, and a visible count of
 * consecutive days is the cheapest known lever on that.
 *
 * One design decision worth stating. The current streak counts consecutive days
 * ending TODAY or YESTERDAY, not today alone. If it required today, then at
 * 8 AM every morning a nine day streak would read as zero, which punishes the
 * user for the state of not having studied yet rather than for missing a day.
 * A streak only breaks once a whole day has passed with nothing in it.
 *
 * Storage is localStorage and every access is wrapped, because a disabled or
 * full store must degrade to "no streak" rather than take a page down.
 */

import { daysBetween } from "@/lib/scheduler";

const KEY = "statlab_streak_v1";

/** yyyy-mm-dd and nothing else. Anything hand-edited into the store is dropped. */
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((d): d is string => typeof d === "string" && ISO.test(d));
    // ISO dates sort correctly as plain strings, which is most of why this
    // format is used everywhere in the app.
    return [...new Set(clean)].sort();
  } catch {
    return [];
  }
}

function write(dates: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(dates));
  } catch {
    /* private mode or quota. A lost streak is not worth an exception. */
  }
}

/** Every day something was answered, sorted, oldest first. */
export function studiedDates(): string[] {
  return read();
}

/** Record that at least one item was answered on this date. Idempotent. */
export function markStudied(dateISO: string): void {
  if (!ISO.test(dateISO)) return;
  const dates = read();
  if (dates.includes(dateISO)) return;
  dates.push(dateISO);
  dates.sort();
  write(dates);
}

/**
 * Consecutive days ending today or yesterday.
 *
 * Returns 0 when there is nothing stored, and 0 once the most recent day is two
 * or more days back, which is the point a streak has genuinely broken.
 */
export function currentStreak(today: string): number {
  const dates = read().filter((d) => d <= today);
  if (!dates.length) return 0;

  const last = dates[dates.length - 1];
  const gap = daysBetween(last, today);
  if (gap > 1) return 0;

  let count = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    if (daysBetween(dates[i], dates[i + 1]) === 1) count++;
    else break;
  }
  return count;
}

/** The longest run of consecutive days ever recorded. */
export function longestStreak(): number {
  const dates = read();
  if (!dates.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

/** Wipe the streak. Used by the profile reset, never by a study screen. */
export function resetStreak(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing useful to do */
  }
}
