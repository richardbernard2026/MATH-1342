"use client";

/**
 * One memory, read from anywhere.
 *
 * The app used to keep two unrelated records of how the studying was going.
 * useProfile knew which sections had been opened and what percentage of loose
 * practice attempts came out right. useReview knew the thing that actually
 * matters: for each item, how many separate days it has survived, whether it
 * was missed while the learner was confident, and when it is next wanted.
 * Only /session ever looked at the second one, so Home and the chapter pages
 * were reporting on a different person than Today was.
 *
 * This hook is the bridge. It derives everything it reports from the SCHEDULER
 * state, so a number shown on Home is the same number the queue is built from.
 * Nothing here writes. It is a read model over useReview and nothing else.
 *
 * Vocabulary, used identically on every screen:
 *   solid      retired, meaning the correct-days criterion is met
 *   shaky      attempted, and currently either missed or flagged sure-and-wrong
 *   learning   attempted, on track, not yet retired
 *   untouched  never attempted
 */

import { useEffect, useMemo, useState } from "react";
import { flashcards } from "@/lib/data/flashcards";
import { allTopicKeys, topicsByChapter } from "@/lib/practiceGenerators";
import {
  EXAM_DATE,
  daysBetween,
  isTaught,
  readiness,
  requiredCorrectDays,
  toISO,
  type Candidate,
  type ItemKind,
  type Readiness,
  type ReviewState,
} from "@/lib/scheduler";
import { useReview } from "@/lib/useReview";
import { currentStreak, longestStreak, markStudied, studiedDates } from "@/lib/streak";

export type MasteryStatus = "solid" | "shaky" | "learning" | "untouched";

export type TopicStatus = {
  key: string;
  label: string;
  ch: number;
  /** Can you pick the method. */
  rule: ReviewState;
  /** Can you execute it. */
  practice: ReviewState;
  /** The worse of the two halves, because a topic is only as good as its weaker half. */
  status: MasteryStatus;
  /** Earliest date either half is wanted again. Null if neither is scheduled. */
  dueOn: string | null;
};

export type ChapterMastery = {
  /** Core items in the chapter, which is two per topic: the rule half and the practice half. */
  total: number;
  solid: number;
  shaky: number;
  untouched: number;
  /** Core items due today or overdue, ignoring anything already retired. */
  due: number;
  /** Share of the chapter judged durable, 0 to 100, same partial-credit rule as readiness(). */
  percent: number;
  /** Has every section of this chapter been covered in class yet. */
  taught: boolean;
};

export type MasteryApi = {
  ready: boolean;
  today: string;
  candidates: Candidate[];
  overall: Readiness;
  byChapter: Record<number, ChapterMastery>;
  chapterNumbers: number[];
  topicStatus(key: string): TopicStatus | null;
  topicsForChapter(ch: number): TopicStatus[];
};

/* ------------------------------------------------------------ topic index */

type TopicRef = { key: string; label: string; ch: number };

/**
 * Every generated topic, with its label and its chapter.
 *
 * Built from allTopicKeys rather than from topicsByChapter, so it holds exactly
 * the topics that can actually produce a problem. A key with no home chapter is
 * dropped here for the same reason session/page.tsx dropped it: an item with no
 * section cannot be scheduled, because isTaught has nothing to check.
 */
export const TOPIC_INDEX: TopicRef[] = allTopicKeys
  .map((key): TopicRef | null => {
    for (const [ch, list] of Object.entries(topicsByChapter)) {
      const hit = list.find((t) => t.key === key);
      if (hit) return { key, label: hit.label, ch: Number(ch) };
    }
    return null;
  })
  .filter((t): t is TopicRef => t !== null && Number.isFinite(t.ch));

const TOPIC_BY_KEY: Record<string, TopicRef> = Object.fromEntries(
  TOPIC_INDEX.map((t) => [t.key, t])
);

/** Chapters that have at least one drillable topic, in numeric order. */
export const MASTERY_CHAPTERS: number[] = [...new Set(TOPIC_INDEX.map((t) => t.ch))].sort(
  (a, b) => a - b
);

/* ------------------------------------------------------------- candidates */

/**
 * The full candidate set the scheduler works over.
 *
 * This lived inline in session/page.tsx. It is here now because Home and the
 * chapter pages need the identical set: two screens that build the list a
 * slightly different way are two screens that quietly disagree about how much
 * work is left, which is the bug this whole file exists to close.
 */
export function buildCandidates(get: (kind: ItemKind, id: string) => ReviewState): Candidate[] {
  const out: Candidate[] = [];
  for (const t of TOPIC_INDEX) {
    const sec = String(t.ch);
    out.push({ kind: "rule", id: t.key, section: sec, state: get("rule", t.key) });
    out.push({ kind: "practice", id: t.key, section: sec, state: get("practice", t.key) });
  }
  for (const f of flashcards) {
    out.push({ kind: "card", id: f.id, section: String(f.ch), state: get("card", f.id) });
  }
  return out;
}

/* ---------------------------------------------------------------- status */

/** Where one half of a topic stands. */
export function halfStatus(s: ReviewState): MasteryStatus {
  if (s.retired) return "solid";
  if (s.attempts === 0) return "untouched";
  if (s.streak === 0 || s.sureWrong) return "shaky";
  return "learning";
}

/** How many separate correct days this half has, out of how many it needs. */
export function halfProgress(s: ReviewState): { done: number; need: number } {
  const need = requiredCorrectDays(s);
  return { done: Math.min(s.correctDays.length, need), need };
}

/** A topic is reported as its weaker half. Shaky beats learning beats solid. */
function worseOf(a: MasteryStatus, b: MasteryStatus): MasteryStatus {
  const rank: Record<MasteryStatus, number> = { shaky: 0, untouched: 1, learning: 2, solid: 3 };
  return rank[a] <= rank[b] ? a : b;
}

/** Is this item wanted today or already late. Retired items are not asked for. */
function isDue(s: ReviewState, today: string): boolean {
  if (s.retired || !s.dueOn) return false;
  return daysBetween(s.dueOn, today) >= 0;
}

function earlier(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

/**
 * Roll a chapter's core items into one figure.
 *
 * Partial credit is the same rule readiness() uses, so a chapter bar and the
 * overall percent cannot tell different stories: an item two thirds of the way
 * to its criterion counts two thirds, not zero and not one.
 */
function summarize(core: Candidate[], today: string): ChapterMastery {
  const solid = core.filter((c) => c.state.retired).length;
  const untouched = core.filter((c) => c.state.attempts === 0).length;
  const shaky = core.filter((c) => halfStatus(c.state) === "shaky").length;
  const due = core.filter((c) => isDue(c.state, today)).length;
  const partial = core.reduce((sum, c) => {
    if (c.state.retired) return sum;
    const { done, need } = halfProgress(c.state);
    return sum + done / need;
  }, 0);
  const denom = core.length || 1;
  const percent = Math.max(0, Math.min(100, Math.round(((solid + partial) / denom) * 100)));
  return {
    total: core.length,
    solid,
    shaky,
    untouched,
    due,
    percent,
    taught: core.length > 0 ? isTaught(core[0].section, today) : true,
  };
}

/**
 * Every chapter's core items, rolled up.
 *
 * Pure, and exported separately from the hook so it can be asserted against
 * without standing up React. Cards are excluded on purpose, exactly as
 * readiness() excludes them: there are more flashcards than everything else
 * combined, and letting them into a chapter bar would let a comfortable green
 * hide a procedure that has never once been executed correctly.
 */
export function summarizeChapters(
  candidates: Candidate[],
  today: string
): Record<number, ChapterMastery> {
  const core = candidates.filter((c) => c.kind !== "card");
  const out: Record<number, ChapterMastery> = {};
  for (const ch of MASTERY_CHAPTERS) {
    out[ch] = summarize(
      core.filter((c) => c.section === String(ch)),
      today
    );
  }
  return out;
}

/* ------------------------------------------------------------------ hook */

export function useMastery(): MasteryApi {
  const { ready, states, get } = useReview();

  // The date is captured once per mount. Recomputing it on every render would
  // make "due today" flip mid-session at midnight while a queue is in flight.
  const [today] = useState(() => toISO(new Date()));

  const candidates = useMemo(
    () => (ready ? buildCandidates(get) : []),
    // `states` is the invalidation signal: `get` reads a ref, so it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, states, get]
  );

  const overall = useMemo<Readiness>(
    () =>
      candidates.length
        ? readiness(candidates, today)
        : {
            total: 0,
            retired: 0,
            inProgress: 0,
            untouched: 0,
            sureWrongOpen: 0,
            daysLeft: Math.max(0, daysBetween(today, EXAM_DATE)),
            percent: 0,
            cardsTotal: 0,
            cardsRetired: 0,
          },
    [candidates, today]
  );

  const byChapter = useMemo<Record<number, ChapterMastery>>(
    () => summarizeChapters(candidates, today),
    [candidates, today]
  );

  const byKey = useMemo(() => {
    const out = new Map<string, { rule?: ReviewState; practice?: ReviewState }>();
    for (const c of candidates) {
      if (c.kind === "card") continue;
      const slot = out.get(c.id) ?? {};
      if (c.kind === "rule") slot.rule = c.state;
      else slot.practice = c.state;
      out.set(c.id, slot);
    }
    return out;
  }, [candidates]);

  return useMemo<MasteryApi>(() => {
    const topicStatus = (key: string): TopicStatus | null => {
      const ref = TOPIC_BY_KEY[key];
      const halves = byKey.get(key);
      if (!ref || !halves?.rule || !halves.practice) return null;
      const { rule, practice } = halves;
      return {
        key,
        label: ref.label,
        ch: ref.ch,
        rule,
        practice,
        status: worseOf(halfStatus(rule), halfStatus(practice)),
        dueOn: earlier(
          rule.retired ? null : rule.dueOn,
          practice.retired ? null : practice.dueOn
        ),
      };
    };

    const topicsForChapter = (ch: number): TopicStatus[] =>
      TOPIC_INDEX.filter((t) => t.ch === ch)
        .map((t) => topicStatus(t.key))
        .filter((t): t is TopicStatus => t !== null);

    return {
      ready,
      today,
      candidates,
      overall,
      byChapter,
      chapterNumbers: MASTERY_CHAPTERS,
      topicStatus,
      topicsForChapter,
    };
  }, [ready, today, candidates, overall, byChapter, byKey]);
}

/* ---------------------------------------------------------------- streak */

export type StreakApi = {
  current: number;
  longest: number;
  dates: string[];
  /** True once the effect has run, so the server render and the first client render agree. */
  hydrated: boolean;
  studiedToday: boolean;
};

/**
 * The visible streak, kept honest without a write hook.
 *
 * The obvious place to record a study day is inside useReview.record, but that
 * file is the scheduler's storage layer and is deliberately left alone. So the
 * streak is harvested from the state record() already writes: every item it
 * touches gets a `lastSeen` date, so any date appearing as a lastSeen is a date
 * something was answered. Reading them on every state change means the streak
 * is recorded as a side effect of answering, cannot be forgotten by a caller,
 * and backfills correctly for anyone whose history predates this file.
 *
 * The stored list is still the source of truth for older days, because lastSeen
 * only keeps the most recent date per item and would otherwise lose history.
 */
export function useStreak(): StreakApi {
  const { ready, states } = useReview();
  const [today] = useState(() => toISO(new Date()));
  const [tick, setTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    for (const s of Object.values(states)) {
      if (s.lastSeen) markStudied(s.lastSeen);
    }
    setHydrated(true);
    setTick((n) => n + 1);
  }, [ready, states]);

  return useMemo(() => {
    // `tick` is what re-reads localStorage after the effect above writes to it.
    void tick;
    const dates = hydrated ? studiedDates() : [];
    return {
      current: hydrated ? currentStreak(today) : 0,
      longest: hydrated ? longestStreak() : 0,
      dates,
      hydrated,
      studiedToday: dates.includes(today),
    };
  }, [tick, hydrated, today]);
}
