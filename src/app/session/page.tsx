"use client";

/**
 * The session runner. This is the front door.
 *
 * Two sessions a day, 8 AM and 4 PM, both about 25 minutes. The queue is
 * chosen by src/lib/scheduler.ts, not by you, which is the point: deciding
 * what to study is the step that reliably does not happen.
 *
 * Design notes, each tied to something measured rather than assumed:
 *
 * - Confidence is collected BEFORE the answer is revealed, on every item.
 *   It is not decoration. It sets the retirement bar (a confident miss needs
 *   four correct days instead of three, per Butterfield & Metcalfe on
 *   high-confidence errors returning) and it drives queue priority.
 *
 * - Rule items hold their options back for a few seconds. The Aug 10
 *   diagnostic ran rule selection at a 10.3 second median with 40% accuracy,
 *   and six of ten misses came in under eleven seconds. That is a reading
 *   failure, and no amount of content fixes it.
 *
 * - The 4 PM session opens with a cold pretest on whatever is being taught in
 *   class that evening, 90 minutes later. Those items are unscored on purpose.
 *   Richland, Kornell & Kao (2009) found that attempting questions before
 *   instruction improves later learning even when you only count the items
 *   answered wrong. Getting them wrong is the mechanism.
 *
 * - The 25 minute mark warns rather than stops, which was a deliberate choice.
 *   Accuracy before and after the mark is tracked separately so the question
 *   of whether pushing on helps becomes a number instead of a feeling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Eye,
  Clock,
  Sun,
  MoonStars,
  Flag,
  ClipboardText,
  Lightbulb,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import { Card, Badge, PageHeader, PrimaryButton, GhostButton, StreakBadge } from "@/components/kit";
import { buildCandidates } from "@/lib/useMastery";
import { MathText } from "@/components/MathText";
import { generateProblem, topicsByChapter, type PracticeProblem } from "@/lib/practiceGenerators";
import { ruleFor } from "@/lib/data/ruleChoices";
import { formulaFor, formulaOptionsFor, type FormulaCard } from "@/lib/data/formulas";
import { flashcards } from "@/lib/data/flashcards";
import { chapters, sectionTaughtOn } from "@/lib/data/chapters";
import { lessons } from "@/lib/data/lessons";
import { useReview } from "@/lib/useReview";
import { buildReport, chaptersWithData, type SessionItem } from "@/lib/report";
import {
  buildSession,
  readiness,
  toISO,
  daysBetween,
  estimateMinutes,
  needsScaffold,
  EXAM_DATE,
  type Candidate,
  type ItemKind,
  type SessionKind,
  type Scored,
} from "@/lib/scheduler";

const READ_SECONDS = 5;
const BUDGET_MINUTES = 25;
const CONF = ["Guessing", "Unsure", "Fairly sure", "Certain"];

const chOf = (key: string) =>
  Number(
    Object.keys(topicsByChapter).find((c) =>
      topicsByChapter[Number(c)].some((t) => t.key === key)
    )
  );

type Live =
  | {
      kind: "rule";
      id: string;
      ch: number;
      /** The real generated problem. Both stages act on THIS problem. */
      problem: PracticeProblem;
      options: FormulaCard[];
      answer: number;
      correct: FormulaCard;
      why: string;
    }
  | { kind: "practice"; id: string; ch: number; problem: PracticeProblem }
  | { kind: "card"; id: string; ch: number; front: string; back: string; why: string };

function materialize(s: Scored): Live | null {
  if (s.kind === "rule") {
    const rc = ruleFor(s.id);
    const card = formulaFor(s.id);
    const opts = formulaOptionsFor(s.id, 3);
    if (!rc || !card || !opts) return null;
    const p = generateProblem(chOf(s.id), s.id);
    return {
      kind: "rule",
      id: s.id,
      ch: rc.ch,
      problem: p,
      options: opts.options,
      answer: opts.answer,
      correct: card,
      why: rc.why,
    };
  }
  if (s.kind === "practice") {
    const p = generateProblem(chOf(s.id), s.id);
    return { kind: "practice", id: s.id, ch: p.ch, problem: p };
  }
  const f = flashcards.find((x) => x.id === s.id);
  if (!f) return null;
  return { kind: "card", id: f.id, ch: f.ch, front: f.front, back: f.back, why: f.why };
}

/** Sections being taught in class today, used for the afternoon pretest. */
function todaysSections(today: string): string[] {
  return Object.entries(sectionTaughtOn)
    .filter(([, d]) => d === today)
    .map(([id]) => id);
}

export default function SessionPage() {
  const { ready, states, get, record } = useReview();

  const [today] = useState(() => toISO(new Date()));
  const [kind, setKind] = useState<SessionKind>(() =>
    new Date().getHours() < 13 ? "morning" : "afternoon"
  );

  const [queue, setQueue] = useState<Scored[]>([]);
  const [idx, setIdx] = useState(0);
  const [live, setLive] = useState<Live | null>(null);

  const [conf, setConf] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(true);
  const [left, setLeft] = useState(READ_SECONDS);

  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState<SessionItem[]>([]);
  const [reportScope, setReportScope] = useState<number | "all">("all");
  const [copied, setCopied] = useState(false);
  const [scaffold, setScaffold] = useState<PracticeProblem | null>(null);
  /**
   * Formula items run in two stages on the SAME problem: pick the formula,
   * then compute with it. Picking wrong does not end the item; the correct
   * formula is shown and stage two still runs, so a miss teaches the formula
   * rather than just scoring one. Stage one records against the "rule" half,
   * stage two against the "practice" half, which keeps the report's
   * identify-versus-execute split intact.
   */
  const [stage, setStage] = useState<1 | 2>(1);
  const [stage1Ok, setStage1Ok] = useState<boolean | null>(null);
  const itemStart = useRef<number>(Date.now());
  const skippedHold = useRef(false);
  const [done, setDone] = useState(false);
  const started = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- candidates ---- */
  // Shared with Home and the chapter pages, so every screen counts the same
  // items. See src/lib/useMastery.tsx.
  const candidates: Candidate[] = useMemo(() => (ready ? buildCandidates(get) : []), [ready, states, get]);

  const stats = useMemo(() => (candidates.length ? readiness(candidates, today) : null), [candidates, today]);

  const pretestSections = kind === "afternoon" ? todaysSections(today) : [];

  const startSession = useCallback(() => {
    const q = buildSession(candidates, today, kind, BUDGET_MINUTES);
    setQueue(q);
    setIdx(0);
    setLog([]);
    setDone(q.length === 0);
    started.current = Date.now();
    setElapsed(0);
  }, [candidates, today, kind]);

  /* ---- advance ---- */
  useEffect(() => {
    if (!queue.length || idx >= queue.length) {
      if (queue.length && idx >= queue.length) setDone(true);
      return;
    }
    const m = materialize(queue[idx]);
    if (!m) {
      setIdx((i) => i + 1);
      return;
    }
    setLive(m);
    setConf(null);
    setPicked(null);
    setValue("");
    setRevealed(false);
    setResult(null);
    setLocked(m.kind === "rule");
    setLeft(READ_SECONDS);
    setStage(1);
    setStage1Ok(null);
    itemStart.current = Date.now();
    skippedHold.current = false;

    // Missed this twice with nothing to show for it? Do not serve the same
    // wall a third time. Show a worked example of the same method with
    // different numbers first, then ask. Stepping down before stepping back up
    // is the fading-ladder idea from the old Test 2 toolkit.
    const st = queue[idx].state;
    if (needsScaffold(st) && m.kind !== "card") {
      const alt = generateProblem(chOf(queue[idx].id), queue[idx].id);
      setScaffold(alt);
    } else {
      setScaffold(null);
    }
    if (m.kind === "practice" && m.problem.kind === "numeric") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [queue, idx]);

  /* ---- forced read ---- */
  useEffect(() => {
    if (!locked) return;
    if (left <= 0) return setLocked(false);
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [locked, left]);

  /* ---- clock ---- */
  useEffect(() => {
    if (done || !queue.length) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done, queue.length]);

  const overBudget = elapsed > BUDGET_MINUTES * 60;

  /** Stage one of a formula item: which formula does this problem call for. */
  function submitFormula(i: number) {
    if (!live || live.kind !== "rule" || conf === null || stage1Ok !== null) return;
    const ok = i === live.answer;
    const seconds = Math.round((Date.now() - itemStart.current) / 1000);
    setPicked(i);
    setStage1Ok(ok);
    record("rule", live.id, { correct: ok, confidence: conf }, today);
    setLog((l) => [
      ...l,
      {
        kind: "rule",
        id: live.id,
        ch: live.ch,
        ok,
        conf,
        seconds,
        rushed: skippedHold.current && seconds < READ_SECONDS + 6,
        late: overBudget,
      },
    ]);
  }

  /** Stage two: compute the answer to the same problem using that formula. */
  function submitComputed(ok: boolean) {
    if (!live || live.kind !== "rule" || result !== null) return;
    const seconds = Math.round((Date.now() - itemStart.current) / 1000);
    setResult(ok);
    record("practice", live.id, { correct: ok, confidence: conf ?? 1 }, today);
    setLog((l) => [
      ...l,
      { kind: "practice", id: live.id, ch: live.ch, ok, conf: conf ?? 1, seconds, rushed: false, late: overBudget },
    ]);
  }

  function submit(ok: boolean) {
    if (!live || conf === null || result !== null) return;
    const seconds = Math.round((Date.now() - itemStart.current) / 1000);
    setResult(ok);
    record(live.kind as ItemKind, live.id, { correct: ok, confidence: conf }, today);
    setLog((l) => [
      ...l,
      {
        kind: live.kind,
        id: live.id,
        ch: live.ch,
        ok,
        conf,
        seconds,
        // Rushed means a rule item answered without letting the hold run out,
        // and inside the window where the diagnostic showed reading failures.
        rushed: live.kind === "rule" && skippedHold.current && seconds < READ_SECONDS + 6,
        late: overBudget,
      },
    ]);
  }

  function checkNumeric() {
    if (!live || conf === null) return;
    if (live.kind === "rule") {
      const v = parseFloat(value);
      const ok = !Number.isNaN(v) && Math.abs(v - live.problem.answer) <= live.problem.tol;
      return submitComputed(ok);
    }
    if (live.kind !== "practice") return;
    const v = parseFloat(value);
    submit(!Number.isNaN(v) && Math.abs(v - live.problem.answer) <= live.problem.tol);
  }

  const daysLeft = daysBetween(today, EXAM_DATE);

  /* ------------------------------------------------------------ render */

  if (!ready) {
    return <div className="py-20 text-center text-sm text-[#9aa1b2]">Loading your queue...</div>;
  }

  // Start screen
  if (!queue.length && !done) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Today"
          sub={`${daysLeft} day${daysLeft === 1 ? "" : "s"} until the final. The queue is picked for you: what you missed, what is due, and nothing you already have.`}
        />

        <div className="mb-5">
          <StreakBadge />
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.percent}%</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Ready</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-good">{stats.retired}</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Solid of {stats.total}</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-bad">{stats.sureWrongOpen}</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Sure and wrong</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-warn">{stats.daysLeft}</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Days left</div>
            </Card>
          </div>
        )}

        <div className="mb-5 flex gap-2">
          {(["morning", "afternoon"] as SessionKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                kind === k
                  ? "border-warn/60 bg-warn/15 text-warn"
                  : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
              }`}
            >
              {k === "morning" ? <Sun size={18} weight="bold" /> : <MoonStars size={18} weight="bold" />}
              {k === "morning" ? "8 AM session" : "4 PM session"}
            </button>
          ))}
        </div>

        <Card className="p-6">
          <p className="text-sm leading-relaxed text-[#9aa1b2]">
            {kind === "morning" ? (
              <>
                <span className="font-bold text-fg">Morning.</span> Weighted toward the newest and
                shakiest material, while the battery is full. Chapters will alternate, and it will
                feel harder than drilling one topic. That is the condition that scored 61% against
                38% in Rohrer&apos;s trial.
              </>
            ) : (
              <>
                <span className="font-bold text-fg">Afternoon.</span> Weighted toward older
                chapters, which is retrieval at a longer delay and exactly what a comprehensive
                final tests.{" "}
                {pretestSections.length > 0 && (
                  <>
                    It opens with a cold pretest on{" "}
                    <span className="font-bold text-warn">{pretestSections.join(" and ")}</span>,
                    covered in class tonight. You are meant to get those wrong.
                  </>
                )}
              </>
            )}
          </p>
          <div className="mt-5">
            <PrimaryButton onClick={startSession} className="w-full">
              Start, about {BUDGET_MINUTES} minutes
            </PrimaryButton>
          </div>
        </Card>

        {pretestSections.length > 0 && kind === "afternoon" && (
          <p className="mt-4 text-center text-xs text-[#9aa1b2]">
            Tonight in class:{" "}
            {pretestSections.map((s) => lessons.find((l) => l.id === s)?.title ?? s).join(", ")}
          </p>
        )}
      </div>
    );
  }

  const reportText = done
    ? buildReport(candidates, today, reportScope, log)
    : "";

  function copyReport() {
    const done2 = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(reportText).then(done2).catch(fallback);
    } else fallback();
    function fallback() {
      try {
        const ta = document.createElement("textarea");
        ta.value = reportText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done2();
      } catch {
        /* the textarea below is selectable by hand */
      }
    }
  }

  // End screen
  if (done) {
    const early = log.filter((l) => !l.late);
    const late = log.filter((l) => l.late);
    const pct = (a: typeof log) => (a.length ? Math.round((a.filter((x) => x.ok).length / a.length) * 100) : 0);
    const sureWrong = log.filter((l) => !l.ok && l.conf >= 2).length;

    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Session done" sub={`${log.length} items in ${Math.round(elapsed / 60)} minutes.`} />
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">{pct(log)}%</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">This session</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.percent ?? 0}%</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Ready for the final</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-bad">{sureWrong}</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Sure and wrong</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warn">{stats?.daysLeft ?? 0}</div>
              <div className="mt-1 text-xs text-[#9aa1b2]">Days left</div>
            </div>
          </div>

          {late.length > 0 && (
            <div className="mt-5 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm leading-relaxed">
              <span className="font-bold text-warn">Before and after the 25 minute mark:</span>{" "}
              {pct(early)}% on the first {early.length}, {pct(late)}% on the {late.length} after.{" "}
              {pct(late) < pct(early) - 10
                ? "That is the drop the diagnostic predicted. The extra time cost you accuracy."
                : "No drop this time, so pushing on was fine today."}
            </div>
          )}

          {sureWrong > 0 && (
            <p className="mt-4 text-sm leading-relaxed text-[#9aa1b2]">
              The {sureWrong} item{sureWrong === 1 ? "" : "s"} you were sure about and got wrong
              {sureWrong === 1 ? " is" : " are"} now flagged. {sureWrong === 1 ? "It needs" : "They need"} four
              correct days rather than three, because confident errors come back about a week later.
            </p>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">Ask Claude where you are falling down</h3>
            <span className="text-xs text-[#9aa1b2]">paste this into a chat</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#9aa1b2]">
            Every topic here is tracked twice, once for whether you can identify the method and
            once for whether you can execute it. The report splits your losses along that line,
            which is the thing no screen in this app shows you.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setReportScope("all")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                reportScope === "all"
                  ? "border-warn/60 bg-warn/15 text-warn"
                  : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
              }`}
            >
              Everything
            </button>
            {chaptersWithData(candidates).map((c) => (
              <button
                key={c}
                onClick={() => setReportScope(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  reportScope === c
                    ? "border-warn/60 bg-warn/15 text-warn"
                    : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
                }`}
              >
                Ch {c}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <PrimaryButton onClick={copyReport} className="flex w-full items-center justify-center gap-2">
              <ClipboardText size={18} weight="bold" />
              {copied ? "Copied, paste it into a chat" : "Copy the report"}
            </PrimaryButton>
          </div>

          <textarea
            readOnly
            value={reportText}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-3 h-40 w-full resize-y rounded-xl border border-border bg-panel2 p-3 font-mono text-[11px] leading-relaxed text-[#9aa1b2] outline-none"
          />
        </Card>

        <div className="mt-6 flex justify-center gap-3">
          <GhostButton onClick={startSession}>Another round</GhostButton>
          <Link href="/">
            <PrimaryButton>Done for now</PrimaryButton>
          </Link>
        </div>
      </div>
    );
  }

  // Item
  const pos = idx + 1;
  const total = queue.length;
  const current = queue[idx];
  // pretestSections holds section ids like "8.1" while a queue item's section
  // is the bare chapter "8", so a direct includes() never matched and every
  // pretest item went unlabelled. Compare on the chapter instead.
  const pretestChapters = new Set(pretestSections.map((sec) => sec.split(".")[0]));
  const isPretest = Boolean(kind === "afternoon" && current && pretestChapters.has(current.section));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#9aa1b2]">
        <span className="font-bold">
          {pos} of {total}
        </span>
        <div className="mx-3 h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-warn transition-all"
            style={{ width: `${(idx / total) * 100}%` }}
          />
        </div>
        <span className={`flex items-center gap-1 font-mono ${overBudget ? "font-bold text-warn" : ""}`}>
          <Clock size={14} weight="bold" />
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>

      {overBudget && (
        <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs leading-relaxed text-warn">
          <Flag size={14} weight="bold" className="mr-1 inline" />
          Past 25 minutes. Your diagnostic fell apart after this point. Everything from here is
          scored separately so you can see whether pushing on actually helps.
        </div>
      )}

      {live && (
        <Card className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge ch={live.ch}>
              {live.kind === "rule"
                ? stage === 1
                  ? "Pick the formula"
                  : "Now use it"
                : live.kind === "card"
                  ? "Recall"
                  : "Work it"}
            </Badge>
            {current?.reason && (
              <span className="text-xs font-semibold text-[#9aa1b2]">{current.reason}</span>
            )}
            {isPretest && (
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-bold text-warn">
                Pretest, not scored against you
              </span>
            )}
          </div>

          <div className="text-lg leading-relaxed">
                  <MathText>
              {live.kind === "card"
                ? live.front
                : live.kind === "rule"
                  ? live.problem.prompt
                  : live.problem.prompt}
            </MathText>
          </div>

          {scaffold && result === null && (
            <div className="fadein mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                <Lightbulb size={14} weight="fill" /> You have missed this one before, so here is
                it worked out first
              </div>
              <div className="mb-3 text-sm leading-relaxed">
                <MathText>{scaffold.prompt}</MathText>
              </div>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#9aa1b2]">
                {scaffold.steps.map((st, i) => (
                  <li key={i}>
                    <MathText>{st}</MathText>
                  </li>
                ))}
              </ol>
              <div className="mt-3 border-t border-border pt-3 text-xs text-[#9aa1b2]">
                Different numbers, same method. Now do the one above.
              </div>
            </div>
          )}

          {/* confidence first, unless this is a pretest on unlearned material */}
          {result === null && isPretest && conf === null && (
            <div className="mt-5 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm leading-relaxed">
              <span className="font-bold text-warn">You have not been taught this yet.</span> It is
              covered in class tonight. Have a go, get it wrong, and it will stick better when he
              teaches it. No confidence rating and nothing counts against you.
              <div className="mt-3">
                <GhostButton onClick={() => setConf(0)}>Give it a shot</GhostButton>
              </div>
            </div>
          )}

          {result === null && !isPretest && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
                Before you answer, how sure are you?
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CONF.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => setConf(i)}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                      conf === i
                        ? "border-warn/60 bg-warn/15 text-warn"
                        : "border-border bg-panel2 text-[#9aa1b2] hover:border-white/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conf !== null && (
            <>
              {live.kind === "rule" && (
                locked ? (
                  <div className="mt-5 rounded-xl border border-border bg-panel2 p-5 text-center text-sm text-[#9aa1b2]">
                    Read it first. Formulas appear in{" "}
                    <span className="font-mono font-bold text-warn">{left}</span>.
                    <div className="mt-3">
                      <GhostButton
                        onClick={() => {
                          skippedHold.current = true;
                          setLocked(false);
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Eye size={16} weight="bold" /> I have read it
                        </span>
                      </GhostButton>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stage one: which formula does this problem call for */}
                    <div className="mt-5 flex flex-col gap-2.5">
                      {live.options.map((card, i) => {
                        let cls = "border-border bg-panel2 hover:border-white/40";
                        if (stage1Ok !== null) {
                          if (i === live.answer) cls = "border-good/60 bg-good/10";
                          else if (i === picked) cls = "border-bad/60 bg-bad/10";
                          else cls = "border-border bg-panel2 opacity-40";
                        }
                        return (
                          <button
                            key={card.key}
                            disabled={stage1Ok !== null}
                            onClick={() => submitFormula(i)}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-default ${cls}`}
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <span className="text-sm font-bold">{card.name}</span>
                              <span className="font-serif text-base">
                                <MathText>{`$${card.latex}$`}</MathText>
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-[#9aa1b2]">{card.plain}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bridge into stage two. A wrong pick still gets the formula. */}
                    {stage1Ok !== null && stage === 1 && (
                      <div
                        className={`fadein mt-4 rounded-xl border p-4 ${
                          stage1Ok ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {stage1Ok ? (
                            <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-good" />
                          ) : (
                            <XCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-bad" />
                          )}
                          <div className="text-sm">
                            <div className={`font-bold ${stage1Ok ? "text-good" : "text-bad"}`}>
                              {stage1Ok ? "Right formula." : "Not that one. Here is the one you need."}
                            </div>
                            <div className="mt-2 rounded-lg border border-border bg-panel2 p-3">
                              <div className="text-sm font-bold">{live.correct.name}</div>
                              <div className="my-1.5 font-serif text-lg">
                                <MathText>{`$${live.correct.latex}$`}</MathText>
                              </div>
                              <div className="text-xs italic text-[#9aa1b2]">{live.correct.note}</div>
                            </div>
                            <div className="mt-2 leading-relaxed text-[#9aa1b2]">{live.why}</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <PrimaryButton onClick={() => setStage(2)} className="w-full">
                            Now solve it with this formula
                          </PrimaryButton>
                        </div>
                      </div>
                    )}

                    {/* Stage two: compute the answer to the SAME problem */}
                    {stage === 2 && (
                      <div className="fadein mt-4">
                        <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
                          <div className="text-xs font-bold uppercase tracking-wide text-accent">
                            Use this
                          </div>
                          <div className="mt-1 font-serif text-lg">
                            <MathText>{`$${live.correct.latex}$`}</MathText>
                          </div>
                        </div>

                        {live.problem.kind === "choice" ? (
                          <div className="mt-4 flex flex-col gap-2.5">
                            {(live.problem.choices || []).map((o, i) => {
                              let cls = "border-border bg-panel2 hover:border-white/40";
                              if (result !== null) {
                                if (i === live.problem.answer) cls = "border-good/60 bg-good/10 text-good";
                                else cls = "border-border bg-panel2 opacity-50";
                              }
                              return (
                                <button
                                  key={i}
                                  disabled={result !== null}
                                  onClick={() => submitComputed(i === live.problem.answer)}
                                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${cls}`}
                                >
                                  <MathText>{o}</MathText>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={value}
                              disabled={result !== null}
                              onChange={(e) => setValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && checkNumeric()}
                              placeholder="Your answer"
                              className="w-full flex-1 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none focus:border-white/50 disabled:opacity-60"
                            />
                            <PrimaryButton onClick={checkNumeric} disabled={result !== null || !value.trim()}>
                              Check
                            </PrimaryButton>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              )}

              {live.kind === "practice" && live.problem.kind === "choice" && (
                <div className="mt-5 flex flex-col gap-2.5">
                  {(live.problem.choices || []).map((o, i) => {
                    let cls = "border-border bg-panel2 hover:border-white/40";
                    if (result !== null) {
                      if (i === live.problem.answer) cls = "border-good/60 bg-good/10 text-good";
                      else if (i === picked) cls = "border-bad/60 bg-bad/10 text-bad";
                      else cls = "border-border bg-panel2 opacity-50";
                    }
                    return (
                      <button
                        key={i}
                        disabled={result !== null}
                        onClick={() => {
                          setPicked(i);
                          submit(i === live.problem.answer);
                        }}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${cls}`}
                      >
                        <MathText>{o}</MathText>
                      </button>
                    );
                  })}
                </div>
              )}

              {live.kind === "practice" && live.problem.kind === "numeric" && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    disabled={result !== null}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkNumeric()}
                    placeholder="Your answer"
                    className="w-full flex-1 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none focus:border-white/50 disabled:opacity-60"
                  />
                  <PrimaryButton onClick={checkNumeric} disabled={result !== null || !value.trim()}>
                    Check
                  </PrimaryButton>
                </div>
              )}

              {live.kind === "card" && (
                <div className="mt-5">
                  {!revealed ? (
                    <PrimaryButton onClick={() => setRevealed(true)} className="w-full">
                      Show the answer
                    </PrimaryButton>
                  ) : (
                    <>
                      <div className="rounded-xl border border-border bg-panel2 p-4 text-sm leading-relaxed">
                        <MathText>{live.back}</MathText>
                        <div className="mt-2 text-xs text-[#9aa1b2]">
                          <MathText>{live.why}</MathText>
                        </div>
                      </div>
                      {result === null && (
                        <div className="mt-4 flex gap-3">
                          <GhostButton onClick={() => submit(false)} className="flex-1">
                            I did not have it
                          </GhostButton>
                          <PrimaryButton onClick={() => submit(true)} className="flex-1">
                            I had it
                          </PrimaryButton>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {result !== null && (
            <div
              className={`fadein mt-4 flex items-start gap-2 rounded-xl border p-4 ${
                result ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"
              }`}
            >
              {result ? (
                <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-good" />
              ) : (
                <XCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-bad" />
              )}
              <div className="text-sm">
                <div className={`font-bold ${result ? "text-good" : "text-bad"}`}>
                  {result ? "Correct" : "Not quite."}
                  {!result && conf !== null && conf >= 2 && (
                    <span className="ml-2 font-normal text-[#9aa1b2]">
                      You were sure. This one now needs four correct days, not three.
                    </span>
                  )}
                </div>
                {live.kind === "rule" && (
                  <>
                    {!result && (
                      <div className="mt-1 text-[#9aa1b2]">
                        Correct answer:{" "}
                        <span className="font-mono text-warn">
                          {live.problem.kind === "choice"
                            ? (live.problem.choices || [])[live.problem.answer]
                            : live.problem.answer}
                        </span>
                      </div>
                    )}
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-[#9aa1b2]">
                      {live.problem.steps.map((st, i) => (
                        <li key={i}>
                          <MathText>{st}</MathText>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {live.kind === "practice" && (
                  <>
                    {!result && (
                      <div className="mt-1 text-[#9aa1b2]">
                        Correct answer:{" "}
                        <span className="font-mono text-warn">
                          {live.problem.kind === "choice"
                            ? (live.problem.choices || [])[live.problem.answer]
                            : live.problem.answer}
                        </span>
                      </div>
                    )}
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-[#9aa1b2]">
                      {live.problem.steps.map((st, i) => (
                        <li key={i}>
                          <MathText>{st}</MathText>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>
          )}

          {result !== null && (
            <div className="mt-5">
              <PrimaryButton onClick={() => setIdx((i) => i + 1)} className="flex w-full items-center justify-center gap-2">
                <ArrowsClockwise size={18} weight="bold" />
                {pos === total ? "Finish" : "Next"}
              </PrimaryButton>
            </div>
          )}
        </Card>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <GhostButton onClick={() => setDone(true)}>
          <span className="flex items-center gap-1.5">
            <SignOut size={16} weight="bold" /> Finish here
          </span>
        </GhostButton>
        <p className="text-center text-xs leading-relaxed text-[#9aa1b2]">
          Everything you have answered is already saved. Stopping early costs you nothing, and a
          tired session teaches you your own mistakes.
        </p>
      </div>
    </div>
  );
}
