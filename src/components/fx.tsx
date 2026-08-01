"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

/**
 * Visual effects used by the dashboard.
 *
 * These are hand-built rather than pulled from a component library, so there is
 * no extra dependency and every animation respects prefers-reduced-motion.
 */

/* ------------------------------------------------------------- spotlight */

/**
 * A card that lights up under the cursor.
 *
 * A radial gradient follows the pointer via CSS custom properties, which keeps
 * the work on the compositor instead of triggering React re-renders.
 */
export function SpotlightCard({
  className,
  children,
  glow = "#4f8fff",
}: {
  className?: string;
  children: React.ReactNode;
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-border bg-panel",
        "transition-colors duration-300 hover:border-white/20",
        className
      )}
    >
      {/* the moving light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), ${glow}22, transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------ count up */

/** Counts from 0 to `value` once, on mount. Skipped if motion is reduced. */
export function CountUp({
  value,
  duration = 900,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced || value === 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------------- progress ring */

export function ProgressRing({
  pct,
  size = 108,
  stroke = 9,
  color = "#4f8fff",
  label,
  sub,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: React.ReactNode;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const [offset, setOffset] = useState(c);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const target = c - (clamped / 100) * c;
    if (reduced) {
      setOffset(target);
      return;
    }
    const id = setTimeout(() => setOffset(target), 60);
    return () => clearTimeout(id);
  }, [clamped, c]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b202b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold leading-none">{label}</div>
        {sub && <div className="mt-1 text-[0.6rem] uppercase tracking-wide text-[#9aa1b2]">{sub}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- gradient border */

/** A card with an animated conic gradient border. Used for the hero tile. */
export function GradientBorder({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("relative rounded-2xl p-px", className)}>
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, #4f8fff33, #b46fef33, #ff9f4333, #22d3ee33, #4f8fff33)",
        }}
      />
      <div className="relative rounded-2xl bg-panel">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------ dot grid bg */

/** Subtle dotted backdrop, fading out toward the edges. */
export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: "radial-gradient(#2a3040 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
      }}
    />
  );
}

/* ------------------------------------------------------------- stagger in */

/** Fades children in one after another. Pure CSS delay, no animation library. */
export function Stagger({
  children,
  step = 60,
  className,
}: {
  children: React.ReactNode[];
  step?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <div key={i} className="fadein" style={{ animationDelay: `${i * step}ms` }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- sparkline */

/** Tiny score-history chart for the exam tile. */
export function Sparkline({
  points,
  color = "#35c98f",
  width = 220,
  height = 52,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return (
      <svg width={width} height={height}>
        <circle cx={width / 2} cy={height - points[0] * (height - 8) - 4} r={4} fill={color} />
      </svg>
    );
  }

  const step = width / (points.length - 1);
  const y = (v: number) => height - 4 - v * (height - 10);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${d} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={color} fillOpacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={i * step} cy={y(p)} r={2.5} fill={color} />
      ))}
    </svg>
  );
}
