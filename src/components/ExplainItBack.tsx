"use client";

import { useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { PencilSimpleLine, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { useProfile } from "@/lib/useProfile";

/**
 * Explain it back.
 *
 * The student writes the concept in their own words and gets it assessed
 * against the actual section text. Producing an explanation from memory forces
 * far deeper processing than re-reading does, and the gaps it exposes are
 * usually the exact things that fall apart under exam pressure.
 *
 * The grading call is scoped to this section, so feedback is measured against
 * the course material rather than a general idea of the topic.
 */

export function ExplainItBack({ sectionId, title }: { sectionId: string; title: string }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { recordSection } = useProfile();

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setSubmitted(true);
    setFeedback("");
    recordSection(sectionId, { explained: true });

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          mode: "explain",
          messages: [
            {
              role: "user",
              content: `I am explaining section ${sectionId} (${title}) in my own words. Assess my explanation:\n\n${text.trim()}`,
            },
          ],
        }),
      });

      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setFeedback(acc);
      }
      if (!acc) setFeedback("No response came back. Please try again.");
    } catch {
      setFeedback("Something went wrong reaching the tutor. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setText("");
    setFeedback("");
    setSubmitted(false);
  }

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
        <PencilSimpleLine size={14} weight="bold" />
        Explain it back
      </div>
      <h3 className="mb-1 text-base font-bold">Teach {title} to someone else</h3>
      <p className="mb-4 text-sm text-[#9aa1b2]">
        Write it in plain English, no formulas required. If you can explain why it works, you know
        it. If you can only state the formula, you do not yet.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        rows={5}
        placeholder="In your own words: what is this section really saying, and why does it work that way?"
        className="w-full resize-y rounded-xl border border-border bg-panel2 px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-white/50 disabled:opacity-60"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[#9aa1b2]">
          {words === 0
            ? "Aim for 3 to 5 sentences"
            : words < 20
              ? `${words} words, keep going`
              : `${words} words`}
        </span>
        <div className="flex gap-2">
          {submitted && !busy && (
            <GhostButton onClick={reset}>
              <span className="flex items-center gap-1.5">
                <ArrowCounterClockwise size={14} weight="bold" /> Try again
              </span>
            </GhostButton>
          )}
          <PrimaryButton onClick={submit} disabled={busy || text.trim() === ""}>
            {busy ? "Reading..." : "Check my explanation"}
          </PrimaryButton>
        </div>
      </div>

      {submitted && (
        <div className="fadein mt-4 rounded-xl border border-border bg-panel2 px-4 py-3">
          {feedback ? (
            <div className="text-sm leading-relaxed">
              <MathText>{feedback}</MathText>
            </div>
          ) : (
            <div className="text-sm text-[#9aa1b2]">Reading your explanation...</div>
          )}
        </div>
      )}
    </Card>
  );
}
