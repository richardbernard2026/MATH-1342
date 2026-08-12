/**
 * Exam-aware spaced repetition.
 *
 * This is deliberately NOT SM-2. SM-2 (Anki) optimizes for indefinite
 * retention, so its intervals grow without bound. That is the wrong objective
 * here. The objective is maximum recall on one specific morning, Aug 21 2026,
 * and nothing after it. An interval that lands on Aug 24 is worth zero.
 *
 * The gap rule comes from Cepeda, Vul, Rohrer, Wixted & Pashler (2008),
 * "Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention",
 * Psychological Science 19, 1095-1102. Over 1,350 participants. The finding is
 * that the optimal gap between study sessions is a PROPORTION of how far away
 * the test is, roughly 20 to 40 percent at a one week horizon, falling to 5 to
 * 10 percent at a one year horizon. The curve is an inverted U, so reviewing
 * too soon wastes nearly as much as reviewing too late.
 *
 * Ten days out, 20 to 40 percent is 2 to 4 days. That is why this scheduler
 * will refuse to show you the same item two days running once you have it,
 * and why the intervals compress on their own as the date approaches.
 *
 * Retirement follows Rawson & Dunlosky's successive relearning: retrieval to a
 * criterion of 3 correct recalls, spread over separate sessions rather than
 * banged out in one. Three corrects in one sitting is fluency, not memory.
 *
 * The confidence rule follows the hypercorrection effect (Butterfield &
 * Metcalfe): errors made with HIGH confidence are corrected more readily than
 * low-confidence errors, but they come back. Butterfield & Metcalfe (2011)
 * found the correction persists about a week and then high-confidence errors
 * return. So those items get priority AND a higher retirement bar, not one
 * explanation and a tick.
 */

import { examDates, sectionTaughtOn } from "@/lib/data/chapters";

export type ItemKind = "rule" | "practice" | "card";

export type ReviewState = {
  kind: ItemKind;
  id: string;
  /** Consecutive correct answers. Reset to 0 on a miss. */
  streak: number;
  /** Distinct calendar dates (ISO, yyyy-mm-dd) on which this was answered correctly. */
  correctDays: string[];
  attempts: number;
  corrects: number;
  /** Was this ever missed while the learner said they were sure? */
  sureWrong: boolean;
  /** ISO date this is next wanted. Null means never scheduled. */
  dueOn: string | null;
  lastSeen: string | null;
  retired: boolean;
};

export type Grade = {
  correct: boolean;
  /** 0 guessing, 1 unsure, 2 fairly sure, 3 certain. */
  confidence: number;
};

/* ------------------------------------------------------------------ dates */

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime();
  return Math.round(ms / 86400000);
}

export const EXAM_DATE = examDates.final;

/* -------------------------------------------------------------- the gap */

/**
 * Base gap in days, from the Cepeda ratio applied to the time left.
 *
 * 30 percent sits in the middle of the 20 to 40 percent band their data gives
 * for short horizons. Floored at 1 because you cannot review a third of a day
 * later, and capped at 4 because past that the ridgeline is falling and, more
 * practically, an item parked 6 days out in a 10 day run gets seen once.
 */
export function baseGap(today: string, exam: string = EXAM_DATE): number {
  const left = daysBetween(today, exam);
  if (left <= 1) return 1;
  return Math.min(4, Math.max(1, Math.round(left * 0.3)));
}

/**
 * How many separate days of correct recall retire an item.
 *
 * Three is Rawson & Dunlosky's criterion. Four for anything ever missed while
 * confident, because those specifically return.
 */
export function requiredCorrectDays(s: ReviewState): number {
  return s.sureWrong ? 4 : 3;
}

export function isRetired(s: ReviewState): boolean {
  return s.correctDays.length >= requiredCorrectDays(s) && s.streak >= 3;
}

/**
 * Apply a graded answer and return the new state.
 *
 * A miss always comes back the next day, whatever the streak was. A correct
 * answer earns an interval that scales with how many separate days it has
 * survived, but never lands after the exam: anything that would overshoot gets
 * pulled to the day before, so every item gets one last look.
 */
export function grade(
  s: ReviewState,
  g: Grade,
  today: string,
  exam: string = EXAM_DATE
): ReviewState {
  const gap = baseGap(today, exam);
  const next: ReviewState = {
    ...s,
    attempts: s.attempts + 1,
    lastSeen: today,
    correctDays: [...s.correctDays],
  };

  if (g.correct) {
    next.corrects = s.corrects + 1;
    next.streak = s.streak + 1;
    if (!next.correctDays.includes(today)) next.correctDays.push(today);
  } else {
    next.streak = 0;
    // High confidence plus wrong is the hypercorrection case. Flag it: it gets
    // priority in the queue and a higher bar to retire.
    if (g.confidence >= 2) next.sureWrong = true;
    // A miss also costs credit for one previous day, so a lapse genuinely
    // sets you back rather than leaving the item one tick from retirement.
    next.correctDays.pop();
  }

  const mult = !g.correct ? 0 : next.streak === 1 ? 0.5 : next.streak === 2 ? 1 : 1.5;
  const raw = g.correct ? Math.max(1, Math.round(gap * mult)) : 1;

  const lastUseful = daysBetween(today, exam) <= 0 ? today : addDays(exam, -1);
  let due = addDays(today, raw);
  if (daysBetween(due, exam) < 0) due = lastUseful;

  next.dueOn = due;
  next.retired = isRetired(next);
  return next;
}

export function freshState(kind: ItemKind, id: string): ReviewState {
  return {
    kind,
    id,
    streak: 0,
    correctDays: [],
    attempts: 0,
    corrects: 0,
    sureWrong: false,
    dueOn: null,
    lastSeen: null,
    retired: false,
  };
}

/* ------------------------------------------------------------ selection */

export type SessionKind = "morning" | "afternoon";

export type Candidate = {
  kind: ItemKind;
  id: string;
  /** Section this item belongs to, e.g. "6.3". Used to respect what has been taught. */
  section: string;
  state: ReviewState;
};

export type Scored = Candidate & { priority: number; reason: string };

/**
 * Has this section been covered in class yet?
 *
 * Scheduling review of something never taught is not review, it is confusion.
 * Untaught sections are only reachable through the afternoon pretest block.
 */
export function isTaught(section: string, today: string): boolean {
  if (section.includes(".")) {
    const on = sectionTaughtOn[section];
    return on ? daysBetween(on, today) >= 0 : true;
  }
  // A bare chapter number, which is what practice topics and flashcards carry.
  // Treat the chapter as available only once every section in it has been
  // covered, since a mixed chapter drill can pull from any of them.
  const dates = Object.entries(sectionTaughtOn)
    .filter(([id]) => id.split(".")[0] === section)
    .map(([, d]) => d)
    .sort();
  if (!dates.length) return true;
  return daysBetween(dates[dates.length - 1], today) >= 0;
}

/**
 * Rank candidates for a session.
 *
 * Order of business:
 *   1. Lapses. Missed last time, due now. Nothing else matters more.
 *   2. Sure and wrong. Hypercorrection says these correct well but return, so
 *      they need repeated exposure rather than a single explanation.
 *   3. Overdue, most overdue first.
 *   4. Due today.
 *   5. Never seen, from taught sections.
 *   6. Retired items get a single sweep in the last two days, and are
 *      otherwise left alone.
 *
 * Morning leans toward recent and unlearned material, which is when the
 * battery is full. Afternoon leans toward older chapters, which is retrieval
 * at a longer delay and is exactly what a comprehensive final tests.
 */
export function scoreCandidate(c: Candidate, today: string, session: SessionKind, exam = EXAM_DATE): Scored {
  const s = c.state;
  const left = daysBetween(today, exam);
  const overdue = s.dueOn ? daysBetween(s.dueOn, today) : 0;
  let p = 0;
  let reason = "";

  if (s.retired) {
    // Final sweep only.
    p = left <= 2 ? 40 : -1;
    reason = left <= 2 ? "final sweep" : "retired";
  } else if (s.attempts > 0 && s.streak === 0 && overdue >= 0) {
    p = 1000 + overdue * 10;
    reason = "missed last time";
  } else if (s.sureWrong && overdue >= 0) {
    p = 800 + overdue * 10;
    reason = "you were sure and wrong";
  } else if (overdue > 0) {
    p = 500 + overdue * 10;
    reason = `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  } else if (s.dueOn && overdue === 0) {
    p = 400;
    reason = "due today";
  } else if (s.attempts === 0) {
    p = 200;
    reason = "not seen yet";
  } else {
    // Scheduled for later. Cepeda says pulling it forward costs retention.
    p = -1;
    reason = "not due";
  }

  // Session shaping. Chapter number is the front of the section id.
  const ch = Number(c.section.split(".")[0]);
  if (p > 0) {
    if (session === "morning") p += ch >= 7 ? 60 : ch >= 4 ? 20 : 0;
    else p += ch <= 3 ? 60 : ch <= 6 ? 30 : 0;
  }

  // Flashcards are a support tool, not the thing the exam measures, and there
  // are more of them than everything else combined. There is only room for
  // roughly 400 item-reviews between now and the exam at two short sessions a
  // day, while the 92 core items alone need about 280 of those to reach the
  // three-separate-days criterion. So cards sit below core items of the same
  // status and fill whatever capacity is left rather than competing for it.
  if (p > 0 && c.kind === "card") p *= 0.35;

  return { ...c, priority: p, reason };
}

/**
 * Roughly how long one item takes, in minutes.
 *
 * Sessions are budgeted in TIME rather than item count, because the three
 * kinds are not remotely comparable. A rule-discrimination item is a single
 * read and a tap. A generated practice problem is real arithmetic on paper.
 * Counting them the same way is how a "20 item session" turns into 50 minutes,
 * which is past the point the diagnostic showed accuracy falling apart.
 */
export const MINUTES_PER_ITEM: Record<ItemKind, number> = {
  rule: 0.6,
  card: 0.4,
  practice: 2.2,
};

export function estimateMinutes(items: { kind: ItemKind }[]): number {
  return items.reduce((m, i) => m + MINUTES_PER_ITEM[i.kind], 0);
}

/**
 * Build a session to fit a time budget.
 *
 * Interleaving is enforced after ranking: no two consecutive items from the
 * same section, which is the Rohrer (2020) manipulation and the whole reason
 * this app stopped sorting practice by chapter.
 */
export function buildSession(
  candidates: Candidate[],
  today: string,
  session: SessionKind,
  minutes = 25,
  exam = EXAM_DATE
): Scored[] {
  const eligible = candidates
    .filter((c) => isTaught(c.section, today))
    .map((c) => scoreCandidate(c, today, session, exam))
    .filter((c) => c.priority > 0)
    .sort((a, b) => b.priority - a.priority);

  const picked: Scored[] = [];
  const perSection = new Map<string, number>();
  const countSection = new Map<string, number>();
  let spent = 0;

  // No single chapter may take more than this share of the session. Without
  // the cap, the morning weighting toward recent chapters fills the whole
  // session with one chapter, and then there is nothing left to interleave
  // AGAINST, which quietly turns the session back into blocked practice. The
  // cap is what makes the alternation actually achievable.
  const sectionCap = minutes * 0.4;

  // A count cap as well as a time cap. Rule items cost 0.6 minutes, so 40% of
  // the time budget is still sixteen of them, which is most of a session from
  // one chapter. Alternation is only possible if no chapter holds more than
  // about half the items, and four is comfortably under that.
  const COUNT_CAP = 4;

  const take = (c: Scored, cap: number, countCap: number) => {
    const cost = MINUTES_PER_ITEM[c.kind];
    if (spent + cost > minutes) return false;
    const used = perSection.get(c.section) ?? 0;
    if (used + cost > cap) return false;
    if ((countSection.get(c.section) ?? 0) >= countCap) return false;
    picked.push(c);
    perSection.set(c.section, used + cost);
    countSection.set(c.section, (countSection.get(c.section) ?? 0) + 1);
    spent += cost;
    return true;
  };

  for (const c of eligible) {
    if (minutes - spent < 0.4) break;
    take(c, sectionCap, COUNT_CAP);
  }
  // Second pass without the cap, so a thin day (few chapters taught, or almost
  // everything retired) still fills the session rather than ending early.
  if (minutes - spent >= 0.4) {
    for (const c of eligible) {
      if (minutes - spent < 0.4) break;
      if (picked.includes(c)) continue;
      take(c, Infinity, Infinity);
    }
  }
  return interleave(picked);
}

/**
 * Reorder so no two neighbours share a section, keeping the urgent work early.
 *
 * Two competing goals. Interleaving needs alternation. Fatigue needs the items
 * that matter most to come first, because the diagnostic showed the last third
 * of a long sitting collapsing into blanks and guesses.
 *
 * So: play the highest-priority available item, EXCEPT when one section holds
 * more than half of what is left, in which case it has to go now or it will
 * strand into a run at the end. That is the only situation where alternation
 * overrides urgency, and the count cap in buildSession makes it rare.
 */
export function interleave<T extends { section: string; priority?: number }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const i of items) {
    const g = groups.get(i.section);
    if (g) g.push(i);
    else groups.set(i.section, [i]);
  }

  const out: T[] = [];
  let remaining = items.length;
  let last = "";

  while (remaining > 0) {
    let key = "";

    // Does any section have to play now to avoid a run later?
    for (const [k, v] of groups) {
      if (k === last || !v.length) continue;
      if (2 * v.length > remaining + 1) {
        key = k;
        break;
      }
    }

    // Otherwise take the most urgent front item from any other section.
    if (!key) {
      let best = -Infinity;
      for (const [k, v] of groups) {
        if (k === last || !v.length) continue;
        const pr = v[0].priority ?? 0;
        if (pr > best) {
          best = pr;
          key = k;
        }
      }
    }

    // Only the just-played section has anything left. Unavoidable.
    if (!key) {
      for (const [k, v] of groups) {
        if (v.length) {
          key = k;
          break;
        }
      }
      if (!key) break;
    }

    out.push(groups.get(key)!.shift() as T);
    remaining--;
    last = key;
  }
  return out;
}

/* ------------------------------------------------------------- reporting */

export type Readiness = {
  total: number;
  retired: number;
  inProgress: number;
  untouched: number;
  sureWrongOpen: number;
  daysLeft: number;
  /** Rough share of the CORE material judged durable, 0 to 100. */
  percent: number;
  /** Flashcards are reported separately so they cannot flatter the number. */
  cardsTotal: number;
  cardsRetired: number;
};

/**
 * Readiness is measured over CORE items only: the rule-discrimination drill and
 * the practice generators. Those are what the exam actually asks for. Counting
 * 96 flashcards in the same figure would let a comfortable 90% hide the fact
 * that the hypothesis-testing procedure was never solid.
 */
export function readiness(candidates: Candidate[], today: string, exam = EXAM_DATE): Readiness {
  const cards = candidates.filter((c) => c.kind === "card" && isTaught(c.section, today));
  const taught = candidates.filter((c) => c.kind !== "card" && isTaught(c.section, today));
  const retired = taught.filter((c) => c.state.retired).length;
  const untouched = taught.filter((c) => c.state.attempts === 0).length;
  const partial = taught.reduce((sum, c) => {
    if (c.state.retired) return sum;
    const need = requiredCorrectDays(c.state);
    return sum + Math.min(c.state.correctDays.length, need) / need;
  }, 0);
  const total = taught.length || 1;
  return {
    total: taught.length,
    retired,
    inProgress: taught.length - retired - untouched,
    untouched,
    sureWrongOpen: candidates.filter((c) => c.state.sureWrong && !c.state.retired).length,
    daysLeft: Math.max(0, daysBetween(today, exam)),
    percent: Math.round(((retired + partial) / total) * 100),
    cardsTotal: cards.length,
    cardsRetired: cards.filter((c) => c.state.retired).length,
  };
}
