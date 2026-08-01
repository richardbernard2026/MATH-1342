"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  Cards,
  ChatCircleDots,
  CheckCircle,
  Fire,
  Lightning,
  Target,
  Timer,
  TreeStructure,
  TrendUp,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import { chapters, examScopes } from "@/lib/data/chapters";
import { flashcards } from "@/lib/data/flashcards";
import { lessons } from "@/lib/data/lessons";
import { useNextUp, useProfile, useStudyStats } from "@/lib/useProfile";
import {
  CountUp,
  DotGrid,
  GradientBorder,
  ProgressRing,
  Sparkline,
  SpotlightCard,
} from "@/components/fx";

/* Hex values mirror tailwind.config.ts; SVG strokes cannot use Tailwind names. */
const CH_HEX: Record<number, string> = {
  1: "#22d3ee",
  2: "#f472b6",
  3: "#a3e635",
  4: "#4f8fff",
  5: "#b46fef",
  6: "#ff9f43",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Cards sitting in Leitner box 4 or 5 count as mastered. */
function useFlashcardMastery() {
  const [mastered, setMastered] = useState(0);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("statlab_srs_v1");
      if (!raw) return;
      const boxes = JSON.parse(raw) as Record<string, number>;
      setMastered(Object.values(boxes).filter((b) => b >= 4).length);
    } catch {
      /* corrupt storage is not worth crashing over */
    }
  }, []);
  return { mastered, total: flashcards.length };
}

export default function HomePage() {
  const { ready, firstName, sections } = useProfile();
  const stats = useStudyStats();
  const nextUp = useNextUp();
  const flash = useFlashcardMastery();

  const viewedIds = useMemo(
    () => new Set(sections.filter((s) => s.viewed).map((s) => s.section_id)),
    [sections]
  );

  const perChapterDone = useMemo(() => {
    const out: Record<number, { done: number; total: number }> = {};
    for (const c of chapters) {
      out[c.num] = {
        done: c.sections.filter((s) => viewedIds.has(s.id)).length,
        total: c.sections.length,
      };
    }
    return out;
  }, [viewedIds]);

  // Oldest first, so the sparkline reads left to right in time order.
  const examHistory = useMemo(
    () =>
      stats.exams
        .filter((e) => e.total > 0)
        .slice(0, 8)
        .reverse()
        .map((e) => e.score / e.total),
    [stats.exams]
  );

  const bestPct = stats.bestExam
    ? Math.round((stats.bestExam.score / stats.bestExam.total) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- hero */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-2 pt-6">
        <DotGrid />
        <div
          aria-hidden
          className="aurora pointer-events-none absolute -top-32 left-1/4 h-72 w-[36rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #4f8fff 0%, #b46fef 45%, transparent 70%)" }}
        />

        <div className="fadein relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel2/80 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
            <Lightning size={12} weight="fill" className="text-warn" />
            MATH 1342 &middot; Chapters 1&ndash;6
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}
            {firstName ? (
              <>
                ,{" "}
                <span className="bg-gradient-to-r from-ch4 via-ch5 to-ch6 bg-clip-text text-transparent">
                  {firstName}
                </span>
              </>
            ) : null}
            .
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9aa1b2]">
            {stats.viewed === 0
              ? "Nothing studied yet. Open one section — from there the site tracks what you do and points you at whatever will help most."
              : `${stats.viewed} of ${stats.total} sections opened, ${stats.guided} worked all the way through.`}
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- next up + rings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GradientBorder className="fadein lg:col-span-2">
          <div className="sheen relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
              <Target size={13} weight="fill" className="text-good" />
              Next up
            </div>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {nextUp.lesson.id} &mdash; {nextUp.lesson.title}
            </h2>
            <p className="mt-1.5 max-w-lg text-sm text-[#9aa1b2]">{nextUp.reason}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/chapter/${nextUp.lesson.ch}/${nextUp.lesson.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-bg transition-transform active:scale-95"
              >
                Open this section <ArrowRight size={15} weight="bold" />
              </Link>
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-white/40"
              >
                <Brain size={15} /> Practice instead
              </Link>
            </div>
          </div>
        </GradientBorder>

        <SpotlightCard className="fadein p-6" glow="#35c98f">
          <div className="flex items-center justify-between gap-4">
            <ProgressRing
              pct={stats.completion}
              color="#35c98f"
              label={<CountUp value={stats.completion} suffix="%" />}
              sub="course"
            />
            <div className="flex-1 space-y-2.5">
              <Stat
                icon={<CheckCircle size={14} className="text-good" />}
                label="Opened"
                value={`${stats.viewed}/${stats.total}`}
              />
              <Stat
                icon={<Fire size={14} className="text-ch6" />}
                label="Worked through"
                value={`${stats.guided}`}
              />
              <Stat
                icon={<ChatCircleDots size={14} className="text-ch5" />}
                label="Explained back"
                value={`${stats.explained}`}
              />
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ------------------------------------------------------------ metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SpotlightCard className="fadein p-5" glow="#4f8fff">
          <TileHead icon={<Brain size={15} className="text-ch4" />} title="Practice accuracy" />
          {stats.practiceAttempted === 0 ? (
            <Empty href="/practice" cta="Generate a problem" note="No practice attempts yet." />
          ) : (
            <>
              <div className="text-4xl font-bold tracking-tight">
                <CountUp value={stats.practiceAccuracy ?? 0} suffix="%" />
              </div>
              <p className="mt-1 text-xs text-[#9aa1b2]">
                across <CountUp value={stats.practiceAttempted} /> problems
              </p>
              <Bar pct={stats.practiceAccuracy ?? 0} from="from-ch4" to="to-good" />
            </>
          )}
        </SpotlightCard>

        <SpotlightCard className="fadein p-5" glow="#b46fef">
          <TileHead icon={<Cards size={15} className="text-ch5" />} title="Flashcards mastered" />
          <div className="text-4xl font-bold tracking-tight">
            <CountUp value={flash.mastered} />
            <span className="text-lg font-semibold text-[#9aa1b2]">/{flash.total}</span>
          </div>
          <p className="mt-1 text-xs text-[#9aa1b2]">cards in box 4 or 5</p>
          <Bar
            pct={Math.round((flash.mastered / flash.total) * 100)}
            from="from-ch5"
            to="to-ch2"
          />
        </SpotlightCard>

        <SpotlightCard className="fadein p-5" glow="#ff9f43">
          <TileHead icon={<TrendUp size={15} className="text-ch6" />} title="Mock exam history" />
          {stats.exams.length === 0 ? (
            <Empty href="/test-review" cta="Take a mock exam" note="No exams taken yet." />
          ) : (
            <>
              <div className="text-4xl font-bold tracking-tight">
                <CountUp value={bestPct ?? 0} suffix="%" />
                <span className="ml-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
                  best
                </span>
              </div>
              <div className="mt-3">
                <Sparkline points={examHistory} width={200} />
              </div>
              <p className="mt-1 text-xs text-[#9aa1b2]">
                {stats.exams.length} attempt{stats.exams.length === 1 ? "" : "s"}
              </p>
            </>
          )}
        </SpotlightCard>
      </div>

      {/* -------------------------------------------------------- weak spot */}
      {ready && stats.weakest && stats.weakest.pct < 0.8 && (
        <SpotlightCard className="fadein p-5" glow="#ff5d5d">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bad/10 text-bad">
              <Warning size={20} weight="fill" />
            </div>
            <div className="min-w-[14rem] flex-1">
              <div className="text-sm font-bold">
                Chapter {stats.weakest.chapter} is your weakest right now
              </div>
              <p className="mt-0.5 text-xs text-[#9aa1b2]">
                {stats.weakest.correct} of {stats.weakest.total} correct (
                {Math.round(stats.weakest.pct * 100)}%). That is where the most points are sitting.
              </p>
            </div>
            <Link
              href={`/chapter/${stats.weakest.chapter}`}
              className="inline-flex items-center gap-2 rounded-xl border border-bad/40 bg-bad/10 px-4 py-2 text-sm font-bold text-bad transition-colors hover:bg-bad/20"
            >
              Go fix it <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </SpotlightCard>
      )}

      {/* ------------------------------------------------------- chapter grid */}
      <section>
        <SectionTitle>Chapters</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => {
            const p = perChapterDone[c.num];
            const pct = Math.round((p.done / p.total) * 100);
            const acc = stats.perChapter[c.num];
            const accPct = acc && acc.total ? Math.round((acc.correct / acc.total) * 100) : null;
            const accColor =
              accPct === null ? "" : accPct >= 80 ? "#35c98f" : accPct >= 60 ? "#ffd166" : "#ff5d5d";
            return (
              <Link key={c.num} href={`/chapter/${c.num}`} className="fadein block">
                <SpotlightCard className="h-full p-5" glow={CH_HEX[c.num]}>
                  <div className="flex items-start gap-4">
                    <ProgressRing
                      pct={pct}
                      size={62}
                      stroke={6}
                      color={CH_HEX[c.num]}
                      label={<span className="text-sm">{c.num}</span>}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold leading-snug">{c.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-[#9aa1b2]">{c.blurb}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[0.68rem] font-semibold text-[#9aa1b2]">
                    <span>
                      {p.done}/{p.total} sections
                    </span>
                    {accPct !== null && (
                      <span
                        className="rounded-md px-1.5 py-0.5"
                        style={{ color: accColor, background: accColor + "1a" }}
                      >
                        {accPct}% correct
                      </span>
                    )}
                    <ArrowRight size={13} weight="bold" className="ml-auto" />
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------- exam prep */}
      <section>
        <SectionTitle>Exam readiness</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {examScopes.map((s) => {
            const taken = stats.exams.filter((e) => e.scope === s.key && e.total > 0);
            const best = taken.length
              ? Math.max(...taken.map((e) => Math.round((e.score / e.total) * 100)))
              : null;
            const covered = s.chapters.reduce((a, ch) => a + (perChapterDone[ch]?.done ?? 0), 0);
            const coverTotal = s.chapters.reduce((a, ch) => a + (perChapterDone[ch]?.total ?? 0), 0);
            return (
              <Link key={s.key} href="/test-review" className="fadein block">
                <SpotlightCard className="h-full p-5" glow="#ffd166">
                  <TileHead icon={<Timer size={15} className="text-warn" />} title={s.label} />
                  <div className="text-2xl font-bold tracking-tight">
                    {best === null ? (
                      <span className="text-base text-[#9aa1b2]">Not attempted</span>
                    ) : (
                      <>
                        {best}%{" "}
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
                          best
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#9aa1b2]">
                    {covered}/{coverTotal} covered sections opened
                  </p>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- tools */}
      <section>
        <SectionTitle>Tools</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="fadein block">
              <SpotlightCard className="h-full p-5" glow={t.glow}>
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: t.glow + "1a", color: t.glow }}
                >
                  <t.icon size={18} />
                </div>
                <div className="text-sm font-bold">{t.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#9aa1b2]">{t.body}</p>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

const TOOLS = [
  {
    href: "/formula",
    icon: TreeStructure,
    title: "Which formula?",
    body: "Answer a few questions about the problem, land on the right formula with the reason why.",
    glow: "#22d3ee",
  },
  {
    href: "/practice",
    icon: Brain,
    title: "Practice generator",
    body: "Endless fresh problems with new numbers, each with a full worked solution.",
    glow: "#4f8fff",
  },
  {
    href: "/flashcards",
    icon: Cards,
    title: "Flashcards",
    body: "Spaced repetition. Cards you miss come back sooner than cards you know.",
    glow: "#b46fef",
  },
  {
    href: "/tutor",
    icon: ChatCircleDots,
    title: "AI tutor",
    body: "Asks before it tells, so the thinking stays yours.",
    glow: "#f472b6",
  },
];

/* ------------------------------------------------------------- small parts */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.68rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
      {children}
    </h2>
  );
}

function TileHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-[#9aa1b2]">
      {icon}
      {title}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-[#9aa1b2]">{label}</span>
      <span className="ml-auto text-sm font-bold">{value}</span>
    </div>
  );
}

function Bar({ pct, from, to }: { pct: number; from: string; to: string }) {
  return (
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-panel2">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${from} ${to} transition-[width] duration-1000`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/**
 * Footer, with a way out.
 *
 * Whoever is using this should be able to change the name they gave or clear
 * their data without asking anyone, so the control lives in plain sight rather
 * than behind a settings page that does not exist.
 */
function Footer() {
  const { firstName, setName, reset } = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
        <input
          autoFocus
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              setName(draft.trim());
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="First name"
          className="rounded-lg border border-border bg-panel2 px-3 py-1.5 text-sm outline-none focus:border-white/50"
        />
        <button
          onClick={() => {
            if (draft.trim()) setName(draft.trim());
            setEditing(false);
          }}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-bg"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs font-semibold text-[#9aa1b2] hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <p className="pt-4 text-center text-[0.68rem] text-[#9aa1b2]">
      {lessons.length} sections &middot; {flashcards.length} flashcards &middot; built for MATH 1342
      {firstName && (
        <>
          <br />
          Studying as {firstName}.{" "}
          <button
            onClick={() => {
              setDraft(firstName);
              setEditing(true);
            }}
            className="underline underline-offset-2 hover:text-white"
          >
            Change name
          </button>{" "}
          &middot;{" "}
          <button
            onClick={() => {
              if (confirm("Clear your name and all progress on this device?")) reset();
            }}
            className="underline underline-offset-2 hover:text-white"
          >
            Start over
          </button>
        </>
      )}
    </p>
  );
}

function Empty({ href, cta, note }: { href: string; cta: string; note: string }) {
  return (
    <div>
      <p className="text-xs text-[#9aa1b2]">{note}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white underline decoration-white/30 underline-offset-4"
      >
        {cta} <ArrowRight size={13} weight="bold" />
      </Link>
    </div>
  );
}
