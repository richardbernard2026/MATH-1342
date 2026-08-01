"use client";

import { useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { PrimaryButton } from "@/components/kit";
import { GradientBorder, DotGrid } from "@/components/fx";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

/**
 * Asked once, on the very first visit.
 *
 * The wording is deliberately explicit about what gets stored. Burying that in
 * a footer would be technically disclosed and practically hidden, and this is
 * the one moment the person is actually reading.
 */
export function NameGate() {
  const { ready, firstName, setName } = useProfile();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready || firstName) return null;

  async function submit() {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    await setName(v);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 px-4 backdrop-blur-sm">
      <DotGrid />
      <GradientBorder className="relative w-full max-w-md">
        <div className="p-7">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-panel2 px-3 py-1 text-xs font-semibold text-[#9aa1b2]">
            <Sparkle size={13} className="text-warn" />
            MATH 1342
          </div>

          <h1 className="text-2xl font-bold tracking-tight">What should I call you?</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#9aa1b2]">
            Just a first name. It lets the site remember where you are, track which chapters you
            are strongest and weakest in, and pick up where you left off.
          </p>

          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            maxLength={40}
            placeholder="First name"
            className="mt-5 w-full rounded-xl border border-border bg-panel2 px-4 py-3 text-base outline-none transition-colors focus:border-white/50"
          />

          <PrimaryButton onClick={submit} disabled={busy || !value.trim()} className="mt-3 w-full">
            {busy ? "Saving..." : "Start studying"}
          </PrimaryButton>

          <p className="mt-4 text-[0.7rem] leading-relaxed text-[#9aa1b2]">
            Your first name, quiz scores, and study activity are saved so your progress follows you
            between devices. The site owner can see this. No email, password, or payment details are
            ever asked for.
          </p>
        </div>
      </GradientBorder>
    </div>
  );
}
