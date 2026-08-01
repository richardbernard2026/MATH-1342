"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, GhostButton, chipActive } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { flashcards, type Flashcard } from "@/lib/data/flashcards";
import { shuffle } from "@/lib/math";

const STORAGE_KEY = "statlab_srs_v1";

/**
 * Leitner spaced repetition.
 *
 * Each card sits in a box from 1 to 5. Lower boxes are queued more often, so
 * cards you keep missing come back quickly and cards you know drop out of
 * rotation. Progress is saved in this browser only.
 */
function buildQueue(cards: Flashcard[], boxes: Record<string, number>): string[] {
  const pool: string[] = [];
  for (const c of cards) {
    const box = boxes[c.id] ?? 1;
    const weight = Math.max(1, 6 - box); // box 1 appears 5x, box 5 appears 1x
    for (let i = 0; i < weight; i++) pool.push(c.id);
  }
  return shuffle(pool);
}

export default function FlashcardsPage() {
  const [filter, setFilter] = useState<number | "all">("all");
  const [boxes, setBoxes] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setBoxes(JSON.parse(raw));
    } catch {
      // corrupt storage is not worth crashing over
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
  }, [boxes, loaded]);

  const cards = useMemo(
    () => (filter === "all" ? flashcards : flashcards.filter((c) => c.ch === filter)),
    [filter]
  );

  useEffect(() => {
    if (!loaded) return;
    setQueue(buildQueue(cards, boxes));
    setFlipped(false);
    // rebuilding on every box change would reshuffle mid-session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, loaded]);

  useEffect(() => {
    if (loaded && queue.length === 0 && cards.length > 0) {
      setQueue(buildQueue(cards, boxes));
      setFlipped(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, loaded]);

  const current = flashcards.find((c) => c.id === queue[0]) ?? null;

  function rate(rating: "again" | "good" | "easy") {
    if (!current) return;
    setBoxes((prev) => {
      const box = prev[current.id] ?? 1;
      const next =
        rating === "again" ? 1 : rating === "good" ? Math.min(5, box + 1) : Math.min(5, box + 2);
      return { ...prev, [current.id]: next };
    });
    setFlipped(false);
    setQueue((q) => q.slice(1));
  }

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0];
    cards.forEach((x) => c[(boxes[x.id] ?? 1) - 1]++);
    return c;
  }, [cards, boxes]);

  const mastered = counts[4];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Flashcards"
        sub="Cards you struggle with come back more often; ones you know fade out. Short daily sessions beat one long cram. Progress saves in this browser."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            filter === "all"
              ? "border-white bg-white/10 text-white"
              : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
          }`}
        >
          All
        </button>
        {[1, 2, 3, 4, 5, 6].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              filter === c ? chipActive[c] : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
            }`}
          >
            Ch {c}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-5 gap-2">
        {counts.map((n, i) => (
          <div
            key={i}
            className={`rounded-xl border px-2 py-2.5 text-center ${
              i === 4 && n > 0 ? "border-good/40 bg-good/5" : "border-border bg-panel2"
            }`}
          >
            <div className={`text-lg font-bold ${i === 4 && n > 0 ? "text-good" : ""}`}>{n}</div>
            <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-[#9aa1b2]">
              Box {i + 1}
            </div>
          </div>
        ))}
      </div>

      {!current ? (
        <Card className="p-10 text-center text-sm text-[#9aa1b2]">Loading your deck...</Card>
      ) : (
        <>
          <div onClick={() => setFlipped((f) => !f)} className="cursor-pointer">
            <Card className="flex min-h-[17rem] flex-col items-center justify-center gap-4 p-8 text-center">
              {!flipped ? (
                <>
                  <Badge ch={current.ch}>Chapter {current.ch}</Badge>
                  <p className="text-xl font-semibold leading-snug">
                    <MathText>{current.front}</MathText>
                  </p>
                  <p className="text-xs text-[#9aa1b2]">Tap to reveal</p>
                </>
              ) : (
                <>
                  <div className="text-xl text-warn">
                    <MathText>{current.back}</MathText>
                  </div>
                  <p className="max-w-sm text-sm text-[#9aa1b2]">
                    <MathText>{current.why}</MathText>
                  </p>
                </>
              )}
            </Card>
          </div>

          {flipped && (
            <div className="fadein mt-5 grid grid-cols-3 gap-3">
              <button
                onClick={() => rate("again")}
                className="rounded-xl border border-bad/40 bg-bad/10 py-3 text-sm font-bold text-bad transition-colors hover:bg-bad/20 active:scale-95"
              >
                Again
              </button>
              <button
                onClick={() => rate("good")}
                className="rounded-xl border border-warn/40 bg-warn/10 py-3 text-sm font-bold text-warn transition-colors hover:bg-warn/20 active:scale-95"
              >
                Good
              </button>
              <button
                onClick={() => rate("easy")}
                className="rounded-xl border border-good/40 bg-good/10 py-3 text-sm font-bold text-good transition-colors hover:bg-good/20 active:scale-95"
              >
                Easy
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 text-xs text-[#9aa1b2]">
            <span>
              {queue.length} left in this session
              {mastered > 0 && ` · ${mastered} mastered`}
            </span>
            <GhostButton
              onClick={() => {
                setQueue(buildQueue(cards, boxes));
                setFlipped(false);
              }}
            >
              <span className="flex items-center gap-1.5">
                <ArrowCounterClockwise size={14} weight="bold" /> Reshuffle
              </span>
            </GhostButton>
          </div>
        </>
      )}
    </div>
  );
}
