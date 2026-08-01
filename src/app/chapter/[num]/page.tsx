"use client";

import Link from "next/link";
import { Card, Badge, PageHeader, GhostButton } from "@/components/kit";
import { getChapter } from "@/lib/data/chapters";
import { lessonsForChapter } from "@/lib/data/lessons";
import { getGuidedExample } from "@/lib/data/guidedExamples";
import { hasPlayground } from "@/components/Playground";
import { ArrowLeft, ArrowRight, Brain, TreeStructure } from "@phosphor-icons/react/dist/ssr";

function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "...";
}

export default function ChapterHubPage({ params }: { params: { num: string } }) {
  const num = parseInt(params.num, 10);
  const chapter = getChapter(num);

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
