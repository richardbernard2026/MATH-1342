"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { lessons } from "@/lib/data/lessons";

/**
 * The study profile: who you are and how far you've got.
 *
 * Design notes:
 *  - A uuid is generated once in the browser and kept in localStorage. It is
 *    the only thing that links a returning visitor to their row.
 *  - Progress is written to the server AND cached locally, so the dashboard
 *    renders instantly on load and still works if the network is slow or the
 *    database is unreachable.
 *  - Nothing blocks on the network. Every record call is fire-and-forget.
 */

export type SectionProgress = {
  section_id: string;
  viewed: boolean;
  guided_completed: boolean;
  guided_first_try: number | null;
  guided_steps: number | null;
  explained: boolean;
};

export type PracticeStat = { chapter: number; attempted: number; correct: number };

export type ExamResult = {
  scope: string;
  score: number;
  total: number;
  seconds: number | null;
  breakdown: Record<string, { correct: number; total: number }> | null;
  created_at: string;
};

type ProfileState = {
  ready: boolean;
  firstName: string | null;
  sections: SectionProgress[];
  practice: PracticeStat[];
  exams: ExamResult[];
  setName: (name: string) => Promise<void>;
  recordSection: (
    sectionId: string,
    data: { viewed?: boolean; guidedCompleted?: boolean; explained?: boolean; guidedFirstTry?: number; guidedSteps?: number }
  ) => void;
  recordPractice: (chapter: number, correct: boolean) => void;
  recordExam: (
    scope: string,
    score: number,
    total: number,
    seconds: number,
    breakdown: Record<number, { correct: number; total: number }>
  ) => void;
  reset: () => void;
};

const UUID_KEY = "statlab_uuid";
const CACHE_KEY = "statlab_profile_v1";

function getUuid(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(UUID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    window.localStorage.setItem(UUID_KEY, id);
  }
  return id;
}

const Ctx = createContext<ProfileState | null>(null);

/* --------------------------------------------------------------- merging */

/**
 * Combine what the server knows with what this browser knows.
 *
 * Replacing local state with the server snapshot would throw away anything
 * recorded before the profile row existed, or while the network was down. So
 * the two are merged, and for every boolean the answer is "did it happen in
 * either place".
 */
function mergeSections(local: SectionProgress[], remote: SectionProgress[]): SectionProgress[] {
  const by = new Map<string, SectionProgress>();
  for (const s of remote) by.set(s.section_id, { ...s });
  for (const s of local) {
    const r = by.get(s.section_id);
    if (!r) {
      by.set(s.section_id, { ...s });
      continue;
    }
    by.set(s.section_id, {
      section_id: s.section_id,
      viewed: r.viewed || s.viewed,
      guided_completed: r.guided_completed || s.guided_completed,
      explained: r.explained || s.explained,
      // Match the server's GREATEST policy so the number never appears to drop.
      guided_first_try: maxOrNull(r.guided_first_try, s.guided_first_try),
      guided_steps: r.guided_steps ?? s.guided_steps,
    });
  }
  return [...by.values()];
}

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function mergePractice(local: PracticeStat[], remote: PracticeStat[]): PracticeStat[] {
  const by = new Map<number, PracticeStat>();
  for (const p of remote) by.set(p.chapter, { ...p });
  for (const p of local) {
    const r = by.get(p.chapter);
    // Counters only ever go up, so the larger tally is the more complete one.
    if (!r || p.attempted > r.attempted) by.set(p.chapter, { ...p });
  }
  return [...by.values()];
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionProgress[]>([]);
  const [practice, setPractice] = useState<PracticeStat[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);

  /**
   * Writes made before the profile exists.
   *
   * The server drops progress for an unknown uuid, which is correct — there is
   * no row to attach it to. But someone can land straight on a lesson URL and
   * start working before they have typed a name, so those events are held here
   * and replayed the moment the profile is created.
   */
  const pending = useRef<Record<string, unknown>[]>([]);
  const hasProfile = useRef(false);

  // Load the local cache immediately so the UI never flashes empty.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.firstName) setFirstName(c.firstName);
        if (Array.isArray(c.sections)) setSections(c.sections);
        if (Array.isArray(c.practice)) setPractice(c.practice);
        if (Array.isArray(c.exams)) setExams(c.exams);
      }
    } catch {
      /* ignore malformed cache */
    }

    // Then reconcile with the server.
    const uuid = getUuid();
    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d.profile) {
          hasProfile.current = true;
          setFirstName(d.profile.firstName);
          // Merge, never replace: local may hold writes the server has not seen.
          setSections((local) => mergeSections(local, d.sections ?? []));
          setPractice((local) => mergePractice(local, d.practice ?? []));
          // Exam rows are append-only and the server holds the full history.
          if (Array.isArray(d.exams) && d.exams.length) setExams(d.exams);
          flush();
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
    // `flush` is defined below and is stable; this effect runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Replay anything recorded before the profile existed. */
  const flush = useCallback(() => {
    if (!hasProfile.current || pending.current.length === 0) return;
    const queued = pending.current;
    pending.current = [];
    const uuid = getUuid();
    for (const body of queued) {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid, ...body }),
      }).catch(() => {});
    }
  }, []);

  // Persist the cache whenever anything changes.
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ firstName, sections, practice, exams })
      );
    } catch {
      /* quota errors are not worth crashing over */
    }
  }, [ready, firstName, sections, practice, exams]);

  const post = useCallback((body: Record<string, unknown>) => {
    // Until the profile row exists the server has nothing to attach this to,
    // so hold it rather than firing a write that would be silently discarded.
    if (!hasProfile.current) {
      if (pending.current.length < 200) pending.current.push(body);
      return;
    }
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid: getUuid(), ...body }),
    }).catch(() => {});
  }, []);

  const setName = useCallback(
    async (name: string) => {
      const uuid = getUuid();
      setFirstName(name);
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid, firstName: name }),
        });
        const d = await res.json().catch(() => null);
        if (d?.ok && d.profile) {
          hasProfile.current = true;
          flush();
        }
      } catch {
        /* keep the local name even if the sync fails */
      }
    },
    [flush]
  );

  const recordSection: ProfileState["recordSection"] = useCallback(
    (sectionId, data) => {
      setSections((prev) => {
        const existing = prev.find((s) => s.section_id === sectionId);
        const merged: SectionProgress = {
          section_id: sectionId,
          viewed: (existing?.viewed || data.viewed) ?? false,
          guided_completed: (existing?.guided_completed || data.guidedCompleted) ?? false,
          explained: (existing?.explained || data.explained) ?? false,
          // GREATEST, matching the server, so a worse second attempt at the
          // same example never appears to erase the better first one.
          guided_first_try: maxOrNull(existing?.guided_first_try ?? null, data.guidedFirstTry ?? null),
          guided_steps: data.guidedSteps ?? existing?.guided_steps ?? null,
        };
        return [...prev.filter((s) => s.section_id !== sectionId), merged];
      });
      post({ kind: "section", sectionId, ...data });
    },
    [post]
  );

  const recordPractice: ProfileState["recordPractice"] = useCallback(
    (chapter, correct) => {
      setPractice((prev) => {
        const existing = prev.find((p) => p.chapter === chapter);
        const merged: PracticeStat = {
          chapter,
          attempted: (existing?.attempted ?? 0) + 1,
          correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
        };
        return [...prev.filter((p) => p.chapter !== chapter), merged];
      });
      post({ kind: "practice", chapter, correct });
    },
    [post]
  );

  const recordExam: ProfileState["recordExam"] = useCallback(
    (scope, score, total, seconds, breakdown) => {
      setExams((prev) =>
        [
          {
            scope,
            score,
            total,
            seconds,
            breakdown: breakdown as any,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 25)
      );
      post({ kind: "exam", scope, score, total, seconds, breakdown });
    },
    [post]
  );

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CACHE_KEY);
    window.localStorage.removeItem(UUID_KEY);
    window.localStorage.removeItem("statlab_srs_v1");
    hasProfile.current = false;
    pending.current = [];
    setFirstName(null);
    setSections([]);
    setPractice([]);
    setExams([]);
  }, []);

  const value = useMemo(
    () => ({ ready, firstName, sections, practice, exams, setName, recordSection, recordPractice, recordExam, reset }),
    [ready, firstName, sections, practice, exams, setName, recordSection, recordPractice, recordExam, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Rendered outside the provider (should not happen), degrade quietly.
    return {
      ready: true,
      firstName: null,
      sections: [],
      practice: [],
      exams: [],
      setName: async () => {},
      recordSection: () => {},
      recordPractice: () => {},
      recordExam: () => {},
      reset: () => {},
    };
  }
  return ctx;
}

/* ------------------------------------------------------------- derivations */

/** Overall completion: a section counts once it has been viewed. */
export function useStudyStats() {
  const { sections, practice, exams } = useProfile();

  return useMemo(() => {
    const total = lessons.length;
    const viewed = sections.filter((s) => s.viewed).length;
    const guided = sections.filter((s) => s.guided_completed).length;
    const explained = sections.filter((s) => s.explained).length;

    const practiceAttempted = practice.reduce((a, p) => a + p.attempted, 0);
    const practiceCorrect = practice.reduce((a, p) => a + p.correct, 0);
    const practiceAccuracy =
      practiceAttempted === 0 ? null : Math.round((practiceCorrect / practiceAttempted) * 100);

    // Weakest chapter blends exam breakdown with practice accuracy. A chapter
    // needs at least 3 data points before it can be called weak, so one unlucky
    // question does not dominate the recommendation.
    const perChapter: Record<number, { correct: number; total: number }> = {};
    for (const p of practice) {
      perChapter[p.chapter] = perChapter[p.chapter] || { correct: 0, total: 0 };
      perChapter[p.chapter].correct += p.correct;
      perChapter[p.chapter].total += p.attempted;
    }
    for (const e of exams) {
      if (!e.breakdown) continue;
      for (const [ch, v] of Object.entries(e.breakdown)) {
        const n = Number(ch);
        if (!v || !v.total) continue;
        perChapter[n] = perChapter[n] || { correct: 0, total: 0 };
        perChapter[n].correct += v.correct;
        perChapter[n].total += v.total;
      }
    }

    const ranked = Object.entries(perChapter)
      .map(([ch, v]) => ({ chapter: Number(ch), ...v, pct: v.total ? v.correct / v.total : 1 }))
      .filter((r) => r.total >= 3)
      .sort((a, b) => a.pct - b.pct);

    const weakest = ranked[0] ?? null;

    // Ignore any row with a zero total. NaN comparisons are always false, so
    // one bad row would otherwise make this reduce silently return the first
    // exam instead of the best.
    const scored = exams.filter((e) => e.total > 0);
    const bestExam = scored.length
      ? scored.reduce((a, b) => (b.score / b.total > a.score / a.total ? b : a))
      : null;

    return {
      total,
      viewed,
      guided,
      explained,
      completion: Math.round((viewed / total) * 100),
      practiceAttempted,
      practiceAccuracy,
      perChapter,
      weakest,
      exams,
      bestExam,
    };
  }, [sections, practice, exams]);
}

/** The single most useful thing to do next. */
export function useNextUp() {
  const { sections } = useProfile();
  const stats = useStudyStats();

  return useMemo(() => {
    const done = new Set(sections.filter((s) => s.viewed).map((s) => s.section_id));

    // 1. If a chapter is clearly weak, send them to its first unfinished section.
    if (stats.weakest && stats.weakest.pct < 0.7) {
      const target = lessons.find((l) => l.ch === stats.weakest!.chapter && !done.has(l.id))
        ?? lessons.find((l) => l.ch === stats.weakest!.chapter);
      if (target) {
        return {
          lesson: target,
          reason: `You are at ${Math.round(stats.weakest.pct * 100)}% in Chapter ${stats.weakest.chapter}, your weakest area right now.`,
        };
      }
    }

    // 2. Otherwise continue in order.
    const nextNew = lessons.find((l) => !done.has(l.id));
    if (nextNew) {
      return {
        lesson: nextNew,
        reason: done.size === 0 ? "Start here. It is the first section of the course." : "Next section in order.",
      };
    }

    // 3. Everything seen: revisit the weakest.
    if (stats.weakest) {
      const target = lessons.find((l) => l.ch === stats.weakest!.chapter);
      if (target) {
        return { lesson: target, reason: "You have seen every section. This chapter is worth another pass." };
      }
    }

    return { lesson: lessons[0], reason: "Review from the top." };
  }, [sections, stats]);
}
