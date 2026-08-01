"use client";

import Link from "next/link";
import { Card, Badge, textCh, borderCh, gradCh } from "@/components/kit";
import { chapters } from "@/lib/data/chapters";
import {
  TreeStructure,
  Brain,
  Timer,
  Cards,
  ChatCircleDots,
  ArrowRight,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

const tools = [
  {
    href: "/formula",
    label: "Which Formula?",
    desc: "Answer a few yes/no questions about your problem and land on the exact formula, with a diagram.",
    icon: TreeStructure,
  },
  {
    href: "/practice",
    label: "Practice Generator",
    desc: "Endless auto-graded problems for any chapter, each with a full worked solution.",
    icon: Brain,
  },
  {
    href: "/test-review",
    label: "Test Review",
    desc: "Timed mock exams for Test 1, Test 2, or the full cumulative set.",
    icon: Timer,
  },
  {
    href: "/flashcards",
    label: "Flashcards",
    desc: "Spaced repetition across all 60 formulas and definitions.",
    icon: Cards,
  },
  {
    href: "/tutor",
    label: "AI Tutor",
    desc: "Ask anything. It teaches Socratically and knows the section you came from.",
    icon: ChatCircleDots,
  },
];

export default function HomePage() {
  return (
    <div className="fadein">
      <section className="mb-12 pt-6 sm:pt-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-panel2 px-3 py-1 text-xs font-semibold text-[#9aa1b2]">
          <Sparkle size={14} className="text-warn" />
          MATH 1342 &middot; Elementary Statistical Methods
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Master{" "}
          <span className="bg-gradient-to-r from-ch4 to-ch5 bg-clip-text text-transparent">
            MATH 1342
          </span>
          <br />
          with StatLab
        </h1>
        <p className="mt-4 max-w-xl text-base text-[#9aa1b2]">
          All six chapters. Every section has the concept, a problem you work through step by step,
          a playground where you can move the math and watch it respond, and a place to explain it
          back in your own words.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">Chapters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((c) => (
            <Link key={c.num} href={`/chapter/${c.num}`} className="group block h-full">
              <Card
                className={`h-full bg-gradient-to-br to-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 ${gradCh[c.num]} ${borderCh[c.num]}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wide ${textCh[c.num]}`}>
                    Chapter {c.num}
                  </span>
                  <ArrowRight
                    size={16}
                    className={`${textCh[c.num]} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                </div>
                <h3 className="mt-2 text-lg font-bold">{c.title}</h3>
                <p className="mt-2 text-sm text-[#9aa1b2]">{c.blurb}</p>
                <div className="mt-4">
                  <Badge ch={c.num}>{c.sections.length} sections</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
          Study Tools
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className="group block h-full">
                <Card className="flex h-full items-start gap-3 transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:shadow-lg hover:shadow-black/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel2 transition-colors group-hover:bg-white group-hover:text-bg">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{t.label}</h3>
                    <p className="mt-1 text-sm text-[#9aa1b2]">{t.desc}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
