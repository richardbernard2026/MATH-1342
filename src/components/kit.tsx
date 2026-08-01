"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  TreeStructure,
  Cards,
  ChatCircleDots,
  Timer,
  Books,
} from "@phosphor-icons/react/dist/ssr";

/* ---------------------------------------------------------------- primitives */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-2xl border border-border bg-panel p-5", className)}>
      {children}
    </div>
  );
}

/*
 * Tailwind can only see class names that appear literally in the source, so
 * every chapter colour is written out in full below rather than built with
 * template strings like `bg-ch${n}` (which would silently produce no CSS).
 */
const badgeStyles: Record<number, string> = {
  1: "bg-ch1/10 text-ch1 border-ch1/40",
  2: "bg-ch2/10 text-ch2 border-ch2/40",
  3: "bg-ch3/10 text-ch3 border-ch3/40",
  4: "bg-ch4/10 text-ch4 border-ch4/40",
  5: "bg-ch5/10 text-ch5 border-ch5/40",
  6: "bg-ch6/10 text-ch6 border-ch6/40",
};

export const chipActive: Record<number, string> = {
  1: "border-ch1 bg-ch1/10 text-ch1",
  2: "border-ch2 bg-ch2/10 text-ch2",
  3: "border-ch3 bg-ch3/10 text-ch3",
  4: "border-ch4 bg-ch4/10 text-ch4",
  5: "border-ch5 bg-ch5/10 text-ch5",
  6: "border-ch6 bg-ch6/10 text-ch6",
};

export const barFill: Record<number, string> = {
  1: "bg-ch1",
  2: "bg-ch2",
  3: "bg-ch3",
  4: "bg-ch4",
  5: "bg-ch5",
  6: "bg-ch6",
};

export const textCh: Record<number, string> = {
  1: "text-ch1",
  2: "text-ch2",
  3: "text-ch3",
  4: "text-ch4",
  5: "text-ch5",
  6: "text-ch6",
};

export const borderCh: Record<number, string> = {
  1: "border-ch1/40",
  2: "border-ch2/40",
  3: "border-ch3/40",
  4: "border-ch4/40",
  5: "border-ch5/40",
  6: "border-ch6/40",
};

export const gradCh: Record<number, string> = {
  1: "from-ch1/20",
  2: "from-ch2/20",
  3: "from-ch3/20",
  4: "from-ch4/20",
  5: "from-ch5/20",
  6: "from-ch6/20",
};

export function Badge({ ch, children }: { ch: number; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-md border px-2 py-0.5 text-[0.68rem] font-bold",
        badgeStyles[ch] || badgeStyles[4]
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 max-w-2xl text-sm text-[#9aa1b2]">{sub}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-bg transition-transform active:scale-95 disabled:opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-xl border border-border bg-panel2 px-4 py-2 text-sm font-semibold text-[#e8eaf0] transition-colors hover:border-white/40",
        className
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- navbar */

const links = [
  { href: "/", label: "Home", icon: Books },
  { href: "/formula", label: "Which Formula?", icon: TreeStructure },
  { href: "/practice", label: "Practice", icon: Brain },
  { href: "/test-review", label: "Test Review", icon: Timer },
  { href: "/flashcards", label: "Flashcards", icon: Cards },
  { href: "/tutor", label: "AI Tutor", icon: ChatCircleDots },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ch4 to-ch5 text-sm">
            S
          </span>
          StatLab
        </Link>

        <nav className="ml-auto flex flex-wrap items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  active ? "bg-white text-bg" : "text-[#9aa1b2] hover:bg-panel2 hover:text-white"
                )}
              >
                <Icon size={16} weight={active ? "fill" : "regular"} />
                <span className="hidden md:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
