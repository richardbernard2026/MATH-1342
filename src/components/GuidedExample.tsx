"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Lightbulb, ArrowRight, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, PrimaryButton, GhostButton } from "@/components/kit";
import { MathText } from "@/components/MathText";
import type { GuidedExample as GE } from "@/lib/data/guidedExamples";
import { useProfile } from "@/lib/useProfile";

/**
 * Work a problem together, one step at a time.
 *
 * The student sees the scenario, then produces each step themselves. Every step
 * is checked immediately and explained before the next one unlocks, so a wrong
 * move gets corrected at the moment it happens rather than at the end when the
 * final answer is already wrong and it is unclear which step caused it.
 *
 * Steps already completed stay on screen, so by the end the full solution is
 * visible as a worked example the student built themselves.
 */

type StepState = {
  status: "correct" | "incorrect" | null;
  attempts: number;
  usedHint: boolean;
  given: string;
};

export function GuidedExample({ example }: { example: GE }) {
  const { recordSection } = useProfile();
  const [current, setCurrent] = useState(0);
  const [value, setValue] = useState("");
  const [states, setStates] = useState<StepState[]>(
    example.steps.map(() => ({ status: null, attempts: 0, usedHint: false, given: "" }))
  );
  const [done, setDone] = useState(false);

  const step = example.steps[current];
  const state = states[current];

  function update(i: number, patch: Partial<StepState>) {
    setStates((prev) => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  }

  /**
   * Increment the attempt count from the previous state rather than from the
   * rendered copy. Reading `state.attempts` in the closure means two grades
   * dispatched in the same batch compute the same number, so an answer that
   * took two tries could still be credited as first-try.
   */
  function bumpAttempts(i: number, patch: Partial<StepState>) {
    setStates((prev) =>
      prev.map((s, k) => (k === i ? { ...s, ...patch, attempts: s.attempts + 1 } : s))
    );
  }

  function grade(raw: string, choiceIndex?: number) {
    if (!step || state.status === "correct") return;

    let ok = false;
    if (step.kind === "choice") {
      ok = choiceIndex === step.answer;
    } else {
      const v = parseFloat(raw);
      const tol = step.tol ?? 0.01;
      ok = !Number.isNaN(v) && Math.abs(v - step.answer) <= tol;
    }

    bumpAttempts(current, {
      status: ok ? "correct" : "incorrect",
      given: step.kind === "choice" ? String(choiceIndex) : raw,
    });
  }

  function next() {
    if (current + 1 >= example.steps.length) {
      setDone(true);
      // Record the outcome once, at the moment the last step is cleared.
      recordSection(example.sectionId, {
        guidedCompleted: true,
        guidedFirstTry: states.filter(
          (s) => s.status === "correct" && s.attempts === 1 && !s.usedHint
        ).length,
        guidedSteps: example.steps.length,
      });
      return;
    }
    setCurrent((c) => c + 1);
    setValue("");
  }

  function restart() {
    setCurrent(0);
    setValue("");
    setStates(example.steps.map(() => ({ status: null, attempts: 0, usedHint: false, given: "" })));
    setDone(false);
  }

  const solved = states.filter((s) => s.status === "correct").length;
  const firstTry = states.filter((s) => s.status === "correct" && s.attempts === 1 && !s.usedHint).length;

  return (
    <div>
      {/* The problem itself, always visible */}
      <Card className="border-warn/30 bg-warn/5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-warn">The problem</div>
        <p className="text-[0.95rem] leading-relaxed">
          <MathText>{example.scenario}</MathText>
        </p>
      </Card>

      {/* Progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-good transition-all duration-300"
            style={{
              width: `${example.steps.length ? (solved / example.steps.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="shrink-0 text-xs text-[#9aa1b2]">
          Step {Math.min(current + 1, example.steps.length)} of {example.steps.length}
        </span>
      </div>

      {/* Completed steps stay visible, building into a full worked solution */}
      <div className="mt-4 flex flex-col gap-3">
        {example.steps.map((s, i) => {
          if (i > current) return null;
          const st = states[i];
          const isCurrent = i === current && !done;
          const isSolved = st.status === "correct";

          return (
            <Card
              key={i}
              className={
                isSolved
                  ? "border-good/30"
                  : isCurrent
                  ? "border-white/25"
                  : "border-border opacity-80"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isSolved ? "bg-good/20 text-good" : "bg-panel2 text-[#9aa1b2]"
                  }`}
                >
                  {isSolved ? <CheckCircle size={15} weight="fill" /> : i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-relaxed">
                    <MathText>{s.ask}</MathText>
                  </p>

                  {/* Input area, only for the step being worked */}
                  {isCurrent && !isSolved && (
                    <div className="mt-3">
                      {s.kind === "choice" ? (
                        <div className="flex flex-col gap-2">
                          {(s.choices || []).map((c, ci) => (
                            <button
                              key={ci}
                              onClick={() => grade("", ci)}
                              className="rounded-xl border border-border bg-panel2 px-4 py-2.5 text-left text-sm transition-colors hover:border-white/40"
                            >
                              <MathText>{c}</MathText>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            autoFocus
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") grade(value);
                            }}
                            placeholder="Your answer for this step"
                            className="w-full flex-1 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-white/50"
                          />
                          <PrimaryButton onClick={() => grade(value)} disabled={value.trim() === ""}>
                            Check step
                          </PrimaryButton>
                        </div>
                      )}

                      <div className="mt-2">
                        <button
                          onClick={() => update(i, { usedHint: true })}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#9aa1b2] transition-colors hover:text-warn"
                        >
                          <Lightbulb size={14} weight={st.usedHint ? "fill" : "regular"} />
                          {st.usedHint ? "Hint shown" : "I'm stuck, show a hint"}
                        </button>
                      </div>

                      {st.usedHint && (
                        <div className="fadein mt-2 rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-[#e8eaf0]/90">
                          <MathText>{s.hint}</MathText>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wrong answer: say so, keep them on this step */}
                  {isCurrent && st.status === "incorrect" && (
                    <div className="fadein mt-3 flex items-start gap-2 rounded-xl border border-bad/40 bg-bad/10 px-3 py-2.5 text-sm">
                      <XCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-bad" />
                      <div>
                        <div className="font-bold text-bad">Not quite, try again.</div>
                        <div className="mt-1 text-xs text-[#9aa1b2]">
                          {st.attempts >= 2
                            ? "Open the hint above, it points at exactly what this step needs."
                            : "Check what the step is asking for before recomputing."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Correct: explain why this step exists, then unlock the next */}
                  {isSolved && (
                    <div className="fadein mt-3 rounded-xl border border-good/30 bg-good/5 px-3 py-2.5">
                      <div className="text-xs font-bold uppercase tracking-wide text-good">
                        {st.attempts === 1 && !st.usedHint ? "Correct, first try" : "Correct"}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[#e8eaf0]/90">
                        <MathText>{s.why}</MathText>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Advance */}
              {isCurrent && isSolved && (
                <div className="mt-4 flex justify-end">
                  <PrimaryButton onClick={next} className="flex items-center gap-2">
                    {current + 1 >= example.steps.length ? "Finish" : "Next step"}
                    <ArrowRight size={16} weight="bold" />
                  </PrimaryButton>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Wrap-up */}
      {done && (
        <Card className="fadein mt-4 border-good/40 bg-good/5">
          <div className="text-xs font-bold uppercase tracking-wide text-good">Solved</div>
          <p className="mt-2 text-sm leading-relaxed">
            <MathText>{example.takeaway}</MathText>
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-[#9aa1b2]">
              {firstTry} of {example.steps.length} steps correct on the first try
            </span>
            <GhostButton onClick={restart}>
              <span className="flex items-center gap-1.5">
                <ArrowCounterClockwise size={14} weight="bold" /> Work it again
              </span>
            </GhostButton>
          </div>
        </Card>
      )}
    </div>
  );
}
