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

/**
 * Estimated chance of getting this right next time.
 *
 * Used to compose a session near an 85% success rate. Wilson, Shenhav,
 * Straccia & Cohen (2019, Nature Communications) derive an optimal training
 * accuracy of about 85% for gradient-descent style learners: below it,
 * learning slows AND the learner quits. Their result is for artificial and
 * biologically plausible networks on binary classification, so treat it as a
 * direction rather than a law, but the direction is not in doubt and the
 * alternative, sorting hardest-first, produced a session with a roughly 25%
 * hit rate that got abandoned halfway through.
 */
export function successOdds(s: ReviewState): number {
  if (s.retired) return 0.95;
  // First-attempt prior. Calibrated to the observed rate rather than guessed:
  // the first real session ran 55% across 20 items, most of them new.
  if (s.attempts === 0) return 0.55;
  const base = s.corrects / s.attempts;
  const streakBonus = Math.min(0.25, s.streak * 0.12);
  const lapsePenalty = s.streak === 0 && s.attempts > 0 ? 0.15 : 0;
  return Math.max(0.05, Math.min(0.97, base + streakBonus - lapsePenalty));
}

/**
 * Has this item been missed enough times to need scaffolding rather than
 * another cold attempt? Two or more attempts with nothing to show for them.
 */
export function needsScaffold(s: ReviewState): boolean {
  return s.attempts >= 2 && s.corrects === 0;
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
    // A sure-wrong flag that never clears turns the report into a wall of red
    // on topics that have since been fixed, which is both wrong and
    // discouraging. Two clean days of confident correct answers earns it off.
    if (next.sureWrong && g.confidence >= 2 && next.correctDays.length >= 2 && next.streak >= 2) {
      next.sureWrong = false;
    }
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
  //
  // Availability starts at the chapter's FIRST section, not its last. Waiting
  // for the last one meant Chapter 8, whose sections run Aug 12 to Aug 14,
  // stayed invisible until four days before Test 3 covers it. The cost is that
  // a chapter-level drill can occasionally reach a topic from a section taught
  // later that same week. That is a far smaller problem than never seeing the
  // chapter, and those items are the ones the pretest framing is for.
  const dates = Object.entries(sectionTaughtOn)
    .filter(([id]) => id.split(".")[0] === section)
    .map(([, d]) => d)
    .sort();
  if (!dates.length) return true;
  return daysBetween(dates[0], today) >= 0;
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
    // New material used to sit below everything due, which starves it once a
    // few days of history exist. With 72 of 92 topics untouched and Chapter 8
    // taught this week, that path ends at the exam having never seen a
    // hypothesis test. buildSession also reserves a hard quota for these.
    p = 340;
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
  // A "rule" item is no longer a single tap. It now runs two stages on the
  // same problem, pick the formula and then compute with it, so it costs
  // roughly what a practice item costs plus the formula choice.
  rule: 2.5,
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
  // Identifying the method gates computing it. Being handed "compute the
  // confidence interval" for a topic whose rule you cannot yet recognise is
  // backwards, and it is most of what made an early session feel impossible.
  const ruleState = new Map<string, ReviewState>();
  for (const c of candidates) if (c.kind === "rule") ruleState.set(c.id, c.state);
  const gated = (c: Candidate) => {
    if (c.kind !== "practice") return false;
    const r = ruleState.get(c.id);
    if (!r) return false;
    // Blocked only while the rule half is actively failing. An untouched rule
    // half does not block, otherwise nothing new could ever start.
    return r.attempts > 0 && r.streak === 0 && r.corrects === 0;
  };

  const eligible = candidates
    .filter((c) => isTaught(c.section, today))
    .map((c) => {
      const sc = scoreCandidate(c, today, session, exam);
      if (gated(c)) return { ...sc, priority: sc.priority * 0.15, reason: "identify it first" };
      return sc;
    })
    .filter((c) => c.priority > 0)
    .sort((a, b) => b.priority - a.priority);

  const picked: Scored[] = [];
  const perSection = new Map<string, number>();
  const countSection = new Map<string, number>();
  let spent = 0;

  // Reserve roughly a fifth of the session for material never seen before, so
  // that a growing pile of due reviews cannot crowd out a whole chapter.
  const NEW_QUOTA = Math.max(3, Math.round(minutes * 0.18));
  let newSpent = 0;

  // A hard ceiling on item count as well as minutes. Flashcards cost 0.4
  // minutes each, so a 25 minute budget can otherwise become a 46 item
  // session, which reads as endless no matter how quick each item is.
  const MAX_ITEMS = 22;

  // At most this share of the session may be material the learner is likely to
  // miss. When everything attempted so far has failed, an unbounded fill turns
  // the session back into the firehose the 85% rule warns about, so the
  // remainder is taken from newer or easier material instead. This cannot
  // always reach 85%: if there is genuinely nothing you can do yet, no
  // ordering fixes that. It can stop the session being ALL of it.
  const MAX_HARD = Math.ceil(MAX_ITEMS * 0.45);
  let hardCount = 0;
  const isHard = (c: Scored) => successOdds(c.state) < 0.35;

  // Open on two things the learner can actually do.
  //
  // These are drawn from everything taught, NOT from the due list. Anything
  // solid enough to be a warm-up is by definition scheduled for later, so
  // restricting warm-ups to due items produced sessions that opened at 18%
  // expected accuracy. Pulling two items forward costs a little spacing
  // efficiency and buys the session actually being finished, which is worth
  // vastly more than nothing.
  const warmups = candidates
    .filter((c) => isTaught(c.section, today) && c.state.attempts > 0 && successOdds(c.state) >= 0.6)
    .sort((a, b) => successOdds(b.state) - successOdds(a.state))
    .slice(0, 2)
    .map((c) => ({ ...scoreCandidate(c, today, session, exam), priority: 9999, reason: "warm up" }));

  // No single chapter may take more than this share of the session. Without
  // the cap, the morning weighting toward recent chapters fills the whole
  // session with one chapter, and then there is nothing left to interleave
  // AGAINST, which quietly turns the session back into blocked practice. The
  // cap is what makes the alternation actually achievable.
  const sectionCap = minutes * 0.4;

  // A count cap as well as a time cap, scaled to how many items the session
  // will actually hold. A flat cap of four was fine at eighteen items but
  // collapses a ten item session onto three chapters, which quietly undoes the
  // interleaving. Roughly a quarter of the session per chapter, never below 2.
  const expectedItems = Math.max(4, Math.round(minutes / 2.4));
  const COUNT_CAP = Math.max(2, Math.min(4, Math.round(expectedItems / 4)));

  // Warm-ups are rebuilt objects rather than the ones in `eligible`, so an
  // identity check missed them and the same item could be served twice in one
  // session, back to back in the same chapter. Dedupe on kind and id.
  const chosen = new Set<string>();
  const seenAlready = (c: Scored) => chosen.has(c.kind + ":" + c.id);

  const take = (c: Scored, cap: number, countCap: number, allowHard = true) => {
    if (seenAlready(c)) return false;
    // A formula item runs both stages on one problem and records the rule half
    // AND the practice half. Scheduling the standalone practice item for the
    // same topic in the same session would just be the same work twice.
    if (c.kind === "practice" && chosen.has("rule:" + c.id)) return false;
    if (c.kind === "rule" && chosen.has("practice:" + c.id)) return false;
    const cost = MINUTES_PER_ITEM[c.kind];
    if (spent + cost > minutes) return false;
    const used = perSection.get(c.section) ?? 0;
    if (used + cost > cap) return false;
    if ((countSection.get(c.section) ?? 0) >= countCap) return false;
    const hard = isHard(c);
    const urgent = c.priority >= 500;
    if (hard && !urgent && (!allowHard || hardCount >= MAX_HARD)) return false;
    if (hard) hardCount++;
    picked.push(c);
    chosen.add(c.kind + ":" + c.id);
    perSection.set(c.section, used + cost);
    countSection.set(c.section, (countSection.get(c.section) ?? 0) + 1);
    spent += cost;
    return true;
  };

  for (const w of warmups) take(w, Infinity, COUNT_CAP);

  // First pass: reserve the new-material quota, newest chapter first.
  //
  // Ordering matters here. Sorting new material by raw priority let Chapter 7
  // fill the whole quota and Chapter 8 never appeared at all, five days before
  // a test that covers it. Most recently taught goes first, which is also what
  // you want pedagogically: drill what you just heard in class.
  const taughtOn = (sec: string) => {
    const ds = Object.entries(sectionTaughtOn)
      .filter(([id]) => id.split(".")[0] === sec)
      .map(([, d]) => d)
      .sort();
    return ds.length ? ds[0] : "1970-01-01";
  };
  const freshFirst = eligible
    .filter((c) => c.state.attempts === 0)
    .sort((a, b) => taughtOn(b.section).localeCompare(taughtOn(a.section)));

  for (const c of freshFirst) {
    if (minutes - spent < 0.4 || newSpent >= NEW_QUOTA) break;
    if (seenAlready(c)) continue;
    const before = spent;
    if (take(c, sectionCap, COUNT_CAP)) newSpent += spent - before;
  }

  // Second pass: fill by priority, but keep the expected success rate near
  // 85%. Anything likely to be missed is skipped once the session already
  // holds its share of hard items, and gets picked up next time instead.
  const TARGET = 0.85;
  for (const c of eligible) {
    if (minutes - spent < 0.4) break;
    if (seenAlready(c)) continue;
    const odds = picked.map((x) => successOdds(x.state));
    const mean = odds.length ? odds.reduce((a, b) => a + b, 0) / odds.length : TARGET;
    const mine = successOdds(c.state);
    // The success-rate target shapes the FILLER, never the core review work.
    // Lapses and sure-wrong items sit at priority 800 and above, and they are
    // the highest-value thing in the queue by a wide margin. An earlier version
    // of this filter was quietly dropping exactly the item the session existed
    // to fix, which is the opposite of the intent.
    const urgent = c.priority >= 500;
    if (!urgent && picked.length >= 4 && mine < 0.5 && mean < TARGET - 0.12) continue;
    if (picked.length >= MAX_ITEMS) break;
    take(c, sectionCap, COUNT_CAP);
  }

  // Anything still missing gets filled from whatever is easiest, so the tail of
  // the session is not the hardest part of it.
  if (picked.length < MAX_ITEMS && minutes - spent >= 0.4) {
    const easiest = [...eligible].sort((a, b) => successOdds(b.state) - successOdds(a.state));
    for (const c of easiest) {
      if (minutes - spent < 0.4 || picked.length >= MAX_ITEMS) break;
      if (seenAlready(c)) continue;
      take(c, sectionCap, COUNT_CAP);
    }
  }
  // Final pass with a looser cap, so a thin day (few chapters taught, or almost
  // everything retired) still fills the session rather than ending early. The
  // count cap only loosens, it does not vanish: dropping it entirely let one
  // chapter take enough of the session that alternation became impossible.
  if (minutes - spent >= 0.4 && picked.length < MAX_ITEMS) {
    for (const c of eligible) {
      if (minutes - spent < 0.4 || picked.length >= MAX_ITEMS) break;
      if (seenAlready(c)) continue;
      take(c, Infinity, COUNT_CAP + 2);
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
      // Off by one matters here. With 3 slots left and 2 of them from one
      // section, that section MUST go now, or the last two are forced adjacent.
      // The old guard used remaining + 1 and let exactly that case through.
      if (2 * v.length > remaining) {
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
