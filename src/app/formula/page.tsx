"use client";

/**
 * "Which method?" discrimination drill.
 *
 * This page used to be a decision-tree navigator: pick a chapter, then answer
 * abstract yes/no questions with no problem on the screen. That taught nothing.
 * There was no retrieval (you were reading a menu, not recalling anything), the
 * questions gave away their own answers ("does it go beyond the data collected?"
 * IS the definition of inferential), and it was blocked by chapter, so you never
 * had to work out which chapter you were even in.
 *
 * What replaces it: a real generated problem appears, and you pick which method
 * it calls for. No arithmetic. Interleaved across every chapter by default, so
 * the chapter itself is part of what you have to work out.
 *
 * This is the tab that matters most here. The diagnostic put rule selection at
 * 40% at a median of 10.3 seconds per item, which is a reading failure as much
 * as a knowledge one, so options stay hidden for the first few seconds.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, ArrowsClockwise, Eye } from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, PrimaryButton, GhostButton } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { generateProblem, topicsByChapter, allTopicKeys } from "@/lib/practiceGenerators";
import { ruleFor, optionsFor } from "@/lib/data/ruleChoices";
import { useProfile } from "@/lib/useProfile";

/** Seconds the scenario is shown before the options unlock. */
const READ_SECONDS = 5;

function chapterOf(key: string): number {
  const found = Object.keys(topicsByChapter).find((c) =>
    topicsByChapter[Number(c)].some((t) => t.key === key)
  );
  return Number(found);
}

/** No two consecutive items from the same chapter, per Rohrer et al. (2020). */
function nextKey(prev?: string): string {
  const prevCh = prev ? chapterOf(prev) : NaN;
  const pool = allTopicKeys.filter((k) => ruleFor(k) && k !== prev && chapterOf(k) !== prevCh);
  const fallback = allTopicKeys.filter((k) => ruleFor(k) && k !== prev);
  const use = pool.length ? pool : fallback;
  return use[Math.floor(Math.random() * use.length)];
}

type Item = {
  key: string;
  ch: number;
  prompt: string;
  options: string[];
  answer: number;
  why: string;
};

function build(prev?: string): Item | null {
  for (let i = 0; i < 30; i++) {
    const key = nextKey(prev);
    const rc = ruleFor(key);
    const opts = optionsFor(key, 3);
    if (!rc || !opts) continue;
    const p = generateProblem(chapterOf(key), key);
    return { key, ch: rc.ch, prompt: p.prompt, options: opts.options, answer: opts.answer, why: rc.why };
  }
  return null;
}

function Drill() {
  const { recordPractice } = useProfile();
  const [item, setItem] = useState<Item | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(true);
  const [left, setLeft] = useState(READ_SECONDS);
  const [tried, setTried] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const prev = useRef<string | undefined>(undefined);

  const next = useCallback(() => {
    const it = build(prev.current);
    if (!it) return;
    prev.current = it.key;
    setItem(it);
    setPicked(null);
    setLocked(true);
    setLeft(READ_SECONDS);
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  // Hold the options back so the scenario has to be read before it can be answered.
  useEffect(() => {
    if (!locked) return;
    if (left <= 0) {
      setLocked(false);
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [locked, left]);

  function pick(i: number) {
    if (!item || picked !== null) return;
    setPicked(i);
    const ok = i === item.answer;
    setTried((n) => n + 1);
    recordPractice(item.ch, ok);
    if (ok) {
      setRight((n) => n + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  const acc = tried === 0 ? 0 : Math.round((right / tried) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Which method?"
        sub="A real problem, mixed across every chapter. Decide which method it calls for. Do not compute anything, and do not skim: picking the wrong rule costs the whole problem, while an arithmetic slip costs one line."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{tried}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Tried</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{acc}%</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Accuracy</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-warn">{streak}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Streak</div>
        </Card>
      </div>

      {item && (
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge ch={item.ch}>Scenario</Badge>
            {picked !== null && (
              <span className="text-xs font-semibold text-[#9aa1b2]">Chapter {item.ch}</span>
            )}
          </div>

          <div className="text-lg leading-relaxed">
            <MathText>{item.prompt}</MathText>
          </div>

          {locked ? (
            <div className="mt-6 rounded-xl border border-border bg-panel2 p-5 text-center">
              <div className="text-sm text-[#9aa1b2]">
                Read it first. The options appear in{" "}
                <span className="font-mono font-bold text-warn">{left}</span>.
              </div>
              <div className="mt-3">
                <GhostButton onClick={() => setLocked(false)}>
                  <span className="flex items-center gap-1.5">
                    <Eye size={16} weight="bold" /> I have read it
                  </span>
                </GhostButton>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2.5">
              {item.options.map((option, i) => {
                let cls = "border-border bg-panel2 hover:border-white/40";
                if (picked !== null) {
                  if (i === item.answer) cls = "border-good/60 bg-good/10 text-good";
                  else if (i === picked) cls = "border-bad/60 bg-bad/10 text-bad";
                  else cls = "border-border bg-panel2 opacity-50";
                }
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium leading-relaxed transition-colors disabled:cursor-default ${cls}`}
                  >
                    <MathText>{option}</MathText>
                  </button>
                );
              })}
            </div>
          )}

          {picked !== null && (
            <div
              className={`fadein mt-4 flex items-start gap-2 rounded-xl border p-4 ${
                picked === item.answer ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
              }`}
            >
              {picked === item.answer ? (
                <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-good" />
              ) : (
                <XCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-bad" />
              )}
              <div className="text-sm">
                <div
                  className={`font-bold ${picked === item.answer ? "text-good" : "text-bad"}`}
                >
                  {picked === item.answer ? "Right method" : "Not that one."}
                </div>
                <div className="mt-1.5 leading-relaxed text-[#9aa1b2]">{item.why}</div>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="mt-6 flex justify-center">
        <PrimaryButton onClick={next} className="flex items-center gap-2 px-8">
          <ArrowsClockwise size={18} weight="bold" /> Next scenario
        </PrimaryButton>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-[#9aa1b2]">
        Looking for the formula sheet rather than a drill? Every formula lives on its section page
        under Chapters.
      </p>
    </div>
  );
}

export default function FormulaPage() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-sm text-[#9aa1b2]">Loading drill...</div>}
    >
      <Drill />
    </Suspense>
  );
}
