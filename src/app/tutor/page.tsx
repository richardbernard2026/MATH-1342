"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PaperPlaneRight, Sparkle, Student } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, Badge } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { getLesson } from "@/lib/data/lessons";

type Message = { role: "user" | "assistant"; content: string };

const GENERAL_STARTERS = [
  "What is the difference between nominal, ordinal, interval, and ratio?",
  "When do I use the median instead of the mean?",
  "Explain the difference between P(A and B) and P(A or B)",
  "Walk me through finding a sample standard deviation",
  "I do not understand the Central Limit Theorem",
];

function TutorInner() {
  const params = useSearchParams();
  const sectionId = params.get("section") || undefined;
  const lesson = sectionId ? getLesson(sectionId) : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState<"socratic" | "direct">("socratic");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  const starters = lesson
    ? [
        `Why does ${lesson.title.toLowerCase()} work the way it does?`,
        `Give me a worked example for ${lesson.id}`,
        `What is the most common mistake in ${lesson.id}?`,
        `Quiz me on ${lesson.id}`,
      ]
    : GENERAL_STARTERS;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setWaiting(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, sectionId, mode }),
      });
      if (!res.body) throw new Error("no body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let placed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;
        if (!placed) {
          placed = true;
          setWaiting(false);
          setMessages((prev) => [...prev, { role: "assistant", content: acc }]);
        } else {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      }

      if (!placed) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I did not get a response. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching the tutor. Please try again in a moment.",
        },
      ]);
    } finally {
      setStreaming(false);
      setWaiting(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-190px)] max-w-3xl flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="AI Tutor"
          sub={
            lesson
              ? `Scoped to section ${lesson.id}. It has this section's actual material in front of it.`
              : "Ask anything from Chapters 1 through 6."
          }
        />
        <div className="flex shrink-0 gap-1 rounded-xl border border-border bg-panel2 p-1">
          <button
            onClick={() => setMode("socratic")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === "socratic" ? "bg-white text-bg" : "text-[#9aa1b2] hover:text-white"
            }`}
          >
            Socratic
          </button>
          <button
            onClick={() => setMode("direct")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === "direct" ? "bg-white text-bg" : "text-[#9aa1b2] hover:text-white"
            }`}
          >
            Direct
          </button>
        </div>
      </div>

      {lesson && (
        <div className="mb-3 flex items-center gap-2">
          <Badge ch={lesson.ch}>{lesson.id}</Badge>
          <span className="text-xs text-[#9aa1b2]">{lesson.title}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {mode === "socratic" ? (
                <Student size={32} weight="duotone" className="mb-3 text-[#9aa1b2]" />
              ) : (
                <Sparkle size={32} weight="duotone" className="mb-3 text-[#9aa1b2]" />
              )}
              <h2 className="text-lg font-bold">
                {lesson ? `Ask about ${lesson.title}` : "Ask me anything about MATH 1342"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#9aa1b2]">
                {mode === "socratic"
                  ? "Socratic mode: I will ask before I tell. Slower, but you will remember it."
                  : "Direct mode: straight explanation with a worked example."}
              </p>
              <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-panel2 px-3.5 py-2 text-left text-xs font-medium transition-colors hover:border-white/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-white text-bg" : "bg-panel2"
                    }`}
                  >
                    {m.role === "assistant" ? <MathText>{m.content}</MathText> : m.content}
                  </div>
                </div>
              ))}
              {waiting && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-panel2 px-4 py-3 text-sm text-[#9aa1b2]">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              disabled={streaming}
              placeholder={lesson ? `Ask about ${lesson.id}...` : "Ask a question..."}
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-white/50 disabled:opacity-60"
            />
            <button
              onClick={() => send(input)}
              disabled={streaming || input.trim() === ""}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-bg transition-transform active:scale-95 disabled:opacity-40"
              aria-label="Send"
            >
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-sm text-[#9aa1b2]">Loading tutor...</div>}
    >
      <TutorInner />
    </Suspense>
  );
}
