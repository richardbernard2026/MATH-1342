"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { freshState, grade, toISO, type Grade, type ItemKind, type ReviewState } from "@/lib/scheduler";
import { DIAGNOSTIC_SEED } from "@/lib/data/diagnosticSeed";
import { getUuid } from "@/lib/useProfile";

/**
 * Where the spaced-repetition state lives.
 *
 * localStorage is the source of truth, not the database. Two reasons:
 *
 *  1. Latency. `record` is called the instant an answer is graded, in the
 *     middle of a session. Waiting on a round trip to decide what the next
 *     item is would put a network hop between every question.
 *  2. Loss. The database is optional in this app and may be unreachable, and
 *     the scheduler's whole value is the history it accumulates. A day of
 *     review that only ever existed in a failed POST is a day thrown away.
 *
 * So every write lands in localStorage synchronously, before React is even
 * told about it, and a reload picks up exactly what the last answer left. The
 * server sync is a backup that runs on a 2 second debounce; if it fails,
 * nothing local is touched and the keys stay marked dirty for the next
 * attempt. Nothing in here is allowed to throw at a caller.
 */

/** Keyed by `${kind}:${id}`, which is the same key the database uniques on. */
export type ReviewMap = Record<string, ReviewState>;

export type ReviewApi = {
  ready: boolean;
  states: ReviewMap;
  /** The state for an item, or a fresh one if it has never been seen. */
  get(kind: ItemKind, id: string): ReviewState;
  /** Apply a graded answer, save it locally now, sync it later. */
  record(kind: ItemKind, id: string, g: Grade, today?: string): void;
  /** Wipe local review history and re-seed from the diagnostic. */
  resetAll(): void;
};

const STORE_KEY = "statlab_review_v1";
const SEED_KEY = "statlab_review_seeded_v1";

/**
 * How long to wait before syncing.
 *
 * Long enough that a burst of answers becomes one request, short enough that
 * closing the tab mid-session rarely outruns it. Nothing depends on it landing
 * anyway: local storage already has the answer, and the next load pushes
 * everything up again.
 */
const SYNC_DELAY_MS = 2000;

/** The route rejects anything larger, so the client chunks rather than lose the tail. */
const MAX_PER_REQUEST = 200;

export function reviewKey(kind: ItemKind, id: string): string {
  return `${kind}:${id}`;
}

/** Today, as the scheduler counts days. UTC, matching scheduler.toISO. */
function todayISO(): string {
  return toISO(new Date());
}

/* -------------------------------------------------------------- storage */

const KINDS: ItemKind[] = ["rule", "practice", "card"];

/**
 * Rebuild one state from whatever was stored or returned.
 *
 * localStorage is user-writable and the payload has been through JSON, so
 * nothing here trusts a field. A row that cannot be made sense of is dropped
 * rather than repaired: half a history is worse than none, because the
 * scheduler would plan around it.
 */
function sanitize(raw: unknown): ReviewState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.kind !== "string" || !KINDS.includes(r.kind as ItemKind)) return null;
  if (typeof r.id !== "string" || !r.id) return null;

  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  const days = Array.isArray(r.correctDays)
    ? r.correctDays.filter((d): d is string => typeof d === "string")
    : [];

  return {
    kind: r.kind as ItemKind,
    id: r.id,
    streak: num(r.streak),
    correctDays: [...new Set(days)],
    attempts: num(r.attempts),
    corrects: num(r.corrects),
    sureWrong: r.sureWrong === true,
    dueOn: typeof r.dueOn === "string" ? r.dueOn : null,
    lastSeen: typeof r.lastSeen === "string" ? r.lastSeen : null,
    retired: r.retired === true,
  };
}

function readStore(): ReviewMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: ReviewMap = {};
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      const s = sanitize(value);
      // Key off the state itself rather than the stored key, so a hand-edited
      // or renamed key cannot put a row somewhere `get` will never look.
      if (s) out[reviewKey(s.kind, s.id)] = s;
    }
    return out;
  } catch {
    // Unreadable, disabled, or full. The session still runs, it just starts
    // from nothing rather than crashing on the first render.
    return {};
  }
}

function writeStore(map: ReviewMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* private mode or quota. Nothing useful to do, and never worth throwing. */
  }
}

/* --------------------------------------------------------------- merging */

/**
 * Combine what the server holds with what this browser holds.
 *
 * More attempts wins the whole row, the same rule practice_stats and the
 * review upsert use. Field-by-field merging could build a state that never
 * happened, and the scheduler would then plan around a history nobody has.
 * Ties go to local, so a reload does not churn rows that already agree.
 */
export function mergeReview(local: ReviewMap, remote: ReviewMap): ReviewMap {
  const out: ReviewMap = { ...local };
  for (const [k, r] of Object.entries(remote)) {
    const l = out[k];
    if (!l || r.attempts > l.attempts) out[k] = r;
  }
  return out;
}

/* --------------------------------------------------------------- seeding */

/**
 * Plant the diagnostic result as starting state, once ever.
 *
 * The diagnostic already established which items were missed and which were
 * missed confidently. Throwing that away and starting everyone at zero would
 * spend the first two days of a ten day run rediscovering it. So each seeded
 * item starts due today with its sureWrong flag already set, which is what
 * puts it near the front of the first session and raises its retirement bar.
 *
 * Guarded by a flag rather than by "is the store empty", so clearing a single
 * item, or a wipe followed by real work, cannot make the seed reappear.
 */
function seedInto(map: ReviewMap, today: string): ReviewMap {
  const next: ReviewMap = { ...map };
  for (const s of DIAGNOSTIC_SEED) {
    const k = reviewKey(s.kind, s.id);
    // Never overwrite real history with a seed.
    if (next[k]) continue;
    next[k] = { ...freshState(s.kind, s.id), sureWrong: s.sureWrong === true, dueOn: today };
  }
  return next;
}

function seedOnce(map: ReviewMap, today: string): ReviewMap {
  if (typeof window === "undefined") return map;
  try {
    if (window.localStorage.getItem(SEED_KEY)) return map;
  } catch {
    // Cannot read the flag, so cannot tell whether this has already happened.
    // Doing nothing is the safe half of that: no seed is recoverable, a seed
    // re-applied on every load is not.
    return map;
  }
  const next = seedInto(map, today);
  try {
    window.localStorage.setItem(SEED_KEY, today);
  } catch {
    /* the seed only skips existing keys, so a repeat is harmless */
  }
  writeStore(next);
  return next;
}

/* -------------------------------------------------------------- provider */

const Ctx = createContext<ReviewApi | null>(null);

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [states, setStates] = useState<ReviewMap>({});

  // The authoritative copy. React state is a mirror kept for rendering; every
  // read inside this file goes through the ref, so two answers graded in the
  // same tick cannot both build on the same stale render.
  const store = useRef<ReviewMap>({});
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);

  /** Save, then tell React. In that order, so a reload can never be ahead. */
  const commit = useCallback((next: ReviewMap) => {
    store.current = next;
    writeStore(next);
    setStates(next);
  }, []);

  /**
   * Push dirty rows to the server. Best effort, and silent about it.
   *
   * A failed batch goes straight back into the dirty set, so the next answer
   * carries it up. Nothing local is modified either way: the server can only
   * ever be behind, never authoritative.
   */
  const flush = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      if (!dirty.current.size) return;

      const uuid = getUuid();
      // No id yet means nothing to attach these to. Leave them dirty.
      if (!uuid) return;

      const keys = [...dirty.current];
      dirty.current.clear();

      const items = keys
        .map((k) => store.current[k])
        .filter((s): s is ReviewState => Boolean(s));

      for (let i = 0; i < items.length; i += MAX_PER_REQUEST) {
        const batch = items.slice(i, i + MAX_PER_REQUEST);
        try {
          const res = await fetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid, items: batch }),
          });
          if (!res.ok) throw new Error(`review sync failed: ${res.status}`);
        } catch {
          for (const s of batch) dirty.current.add(reviewKey(s.kind, s.id));
        }
      }
    } catch {
      /* never surface a sync problem to a session in progress */
    }
  }, []);

  const schedule = useCallback(() => {
    if (typeof window === "undefined") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, SYNC_DELAY_MS);
  }, [flush]);

  /**
   * Load local first, then reconcile with the server.
   *
   * `ready` flips as soon as the local copy is in hand, because that is all a
   * session needs. The fetch that follows only ever adds history this browser
   * has not got, and afterwards everything is marked dirty and pushed back so
   * a row the server is missing gets there even if the answer that created it
   * was graded a second before the last reload.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    // StrictMode runs effects twice in development. One bootstrap per provider.
    if (booted.current) return;
    booted.current = true;

    const today = todayISO();
    const local = seedOnce(readStore(), today);
    store.current = local;
    setStates(local);
    setReady(true);

    const pushEverything = () => {
      for (const k of Object.keys(store.current)) dirty.current.add(k);
      schedule();
    };

    const uuid = getUuid();
    if (!uuid) return;

    fetch(`/api/review?uuid=${encodeURIComponent(uuid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok || !Array.isArray(d.items)) return;
        const remote: ReviewMap = {};
        for (const raw of d.items) {
          const s = sanitize(raw);
          if (s) remote[reviewKey(s.kind, s.id)] = s;
        }
        commit(mergeReview(store.current, remote));
      })
      .catch(() => {
        /* offline or no database. The local copy is already live. */
      })
      .finally(pushEverything);
  }, [commit, schedule]);

  /**
   * Try to get ahead of a closing tab.
   *
   * Best effort only, and deliberately not depended on: localStorage already
   * holds the answer, and the next load pushes the whole store up again.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [flush]);

  const get = useCallback((kind: ItemKind, id: string): ReviewState => {
    return store.current[reviewKey(kind, id)] ?? freshState(kind, id);
  }, []);

  const record = useCallback(
    (kind: ItemKind, id: string, g: Grade, today?: string) => {
      const day = today ?? todayISO();
      const key = reviewKey(kind, id);
      const prev = store.current[key] ?? freshState(kind, id);
      commit({ ...store.current, [key]: grade(prev, g, day) });
      dirty.current.add(key);
      schedule();
    },
    [commit, schedule]
  );

  /**
   * Start over.
   *
   * Local only. Rows already on the server are left alone, and a later load
   * will merge them back in, because "more attempts wins" cannot tell a
   * deliberate reset from a browser that has fallen behind. Deleting server
   * history is an account-level action, not something a study screen should
   * do behind a single button.
   */
  const resetAll = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    dirty.current.clear();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORE_KEY);
        window.localStorage.removeItem(SEED_KEY);
      } catch {
        /* nothing to do if storage is unavailable */
      }
    }
    commit(seedOnce({}, todayISO()));
  }, [commit]);

  const value = useMemo<ReviewApi>(
    () => ({ ready, states, get, record, resetAll }),
    [ready, states, get, record, resetAll]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The review store.
 *
 * Degrades to an inert, non-throwing stub outside the provider, matching
 * useProfile. A missing provider should not take a page down.
 */
export function useReview(): ReviewApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      ready: true,
      states: {},
      get: (kind, id) => freshState(kind, id),
      record: () => {},
      resetAll: () => {},
    };
  }
  return ctx;
}
