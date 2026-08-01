"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PageHeader, GhostButton, chipActive } from "@/components/kit";
import { DiagramByKey } from "@/components/Diagram";
import { MathText, FormulaBlock } from "@/components/MathText";
import { trees, isQuestion } from "@/lib/data/decisionTrees";
import { chapters } from "@/lib/data/chapters";
import { ArrowCounterClockwise, Check, X } from "@phosphor-icons/react/dist/ssr";

function FormulaFinder() {
  const params = useSearchParams();
  const initial = (() => {
    const raw = Number(params.get("ch"));
    return raw >= 1 && raw <= 6 ? raw : 4;
  })();

  const [chapter, setChapter] = useState(initial);
  const [nodeId, setNodeId] = useState<string>(trees[initial].start);
  const [trail, setTrail] = useState<{ q: string; a: string }[]>([]);

  const node = trees[chapter].nodes[nodeId];

  function pickChapter(ch: number) {
    setChapter(ch);
    setNodeId(trees[ch].start);
    setTrail([]);
  }

  function answer(choice: "Yes" | "No") {
    if (!isQuestion(node)) return;
    setTrail((t) => [...t, { q: node.q, a: choice }]);
    setNodeId(choice === "Yes" ? node.yes : node.no);
  }

  function reset() {
    setNodeId(trees[chapter].start);
    setTrail([]);
  }

  return (
    <div className="fadein">
      <PageHeader
        title="Which formula do I use?"
        sub="Knowing the formulas is rarely the problem. Knowing which one a word problem is asking for is. Answer a few questions about the problem in front of you."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {chapters.map((c) => (
          <button
            key={c.num}
            onClick={() => pickChapter(c.num)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              chapter === c.num
                ? chipActive[c.num]
                : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30 hover:text-white"
            }`}
          >
            Ch {c.num}
          </button>
        ))}
      </div>

      {/* the path taken so far, so the reasoning stays visible */}
      {trail.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          {trail.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#9aa1b2]">
              <span
                className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-bold ${
                  t.a === "Yes"
                    ? "border-good/40 bg-good/10 text-good"
                    : "border-bad/40 bg-bad/10 text-bad"
                }`}
              >
                {t.a}
              </span>
              <span className="leading-relaxed">{t.q}</span>
            </div>
          ))}
        </div>
      )}

      <div key={`${chapter}-${nodeId}`} className="fadein">
        {isQuestion(node) ? (
          <Card className="mx-auto max-w-xl py-10 text-center">
            <p className="text-xl font-bold leading-snug sm:text-2xl">
              <MathText>{node.q}</MathText>
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => answer("Yes")}
                className="flex items-center justify-center gap-2 rounded-xl border border-good/40 bg-good/10 px-8 py-3 text-base font-bold text-good transition-all hover:bg-good/20 active:scale-95"
              >
                <Check size={18} weight="bold" /> Yes
              </button>
              <button
                onClick={() => answer("No")}
                className="flex items-center justify-center gap-2 rounded-xl border border-bad/40 bg-bad/10 px-8 py-3 text-base font-bold text-bad transition-all hover:bg-bad/20 active:scale-95"
              >
                <X size={18} weight="bold" /> No
              </button>
            </div>
          </Card>
        ) : (
          <Card className="mx-auto max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
              Use this
            </span>
            <FormulaBlock
              text={node.formula}
              className="mt-3 text-lg leading-relaxed text-warn sm:text-xl"
            />
            <p className="mt-4 text-sm leading-relaxed text-[#9aa1b2]">
              <MathText>{node.why}</MathText>
            </p>
            {node.diagram && (
              <div className="mt-6 flex justify-center border-t border-border pt-6">
                <DiagramByKey diagramKey={node.diagram} />
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <GhostButton onClick={reset}>
                <span className="flex items-center gap-1.5">
                  <ArrowCounterClockwise size={16} /> Start over
                </span>
              </GhostButton>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function FormulaPage() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-sm text-[#9aa1b2]">Loading...</div>}
    >
      <FormulaFinder />
    </Suspense>
  );
}
