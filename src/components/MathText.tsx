"use client";

import katex from "katex";
import { useMemo } from "react";

/**
 * One shared renderer for every piece of text in the app that might contain math.
 *
 * Lesson formulas, practice prompts, worked steps, flashcard backs, and tutor
 * replies all go through this. Keeping it in a single component is deliberate:
 * the alternative (rendering math in one place and forgetting the other five)
 * is the most common way a study site ends up showing raw `sqrt(npq)` to a
 * student halfway through a problem.
 *
 * Syntax supported:
 *   $...$    inline math
 *   $$...$$  display math (centred, on its own line)
 *
 * Anything outside a $ pair is rendered as plain text, so existing content that
 * contains no math still works untouched.
 */

type Segment = { type: "text" | "inline" | "display"; value: string };

function parse(input: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;

  while (i < input.length) {
    const display = input.indexOf("$$", i);
    const inline = findInline(input, i);

    // Whichever delimiter comes first wins.
    const nextIsDisplay = display !== -1 && (inline === -1 || display <= inline);

    if (nextIsDisplay) {
      const close = input.indexOf("$$", display + 2);
      if (close === -1) break;
      if (display > i) out.push({ type: "text", value: input.slice(i, display) });
      out.push({ type: "display", value: input.slice(display + 2, close) });
      i = close + 2;
      continue;
    }

    if (inline !== -1) {
      const close = findInline(input, inline + 1);
      if (close === -1) break;
      if (inline > i) out.push({ type: "text", value: input.slice(i, inline) });
      out.push({ type: "inline", value: input.slice(inline + 1, close) });
      i = close + 1;
      continue;
    }

    break;
  }

  if (i < input.length) out.push({ type: "text", value: input.slice(i) });
  return out;
}

/** Find a single `$` that is not part of `$$` and not escaped as `\$`. */
function findInline(s: string, from: number): number {
  for (let k = from; k < s.length; k++) {
    if (s[k] !== "$") continue;
    if (s[k - 1] === "\\") continue;
    if (s[k + 1] === "$") continue;
    if (s[k - 1] === "$") continue;
    return k;
  }
  return -1;
}

function renderTeX(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      // Never let a malformed formula blank out a whole lesson page.
      errorColor: "#ff5d5d",
      strict: false,
      trust: false,
    });
  } catch {
    return "";
  }
}

export function MathText({ children, className }: { children: string; className?: string }) {
  const segments = useMemo(() => parse(children ?? ""), [children]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          // Preserve newlines in plain prose without needing <br> in the data,
          // and turn an escaped \$ back into a literal dollar sign (so prices
          // like "\$5 to play" display correctly and never open a math span).
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {seg.value.replace(/\\\$/g, "$")}
            </span>
          );
        }
        const html = renderTeX(seg.value, seg.type === "display");
        if (!html) {
          return (
            <span key={idx} className="font-mono text-warn">
              {seg.value}
            </span>
          );
        }
        return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}

/**
 * A formula block for lesson pages. Each line is rendered independently so a
 * multi-line formula callout keeps its line breaks and alignment.
 */
export function FormulaBlock({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? "").split("\n");
  return (
    <div className={className}>
      {lines.map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <div key={i} className="leading-relaxed">
            <MathText>{line}</MathText>
          </div>
        )
      )}
    </div>
  );
}
