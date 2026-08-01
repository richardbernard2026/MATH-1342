import { round, normalCDF, normalInv, nCr, binomPMF, pick, randInt, median, quartiles } from "./math";

/**
 * Infinite practice problems.
 *
 * Every problem is generated fresh with random values, and its answer is
 * computed from those same values at generation time. Nothing is hard-coded, so
 * a prompt and its answer can never disagree. The step list is written as a
 * worked solution, not just a final number.
 */

export type PracticeProblem = {
  ch: number;
  topic: string;
  topicLabel: string;
  prompt: string;
  steps: string[];
  kind: "numeric" | "choice";
  /** Numeric answer, or the index of the correct choice. */
  answer: number;
  tol: number;
  choices?: string[];
};

const N = (
  ch: number,
  topic: string,
  topicLabel: string,
  prompt: string,
  steps: string[],
  answer: number,
  tol: number
): PracticeProblem => ({ ch, topic, topicLabel, prompt, steps, kind: "numeric", answer, tol });

const C = (
  ch: number,
  topic: string,
  topicLabel: string,
  prompt: string,
  choices: string[],
  answer: number,
  steps: string[]
): PracticeProblem => ({ ch, topic, topicLabel, prompt, steps, kind: "choice", answer, tol: 0, choices });

export const topicsByChapter: Record<number, { key: string; label: string }[]> = {
  1: [
    { key: "desc-inf", label: "Descriptive vs Inferential" },
    { key: "var-type", label: "Variable Type" },
    { key: "level", label: "Level of Measurement" },
  ],
  2: [
    { key: "classwidth", label: "Class Width" },
    { key: "midbound", label: "Midpoints & Boundaries" },
    { key: "cumrel", label: "Cumulative & Relative Frequency" },
    { key: "graphpick", label: "Choosing a Graph" },
  ],
  3: [
    { key: "center", label: "Mean, Median, Mode" },
    { key: "spread", label: "Variance & Standard Deviation" },
    { key: "zpos", label: "z-scores" },
    { key: "quart", label: "Quartiles & Outliers" },
  ],
  4: [
    { key: "addition", label: "Addition Rule" },
    { key: "multiplication", label: "Multiplication Rule" },
    { key: "atleastone", label: "At Least One" },
  ],
  5: [
    { key: "meanvariance", label: "Mean & Variance" },
    { key: "binomial-exact", label: "Binomial Probability" },
    { key: "binomial-meansd", label: "Binomial Mean & SD" },
  ],
  6: [
    { key: "area-from-z", label: "Area from a Value" },
    { key: "value-from-area", label: "Value from a Percentile" },
    { key: "clt", label: "Central Limit Theorem" },
  ],
};

/* --------------------------------------------------------------- item banks */

const STATEMENTS: [string, number][] = [
  ["In a survey of 250 shoppers, 42% said they prefer online checkout.", 0],
  ["Researchers predict electric vehicles will be half of new car sales within a decade.", 1],
  ["The average score on last week's quiz in this class was 78.", 0],
  ["Drinking green tea daily can lower your risk of heart disease.", 1],
  ["Of the 40 cars serviced this month, 12 needed new brakes.", 0],
  ["Based on this sample, the typical adult sleeps under 7 hours a night.", 1],
  ["The median home price in the sampled neighborhood was $310,000.", 0],
  ["Experts say mortgage rates may soon hit bottom.", 1],
  ["Exactly 18 of the 30 students surveyed own a car.", 0],
  ["This new teaching method will improve test scores nationwide.", 1],
];

const VARIABLES: [string, number][] = [
  ["Number of text messages sent in a day", 1],
  ["Height of a basketball player", 2],
  ["Favorite pizza topping", 0],
  ["Time to finish a 5K race", 2],
  ["Number of pets in a household", 1],
  ["Blood type", 0],
  ["Weight of a suitcase", 2],
  ["Number of cars in a parking lot", 1],
  ["Jersey color of a team", 0],
  ["Temperature of a cup of coffee", 2],
  ["Number of siblings", 1],
  ["Volume of water in a bottle", 2],
];

const LEVELS: [string, number][] = [
  ["Zip codes", 0],
  ["Finishing places in a race", 1],
  ["Temperature in degrees Celsius", 2],
  ["Annual salary in dollars", 3],
  ["Types of music", 0],
  ["Satisfaction rated poor, fair, or good", 1],
  ["Calendar years", 2],
  ["Distance driven in miles", 3],
  ["Social security numbers", 0],
  ["Military rank", 1],
  ["Weight in kilograms", 3],
  ["IQ scores", 2],
];

const GRAPHS: [string, number][] = [
  ["You want to see how many values fall BELOW each class boundary.", 2],
  ["You want to rank product categories from most to least common.", 3],
  ["You are tracking monthly revenue over two years.", 4],
  ["You must preserve every exact value while still seeing the shape.", 5],
  ["You want the standard picture of a numeric frequency distribution.", 0],
  ["You want to compare two distributions on the same set of axes.", 1],
];

const GRAPH_CHOICES = [
  "Histogram",
  "Frequency polygon",
  "Ogive",
  "Pareto chart",
  "Time series graph",
  "Stem-and-leaf plot",
];

const DISTRIBUTIONS = [
  { X: [0, 1, 2, 3], P: [0.1, 0.3, 0.4, 0.2] },
  { X: [0, 1, 2], P: [0.5, 0.3, 0.2] },
  { X: [1, 2, 3, 4], P: [0.1, 0.4, 0.3, 0.2] },
  { X: [0, 1, 2, 3, 4], P: [0.05, 0.2, 0.4, 0.25, 0.1] },
  { X: [0, 1, 2], P: [0.25, 0.5, 0.25] },
  { X: [2, 3, 4], P: [0.3, 0.5, 0.2] },
];

/* -------------------------------------------------------------- generators */

const generators: Record<string, () => PracticeProblem> = {
  "desc-inf": () => {
    const [s, a] = pick(STATEMENTS);
    return C(
      1,
      "desc-inf",
      "Descriptive vs Inferential",
      `Classify this statement: "${s}"`,
      ["Descriptive", "Inferential"],
      a,
      [
        a === 0
          ? "It only reports what was actually observed in the data collected, so it is descriptive."
          : "It makes a prediction or generalizes beyond the data collected, so it is inferential.",
      ]
    );
  },

  "var-type": () => {
    const [v, a] = pick(VARIABLES);
    const why = [
      "It names a category rather than a quantity, so it is qualitative.",
      "It is a count: whole numbers with gaps between them, so it is discrete.",
      "It is a measurement that can take any value in a range, so it is continuous.",
    ];
    return C(
      1,
      "var-type",
      "Variable Type",
      `Classify the variable: ${v}`,
      ["Qualitative", "Quantitative, discrete", "Quantitative, continuous"],
      a,
      [why[a]]
    );
  },

  level: () => {
    const [v, a] = pick(LEVELS);
    const why = [
      "Categories with no meaningful order, so nominal.",
      "It can be ranked, but the gaps are not equal, so ordinal.",
      "Equal gaps but zero is arbitrary, so interval.",
      "Equal gaps AND a true zero, so ratio.",
    ];
    return C(1, "level", "Level of Measurement", `What level of measurement is this? ${v}`, ["Nominal", "Ordinal", "Interval", "Ratio"], a, [why[a]]);
  },

  classwidth: () => {
    const lo = randInt(2, 20);
    const hi = lo + pick([25, 33, 42, 55, 68, 74, 90]);
    const k = pick([5, 6, 7, 8]);
    const range = hi - lo;
    const width = Math.ceil(range / k);
    return N(
      2,
      "classwidth",
      "Class Width",
      `A data set runs from ${lo} to ${hi}. Using ${k} classes, find the class width.`,
      [
        `$\\text{range} = ${hi} - ${lo} = ${range}$`,
        `$${range} \\div ${k} = ${round(range / k, 3)}$`,
        `Always round UP: class width $= ${width}$`,
      ],
      width,
      0.01
    );
  },

  midbound: () => {
    const lo = pick([10, 20, 25, 30, 45, 50, 60]);
    const w = pick([5, 10, 15]);
    const hi = lo + w - 1;
    const askMid = Math.random() < 0.5;
    const mid = (lo + hi) / 2;
    return N(
      2,
      "midbound",
      "Midpoints & Boundaries",
      `A class runs ${lo}-${hi}. Find its ${askMid ? "midpoint" : "LOWER class boundary"}.`,
      askMid
        ? [`$\\text{midpoint} = \\dfrac{${lo} + ${hi}}{2} = ${round(mid, 2)}$`]
        : [
            "Boundaries shift the limits by $0.5$ so the bars touch.",
            `$\\text{lower boundary} = ${lo} - 0.5 = ${lo - 0.5}$`,
          ],
      askMid ? round(mid, 2) : lo - 0.5,
      0.01
    );
  },

  cumrel: () => {
    const k = pick([3, 4, 5]);
    const f: number[] = [];
    for (let i = 0; i < k; i++) f.push(randInt(2, 12));
    const total = f.reduce((a, b) => a + b, 0);
    const idx = randInt(0, k - 1);
    const askCum = Math.random() < 0.5;
    const cum = f.slice(0, idx + 1).reduce((a, b) => a + b, 0);
    const rel = round((100 * f[idx]) / total, 2);
    return N(
      2,
      "cumrel",
      "Cumulative & Relative Frequency",
      `Class frequencies are ${f.join(", ")} for a total of ${total}. Find the ${
        askCum
          ? `cumulative frequency through class ${idx + 1}`
          : `relative frequency of class ${idx + 1}, as a percent`
      }.`,
      askCum
        ? [
            `Add every frequency up to and including class ${idx + 1}:`,
            `$${f.slice(0, idx + 1).join(" + ")} = ${cum}$`,
          ]
        : [
            `$\\text{relative frequency} = \\dfrac{\\text{class frequency}}{\\text{total}}$`,
            `$= \\dfrac{${f[idx]}}{${total}} = ${rel}\\%$`,
          ],
      askCum ? cum : rel,
      askCum ? 0.01 : 0.5
    );
  },

  graphpick: () => {
    const [s, a] = pick(GRAPHS);
    const why = [
      "A histogram is the standard picture of a numeric frequency distribution.",
      "Frequency polygons overlay cleanly, which is what you want when comparing distributions.",
      "An ogive plots cumulative frequency, which directly answers how many fall below a point.",
      "A Pareto chart sorts the bars highest to lowest so the dominant category stands out.",
      "A time series graph puts time on the horizontal axis to reveal the trend.",
      "A stem-and-leaf plot shows the shape while keeping every exact value.",
    ];
    return C(2, "graphpick", "Choosing a Graph", `Which graph fits best? ${s}`, GRAPH_CHOICES, a, [why[a]]);
  },

  center: () => {
    // Build a set with exactly one mode so "find the mode" is unambiguous.
    let data: number[] = [];
    let modes: number[] = [];
    for (let attempt = 0; attempt < 60; attempt++) {
      const n = pick([5, 7, 9]);
      const base = randInt(2, 12);
      const d: number[] = [];
      for (let i = 0; i < n - 2; i++) d.push(base + randInt(0, 6));
      const dup = d[randInt(0, d.length - 1)];
      d.push(dup, dup);
      const counts: Record<number, number> = {};
      d.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const mx = Math.max(...Object.values(counts));
      const ms = Object.keys(counts)
        .filter((k) => counts[Number(k)] === mx)
        .map(Number);
      data = d;
      modes = ms;
      if (ms.length === 1) break;
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const med = median(sorted);
    const midrange = (sorted[0] + sorted[n - 1]) / 2;

    const which = modes.length === 1 ? pick(["mean", "median", "mode", "midrange"]) : pick(["mean", "median", "midrange"]);
    const answer =
      which === "mean" ? round(mean, 4) : which === "median" ? med : which === "mode" ? modes[0] : midrange;

    const steps =
      which === "mean"
        ? [`Add all ${n} values: $${sum}$`, `$\\bar{x} = \\dfrac{${sum}}{${n}} = ${round(mean, 4)}$`]
        : which === "median"
          ? [`Sort: ${sorted.join(", ")}`, `With $n = ${n}$, the median is $${med}$`]
          : which === "mode"
            ? [`Sort: ${sorted.join(", ")}`, `The most frequent value is $${modes[0]}$`]
            : [
                `Sort: ${sorted.join(", ")}`,
                `$\\text{midrange} = \\dfrac{${sorted[0]} + ${sorted[n - 1]}}{2} = ${midrange}$`,
              ];

    return N(3, "center", "Mean, Median, Mode", `Find the ${which} of: ${data.join(", ")}`, steps, answer, 0.03);
  },

  spread: () => {
    const n = pick([5, 6, 7]);
    const data: number[] = [];
    for (let i = 0; i < n; i++) data.push(randInt(20, 60));
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const ss = data.reduce((a, v) => a + Math.pow(v - mean, 2), 0);
    const variance = ss / (n - 1);
    const which = pick(["range", "variance", "standard deviation"]);
    const answer =
      which === "range"
        ? Math.max(...data) - Math.min(...data)
        : which === "variance"
          ? round(variance, 3)
          : round(Math.sqrt(variance), 3);

    const steps =
      which === "range"
        ? [`$\\text{range} = ${Math.max(...data)} - ${Math.min(...data)} = ${Math.max(...data) - Math.min(...data)}$`]
        : [
            `$\\bar{x} = ${round(mean, 4)}$`,
            `$\\sum (x - \\bar{x})^2 = ${round(ss, 4)}$`,
            `$s^2 = \\dfrac{${round(ss, 4)}}{${n} - 1} = ${round(variance, 4)}$`,
            ...(which === "standard deviation" ? [`$s = \\sqrt{${round(variance, 4)}} = ${round(Math.sqrt(variance), 4)}$`] : []),
          ];

    return N(
      3,
      "spread",
      "Variance & Standard Deviation",
      `For the SAMPLE ${data.join(", ")}, find the ${which}. Round to 2 or 3 decimals.`,
      steps,
      answer,
      which === "range" ? 0.01 : 0.05
    );
  },

  zpos: () => {
    const mean = pick([50, 60, 70, 80, 100]);
    const sd = pick([4, 5, 8, 10, 12]);
    const z = pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
    const value = round(mean + z * sd, 2);
    return N(
      3,
      "zpos",
      "z-scores",
      `A data set has mean ${mean} and standard deviation ${sd}. Find the z-score for the value ${value}.`,
      [`$z = \\dfrac{x - \\bar{x}}{s}$`, `$= \\dfrac{${value} - ${mean}}{${sd}} = ${round(z, 3)}$`],
      round(z, 3),
      0.05
    );
  },

  quart: () => {
    const n = pick([8, 12]);
    const data: number[] = [];
    for (let i = 0; i < n; i++) data.push(randInt(5, 60));
    const sorted = [...data].sort((a, b) => a - b);
    const { Q1, Q2, Q3 } = quartiles(sorted);
    const iqr = Q3 - Q1;
    const which = pick(["Q1", "Q3", "the IQR", "the upper outlier fence"]);
    const answer =
      which === "Q1" ? Q1 : which === "Q3" ? Q3 : which === "the IQR" ? round(iqr, 4) : round(Q3 + 1.5 * iqr, 4);
    const half = n / 2;

    const steps = [
      `Sort: ${sorted.join(", ")}`,
      `Median $= ${Q2}$`,
      `$Q_1 = $ median of the lower half (${sorted.slice(0, half).join(", ")}) $= ${Q1}$`,
      `$Q_3 = $ median of the upper half (${sorted.slice(half).join(", ")}) $= ${Q3}$`,
    ];
    if (which === "the IQR" || which === "the upper outlier fence") {
      steps.push(`$\\text{IQR} = ${Q3} - ${Q1} = ${round(iqr, 4)}$`);
    }
    if (which === "the upper outlier fence") {
      steps.push(`$\\text{upper fence} = ${Q3} + 1.5(${round(iqr, 4)}) = ${round(Q3 + 1.5 * iqr, 4)}$`);
    }

    return N(3, "quart", "Quartiles & Outliers", `For the data ${data.join(", ")}, find ${which}.`, steps, answer, 0.05);
  },

  addition: () => {
    const total = pick([100, 200, 250, 300, 400, 500]);
    const countA = Math.round(total * pick([0.2, 0.3, 0.4, 0.5, 0.6]));
    const countB = Math.round(total * pick([0.2, 0.25, 0.3, 0.4]));
    const overlaps = Math.random() < 0.5;
    let both = 0;
    if (overlaps) {
      const maxBoth = Math.min(countA, countB);
      const opts = [0.1, 0.15, 0.2, 0.25].filter((d) => Math.round(total * d) <= maxBoth && Math.round(total * d) > 0);
      both = opts.length ? Math.round(total * pick(opts)) : Math.min(1, maxBoth);
    }
    const pA = countA / total;
    const pB = countB / total;
    const pBoth = both / total;
    const answer = overlaps ? round(pA + pB - pBoth, 4) : round(pA + pB, 4);

    return N(
      4,
      "addition",
      "Addition Rule",
      overlaps
        ? `Out of ${total} customers, ${countA} want email marketing, ${countB} want social ads, and ${both} want both. Find P(email or social).`
        : `Out of ${total} customers, ${countA} want email marketing and ${countB} want social ads. Nobody wants both. Find P(email or social).`,
      [
        `$P(A) = \\dfrac{${countA}}{${total}} = ${round(pA, 4)}$`,
        `$P(B) = \\dfrac{${countB}}{${total}} = ${round(pB, 4)}$`,
        overlaps
          ? `$P(A \\text{ and } B) = \\dfrac{${both}}{${total}} = ${round(pBoth, 4)}$`
          : "Mutually exclusive, so there is no overlap term to subtract.",
        overlaps
          ? `$P(A \\text{ or } B) = ${round(pA, 4)} + ${round(pB, 4)} - ${round(pBoth, 4)} = ${answer}$`
          : `$P(A \\text{ or } B) = ${round(pA, 4)} + ${round(pB, 4)} = ${answer}$`,
      ],
      answer,
      0.01
    );
  },

  multiplication: () => {
    const total = pick([8, 10, 12, 15, 20]);
    const winners = randInt(2, Math.floor(total / 2));
    const p1 = winners / total;
    const p2 = (winners - 1) / (total - 1);
    const answer = round(p1 * p2, 4);
    return N(
      4,
      "multiplication",
      "Multiplication Rule",
      `A box has ${total} raffle tickets, ${winners} of which are winners. Two are drawn without replacement. Find P(both winners).`,
      [
        `$P(\\text{1st winner}) = \\dfrac{${winners}}{${total}} = ${round(p1, 4)}$`,
        `$P(\\text{2nd winner} \\mid \\text{1st was}) = \\dfrac{${winners - 1}}{${total - 1}} = ${round(p2, 4)}$`,
        `$P(\\text{both}) = ${round(p1, 4)} \\times ${round(p2, 4)} = ${answer}$`,
      ],
      answer,
      0.005
    );
  },

  atleastone: () => {
    const n = randInt(2, 4);
    const pFail = pick([0.1, 0.15, 0.2, 0.25, 0.3]);
    const answer = round(1 - Math.pow(pFail, n), 4);
    return N(
      4,
      "atleastone",
      "At Least One",
      `${n} independent trials are run, each with a ${round(pFail * 100, 0)}% chance of failure. Find P(at least one success).`,
      [
        `$P(\\text{all fail}) = ${pFail}^{${n}} = ${round(Math.pow(pFail, n), 5)}$`,
        `$P(\\text{at least one}) = 1 - ${round(Math.pow(pFail, n), 5)} = ${answer}$`,
      ],
      answer,
      0.005
    );
  },

  meanvariance: () => {
    const d = pick(DISTRIBUTIONS);
    const mean = d.X.reduce((a, x, i) => a + x * d.P[i], 0);
    const eX2 = d.X.reduce((a, x, i) => a + x * x * d.P[i], 0);
    const variance = eX2 - mean * mean;
    const askVariance = Math.random() < 0.5;

    const steps = [
      `$E(X) = ${d.X.map((x, i) => `${x}(${d.P[i]})`).join(" + ")} = ${round(mean, 4)}$`,
    ];
    if (askVariance) {
      steps.push(`$E(X^2) = ${round(eX2, 4)}$`);
      steps.push(`$\\sigma^2 = ${round(eX2, 4)} - (${round(mean, 4)})^2 = ${round(variance, 4)}$`);
    }

    return N(
      5,
      "meanvariance",
      "Mean & Variance",
      `A random variable X has ${d.X.map((x, i) => `P(${x}) = ${d.P[i]}`).join(", ")}. Find the ${askVariance ? "variance" : "mean"}.`,
      steps,
      round(askVariance ? variance : mean, 4),
      0.03
    );
  },

  "binomial-exact": () => {
    const n = randInt(5, 12);
    const p = pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
    const x = randInt(0, n);
    const answer = round(binomPMF(n, p, x), 4);
    return N(
      5,
      "binomial-exact",
      "Binomial Probability",
      `A binomial experiment has $n = ${n}$ and $p = ${p}$. Find $P(X = ${x})$.`,
      [
        `$\\binom{${n}}{${x}} = ${nCr(n, x)}$`,
        `$p^{${x}} = ${round(Math.pow(p, x), 6)}$`,
        `$q^{${n - x}} = ${round(Math.pow(1 - p, n - x), 6)}$`,
        `$P(X = ${x}) = ${nCr(n, x)} \\times ${round(Math.pow(p, x), 6)} \\times ${round(Math.pow(1 - p, n - x), 6)} = ${answer}$`,
      ],
      answer,
      Math.max(0.01, answer * 0.05)
    );
  },

  "binomial-meansd": () => {
    const n = randInt(10, 40);
    const p = pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7]);
    const mean = n * p;
    const variance = n * p * (1 - p);
    const askSd = Math.random() < 0.5;
    return N(
      5,
      "binomial-meansd",
      "Binomial Mean & SD",
      `A binomial has $n = ${n}$ and $p = ${p}$. Find the ${askSd ? "standard deviation" : "mean"}.`,
      askSd
        ? [
            `$\\sigma^2 = npq = ${n}(${p})(${round(1 - p, 2)}) = ${round(variance, 4)}$`,
            `$\\sigma = \\sqrt{${round(variance, 4)}} = ${round(Math.sqrt(variance), 4)}$`,
          ]
        : [`$\\mu = np = ${n}(${p}) = ${round(mean, 4)}$`],
      round(askSd ? Math.sqrt(variance) : mean, 4),
      0.1
    );
  },

  "area-from-z": () => {
    const mu = pick([50, 60, 70, 100, 200, 500]);
    const sigma = pick([5, 8, 10, 12, 15, 20, 25]);
    const z = pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
    const X = round(mu + z * sigma, 2);
    const side = Math.random() < 0.5 ? "LEFT" : "RIGHT";
    const areaLeft = normalCDF(z);
    const answer = side === "LEFT" ? round(areaLeft, 4) : round(1 - areaLeft, 4);
    return N(
      6,
      "area-from-z",
      "Area from a Value",
      `A normal distribution has $\\mu = ${mu}$ and $\\sigma = ${sigma}$. For $X = ${X}$, find the area to the ${side}, as a probability between 0 and 1.`,
      [
        `$z = \\dfrac{${X} - ${mu}}{${sigma}} = ${round(z, 3)}$`,
        `Area to the left of $z$ is about $${round(areaLeft, 4)}$`,
        side === "RIGHT"
          ? `$\\text{area right} = 1 - ${round(areaLeft, 4)} = ${answer}$`
          : `That is already the area to the left: $${answer}$`,
      ],
      answer,
      0.01
    );
  },

  "value-from-area": () => {
    const mu = pick([50, 60, 70, 100, 200, 500]);
    const sigma = pick([5, 8, 10, 12, 15, 20, 25]);
    const areaLeft = pick([0.1, 0.25, 0.75, 0.8, 0.9, 0.95, 0.99, 0.05]);
    const z = normalInv(areaLeft);
    const X = round(mu + z * sigma, 2);
    return N(
      6,
      "value-from-area",
      "Value from a Percentile",
      `A normal distribution has $\\mu = ${mu}$ and $\\sigma = ${sigma}$. Find the value X at the ${round(areaLeft * 100, 0)}th percentile.`,
      [
        `The z-score for an area of $${areaLeft}$ to the left is about $${round(z, 3)}$`,
        `$X = \\mu + z\\sigma = ${mu} + (${round(z, 3)})(${sigma}) = ${X}$`,
      ],
      X,
      Math.max(0.5, Math.abs(X * 0.02))
    );
  },

  clt: () => {
    const mu = pick([40, 50, 60, 70, 100, 200]);
    const sigma = pick([8, 10, 12, 15, 20, 24]);
    const n = pick([4, 9, 16, 25, 36, 49, 64, 100]);
    const z = pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]);
    const se = sigma / Math.sqrt(n);
    const xbar = round(mu + z * se, 3);
    return N(
      6,
      "clt",
      "Central Limit Theorem",
      `A population has $\\mu = ${mu}$ and $\\sigma = ${sigma}$. A sample of $n = ${n}$ has sample mean $\\bar{x} = ${xbar}$. Find the z-score for this sample mean.`,
      [
        `$\\sigma_{\\bar{x}} = \\dfrac{${sigma}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$z = \\dfrac{${xbar} - ${mu}}{${round(se, 4)}} = ${round((xbar - mu) / se, 3)}$`,
      ],
      round(z, 3),
      0.05
    );
  },
};

export function generateProblem(ch: number, topicKey?: string): PracticeProblem {
  const topics = topicsByChapter[ch] || topicsByChapter[4];
  const key = topicKey && generators[topicKey] ? topicKey : pick(topics).key;
  return generators[key]();
}

/** Exposed for testing: generate one of every topic. */
export const allTopicKeys = Object.keys(generators);
