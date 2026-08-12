"use client";

import Link from "next/link";
import {
  Card,
  Badge,
  PageHeader,
  GhostButton,
  MasteryBar,
  StatusPill,
  statusLabel,
} from "@/components/kit";
import { getChapter } from "@/lib/data/chapters";
import { lessonsForChapter } from "@/lib/data/lessons";
import { getGuidedExample } from "@/lib/data/guidedExamples";
import { hasPlayground } from "@/components/Playground";
import {
  halfProgress,
  halfStatus,
  useMastery,
  type ChapterMastery,
  type TopicStatus,
} from "@/lib/useMastery";
import { daysBetween } from "@/lib/scheduler";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarCheck,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";

function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "...";
}

const ORDER: Record<TopicStatus["status"], number> = {
  shaky: 0,
  untouched: 1,
  learning: 2,
  solid: 3,
};

/** Plain English for when an item is next wanted. */
function dueText(dueOn: string | null, today: string): string | null {
  if (!dueOn) return null;
  const late = daysBetween(dueOn, today);
  if (late > 0) return `${late} day${late === 1 ? "" : "s"} overdue`;
  if (late === 0) return "due today";
  const inDays = -late;
  return `due in ${inDays} day${inDays === 1 ? "" : "s"}`;
}

/**
 * One topic, split down the line the exam actually splits on.
 *
 * Knowing WHICH test to run and being able to RUN it are different skills and
 * they fail separately, so they are stored separately and shown separately.
 * Averaging them into one bar is how a chapter reads 70% while the procedure
 * behind it has never once been executed correctly.
 */
function TopicRow({ t, today }: { t: TopicStatus; today: string }) {
  const due = dueText(t.dueOn, today);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span className="min-w-[9rem] flex-1 text-sm font-semibold">{t.label}</span>

      <Half label="Pick the method" s={t.rule} />
      <Half label="Work it" s={t.practice} />

      <span className="ml-auto flex items-center gap-2">
        {due && (
          <span
            className={`text-[0.65rem] font-semibold ${
              t.dueOn && daysBetween(t.dueOn, today) >= 0 ? "text-warn" : "text-[#9aa1b2]"
            }`}
          >
            {due}
          </span>
        )}
        <StatusPill status={t.status} />
      </span>
    </li>
  );
}

function Half({ label, s }: { label: string; s: TopicStatus["rule"] }) {
  const st = halfStatus(s);
  const { done, need } = halfProgress(s);
  return (
    <span className="flex min-w-[8.5rem] flex-col gap-1">
      <span className="flex items-center gap-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[#9aa1b2]">
          {label}
        </span>
        <StatusPill status={st}>{statusLabel[st]}</StatusPill>
      </span>
      <span className="flex items-center gap-1">
        {Array.from({ length: need }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${
              i < done ? (st === "shaky" ? "bg-bad" : "bg-good") : "bg-panel2"
            }`}
          />
        ))}
        <span className="ml-1 text-[0.65rem] text-[#9aa1b2]">
          {done}/{need} days
        </span>
      </span>
    </span>
  );
}

/**
 * The chapter, as the scheduler sees it.
 *
 * This is the piece that was missing. The chapter hub used to be a reading
 * list, and the only record of whether any of it had stuck lived on a screen
 * this page never spoke to. Every figure here is the same one Today schedules
 * from, so clearing a session visibly moves this page.
 */
function ChapterStatus({
  ch,
  m,
  topics,
  today,
}: {
  ch: number;
  m: ChapterMastery;
  topics: TopicStatus[];
  today: string;
}) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-bold">Where this chapter stands</h2>
          <p className="mt-1 max-w-xl text-sm text-[#9aa1b2]">
            The same measurement the Today tab schedules from. Every topic is tracked twice: whether
            you can pick the method, and whether you can execute it.
          </p>
        </div>
        <Link href={`/session?ch=${ch}`}>
          <GhostButton className="whitespace-nowrap">
            <span className="flex items-center gap-1.5">
              <CalendarCheck size={16} weight="bold" /> Drill this chapter
            </span>
          </GhostButton>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#9aa1b2]">
        <span className="text-good">{m.solid} solid</span>
        <span className="text-bad">{m.shaky} shaky</span>
        <span>{m.untouched} not started</span>
        {m.due > 0 && <span className="text-warn">{m.due} due today</span>}
        <span className="ml-auto text-[#e8eaf0]">{m.percent}% durable</span>
      </div>
      <MasteryBar ch={ch} pct={m.percent} className="mt-2 h-2" />

      {!m.taught && (
        <p className="mt-3 text-xs text-[#9aa1b2]">
          Not fully covered in class yet, so the scheduler will not queue this chapter on its own.
          Drilling it early is fine, it just will not be asked for.
        </p>
      )}

      <ul className="mt-5 divide-y divide-border">
        {topics.map((t) => (
          <TopicRow key={t.key} t={t} today={today} />
        ))}
      </ul>
    </Card>
  );
}

export default function ChapterHubPage({ params }: { params: { num: string } }) {
  const num = parseInt(params.num, 10);
  const chapter = getChapter(num);

  // Called before the not-found branch, because hooks cannot be conditional.
  const mastery = useMastery();
  const chapterMastery = mastery.byChapter[num];
  // Unfinished work floats to the top, so the answer to "what is left in this
  // chapter" is the first thing on screen rather than something to scan for.
  const topics = [...mastery.topicsForChapter(num)].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status]
  );

  if (!chapter) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold">Chapter not found</h1>
        <p className="mt-2 text-sm text-[#9aa1b2]">There is no chapter numbered {params.num}.</p>
        <Link href="/" className="mt-6 inline-block">
          <GhostButton>
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={16} /> Back home
            </span>
          </GhostButton>
        </Link>
      </div>
    );
  }

  const lessons = lessonsForChapter(chapter.num);

  return (
    <div className="fadein">
      <PageHeader title={chapter.title} sub={chapter.blurb} />
      <div className="mb-6">
        <Badge ch={chapter.num}>Chapter {chapter.num}</Badge>
      </div>

      {/* What the scheduler knows about this chapter, before the reading list,
          because "what is left here" is the question this page is opened with. */}
      {chapterMastery && topics.length > 0 && (
        <ChapterStatus
          ch={chapter.num}
          m={chapterMastery}
          topics={topics}
          today={mastery.today}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chapter.sections.map((s) => {
          const lesson = lessons.find((l) => l.id === s.id);
          const guided = getGuidedExample(s.id);
          const play = hasPlayground(s.id);

          return (
            <Link key={s.id} href={`/chapter/${chapter.num}/${s.id}`} className="group block h-full">
              <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-white/30">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
                    {s.id}
                  </span>
                  <ArrowRight
                    size={16}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <h3 className="mt-2 font-bold">{s.title}</h3>
                {lesson && (
                  <p className="mt-2 text-sm text-[#9aa1b2]">{truncate(lesson.idea, 118)}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {guided && (
                    <span className="rounded-md border border-good/30 bg-good/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-good">
                      Guided problem
                    </span>
                  )}
                  {play && (
                    <span className="rounded-md border border-warn/30 bg-warn/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-warn">
                      Playground
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={`/practice?ch=${chapter.num}`}>
          <Card className="flex h-full items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/30">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2">
              <Brain size={22} />
            </div>
            <div>
              <h3 className="font-bold">Practice Chapter {chapter.num}</h3>
              <p className="mt-1 text-sm text-[#9aa1b2]">
                Endless generated problems for just this chapter.
              </p>
            </div>
          </Card>
        </Link>
        <Link href={`/formula?ch=${chapter.num}`}>
          <Card className="flex h-full items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/30">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2">
              <TreeStructure size={22} />
            </div>
            <div>
              <h3 className="font-bold">Which Formula?</h3>
              <p className="mt-1 text-sm text-[#9aa1b2]">
                Not sure which rule applies? Answer a few questions.
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
