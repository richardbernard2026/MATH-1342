"use client";

import { useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/kit";
import { Lock } from "@phosphor-icons/react/dist/ssr";

/**
 * Admin dashboard at /admin-1342.
 *
 * Two things are different from the old static version:
 *
 * 1. NO XSS. Every value is rendered as a React child, and React escapes text
 *    by default. The old page built table rows with string concatenation into
 *    innerHTML, which meant anyone could POST a payload like
 *    `<img src=x onerror=...>` to the public tracking endpoint and have it run
 *    here, in this browser, with the passphrase sitting in the DOM. That entire
 *    class of bug is now structurally impossible, and the API additionally
 *    restricts page and test names to a fixed allowlist.
 *
 * 2. The passphrase is cleared from memory the moment it is accepted, so it is
 *    not left sitting in a form field for the rest of the session.
 */

type Row = Record<string, any>;

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<{
    visitorCount?: number;
    results: Row[];
    visits: Row[];
    dbConfigured?: boolean;
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
        visitorCount: json.visitorCount,
        results: json.results ?? [],
        visits: json.visits ?? [],
        dbConfigured: json.dbConfigured,
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
          <p className="mt-1 text-sm text-[#9aa1b2]">Enter the passphrase to view usage data.</p>

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

  return (
    <div className="fadein">
      <PageHeader
        title="Usage"
        sub="Anonymous study activity. No names, emails, or IP addresses are stored."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{data?.visitorCount ?? 0}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Visitors</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{data?.results.length ?? 0}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Tests taken</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{data?.visits.length ?? 0}</div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Page visits</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">
            {data && data.results.length
              ? Math.round(
                  (data.results.reduce(
                    (a, r) => a + (r.mock_total ? r.mock_score / r.mock_total : 0),
                    0
                  ) /
                    data.results.length) *
                    100
                )
              : 0}
            %
          </div>
          <div className="mt-1 text-xs text-[#9aa1b2]">Average score</div>
        </Card>
      </div>

      <Card className="mb-4 overflow-x-auto">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
          Recent tests
        </h2>
        {data && data.results.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#9aa1b2]">
              <tr>
                <th className="pb-2 pr-4">Test</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  {/* React escapes these values automatically */}
                  <td className="py-2 pr-4">{r.test}</td>
                  <td className="py-2 pr-4 font-mono">
                    {r.mock_score}/{r.mock_total}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {r.mock_time_seconds != null ? `${Math.round(r.mock_time_seconds / 60)}m` : "-"}
                  </td>
                  <td className="py-2 text-[#9aa1b2]">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9aa1b2]">No test results recorded yet.</p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9aa1b2]">
          Recent page visits
        </h2>
        {data && data.visits.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#9aa1b2]">
              <tr>
                <th className="pb-2 pr-4">Page</th>
                <th className="pb-2 pr-4">Seconds</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.visits.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2 pr-4">{v.page}</td>
                  <td className="py-2 pr-4 font-mono">{v.seconds}</td>
                  <td className="py-2 text-[#9aa1b2]">
                    {v.created_at ? new Date(v.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9aa1b2]">No page visits recorded yet.</p>
        )}
      </Card>
    </div>
  );
}
