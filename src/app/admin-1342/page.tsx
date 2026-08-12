"use client";

import { useState } from "react";
import { Card, PageHeader, PrimaryButton, barFill } from "@/components/kit";
import { examScopes } from "@/lib/data/chapters";
import { Lock } from "@phosphor-icons/react/dist/ssr";

/**
 * Admin dashboard at /admin-1342.
 *
 * No XSS is possible here: every value is rendered as a React child, and React
 * escapes text by default. The earlier version of this page built table rows by
 * concatenating strings into innerHTML, which meant anyone could POST a payload
 * like `<img src=x onerror=...>` to the public tracking endpoint and have it run
 * in this browser with the passphrase sitting in the DOM. That whole class of
 * bug is now structurally impossible, and the API additionally restricts every
 * identifier to a fixed allowlist.
 *
 * The passphrase is cleared the moment it is accepted, so it is not left sitting
 * in a form field for the rest of the session.
 */

type Person = {
  id: number;
  first_name: string;
  created_at: string;
  last_seen: string | null;
  sections_viewed: number;
  guided_done: number;
  practice_attempted: number;
  practice_correct: number;
  exams_taken: number;
};

type Exam = {
  id: number;
  scope: string;
  score: number;
  total: number;
  seconds: number | null;
  created_at: string;
  first_name: string;
};

type ChapterStat = { chapter: number; attempted: number; correct: number };

/**
 * Exam names, taken from the course data.
 *
 * Written out by hand this listed t1, t2 and cum only, so every Test 3 attempt
 * showed up in the table as the raw key "t3".
 */
const SCOPE_LABEL: Record<string, string> = Object.fromEntries(
  examScopes.map((s) => [s.key, s.label])
);

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<{
    dbConfigured?: boolean;
    people: Person[];
    exams: Exam[];
    chapters: ChapterStat[];
  } | null>(null);

  async function load() {
    if (!secret.trim()) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setStatus("error");
        setMessage(json?.error || "Could not load data.");
        return;
      }

      setData({
        dbConfigured: json.dbConfigured,
        people: json.people ?? [],
        exams: json.exams ?? [],
        chapters: json.chapters ?? [],
      });
      setStatus("ready");
      // Do not keep the passphrase around after it has been used.
      setSecret("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  if (status !== "ready") {
    return (
      <div className="mx-auto max-w-sm py-16">
        <Card className="text-center">
          <Lock size={30} weight="duotone" className="mx-auto mb-3 text-[#9aa1b2]" />
          <h1 className="text-lg font-bold">Admin</h1>
          <p className="mt-1 text-sm text-[#9aa1b2]">Enter the passphrase to view study data.</p>

          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="Passphrase"
            className="mt-5 w-full rounded-xl border border-border bg-panel2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-white/50"
          />

          <PrimaryButton
            onClick={load}
            disabled={status === "loading" || !secret.trim()}
            className="mt-3 w-full"
          >
            {status === "loading" ? "Checking..." : "Unlock"}
          </PrimaryButton>

          {status === "error" && <p className="mt-3 text-sm text-bad">{message}</p>}
        </Card>
      </div>
    );
  }

  const people = data?.people ?? [];
  const exams = data?.exams ?? [];
  const chapters = data?.chapters ?? [];

  const avgExam = exams.length
    ? Math.round(
        (exams.reduce((a, e) => a + (e.total ? e.score / e.total : 0), 0) / exams.length) * 100
      )
    : 0;
  const activeThisWeek = people.filter(
    (p) => p.last_seen && Date.now() - new Date(p.last_seen).getTime() < 7 * 864e5
  ).length;

  return (
    <div className="fadein">
      <PageHeader
        title="Study data"
        sub="First names and study activity for everyone using the site. No emails, passwords, IP addresses, or device identifiers are stored."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={people.length} label="Students" />
        <Stat value={activeThisWeek} label="Active this week" />
        <Stat value={exams.length} label="Mock exams taken" />
        <Stat value={`${avgExam}%`} label="Average exam score" />
      </div>

      {chapters.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
            Class practice accuracy by chapter
          </h2>
          <div className="space-y-3">
            {chapters.map((c) => {
              const pct = c.attempted ? Math.round((c.correct / c.attempted) * 100) : 0;
              return (
                <div key={c.chapter}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">Chapter {c.chapter}</span>
                    <span className="text-[#9aa1b2]">
                      {pct}% of {c.attempted}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
                    <div
                      className={`h-full rounded-full ${barFill[c.chapter] || "bg-ch4"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mb-4 overflow-x-auto">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">Students</h2>
        {people.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#9aa1b2]">
              <tr>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Sections</th>
                <th className="pb-2 pr-4">Worked</th>
                <th className="pb-2 pr-4">Practice</th>
                <th className="pb-2 pr-4">Exams</th>
                <th className="pb-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const acc = p.practice_attempted
                  ? Math.round((p.practice_correct / p.practice_attempted) * 100)
                  : null;
                return (
                  <tr key={p.id} className="border-t border-border">
                    {/* React escapes these values automatically */}
                    <td className="py-2 pr-4 font-semibold">{p.first_name}</td>
                    <td className="py-2 pr-4 font-mono">{p.sections_viewed}/18</td>
                    <td className="py-2 pr-4 font-mono">{p.guided_done}</td>
                    <td className="py-2 pr-4 font-mono">
                      {acc === null ? "-" : `${acc}% of ${p.practice_attempted}`}
                    </td>
                    <td className="py-2 pr-4 font-mono">{p.exams_taken}</td>
                    <td className="py-2 text-[#9aa1b2]">
                      {p.last_seen ? new Date(p.last_seen).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9aa1b2]">
            {data?.dbConfigured === false
              ? "No database is configured, so nothing is being recorded."
              : "Nobody has entered a name yet."}
          </p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
          Recent mock exams
        </h2>
        {exams.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#9aa1b2]">
              <tr>
                <th className="pb-2 pr-4">Who</th>
                <th className="pb-2 pr-4">Test</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-semibold">{e.first_name}</td>
                  <td className="py-2 pr-4">{SCOPE_LABEL[e.scope] ?? e.scope}</td>
                  <td className="py-2 pr-4 font-mono">
                    {e.score}/{e.total}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {e.seconds != null ? `${Math.round(e.seconds / 60)}m` : "-"}
                  </td>
                  <td className="py-2 text-[#9aa1b2]">
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9aa1b2]">No mock exams recorded yet.</p>
        )}
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-[#9aa1b2]">{label}</div>
    </Card>
  );
}
