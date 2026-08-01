"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/kit";
import { MathText } from "@/components/MathText";
import { normalCDF, pdf, binomPMF, median, round } from "@/lib/math";

/**
 * Interactive intuition builders.
 *
 * Each one lets you move a parameter and watch the consequence immediately.
 * The point is to make relationships felt rather than memorized: that raising n
 * shrinks the standard error, that one outlier drags the mean but not the
 * median, that a binomial quietly turns into a bell curve.
 */

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#9aa1b2]">{label}</span>
        <span className="font-mono text-warn">{display ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-panel2 accent-white"
      />
    </label>
  );
}

function Readout({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-panel2 px-3 py-2 text-center">
          <div className="text-[0.62rem] uppercase tracking-wide text-[#9aa1b2]">{k}</div>
          <div className="mt-0.5 font-mono text-sm text-[#e8eaf0]">{v}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------ normal curve + shaded area */

function NormalArea({ showSampleMean = false }: { showSampleMean?: boolean }) {
  const [mu, setMu] = useState(100);
  const [sigma, setSigma] = useState(15);
  const [x, setX] = useState(130);
  const [n, setN] = useState(1);

  const se = sigma / Math.sqrt(n);
  const z = (x - mu) / se;
  const left = normalCDF(z);

  // Draw in z-space so the curve always fits the viewbox.
  const zx = (t: number) => 20 + ((t + 3.5) / 7) * 260;
  const zy = (t: number) => 108 - (pdf(t) / 0.399) * 92;
  const curve: string[] = [];
  for (let t = -3.5; t <= 3.51; t += 0.08) curve.push(`${zx(t).toFixed(1)},${zy(t).toFixed(1)}`);

  const clamped = Math.max(-3.5, Math.min(3.5, z));
  const shade: string[] = [];
  for (let t = -3.5; t <= clamped + 0.001; t += 0.04) shade.push(`${zx(t).toFixed(1)},${zy(t).toFixed(1)}`);
  const shadePath =
    shade.length > 1
      ? `M ${zx(-3.5).toFixed(1)},108 L ${shade.join(" L ")} L ${zx(clamped).toFixed(1)},108 Z`
      : "";

  return (
    <div>
      <svg viewBox="0 0 300 128" className="w-full" style={{ maxHeight: 190 }}>
        <line x1="20" y1="108" x2="280" y2="108" stroke="#2a3040" />
        {shadePath && <path d={shadePath} fill="#35c98f" fillOpacity={0.35} />}
        <path d={`M ${curve.join(" L ")}`} fill="none" stroke="#e8eaf0" strokeWidth={1.6} />
        <line x1={zx(clamped)} y1={zy(clamped)} x2={zx(clamped)} y2={108} stroke="#ffd166" strokeWidth={1.5} />
        <text x={zx(clamped)} y={zy(clamped) - 5} fontSize={9} fill="#ffd166" textAnchor="middle">
          x = {round(x, 2)}
        </text>
        {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
          <text key={t} x={zx(t)} y={120} fontSize={8} fill="#9aa1b2" textAnchor="middle">
            {round(mu + t * se, 1)}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-col gap-3">
        <Slider label="mean (mu)" value={mu} min={0} max={200} step={1} onChange={setMu} />
        <Slider label="standard deviation (sigma)" value={sigma} min={1} max={40} step={1} onChange={setSigma} />
        <Slider label="the value x" value={x} min={0} max={250} step={1} onChange={setX} />
        {showSampleMean && (
          <Slider
            label="sample size (n)"
            value={n}
            min={1}
            max={100}
            step={1}
            onChange={setN}
            display={n === 1 ? "1 (a single value)" : String(n)}
          />
        )}
      </div>

      <Readout
        items={[
          [showSampleMean ? "standard error" : "sigma", round(se, 3).toString()],
          ["z-score", round(z, 3).toString()],
          ["area left", round(left, 4).toString()],
          ["area right", round(1 - left, 4).toString()],
          ["percentile", `${round(left * 100, 1)}%`],
          ["", ""],
        ].filter(([k]) => k !== "") as [string, string][]}
      />

      <p className="mt-3 text-xs leading-relaxed text-[#9aa1b2]">
        {showSampleMean
          ? "Drag n upward and watch the curve tighten around the mean. The value x stays put, but its z-score grows, because averaging more observations makes the same distance from the mean far more surprising."
          : "Notice that moving mu slides the whole curve while sigma stretches it. The z-score is just x re-expressed in standard-deviation units, which is why one table works for every normal curve."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------- binomial explorer */

function BinomialExplorer() {
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);

  const bars = useMemo(() => {
    const out: { x: number; prob: number }[] = [];
    for (let x = 0; x <= n; x++) out.push({ x, prob: binomPMF(n, p, x) });
    return out;
  }, [n, p]);

  const maxProb = Math.max(...bars.map((b) => b.prob), 0.0001);
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  const bw = 268 / (n + 1);

  return (
    <div>
      <svg viewBox="0 0 300 120" className="w-full" style={{ maxHeight: 180 }}>
        <line x1="18" y1="104" x2="292" y2="104" stroke="#2a3040" />
        {bars.map((b) => {
          const h = (b.prob / maxProb) * 88;
          return (
            <rect
              key={b.x}
              x={20 + b.x * bw}
              y={104 - h}
              width={Math.max(1.5, bw - 1.5)}
              height={h}
              fill="#b46fef"
              fillOpacity={0.45}
              stroke="#b46fef"
              strokeWidth={0.8}
            />
          );
        })}
        <line
          x1={20 + mean * bw + bw / 2}
          y1="12"
          x2={20 + mean * bw + bw / 2}
          y2="104"
          stroke="#ffd166"
          strokeDasharray="3,2"
        />
      </svg>

      <div className="mt-3 flex flex-col gap-3">
        <Slider label="number of trials (n)" value={n} min={1} max={40} step={1} onChange={setN} />
        <Slider
          label="probability of success (p)"
          value={p}
          min={0.05}
          max={0.95}
          step={0.05}
          onChange={setP}
          display={p.toFixed(2)}
        />
      </div>

      <Readout
        items={[
          ["mean = np", round(mean, 2).toString()],
          ["variance = npq", round(n * p * (1 - p), 3).toString()],
          ["sd", round(sd, 3).toString()],
        ]}
      />

      <p className="mt-3 text-xs leading-relaxed text-[#9aa1b2]">
        Push n up past about 20 and the bars start tracing a bell curve, even when p is nowhere
        near 0.5. That is not a coincidence: it is the reason Chapter 6&apos;s normal distribution can
        stand in for a binomial when n gets large. The yellow line marks the mean, np.
      </p>
    </div>
  );
}

/* ------------------------------------------- mean vs median under an outlier */

function CenterTug() {
  const base = [4, 5, 5, 6, 7, 7, 8];
  const [outlier, setOutlier] = useState(9);

  const data = [...base, outlier];
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const med = median(sorted);

  const scale = (v: number) => 20 + ((v - 0) / 60) * 260;

  return (
    <div>
      <svg viewBox="0 0 300 96" className="w-full" style={{ maxHeight: 150 }}>
        <line x1="18" y1="66" x2="292" y2="66" stroke="#2a3040" />
        {sorted.map((v, i) => (
          <circle key={i} cx={scale(v)} cy={66} r={5} fill="#a3e635" fillOpacity={0.55} stroke="#a3e635" />
        ))}
        {/* mean marker */}
        <line x1={scale(mean)} y1="34" x2={scale(mean)} y2="78" stroke="#ff9f43" strokeWidth={2} />
        <text x={scale(mean)} y="28" fontSize={9} fill="#ff9f43" textAnchor="middle">mean</text>
        {/* median marker */}
        <line x1={scale(med)} y1="54" x2={scale(med)} y2="90" stroke="#4f8fff" strokeWidth={2} />
        <text x={scale(med)} y="96" fontSize={9} fill="#4f8fff" textAnchor="middle">median</text>
      </svg>

      <div className="mt-3">
        <Slider
          label="drag the largest value"
          value={outlier}
          min={9}
          max={60}
          step={1}
          onChange={setOutlier}
        />
      </div>

      <Readout
        items={[
          ["mean", round(mean, 2).toString()],
          ["median", round(med, 2).toString()],
          ["gap", round(Math.abs(mean - med), 2).toString()],
        ]}
      />

      <p className="mt-3 text-xs leading-relaxed text-[#9aa1b2]">
        Drag that last point out to 60. The orange mean chases it across the axis while the blue
        median barely twitches, because the median only cares which value sits in the middle
        position, not how large it is. When these two separate, the data is skewed, and the median
        is usually the more honest summary.
      </p>
    </div>
  );
}

/* --------------------------------------------------- addition rule / overlap */

function OverlapExplorer() {
  const [both, setBoth] = useState(60);
  const total = 250;
  const a = 150;
  const b = 100;
  const maxBoth = Math.min(a, b);

  const pA = a / total;
  const pB = b / total;
  const pBoth = both / total;
  const pOr = pA + pB - pBoth;

  // circle centres slide together as the overlap grows
  const shift = 40 + (1 - both / maxBoth) * 60;

  return (
    <div>
      <svg viewBox="0 0 300 130" className="w-full" style={{ maxHeight: 170 }}>
        <circle cx={150 - shift / 2} cy="62" r="48" fill="#4f8fff" fillOpacity={0.35} stroke="#4f8fff" />
        <circle cx={150 + shift / 2} cy="62" r="48" fill="#b46fef" fillOpacity={0.35} stroke="#b46fef" />
        <text x={150 - shift / 2 - 20} y="40" fontSize={11} fill="#e8eaf0" fontWeight={700}>email</text>
        <text x={150 + shift / 2 - 4} y="40" fontSize={11} fill="#e8eaf0" fontWeight={700}>social</text>
        <text x="150" y="122" fontSize={9} fill="#9aa1b2" textAnchor="middle">
          {both} customers want both
        </text>
      </svg>

      <div className="mt-3">
        <Slider label="customers wanting BOTH" value={both} min={0} max={maxBoth} step={5} onChange={setBoth} />
      </div>

      <Readout
        items={[
          ["P(email)", round(pA, 3).toString()],
          ["P(social)", round(pB, 3).toString()],
          ["P(both)", round(pBoth, 3).toString()],
          ["sum, no subtraction", round(pA + pB, 3).toString()],
          ["P(email or social)", round(pOr, 3).toString()],
        ]}
      />

      <p className="mt-3 text-xs leading-relaxed text-[#9aa1b2]">
        The naive sum stays frozen at 1.0 no matter what, which would claim every customer wants
        one or the other. Only the corrected value moves. Slide the overlap to zero and the two
        agree exactly, which is precisely the mutually-exclusive case where the subtraction term
        vanishes.
      </p>
    </div>
  );
}

/* ------------------------------------------------- class width / histogram shape */

function ClassWidthExplorer() {
  const data = useMemo(
    () => [12, 15, 18, 19, 22, 23, 25, 27, 28, 31, 33, 34, 36, 39, 41, 44, 47, 52, 61, 87],
    []
  );
  const [classes, setClasses] = useState(5);

  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const range = hi - lo;
  const width = Math.ceil(range / classes);

  const bins = useMemo(() => {
    const out: { start: number; end: number; count: number }[] = [];
    for (let i = 0; i < classes; i++) {
      const start = lo + i * width;
      const end = start + width - 1;
      out.push({ start, end, count: data.filter((v) => v >= start && v <= end).length });
    }
    return out;
  }, [classes, width, lo, data]);

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const bw = 268 / classes;

  return (
    <div>
      <svg viewBox="0 0 300 120" className="w-full" style={{ maxHeight: 180 }}>
        <line x1="18" y1="104" x2="292" y2="104" stroke="#2a3040" />
        {bins.map((b, i) => {
          const h = (b.count / maxCount) * 86;
          return (
            <g key={i}>
              <rect
                x={20 + i * bw}
                y={104 - h}
                width={bw}
                height={h}
                fill="#f472b6"
                fillOpacity={0.4}
                stroke="#f472b6"
              />
              <text x={20 + i * bw + bw / 2} y={116} fontSize={7} fill="#9aa1b2" textAnchor="middle">
                {b.start}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3">
        <Slider label="number of classes" value={classes} min={3} max={10} step={1} onChange={setClasses} />
      </div>

      <Readout
        items={[
          ["range", range.toString()],
          ["class width", width.toString()],
          ["computed", `${range} / ${classes} = ${round(range / classes, 2)}`],
        ]}
      />

      <p className="mt-3 text-xs leading-relaxed text-[#9aa1b2]">
        Same twenty data points every time, but the story changes with the number of classes. Too
        few and the shape flattens into nothing; too many and it breaks into noisy spikes. Note the
        width is always rounded up from the division shown, which is what guarantees the largest
        value still has a class to land in.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- dispatcher */

const BY_SECTION: Record<string, { title: string; node: React.ReactNode }> = {
  "2.1": { title: "How many classes should you use?", node: <ClassWidthExplorer /> },
  "2.2": { title: "How class width reshapes a histogram", node: <ClassWidthExplorer /> },
  "3.1": { title: "Watch an outlier drag the mean", node: <CenterTug /> },
  "3.2": { title: "The Empirical Rule, live", node: <NormalArea /> },
  "3.3": { title: "Where a value sits on the curve", node: <NormalArea /> },
  "4.2": { title: "Why you subtract the overlap", node: <OverlapExplorer /> },
  "5.3": { title: "Watch a binomial become a bell curve", node: <BinomialExplorer /> },
  "6.1": { title: "Move the curve, read the area", node: <NormalArea /> },
  "6.2": { title: "Areas and cutoffs, both directions", node: <NormalArea /> },
  "6.3": { title: "Watch the standard error shrink", node: <NormalArea showSampleMean /> },
};

export function Playground({ sectionId }: { sectionId: string }) {
  const entry = BY_SECTION[sectionId];
  if (!entry) return null;

  return (
    <Card>
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#9aa1b2]">
        Playground
      </div>
      <h3 className="mb-4 text-base font-bold">
        <MathText>{entry.title}</MathText>
      </h3>
      {entry.node}
    </Card>
  );
}

export function hasPlayground(sectionId: string) {
  return Boolean(BY_SECTION[sectionId]);
}
