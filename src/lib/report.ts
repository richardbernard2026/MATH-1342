/**
 * Builds a copyable report to paste into a chat with Claude.
 *
 * The point is not a score summary. It is that every topic in this app is
 * tracked twice, once as a RULE item (can you identify the method from the
 * wording) and once as a PRACTICE item (can you execute it once identified).
 * Those two failures need completely different fixes, and no page in the app
 * shows them side by side. This does.
 *
 * The Aug 10 diagnostic got that decomposition by asking six problems twice.
 * Here it falls out of normal use for all 46 topics, continuously.
 *
 * Deliberately plain text, not JSON. It has to survive a copy and paste into
 * a message box, and it has to be readable by a person who is deciding
 * whether to trust what comes back.
 */

import { chapters, sectionTaughtOn } from "@/lib/data/chapters";
import { topicsByChapter } from "@/lib/practiceGenerators";
import { flashcards } from "@/lib/data/flashcards";
import { daysBetween, requiredCorrectDays, EXAM_DATE, type Candidate, type ReviewState } from "@/lib/scheduler";

export type SessionItem = {
  kind: string;
  id: string;
  ch: number;
  ok: boolean;
  conf: number;
  seconds: number;
  /** Answered a rule item without waiting for, or reading through, the hold. */
  rushed: boolean;
  late: boolean;
};

const label = (key: string) => {
  for (const list of Object.values(topicsByChapter)) {
    const hit = list.find((t) => t.key === key);
    if (hit) return hit.label;
  }
  // Flashcard ids look like "c2-2", which means nothing to a reader. Fall back
  // to the front of the card so the report names the actual idea.
  const card = flashcards.find((f) => f.id === key);
  if (card) return card.front.replace(/\$/g, "");
  return key;
};

const pct = (a: number, b: number) => (b === 0 ? "-" : `${Math.round((100 * a) / b)}%`);

function chapterTitle(n: number) {
  return chapters.find((c) => c.num === n)?.title ?? `Chapter ${n}`;
}

/**
 * @param scope  a chapter number, or "all"
 * @param session the items just answered, if this is being generated at the
 *                end of a session rather than from a chapter page
 */
export function buildReport(
  candidates: Candidate[],
  today: string,
  scope: number | "all",
  session?: SessionItem[]
): string {
  const inScope = (c: Candidate) => scope === "all" || Number(c.section) === scope;
  const core = candidates.filter((c) => c.kind !== "card" && inScope(c));
  const seen = core.filter((c) => c.state.attempts > 0);
  const daysLeft = Math.max(0, daysBetween(today, EXAM_DATE));

  const L: string[] = [];

  L.push(
    `MATH 1342 StatLab report. ${today}. ${daysLeft} day${daysLeft === 1 ? "" : "s"} until the final exam on ${EXAM_DATE}.`
  );
  L.push(
    scope === "all"
      ? `Scope: everything taught so far.`
      : `Scope: Chapter ${scope}, ${chapterTitle(scope as number)}.`
  );
  L.push("");
  L.push("Tell me where I am falling down. Work from the data below, and specifically:");
  L.push("");
  L.push(
    "1. Every topic is tracked twice: RULE means could I identify which method the wording calls for, PRACTICE means could I execute it. Split my losses into picked-the-wrong-method versus right-method-wrong-arithmetic, and tell me which is costing more, because they need different fixes."
  );
  L.push(
    "2. Calibration. Flag anything marked SURE-WRONG (I was confident and wrong) and anything marked FRAGILE (right, but I said I was guessing). Do not treat those the same."
  );
  L.push(
    "3. Speed. RUSHED means I answered a rule item without reading it properly. Fast and wrong is a reading problem, not a knowledge problem, and I have a documented history of it."
  );
  L.push("4. Anything that reached solid and then lapsed, since that is decay rather than a gap.");
  L.push(
    `5. Given ${daysLeft} day${daysLeft === 1 ? "" : "s"} left, name the three things my next sessions should prioritize, and say plainly what I should stop spending time on.`
  );
  L.push("");
  L.push("Be blunt. Do not soften a bad number.");
  L.push("");

  /* ---------------------------------------------------------- headline */
  const solid = core.filter((c) => c.state.retired).length;
  const swOpen = core.filter((c) => c.state.sureWrong && !c.state.retired);
  const attempts = core.reduce((n, c) => n + c.state.attempts, 0);
  const corrects = core.reduce((n, c) => n + c.state.corrects, 0);

  L.push("=== OVERALL ===");
  L.push(
    `solid ${solid}/${core.length} | lifetime accuracy ${pct(corrects, attempts)} over ${attempts} attempts | untouched ${core.filter((c) => c.state.attempts === 0).length} | open sure-wrong ${swOpen.length}`
  );
  L.push("");

  /* ------------------------------------------------------- the session */
  if (session && session.length) {
    const early = session.filter((s) => !s.late);
    const late = session.filter((s) => s.late);
    const ok = (a: SessionItem[]) => pct(a.filter((x) => x.ok).length, a.length);
    const rushedWrong = session.filter((s) => s.rushed && !s.ok).length;
    L.push("=== THE SESSION I JUST FINISHED ===");
    L.push(
      `${session.length} items | ${ok(session)} | median ${Math.round(
        [...session.map((s) => s.seconds)].sort((a, b) => a - b)[Math.floor(session.length / 2)] || 0
      )}s per item`
    );
    if (late.length) {
      L.push(
        `before the 25 minute mark ${ok(early)} on ${early.length} items, after it ${ok(late)} on ${late.length} items`
      );
    }
    if (rushedWrong) L.push(`answered without reading, and wrong: ${rushedWrong} item(s)`);
    const sureWrongNow = session.filter((s) => !s.ok && s.conf >= 2);
    if (sureWrongNow.length) {
      L.push(
        `sure and wrong this session: ${sureWrongNow.map((s) => `${label(s.id)} (${s.kind})`).join(", ")}`
      );
    }
    L.push("");
  }

  /* --------------------------------------------------------- by topic */
  L.push("=== BY TOPIC ===");
  L.push("format: ch | topic | RULE correct/attempts | PRACTICE correct/attempts | solid-days/needed | flags");
  L.push("");

  const keys = Array.from(new Set(seen.map((c) => c.id)));
  const byChapter = new Map<number, string[]>();

  for (const key of keys) {
    const ch = Number(seen.find((c) => c.id === key)!.section);
    const rule = core.find((c) => c.kind === "rule" && c.id === key)?.state;
    const prac = core.find((c) => c.kind === "practice" && c.id === key)?.state;
    if (!rule && !prac) continue;

    const flags: string[] = [];
    const anySure = (rule?.sureWrong || prac?.sureWrong) ?? false;
    if (anySure) flags.push("SURE-WRONG");
    if (rule && rule.retired && prac && !prac.retired && prac.attempts > 1) flags.push("KNOWS-RULE-CANNOT-EXECUTE");
    if (prac && prac.retired && rule && !rule.retired && rule.attempts > 1) flags.push("EXECUTES-CANNOT-IDENTIFY");
    if (session) {
      const s = session.filter((x) => x.id === key);
      if (s.some((x) => x.rushed && !x.ok)) flags.push("RUSHED");
      if (s.some((x) => x.ok && x.conf <= 1)) flags.push("FRAGILE");
    }
    const best = prac ?? rule!;
    const need = requiredCorrectDays(best);
    const days = Math.max(rule?.correctDays.length ?? 0, prac?.correctDays.length ?? 0);
    if ((rule?.retired || prac?.retired) && (rule?.streak === 0 || prac?.streak === 0)) flags.push("LAPSED");

    const line = `${ch} | ${label(key)} | RULE ${rule ? `${rule.corrects}/${rule.attempts}` : "-"} | PRACTICE ${
      prac ? `${prac.corrects}/${prac.attempts}` : "-"
    } | ${days}/${need} | ${flags.join(" ") || "ok"}`;

    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch)!.push(line);
  }

  for (const ch of [...byChapter.keys()].sort((a, b) => a - b)) {
    for (const l of byChapter.get(ch)!) L.push(l);
  }

  if (!keys.length) L.push("(nothing attempted in this scope yet)");
  L.push("");

  /* ------------------------------------------------------ not yet seen */
  const untouched = core.filter((c) => c.state.attempts === 0);
  if (untouched.length) {
    const names = Array.from(new Set(untouched.map((c) => `${c.section}:${label(c.id)}`)));
    L.push(`=== NEVER ATTEMPTED (${names.length}) ===`);
    L.push(names.join(", "));
    L.push("");
  }

  /* ------------------------------------------------ what is still ahead */
  const upcoming = Object.entries(sectionTaughtOn)
    .filter(([, d]) => daysBetween(today, d) > 0)
    .sort((a, b) => a[1].localeCompare(b[1]));
  if (upcoming.length) {
    L.push("=== NOT TAUGHT YET ===");
    L.push(upcoming.map(([id, d]) => `${id} on ${d}`).join(", "));
  }

  return L.join("\n");
}

/** Chapters with at least one attempted core item, for the report picker. */
export function chaptersWithData(candidates: Candidate[]): number[] {
  const set = new Set<number>();
  for (const c of candidates) {
    if (c.kind !== "card" && c.state.attempts > 0) set.add(Number(c.section));
  }
  return [...set].sort((a, b) => a - b);
}

export type { ReviewState };
