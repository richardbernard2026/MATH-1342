"use client";

import { pdf } from "@/lib/math";

/**
 * Hand-drawn SVG diagrams, one per concept.
 *
 * These exist because a picture of a shaded normal curve teaches the idea of
 * "area = probability" faster than a paragraph does. Every diagram is pure SVG
 * with no chart library, so they render instantly and cost nothing.
 */

function Caption({ children, svg }: { children: React.ReactNode; svg: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {svg}
      <div className="mt-1 max-w-xs text-center text-[0.68rem] leading-snug text-[#9aa1b2]">
        {children}
      </div>
    </div>
  );
}

/** The bell curve, optionally shaded between two z-values. */
export function NormalCurve({
  zStart,
  zEnd,
  width = 260,
}: {
  zStart: number | null;
  zEnd: number | null;
  width?: number;
}) {
  const zx = (z: number) => 20 + ((z + 3.5) / 7) * 260;
  const zy = (z: number) => 108 - (pdf(z) / 0.399) * 92;

  const curve: string[] = [];
  for (let z = -3.5; z <= 3.51; z += 0.1) curve.push(`${zx(z).toFixed(1)},${zy(z).toFixed(1)}`);

  let shade = "";
  if (zStart != null && zEnd != null) {
    const pts: string[] = [];
    for (let z = zStart; z <= zEnd + 0.001; z += 0.05) pts.push(`${zx(z).toFixed(1)},${zy(z).toFixed(1)}`);
    shade = `M ${zx(zStart).toFixed(1)},108 L ${pts.join(" L ")} L ${zx(zEnd).toFixed(1)},108 Z`;
  }

  const markers = [zStart, zEnd].filter((z): z is number => z != null && z > -3.5 && z < 3.5);

  return (
    <svg viewBox="0 0 300 130" width={width} height={(width / 300) * 130}>
      <line x1="20" y1="108" x2="280" y2="108" stroke="#2a3040" />
      {shade && <path d={shade} fill="#35c98f" fillOpacity={0.35} />}
      <path d={`M ${curve.join(" L ")}`} fill="none" stroke="#e8eaf0" strokeWidth={1.6} />
      {markers.map((z, i) => (
        <line
          key={i}
          x1={zx(z)}
          y1={zy(z)}
          x2={zx(z)}
          y2={108}
          stroke="#ffd166"
          strokeDasharray="3,2"
        />
      ))}
      {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
        <text key={z} x={zx(z)} y={120} fontSize={9} fill="#9aa1b2" textAnchor="middle">
          {z}
        </text>
      ))}
    </svg>
  );
}

function Venn({ overlap }: { overlap: boolean }) {
  const secondX = overlap ? 135 : 210;
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 140" width={220} height={103}>
          <circle cx="110" cy="70" r="52" fill="#4f8fff" fillOpacity={0.35} stroke="#4f8fff" />
          <circle cx={secondX} cy="70" r="52" fill="#b46fef" fillOpacity={0.35} stroke="#b46fef" />
          <text x="82" y="45" fontSize={13} fill="#e8eaf0" fontWeight={700}>A</text>
          <text x={secondX + 26} y="45" fontSize={13} fill="#e8eaf0" fontWeight={700}>B</text>
        </svg>
      }
    >
      {overlap
        ? "The overlap belongs to both, so it gets subtracted once"
        : "No overlap, so nothing is double-counted"}
    </Caption>
  );
}

function ProbTree({ dependent }: { dependent: boolean }) {
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 130" width={240} height={104}>
          <circle cx="40" cy="65" r="5" fill="#e8eaf0" />
          <line x1="45" y1="62" x2="150" y2="25" stroke="#9aa1b2" />
          <line x1="45" y1="68" x2="150" y2="105" stroke="#9aa1b2" />
          <text x="88" y="34" fontSize={10} fill="#4f8fff">P(A)</text>
          <text x="82" y="106" fontSize={10} fill="#4f8fff">P(not A)</text>
          <circle cx="152" cy="25" r="4" fill="#4f8fff" />
          <circle cx="152" cy="105" r="4" fill="#4f8fff" />
          <line x1="156" y1="23" x2="255" y2="12" stroke="#9aa1b2" />
          <line x1="156" y1="28" x2="255" y2="42" stroke="#9aa1b2" />
          <text x="176" y="13" fontSize={10} fill="#b46fef">
            {dependent ? "P(B|A)" : "P(B)"}
          </text>
        </svg>
      }
    >
      {dependent
        ? "The second branch uses the updated probability"
        : "The branches multiply straight through"}
    </Caption>
  );
}

function TrialStrip({ n, x }: { n: number; x: number }) {
  const circles = [];
  for (let i = 0; i < n; i++) {
    const cx = 18 + (i * 264) / (n - 1 || 1);
    const success = i < x;
    circles.push(
      <circle
        key={i}
        cx={cx}
        cy={35}
        r={10}
        fill={success ? "#35c98f" : "#2a3040"}
        stroke={success ? "#35c98f" : "#9aa1b2"}
      />
    );
  }
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 70" width={240} height={56}>
          {circles}
        </svg>
      }
    >
      {x} successes out of {n} trials. The binomial coefficient counts how many
      different arrangements like this exist
    </Caption>
  );
}

function Bars({ touching }: { touching: boolean }) {
  const freqs = [3, 6, 9, 5, 2];
  const gap = touching ? 0 : 6;
  const bw = (250 - gap * 4) / 5;
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 120" width={260} height={104}>
          <line x1="25" y1="105" x2="285" y2="105" stroke="#2a3040" />
          <line x1="25" y1="12" x2="25" y2="105" stroke="#2a3040" />
          {freqs.map((v, i) => {
            const h = (v / 10) * 88;
            return (
              <rect
                key={i}
                x={26 + i * (bw + gap)}
                y={105 - h}
                width={bw}
                height={h}
                fill="#f472b6"
                fillOpacity={0.4}
                stroke="#f472b6"
              />
            );
          })}
        </svg>
      }
    >
      {touching
        ? "Histogram: bars touch, drawn at class boundaries"
        : "Bar graph: gaps, because the categories are separate"}
    </Caption>
  );
}

function Ogive() {
  const cum = [0, 3, 9, 18, 23, 25];
  const pts = cum.map((v, i) => [30 + i * 48, 105 - (v / 25) * 88] as [number, number]);
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 120" width={260} height={104}>
          <line x1="25" y1="105" x2="285" y2="105" stroke="#2a3040" />
          <line x1="25" y1="12" x2="25" y2="105" stroke="#2a3040" />
          <path
            d={`M ${pts.map((p) => `${p[0]},${p[1].toFixed(1)}`).join(" L ")}`}
            fill="none"
            stroke="#f472b6"
            strokeWidth={2}
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#f472b6" />
          ))}
        </svg>
      }
    >
      Cumulative frequency at each upper boundary, so the line only ever rises
    </Caption>
  );
}

function Pareto() {
  const freqs = [12, 8, 5, 3, 1];
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 120" width={260} height={104}>
          <line x1="25" y1="105" x2="285" y2="105" stroke="#2a3040" />
          {freqs.map((v, i) => {
            const h = (v / 13) * 88;
            return (
              <rect
                key={i}
                x={30 + i * 50}
                y={105 - h}
                width={44}
                height={h}
                fill="#f472b6"
                fillOpacity={0.4}
                stroke="#f472b6"
              />
            );
          })}
        </svg>
      }
    >
      Sorted highest to lowest, so the dominant category is unmissable
    </Caption>
  );
}

function BoxPlot() {
  const s = (v: number) => 25 + (v / 35) * 250;
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 100" width={270} height={90}>
          <line x1="25" y1="88" x2="285" y2="88" stroke="#2a3040" />
          {/* whiskers */}
          <line x1={s(5)} y1="45" x2={s(6.5)} y2="45" stroke="#a3e635" />
          <line x1={s(11.5)} y1="45" x2={s(12)} y2="45" stroke="#a3e635" />
          <line x1={s(5)} y1="33" x2={s(5)} y2="57" stroke="#a3e635" />
          <line x1={s(12)} y1="33" x2={s(12)} y2="57" stroke="#a3e635" />
          {/* box */}
          <rect
            x={s(6.5)}
            y="26"
            width={s(11.5) - s(6.5)}
            height="38"
            fill="#a3e635"
            fillOpacity={0.25}
            stroke="#a3e635"
          />
          <line x1={s(9)} y1="26" x2={s(9)} y2="64" stroke="#e8eaf0" strokeWidth={2} />
          {/* the outlier sits past the upper fence */}
          <circle cx={s(30)} cy="45" r="4" fill="none" stroke="#ff5d5d" strokeWidth={1.5} />
          <text x={s(30)} y="32" fontSize={8} fill="#ff5d5d" textAnchor="middle">outlier</text>
          <text x={s(6.5)} y="79" fontSize={8} fill="#9aa1b2" textAnchor="middle">Q1</text>
          <text x={s(9)} y="79" fontSize={8} fill="#9aa1b2" textAnchor="middle">med</text>
          <text x={s(11.5)} y="79" fontSize={8} fill="#9aa1b2" textAnchor="middle">Q3</text>
        </svg>
      }
    >
      The box is the middle 50%. Whiskers stop at the last non-outlier value
    </Caption>
  );
}

function SkewShapes() {
  return (
    <Caption
      svg={
        <svg viewBox="0 0 300 100" width={280} height={93}>
          <path d="M 10,80 Q 30,20 50,35 Q 70,50 90,80 Z" fill="#a3e635" fillOpacity={0.3} stroke="#a3e635" />
          <text x="50" y="95" fontSize={8} fill="#9aa1b2" textAnchor="middle">skewed right</text>
          <path d="M 110,80 Q 150,10 190,80 Z" fill="#a3e635" fillOpacity={0.3} stroke="#a3e635" />
          <text x="150" y="95" fontSize={8} fill="#9aa1b2" textAnchor="middle">symmetric</text>
          <path d="M 210,80 Q 230,50 250,35 Q 270,20 290,80 Z" fill="#a3e635" fillOpacity={0.3} stroke="#a3e635" />
          <text x="250" y="95" fontSize={8} fill="#9aa1b2" textAnchor="middle">skewed left</text>
        </svg>
      }
    >
      A right tail pulls the mean above the median; a left tail pulls it below
    </Caption>
  );
}

function MeasurementLadder() {
  const levels = [
    ["Nominal", "categories only"],
    ["Ordinal", "can be ranked"],
    ["Interval", "equal gaps, no true zero"],
    ["Ratio", "true zero, ratios work"],
  ];
  return (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      {levels.map((l, i) => (
        <div
          key={l[0]}
          className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-3 py-1.5"
          style={{ marginLeft: i * 12 }}
        >
          <span className="text-xs font-bold text-ch1">{l[0]}</span>
          <span className="text-[0.65rem] text-[#9aa1b2]">{l[1]}</span>
        </div>
      ))}
    </div>
  );
}

/** Lessons and decision-tree nodes reference diagrams by string key. */
export function DiagramByKey({ diagramKey }: { diagramKey?: string }) {
  switch (diagramKey) {
    case "venn-me":
      return <Venn overlap={false} />;
    case "venn-ov":
      return <Venn overlap={true} />;
    case "tree-indep":
      return <ProbTree dependent={false} />;
    case "tree-dep":
      return <ProbTree dependent={true} />;
    case "binom-strip":
      return <TrialStrip n={8} x={3} />;
    case "curve-left":
      return <NormalCurve zStart={-3.5} zEnd={1} />;
    case "curve-mid":
      return <NormalCurve zStart={-3.5} zEnd={1.28} />;
    case "curve-between":
      return <NormalCurve zStart={-1} zEnd={1} />;
    case "clt":
      return <NormalCurve zStart={-3.5} zEnd={1.5} />;
    case "empirical":
      return <NormalCurve zStart={-2} zEnd={2} />;
    case "histogram":
      return <Bars touching={true} />;
    case "bargraph":
      return <Bars touching={false} />;
    case "ogive":
      return <Ogive />;
    case "pareto":
      return <Pareto />;
    case "boxplot":
      return <BoxPlot />;
    case "skew":
      return <SkewShapes />;
    case "ladder":
      return <MeasurementLadder />;
    default:
      return null;
  }
}
