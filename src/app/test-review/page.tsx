"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, XCircle, Timer, ArrowsClockwise, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, PrimaryButton, barFill } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { testBank, type Question } from "@/lib/data/testBank";
import { examScopes } from "@/lib/data/chapters";
import { shuffle } from "@/lib/math";

type Phase = "intro" | "running" | "results";
type Answered = { question: Question; correct: boolean };

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TestReviewPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [scope, setScope] = useState(examScopes[1]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [numInput, setNumInput] = useState("");
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const numRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "running") timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && questions[index]?.type === "num" && !locked) numRef.current?.focus();
  }, [phase, index, questions, locked]);

  function start(s = scope) {
    setScope(s);
    setQuestions(shuffle(testBank.filter((q) => s.chapters.includes(q.ch))));
    setIndex(0);
    setAnswers([]);
    setPicked(null);
    setNumInput("");
    setLocked(false);
    setSeconds(0);
    setPhase("running");
  }

  function submitChoice(k: number) {
    if (locked) return;
    const q = questions[index];
    if (q.type !== "mc") return;
    setPicked(k);
    setLocked(true);
    setAnswers((a) => [...a, { question: q, correct: k === q.answer }]);
  }

  function submitNumeric() {
    if (locked) return;
    const q = questions[index];
    if (q.type !== "num" || numInput.trim() === "") return;
    const v = parseFloat(numInput);
    setLocked(true);
    setAnswers((a) => [
      ...a,
      { question: q, correct: !Number.isNaN(v) && Math.abs(v - q.answer) <= q.tol },
    ]);
  }

  function goNext() {
    if (index + 1 >= questions.length) {
      setFinalTime(seconds);
      setPhase("results");
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setNumInput("");
    setLocked(false);
  }

  const score = answers.filter((a) => a.correct).length;

  const breakdown = useMemo(() => {
    const r: Record<number, { correct: number; total: number }> = {};
    scope.chapters.forEach((c) => (r[c] = { correct: 0, total: 0 }));
    answers.forEach((a) => {
      if (!r[a.question.ch]) r[a.question.ch] = { correct: 0, total: 0 };
      r[a.question.ch].total += 1;
      if (a.correct) r[a.question.ch].correct += 1;
    });
    return r;
  }, [answers, scope]);

  /* --------------------------------------------------------------- intro */
  if (phase === "intro") {
    const count = testBank.filter((q) => scope.chapters.includes(q.ch)).length;
    return (
      <div className="mx-auto max-w-2xl fadein">
        <PageHeader
          title="Test Review"
          sub="Timed mock exams built from the same mix of concept and computation questions as the real tests."
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {examScopes.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                scope.key === s.key
                  ? "border-white bg-white text-bg"
                  : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Card className="p-8 text-center">
          <Timer size={40} weight="duotone" className="mx-auto mb-4 text-[#9aa1b2]" />
          <h2 className="text-lg font-bold">
            {count} questions &middot; {scope.label}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#9aa1b2]">
            Shuffled every time. The stopwatch tracks your pace but never auto-submits, and you get
            an explanation after each question plus a chapter-by-chapter breakdown at the end.
          </p>
          <PrimaryButton onClick={() => start(scope)} className="mt-6 px-8">
            Start
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------- running */
  if (phase === "running") {
    const q = questions[index];
    if (!q) return null;
    const last = answers[answers.length - 1];

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between text-sm text-[#9aa1b2]">
          <span className="font-semibold text-[#e8eaf0]">
            Question {index + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-4">
            <span>
              Score: <span className="font-bold text-[#e8eaf0]">{score}</span>
            </span>
            <span className="flex items-center gap-1">
              <Timer size={16} />
              {formatTime(seconds)}
            </span>
          </div>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-white/70 transition-all duration-300"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>

        <Card className="fadein p-6" key={index}>
          <div className="mb-3">
            <Badge ch={q.ch}>Chapter {q.ch}</Badge>
          </div>
          <div className="text-lg leading-relaxed">
            <MathText>{q.prompt}</MathText>
          </div>

          {q.type === "mc" ? (
            <div className="mt-5 flex flex-col gap-2.5">
              {q.options.map((option, k) => {
                let cls = "border-border bg-panel2 hover:border-white/40";
                if (locked) {
                  if (k === q.answer) cls = "border-good/60 bg-good/10 text-good";
                  else if (k === picked) cls = "border-bad/60 bg-bad/10 text-bad";
                  else cls = "border-border bg-panel2 opacity-50";
                }
                return (
                  <button
                    key={k}
                    onClick={() => submitChoice(k)}
                    disabled={locked}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${cls}`}
                  >
                    <MathText>{option}</MathText>
                    {locked && k === q.answer && <CheckCircle size={18} weight="fill" />}
                    {locked && k === picked && k !== q.answer && <XCircle size={18} weight="fill" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={numRef}
                type="text"
                inputMode="decimal"
                value={numInput}
                onChange={(e) => setNumInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (locked) goNext();
                  else submitNumeric();
                }}
                disabled={locked}
                placeholder="Your answer"
                className="w-full flex-1 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-white/50 disabled:opacity-60 sm:w-auto"
              />
              {!locked && (
                <PrimaryButton onClick={submitNumeric} disabled={numInput.trim() === ""}>
                  Submit
                </PrimaryButton>
              )}
            </div>
          )}

          {locked && (
            <div
              className={`fadein mt-4 flex items-start gap-2 rounded-xl border p-4 ${
                last?.correct ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
              }`}
            >
              {last?.correct ? (
                <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-good" />
              ) : (
                <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-bad" />
              )}
              <div className="text-sm">
                <div className={`font-bold ${last?.correct ? "text-good" : "text-bad"}`}>
                  {last?.correct ? "Correct" : "Not quite."}
                </div>
                {q.type === "num" && !last?.correct && (
                  <div className="mt-1 text-[#9aa1b2]">
                    Correct answer: <span className="font-mono text-warn">{q.answer}</span>
                  </div>
                )}
                <div className="mt-1 text-[#9aa1b2]">
                  <MathText>{q.explain}</MathText>
                </div>
              </div>
            </div>
          )}

          {locked && (
            <div className="mt-5 flex justify-end">
              <PrimaryButton onClick={goNext} className="flex items-center gap-2">
                {index + 1 >= questions.length ? "See results" : "Next"}
                <ArrowRight size={16} weight="bold" />
              </PrimaryButton>
            </div>
          )}
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------- results */
  const accuracy = questions.length === 0 ? 0 : Math.round((score / questions.length) * 100);
  const weakest = scope.chapters
    .map((c) => ({ c, ...(breakdown[c] || { correct: 0, total: 0 }) }))
    .filter((b) => b.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];

  return (
    <div className="mx-auto max-w-2xl fadein">
      <PageHeader title="Results" sub={`${scope.label} complete.`} />

      <Card className="p-8 text-center">
        <div className="text-5xl font-bold">
          {score}
          <span className="text-2xl text-[#9aa1b2]">/{questions.length}</span>
        </div>
        <div className="mt-2 text-sm text-[#9aa1b2]">
          {accuracy}% accuracy, finished in {formatTime(finalTime)}
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
          Chapter breakdown
        </h3>
        <div className="flex flex-col gap-4">
          {scope.chapters.map((c) => {
            const b = breakdown[c] || { correct: 0, total: 0 };
            const pct = b.total === 0 ? 0 : Math.round((b.correct / b.total) * 100);
            return (
              <div key={c}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <Badge ch={c}>Chapter {c}</Badge>
                  <span className="font-mono text-[#9aa1b2]">
                    {b.correct}/{b.total}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barFill[c]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {weakest && weakest.correct / weakest.total < 0.8 && (
          <p className="mt-5 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-[#e8eaf0]/90">
            Chapter {weakest.c} was your weakest at {weakest.correct}/{weakest.total}. That is where
            another pass through the guided problems will pay off most.
          </p>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <PrimaryButton onClick={() => start(scope)} className="flex items-center gap-2 px-8">
          <ArrowsClockwise size={18} weight="bold" /> Retake
        </PrimaryButton>
        <PrimaryButton onClick={() => setPhase("intro")} className="bg-panel2 text-[#e8eaf0]">
          Change test
        </PrimaryButton>
      </div>
    </div>
  );
}
