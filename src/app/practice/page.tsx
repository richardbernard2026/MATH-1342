"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, ListNumbers, ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, PrimaryButton, GhostButton, chipActive } from "@/components/kit";
import { MathText } from "@/components/MathText";
import {
  generateProblem,
  topicsByChapter,
  allTopicKeys,
  type PracticeProblem,
} from "@/lib/practiceGenerators";
import { chapters } from "@/lib/data/chapters";

/** Every chapter the course covers, in teaching order. 9 is not in this course. */
const CH = chapters.map((c) => c.num);

/**
 * Interleaved selection: pick a topic that does NOT match the one just seen.
 *
 * Rohrer, Dedrick, Hartwig & Cheung (2020) ran this as a randomized trial with
 * 787 students. Same problems, same total practice, only the ORDER changed.
 * Blocked practice scored 38% on a delayed test; interleaved scored 61%
 * (d = 0.83). Blocking removes the hardest part of a word problem, which is
 * working out which method it wants, because the heading already said so.
 *
 * Prefers a different chapter as well as a different topic, so consecutive
 * problems rarely rhyme.
 */
function nextInterleavedKey(prevKey?: string): string {
  const chOf = (k: string) =>
    Number(Object.keys(topicsByChapter).find((c) => topicsByChapter[Number(c)].some((t) => t.key === k)));
  const prevCh = prevKey ? chOf(prevKey) : NaN;
  const notSameTopic = allTopicKeys.filter((k) => k !== prevKey);
  const notSameChapter = notSameTopic.filter((k) => chOf(k) !== prevCh);
  const pool = notSameChapter.length ? notSameChapter : notSameTopic;
  return pool[Math.floor(Math.random() * pool.length)];
}
import { useProfile } from "@/lib/useProfile";

function PracticeInner() {
  const { recordPractice } = useProfile();
  const params = useSearchParams();
  const initialCh = (() => {
    const raw = Number(params.get("ch"));
    return CH.includes(raw) ? raw : 0;
  })();

  // chapter 0 means MIXED: interleaved across every chapter, which is the default.
  const [chapter, setChapter] = useState(initialCh);
  const [topicKey, setTopicKey] = useState<string | undefined>(undefined);
  const [example, setExample] = useState<PracticeProblem | null>(null);
  const lastKey = useRef<string | undefined>(undefined);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [attempted, setAttempted] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextProblem = useCallback((ch: number, key?: string) => {
    const chosen = ch === 0 && !key ? nextInterleavedKey(lastKey.current) : key;
    const p = generateProblem(ch === 0 ? 4 : ch, chosen);
    lastKey.current = p.topic;
    setProblem(p);
    setExample(null);
    setValue("");
    setPicked(null);
    setShowSteps(false);
    setFeedback(null);
    if (p.kind === "numeric") requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  /**
   * Show a worked example of a DIFFERENT problem of the same type.
   *
   * Previously this button revealed the solution to the problem on screen,
   * which handed over the answer and removed the retrieval attempt entirely.
   * The worked example effect works through example-problem PAIRS: study a
   * solved instance, then solve a different one yourself. So this generates a
   * fresh draw from the same generator and works that one instead.
   */
  const showExample = useCallback(() => {
    if (!problem) return;
    for (let i = 0; i < 40; i++) {
      const alt = generateProblem(problem.ch, problem.topic);
      if (alt.prompt !== problem.prompt) return setExample(alt);
    }
    setExample(generateProblem(problem.ch, problem.topic));
  }, [problem]);

  // Keep the selected chapter in step with ?ch=. Navigating from /practice?ch=2
  // to /practice?ch=5 is a same-route transition, so this component does not
  // remount and the initial useState value would otherwise go stale — leaving
  // attempts recorded against the wrong chapter.
  const chParam = params.get("ch");
  useEffect(() => {
    const n = Number(chParam);
    if (CH.includes(n)) {
      setChapter(n);
      setTopicKey(undefined);
    }
  }, [chParam]);

  useEffect(() => {
    nextProblem(chapter, topicKey);
  }, [chapter, topicKey, nextProblem]);

  function grade(ok: boolean) {
    setFeedback(ok ? "correct" : "incorrect");
    setAttempted((n) => n + 1);
    recordPractice(problem ? problem.ch : chapter, ok);
    if (ok) {
      setCorrect((n) => n + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function checkNumeric() {
    if (!problem || value.trim() === "" || feedback) return;
    const v = parseFloat(value);
    grade(!Number.isNaN(v) && Math.abs(v - problem.answer) <= problem.tol);
  }

  function checkChoice(i: number) {
    if (!problem || feedback) return;
    setPicked(i);
    grade(i === problem.answer);
  }

  const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Infinite Practice"
        sub="Every problem is generated fresh, and every answer is computed from the same random values used to write the prompt. You will not run out."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setChapter(0);
            setTopicKey(undefined);
          }}
          className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            chapter === 0
              ? "border-warn/60 bg-warn/15 text-warn"
              : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
          }`}
          title="Interleaved across every chapter. This is the condition that scored 61% instead of 38% in Rohrer's trial."
        >
          Mixed
        </button>
        {CH.map((c) => (
          <button
            key={c}
            onClick={() => {
              setChapter(c);
              setTopicKey(undefined);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              chapter === c
                ? chipActive[c]
                : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
            }`}
          >
            Ch {c}
          </button>
        ))}
      </div>

      {chapter === 0 ? (
        <div className="mb-6 rounded-xl border border-warn/30 bg-warn/5 p-3 text-xs leading-relaxed text-[#9aa1b2]">
          <span className="font-bold text-warn">Mixed practice.</span> No two problems in a row
          come from the same chapter, so you have to work out which method applies before you can
          start. It will feel harder and slower than drilling one topic. That is the point: in a
          randomized trial of 787 students this ordering scored 61% on a delayed test against 38%
          for one-topic-at-a-time practice.
        </div>
      ) : (
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setTopicKey(undefined)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            topicKey === undefined
              ? chipActive[chapter]
              : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
          }`}
        >
          All topics
        </button>
        {(topicsByChapter[chapter] || []).map((t) => (
          <button
            key={t.key}
            onClick={() => setTopicKey(t.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              topicKey === t.key
                ? chipActive[chapter]
                : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}

      <div className="mb-6 grid grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{attempted}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Tried</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-good">{correct}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Correct</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{accuracy}%</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Accuracy</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-warn">{streak}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Streak</div>
        </Card>
      </div>

      {problem && (
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge ch={problem.ch}>{problem.topicLabel}</Badge>
            {chapter === 0 && (
              <span className="text-xs font-semibold text-[#9aa1b2]">Chapter {problem.ch}</span>
            )}
          </div>

          <div className="text-lg leading-relaxed">
            <MathText>{problem.prompt}</MathText>
          </div>

          {problem.kind === "choice" ? (
            <div className="mt-5 flex flex-col gap-2.5">
              {(problem.choices || []).map((option, i) => {
                let cls = "border-border bg-panel2 hover:border-white/40";
                if (feedback) {
                  if (i === problem.answer) cls = "border-good/60 bg-good/10 text-good";
                  else if (i === picked) cls = "border-bad/60 bg-bad/10 text-bad";
                  else cls = "border-border bg-panel2 opacity-50";
                }
                return (
                  <button
                    key={i}
                    onClick={() => checkChoice(i)}
                    disabled={!!feedback}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${cls}`}
                  >
                    <MathText>{option}</MathText>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") checkNumeric();
                }}
                disabled={!!feedback}
                placeholder="Your answer"
                className="w-full flex-1 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-white/50 disabled:opacity-60 sm:w-auto"
              />
              <PrimaryButton onClick={checkNumeric} disabled={!!feedback || value.trim() === ""}>
                Check
              </PrimaryButton>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <GhostButton onClick={example ? () => setExample(null) : showExample}>
              <span className="flex items-center gap-1.5">
                <ListNumbers size={16} weight="bold" />
                {example ? "Hide the example" : "Show a worked example"}
              </span>
            </GhostButton>
            {feedback && (
              <GhostButton onClick={() => setShowSteps((v) => !v)}>
                <span className="flex items-center gap-1.5">
                  <ListNumbers size={16} weight="bold" />
                  {showSteps ? "Hide my solution" : "Show my solution"}
                </span>
              </GhostButton>
            )}
          </div>

          {example && (
            <div className="fadein mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                A different problem of the same type, worked in full
              </div>
              <div className="mb-3 text-sm leading-relaxed">
                <MathText>{example.prompt}</MathText>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {example.steps.map((st, i) => (
                  <li key={i}>
                    <MathText>{st}</MathText>
                  </li>
                ))}
              </ol>
              <div className="mt-3 border-t border-border pt-3 text-xs text-[#9aa1b2]">
                Different numbers, same method. Yours is still unanswered above.
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`fadein mt-4 flex items-start gap-2 rounded-xl border p-4 ${
                feedback === "correct" ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
              }`}
            >
              {feedback === "correct" ? (
                <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-good" />
              ) : (
                <XCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-bad" />
              )}
              <div className="text-sm">
                <div className={`font-bold ${feedback === "correct" ? "text-good" : "text-bad"}`}>
                  {feedback === "correct" ? "Correct" : "Not quite."}
                </div>
                {feedback === "incorrect" && (
                  <div className="mt-1 text-[#9aa1b2]">
                    Correct answer:{" "}
                    <span className="font-mono text-warn">
                      {problem.kind === "choice"
                        ? (problem.choices || [])[problem.answer]
                        : problem.answer}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {feedback && (showSteps || feedback === "incorrect") && (
            <div className="fadein mt-4 rounded-xl border border-border bg-panel2 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
                Your problem, worked
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {problem.steps.map((s, i) => (
                  <li key={i}>
                    <MathText>{s}</MathText>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      )}

      <div className="mt-6 flex justify-center">
        <PrimaryButton
          onClick={() => nextProblem(chapter, topicKey)}
          className="flex items-center gap-2 px-8"
        >
          <ArrowsClockwise size={18} weight="bold" /> New problem
        </PrimaryButton>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-sm text-[#9aa1b2]">Loading practice...</div>}
    >
      <PracticeInner />
    </Suspense>
  );
}
