"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, ListNumbers, ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, PrimaryButton, GhostButton, chipActive } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { generateProblem, topicsByChapter, type PracticeProblem } from "@/lib/practiceGenerators";
import { useProfile } from "@/lib/useProfile";

function PracticeInner() {
  const { recordPractice } = useProfile();
  const params = useSearchParams();
  const initialCh = (() => {
    const raw = Number(params.get("ch"));
    return raw >= 1 && raw <= 6 ? raw : 4;
  })();

  const [chapter, setChapter] = useState(initialCh);
  const [topicKey, setTopicKey] = useState<string | undefined>(undefined);
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
    const p = generateProblem(ch, key);
    setProblem(p);
    setValue("");
    setPicked(null);
    setShowSteps(false);
    setFeedback(null);
    if (p.kind === "numeric") requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Keep the selected chapter in step with ?ch=. Navigating from /practice?ch=2
  // to /practice?ch=5 is a same-route transition, so this component does not
  // remount and the initial useState value would otherwise go stale — leaving
  // attempts recorded against the wrong chapter.
  const chParam = params.get("ch");
  useEffect(() => {
    const n = Number(chParam);
    if (n >= 1 && n <= 6) {
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
    recordPractice(chapter, ok);
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
        {[1, 2, 3, 4, 5, 6].map((c) => (
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
          <div className="mb-3">
            <Badge ch={chapter}>{problem.topicLabel}</Badge>
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

          <div className="mt-3">
            <GhostButton onClick={() => setShowSteps((s) => !s)}>
              <span className="flex items-center gap-1.5">
                <ListNumbers size={16} weight="bold" />
                {showSteps ? "Hide the worked solution" : "Show the worked solution"}
              </span>
            </GhostButton>
          </div>

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

          {(showSteps || feedback === "incorrect") && (
            <div className="fadein mt-4 rounded-xl border border-border bg-panel2 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
                Worked solution
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
