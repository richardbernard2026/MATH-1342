"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Badge, PrimaryButton, GhostButton } from "@/components/kit";
import { DiagramByKey } from "@/components/Diagram";
import { MathText, FormulaBlock } from "@/components/MathText";
import { GuidedExample } from "@/components/GuidedExample";
import { Playground, hasPlayground } from "@/components/Playground";
import { ExplainItBack } from "@/components/ExplainItBack";
import { getLesson, lessonsForChapter } from "@/lib/data/lessons";
import { getGuidedExample } from "@/lib/data/guidedExamples";
import { ArrowLeft, ArrowRight, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";

type Tab = "learn" | "work" | "play" | "explain";

export default function LessonPage({ params }: { params: { num: string; section: string } }) {
  const chapterNum = parseInt(params.num, 10);
  const lesson = getLesson(params.section);
  const [tab, setTab] = useState<Tab>("learn");

  if (!lesson || lesson.ch !== chapterNum) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold">Section not found</h1>
        <p className="mt-2 text-sm text-[#9aa1b2]">
          There is no section {params.section} in Chapter {params.num}.
        </p>
        <Link href={`/chapter/${params.num}`} className="mt-6 inline-block">
          <GhostButton>
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={16} /> Back to chapter
            </span>
          </GhostButton>
        </Link>
      </div>
    );
  }

  const siblings = lessonsForChapter(lesson.ch);
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const guided = getGuidedExample(lesson.id);
  const playground = hasPlayground(lesson.id);

  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: "learn", label: "Learn", available: true },
    { key: "work", label: "Work a problem", available: Boolean(guided) },
    { key: "play", label: "Playground", available: playground },
    { key: "explain", label: "Explain it back", available: true },
  ];

  return (
    <div className="fadein">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge ch={lesson.ch}>{lesson.id}</Badge>
        <Link
          href={`/chapter/${lesson.ch}`}
          className="text-xs font-semibold text-[#9aa1b2] transition-colors hover:text-white"
        >
          Back to Chapter {lesson.ch}
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>

      {/* tabs */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs
          .filter((t) => t.available)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-white text-bg"
                  : "border border-border bg-panel2 text-[#9aa1b2] hover:border-white/30 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {/* ---------------------------------------------------------- LEARN */}
      {tab === "learn" && (
        <div className="fadein mt-6">
          <p className="max-w-2xl text-base leading-relaxed text-[#e8eaf0]/90">
            <MathText>{lesson.idea}</MathText>
          </p>

          <Card className="mt-8">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">Formula</span>
            <FormulaBlock
              text={lesson.formula}
              className="mt-3 text-lg leading-relaxed text-warn sm:text-xl"
            />
            {lesson.diagram && (
              <div className="mt-6 flex justify-center border-t border-border pt-6">
                <DiagramByKey diagramKey={lesson.diagram} />
              </div>
            )}
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <span className="text-xs font-bold uppercase tracking-wide text-ch4">Builds on</span>
              <p className="mt-2 text-sm leading-relaxed text-[#9aa1b2]">
                <MathText>{lesson.buildsOn}</MathText>
              </p>
            </Card>
            <Card>
              <span className="text-xs font-bold uppercase tracking-wide text-ch5">
                Builds toward
              </span>
              <p className="mt-2 text-sm leading-relaxed text-[#9aa1b2]">
                <MathText>{lesson.buildsToward}</MathText>
              </p>
            </Card>
          </div>

          {/* next actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {guided && (
              <PrimaryButton onClick={() => setTab("work")}>Work a problem together</PrimaryButton>
            )}
            <Link href={`/tutor?section=${lesson.id}`}>
              <GhostButton>
                <span className="flex items-center gap-1.5">
                  <ChatCircleDots size={16} weight="bold" />
                  Ask the tutor about {lesson.id}
                </span>
              </GhostButton>
            </Link>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- WORK */}
      {tab === "work" && guided && (
        <div className="fadein mt-6">
          <h2 className="mb-1 text-lg font-bold">{guided.title}</h2>
          <p className="mb-5 text-sm text-[#9aa1b2]">
            We solve this one step at a time. Do each step yourself, and you will get feedback
            before moving on.
          </p>
          <GuidedExample example={guided} />
        </div>
      )}

      {/* ----------------------------------------------------------- PLAY */}
      {tab === "play" && playground && (
        <div className="fadein mt-6">
          <Playground sectionId={lesson.id} />
        </div>
      )}

      {/* -------------------------------------------------------- EXPLAIN */}
      {tab === "explain" && (
        <div className="fadein mt-6">
          <ExplainItBack sectionId={lesson.id} title={lesson.title} />
        </div>
      )}

      {/* prev / next */}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
        {prev ? (
          <Link
            href={`/chapter/${lesson.ch}/${prev.id}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#9aa1b2] transition-colors hover:text-white"
          >
            <ArrowLeft size={16} /> {prev.id} {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/chapter/${lesson.ch}/${next.id}`}
            className="flex items-center gap-1.5 text-right text-sm font-semibold text-[#9aa1b2] transition-colors hover:text-white"
          >
            {next.id} {next.title} <ArrowRight size={16} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
