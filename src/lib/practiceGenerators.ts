import {
  round,
  pick,
  randInt,
  median,
  quartiles,
  binomPMF,
  binomCDF,
  nCr,
  normalCDF,
  normalInv,
  classWidth,
  shuffle,
} from "@/lib/math";

/**
 * Practice problem generators.
 *
 * Every answer is computed at runtime from the same numbers that appear in the
 * prompt, so a question can never drift out of sync with its own solution.
 *
 * On variety: each topic varies along three independent axes, not just one.
 *   1. the NUMBERS
 *   2. the WORDING — several phrasings of the same question
 *   3. the QUESTION FORM — which unknown is asked for, and sometimes whether
 *      it is asked forwards or backwards
 * Plus a shared bank of cover stories, so the same computation shows up as
 * commute times, then rainfall, then repair costs. That last axis matters more
 * than it looks: recognising a mean when it is dressed as something unfamiliar
 * is most of what an exam actually tests.
 */

import { ch7Generators, ch7Topics } from "@/lib/data/ch7";
import { ch8Generators, ch8Topics } from "@/lib/data/ch8";
import { ch10Generators, ch10Topics } from "@/lib/data/ch10";

export type PracticeProblem = {
  ch: number;
  topic: string;
  topicLabel: string;
  prompt: string;
  steps: string[];
  kind: "numeric" | "choice";
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
    { key: "param-stat", label: "Population, Sample, Parameter" },
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
    { key: "rules", label: "Empirical Rule & Chebyshev" },
    { key: "zpos", label: "z-scores" },
    { key: "quart", label: "Quartiles & Outliers" },
    { key: "fivenum", label: "Five-Number Summary & Boxplots" },
  ],
  4: [
    { key: "basicprob", label: "Basic Probability" },
    { key: "addition", label: "Addition Rule" },
    { key: "multiplication", label: "Multiplication Rule" },
    { key: "conditional", label: "Conditional Probability" },
    { key: "atleastone", label: "At Least One" },
  ],
  5: [
    { key: "validdist", label: "Is It a Distribution?" },
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

topicsByChapter[7] = ch7Topics;
topicsByChapter[8] = ch8Topics;
topicsByChapter[10] = ch10Topics;


/* ------------------------------------------------------------- cover stories */

/**
 * Scenarios reused across the numeric generators.
 *
 * `plural` is the thing being measured, `unit` how it is measured, `who` the
 * source of the data. Keeping them separate means one bank of 20 dresses every
 * data-set question in the app.
 */
type Ctx = { plural: string; unit: string; who: string; short: string };

const CONTEXTS: Ctx[] = [
  { plural: "commute times", unit: "minutes", who: "employees at a logistics firm", short: "commute time" },
  { plural: "daily rainfall totals", unit: "millimeters", who: "a weather station", short: "rainfall" },
  { plural: "repair costs", unit: "dollars", who: "an auto shop", short: "repair cost" },
  { plural: "wait times", unit: "minutes", who: "patients in a clinic", short: "wait time" },
  { plural: "battery lives", unit: "hours", who: "a phone testing lab", short: "battery life" },
  { plural: "delivery distances", unit: "miles", who: "a courier company", short: "distance" },
  { plural: "exam scores", unit: "points", who: "a statistics section", short: "score" },
  { plural: "weekly hours worked", unit: "hours", who: "part-time staff", short: "hours worked" },
  { plural: "heights of seedlings", unit: "centimeters", who: "a greenhouse trial", short: "height" },
  { plural: "call durations", unit: "seconds", who: "a support center", short: "call duration" },
  { plural: "monthly electricity bills", unit: "dollars", who: "households on one street", short: "bill" },
  { plural: "ages", unit: "years", who: "members of a hiking club", short: "age" },
  { plural: "protein contents", unit: "grams", who: "a nutrition label survey", short: "protein" },
  { plural: "reaction times", unit: "milliseconds", who: "a psychology study", short: "reaction time" },
  { plural: "package weights", unit: "ounces", who: "a shipping counter", short: "weight" },
  { plural: "gas mileages", unit: "miles per gallon", who: "a fleet of rental cars", short: "mileage" },
  { plural: "ticket prices", unit: "dollars", who: "a concert resale site", short: "price" },
  { plural: "temperatures at noon", unit: "degrees", who: "a rooftop sensor", short: "temperature" },
  { plural: "download speeds", unit: "megabits per second", who: "an internet survey", short: "speed" },
  { plural: "pages read per day", unit: "pages", who: "a reading challenge", short: "pages" },
];

/**
 * Tolerance for an answer that is a probability or an area.
 *
 * Generous enough for Table E rounding, but never as large as the answer
 * itself — otherwise a tail area of 0.0062 with a flat tolerance of 0.01 would
 * accept a typed 0, marking "I have no idea" as correct. It tightens near
 * BOTH ends, since an area of 0.9938 is just as easy to confuse with 1.
 */
function areaTol(answer: number): number {
  const edge = Math.min(Math.abs(answer), Math.abs(1 - answer));
  return Math.max(0.0008, Math.min(0.01, 0.25 * edge));
}

/** "A courier company recorded delivery distances (in miles) for 7 routes." */
function setup(c: Ctx, n: number, itemWord = "values"): string {
  const openers = [
    `${cap(c.who)} recorded ${c.plural} (in ${c.unit}) for ${n} ${itemWord}`,
    `A study of ${c.who} collected ${n} ${c.plural} (in ${c.unit})`,
    `${cap(c.who)} logged ${c.plural}, measured in ${c.unit}, for ${n} ${itemWord}`,
    `${n} ${c.plural} (in ${c.unit}) were recorded by ${c.who}`,
  ];
  return pick(openers);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format a data list for a prompt. */
function list(d: number[]) {
  return d.join(", ");
}

/* --------------------------------------------------------------- item banks */

/** [statement, 0 = descriptive | 1 = inferential] */
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
  ["The tallest player on the roster is 6 feet 11 inches.", 0],
  ["Cities that add bike lanes will see fewer traffic injuries.", 1],
  ["Three of the twelve jurors were under the age of 30.", 0],
  ["A person who studies with flashcards is likely to score higher on the final.", 1],
  ["Last season the team's home attendance averaged 18,400 per game.", 0],
  ["Analysts expect grocery prices to level off by next spring.", 1],
  ["In the sample of 60 batteries, the shortest lasted 9.2 hours.", 0],
  ["Households that install solar panels tend to lower their bills over time.", 1],
  ["Of 500 flights logged at this airport, 47 departed late.", 0],
  ["The results suggest that most residents in the county support the measure.", 1],
  ["The standard deviation of the 25 recorded wait times was 4.1 minutes.", 0],
  ["Students who sleep more than 7 hours will perform better on exams.", 1],
  ["Twenty-two percent of the 900 responses came from first-year students.", 0],
  ["This drug is expected to reduce recovery time for future patients.", 1],
];

/** [variable, 0 = qualitative | 1 = quantitative discrete | 2 = quantitative continuous] */
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
  ["Brand of laptop owned", 0],
  ["Number of absences this semester", 1],
  ["Length of a phone call", 2],
  ["Marital status", 0],
  ["Number of eggs in a carton", 1],
  ["Amount of rainfall in a storm", 2],
  ["Political party affiliation", 0],
  ["Number of flights delayed at an airport", 1],
  ["Speed of a car in miles per hour", 2],
  ["Type of fuel a vehicle uses", 0],
  ["Number of questions answered correctly", 1],
  ["Mass of a sample in grams", 2],
  ["Country of birth", 0],
  ["Number of bedrooms in a house", 1],
];

/** [item, 0 = nominal | 1 = ordinal | 2 = interval | 3 = ratio] */
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
  ["Jersey numbers on a team", 0],
  ["T-shirt sizes: small, medium, large", 1],
  ["Time of day on a 12-hour clock", 2],
  ["Number of calories in a meal", 3],
  ["Hair color", 0],
  ["Letter grades A, B, C, D, F", 1],
  ["Temperature in degrees Fahrenheit", 2],
  ["Height in centimeters", 3],
  ["Telephone area codes", 0],
  ["Movie ratings from one to five stars", 1],
  ["Years on a historical timeline", 2],
  ["Age in years", 3],
  ["License plate numbers", 0],
  ["Class rank: freshman, sophomore, junior, senior", 1],
];

const GRAPH_CHOICES = [
  "Histogram",
  "Frequency polygon",
  "Ogive",
  "Pareto chart",
  "Time series graph",
  "Stem-and-leaf plot",
  "Pie graph",
  "Dotplot",
];

/** [scenario, index into GRAPH_CHOICES] */
const GRAPHS: [string, number][] = [
  ["You want to see how many values fall BELOW each class boundary.", 2],
  ["You want to rank product categories from most to least common.", 3],
  ["You are tracking monthly revenue over two years.", 4],
  ["You must preserve every exact value while still seeing the shape.", 5],
  ["You want the standard picture of a numeric frequency distribution.", 0],
  ["You want to compare two distributions on the same set of axes.", 1],
  ["You want to show what share of a budget each department takes.", 6],
  ["You have 15 values and want each one shown as a single dot above a number line.", 7],
  ["You need the cumulative total accumulated up to each upper boundary.", 2],
  ["You want the categories ordered so the biggest problem is obvious first.", 3],
  ["You are plotting daily website visits across a full year.", 4],
  ["You want to see the shape of the data without losing the original digits.", 5],
  ["You want contiguous bars whose heights are class frequencies.", 0],
  ["You want to overlay this year's and last year's distributions as connected lines.", 1],
  ["You want each slice of a circle to represent a percentage of the whole.", 6],
  ["You have a small data set and want a quick picture of clustering and gaps.", 7],
];

const GRAPH_WHY = [
  "A histogram is the standard picture of a numeric frequency distribution, drawn with contiguous bars.",
  "Frequency polygons are lines through the class midpoints, so two of them overlay cleanly on one set of axes.",
  "An ogive plots cumulative frequency against upper boundaries, which is exactly a running total.",
  "A Pareto chart sorts the bars highest to lowest so the dominant category stands out immediately.",
  "A time series graph puts time on the horizontal axis, which is what reveals a trend.",
  "A stem-and-leaf plot shows the shape while keeping every original digit.",
  "A pie graph divides a circle into wedges sized by each category's share of the whole.",
  "A dotplot puts one dot per value above a number line, good for spotting clusters and gaps in a small set.",
];

/** Discrete distributions whose probabilities sum to exactly 1. */
const DISTRIBUTIONS = [
  { X: [0, 1, 2, 3], P: [0.1, 0.3, 0.4, 0.2] },
  { X: [0, 1, 2], P: [0.5, 0.3, 0.2] },
  { X: [1, 2, 3, 4], P: [0.1, 0.4, 0.3, 0.2] },
  { X: [0, 1, 2, 3, 4], P: [0.05, 0.2, 0.4, 0.25, 0.1] },
  { X: [0, 1, 2], P: [0.25, 0.5, 0.25] },
  { X: [2, 3, 4], P: [0.3, 0.5, 0.2] },
  { X: [1, 2, 3], P: [0.2, 0.45, 0.35] },
  { X: [0, 1, 2, 3], P: [0.4, 0.3, 0.2, 0.1] },
  { X: [5, 10, 15, 20], P: [0.15, 0.35, 0.35, 0.15] },
  { X: [0, 2, 4, 6], P: [0.1, 0.2, 0.5, 0.2] },
];

/** Cover stories for a discrete random variable. */
const RV_STORIES = [
  { name: "the number of cars sold per day at a dealership", sym: "X" },
  { name: "the number of no-shows on a morning flight", sym: "X" },
  { name: "the number of defective bulbs in a random box", sym: "X" },
  { name: "the number of pizzas ordered per hour at a counter", sym: "X" },
  { name: "the number of library books checked out per visit", sym: "X" },
  { name: "the number of goals scored by a team in a match", sym: "X" },
];

/* -------------------------------------------------------------- generators */

const generators: Record<string, () => PracticeProblem> = {
  /* ------------------------------------------------------------- chapter 1 */

  "desc-inf": () => {
    const [s, a] = pick(STATEMENTS);
    const prompt = pick([
      `Classify this statement: "${s}"`,
      `Is the following descriptive or inferential? "${s}"`,
      `A report contains this line: "${s}" Which branch of statistics does it belong to?`,
      `"${s}" This statement is an example of which type of statistics?`,
    ]);
    return C(1, "desc-inf", "Descriptive vs Inferential", prompt, ["Descriptive", "Inferential"], a, [
      a === 0
        ? "It only reports what was actually observed in the data collected, so it is descriptive."
        : "It generalizes or predicts beyond the data collected, so it is inferential.",
    ]);
  },

  "param-stat": () => {
    const form = pick(["parastat", "popsample", "vocab"] as const);

    if (form === "parastat") {
      const cases: [string, number][] = [
        ["The mean age of ALL 4,200 employees at a company is 41.3 years.", 0],
        ["The mean age of 60 randomly chosen employees is 39.8 years.", 1],
        ["37% of the 500 voters surveyed support the measure.", 1],
        ["52% of every registered voter in the county is female.", 0],
        ["The average GPA of all students enrolled at the college is 3.04.", 0],
        ["The average GPA of the 25 students in this section is 3.11.", 1],
        ["Across all 1,000 batteries produced today, the mean life was 14.2 hours.", 0],
        ["In a sample of 30 batteries, the mean life was 13.9 hours.", 1],
        ["Every one of the 32 apartments in the building averages 890 square feet.", 0],
        ["A random sample of 45 apartments in the city averages 910 square feet.", 1],
        ["The median salary of the 12 people on the board is $184,000.", 0],
        ["Among 200 surveyed nurses, the median salary was $79,500.", 1],
        ["The standard deviation of all 5,000 test scores in the district was 11.4.", 0],
        ["The standard deviation of 80 sampled test scores was 12.1.", 1],
        ["All 18 players on the roster average 22.4 minutes per game.", 0],
        ["A sample of 40 games shows an average attendance of 12,300.", 1],
      ];
      const [s, a] = pick(cases);
      return C(
        1,
        "param-stat",
        "Population, Sample, Parameter",
        pick([
          `Is the highlighted number a parameter or a statistic? "${s}"`,
          `"${s}" The number described here is a...`,
        ]),
        ["Parameter", "Statistic"],
        a,
        [
          a === 0
            ? "It describes the ENTIRE group, so it is a parameter. Parameter goes with population."
            : "It describes only a subset that was measured, so it is a statistic. Statistic goes with sample.",
        ]
      );
    }

    if (form === "popsample") {
      // Half population, half sample, so the answer position carries no hint.
      const cases: [string, string, number][] = [
        ["a pollster wants to know the opinion of every adult in Texas", "300 adults are interviewed", 1],
        ["a factory wants to know the quality of all 8,000 units made today", "50 units are pulled off the line", 1],
        ["a professor wants the average score for everyone enrolled in her course", "all 32 enrolled students are graded", 0],
        ["a city wants the income of every household in the city", "400 households are surveyed", 1],
        ["a manager wants the total sales of each of the 9 stores she runs", "all 9 stores report their sales", 0],
        ["a coach wants the height of every player on the 15-person roster", "all 15 players are measured", 0],
      ];
      const [goal, action, a] = pick(cases);
      return C(
        1,
        "param-stat",
        "Population, Sample, Parameter",
        `Suppose ${goal}, and ${action}. The group that was actually measured is the...`,
        ["Population", "Sample"],
        a,
        [
          a === 0
            ? "Every member of the group of interest was measured, so the measured group IS the population."
            : "Only part of the group of interest was measured, so the measured group is a sample.",
        ]
      );
    }

    const vocab: [string, string[], number, string][] = [
      [
        "The entire group you want to draw a conclusion about is called the...",
        ["Population", "Sample", "Statistic", "Variable"],
        0,
        "The population is the whole group of interest, whether or not you can measure all of it.",
      ],
      [
        "A numerical value describing a POPULATION is called a...",
        ["Parameter", "Statistic", "Sample", "Census"],
        0,
        "Parameter goes with population; statistic goes with sample.",
      ],
      [
        "Measuring every single member of the population is called a...",
        ["Sample", "Survey", "Census", "Trial"],
        2,
        "A census measures everyone. A sample measures only part.",
      ],
      [
        "A characteristic that can take different values from one individual to the next is a...",
        ["Constant", "Parameter", "Population", "Variable"],
        3,
        "If it varies between individuals, it is a variable. That variation is what statistics studies.",
      ],
      [
        "A numerical value computed from a SAMPLE is called a...",
        ["Parameter", "Statistic", "Census", "Population"],
        1,
        "Statistic goes with sample. The two words even start with the same letter, which is the usual way to remember it.",
      ],
    ];
    const [q, opts, a, why] = pick(vocab);
    return C(1, "param-stat", "Population, Sample, Parameter", q, opts, a, [why]);
  },

  "var-type": () => {
    const [v, a] = pick(VARIABLES);
    const why = [
      "It names a category rather than a quantity, so it is qualitative.",
      "It is a count: whole numbers with gaps between them, so it is quantitative discrete.",
      "It is a measurement that can take any value in a range, so it is quantitative continuous.",
    ];
    const prompt = pick([
      `Classify the variable: ${v}`,
      `What type of variable is this? ${v}`,
      `A researcher records: ${v}. This variable is...`,
    ]);
    return C(
      1,
      "var-type",
      "Variable Type",
      prompt,
      ["Qualitative", "Quantitative, discrete", "Quantitative, continuous"],
      a,
      [why[a]]
    );
  },

  level: () => {
    const [v, a] = pick(LEVELS);
    const why = [
      "Categories with no meaningful order, so nominal.",
      "It can be ranked, but the gaps between ranks are not equal, so ordinal.",
      "Equal gaps, but zero does not mean 'none', so interval.",
      "Equal gaps AND a true zero, so ratio. Ratios like 'twice as much' make sense.",
    ];
    const prompt = pick([
      `What level of measurement is this? ${v}`,
      `Identify the level of measurement: ${v}`,
      `${v} would be measured at which level?`,
    ]);
    return C(1, "level", "Level of Measurement", prompt, ["Nominal", "Ordinal", "Interval", "Ratio"], a, [why[a]]);
  },

  /* ------------------------------------------------------------- chapter 2 */

  classwidth: () => {
    const c = pick(CONTEXTS);
    const k = pick([5, 6, 7, 8]);
    // Deliberately avoid a range that divides evenly. The course's own worked
    // solutions never hit that case, and the professor's slides never state a
    // convention for it, so grading a student on it would be unfair.
    let lo = randInt(2, 40);
    let range = pick([37, 43, 47, 53, 58, 62, 71, 79, 83, 94, 107, 119]);
    while (range % k === 0) range += 1;
    const hi = lo + range;
    const width = classWidth(range, k);

    const form = pick(["width", "classes"] as const);

    if (form === "classes") {
      // Backwards: given the width, how many classes does it take?
      const need = Math.ceil((range + 1) / width);
      return N(
        2,
        "classwidth",
        "Class Width",
        `${setup(c, 30, "observations")}. The smallest value is ${lo} ${c.unit} and the largest is ${hi} ${c.unit}. If each class is ${width} ${c.unit} wide, how many classes are needed to cover all the data?`,
        [
          `$\\text{range} = ${hi} - ${lo} = ${range}$`,
          `Counting both endpoints, the classes must span $${range} + 1 = ${range + 1}$ values.`,
          `$${range + 1} \\div ${width} = ${round((range + 1) / width, 3)}$, and you cannot have a partial class, so round up.`,
          `Classes needed $= ${need}$`,
        ],
        need,
        0.01
      );
    }

    return N(
      2,
      "classwidth",
      "Class Width",
      pick([
        `${setup(c, 30, "observations")}. The values run from ${lo} to ${hi} ${c.unit}. Using ${k} classes, find the class width.`,
        `A grouped frequency distribution of ${c.plural} uses ${k} classes. The smallest value is ${lo} and the largest is ${hi}. Find the class width.`,
        `To organize ${c.plural} ranging from ${lo} to ${hi} ${c.unit} into ${k} classes, what class width should you use?`,
      ]),
      [
        `$\\text{range} = ${hi} - ${lo} = ${range}$`,
        `$${range} \\div ${k} = ${round(range / k, 3)}$`,
        `Round UP so the classes reach the largest value: width $= ${width}$`,
      ],
      width,
      0.01
    );
  },

  midbound: () => {
    const lo = pick([10, 15, 20, 25, 30, 36, 45, 50, 60, 72, 85, 100]);
    const w = pick([5, 8, 10, 12, 15]);
    const hi = lo + w - 1;
    const form = pick(["mid", "lower", "upper", "width"] as const);

    const mid = (lo + hi) / 2;
    const answer = form === "mid" ? round(mid, 2) : form === "lower" ? lo - 0.5 : form === "upper" ? hi + 0.5 : w;

    const asked =
      form === "mid"
        ? "midpoint"
        : form === "lower"
          ? "LOWER class boundary"
          : form === "upper"
            ? "UPPER class boundary"
            : "class width";

    const steps =
      form === "mid"
        ? [
            "The midpoint is the average of the two class LIMITS.",
            `$\\text{midpoint} = \\dfrac{${lo} + ${hi}}{2} = ${round(mid, 2)}$`,
          ]
        : form === "lower"
          ? [
              "Boundaries sit halfway between one class's upper limit and the next class's lower limit, so they shift the limits by $0.5$. That is what makes histogram bars touch.",
              `$\\text{lower boundary} = ${lo} - 0.5 = ${lo - 0.5}$`,
            ]
          : form === "upper"
            ? [
                "Boundaries shift the limits by $0.5$ so the bars touch with no gap.",
                `$\\text{upper boundary} = ${hi} + 0.5 = ${hi + 0.5}$`,
              ]
            : [
                "Class width is the distance between two consecutive LOWER limits, which is the same as boundary-to-boundary.",
                `$(${hi} + 0.5) - (${lo} - 0.5) = ${w}$`,
              ];

    return N(
      2,
      "midbound",
      "Midpoints & Boundaries",
      pick([
        `A class in a frequency distribution runs ${lo}-${hi}. Find its ${asked}.`,
        `One class of a grouped frequency distribution has limits ${lo}-${hi}. What is the ${asked}?`,
        `For the class ${lo}-${hi}, determine the ${asked}.`,
      ]),
      steps,
      answer,
      0.01
    );
  },

  cumrel: () => {
    const c = pick(CONTEXTS);
    const k = pick([4, 5, 6]);
    const f: number[] = [];
    for (let i = 0; i < k; i++) f.push(randInt(2, 15));
    const total = f.reduce((a, b) => a + b, 0);
    const idx = randInt(0, k - 1);
    const form = pick(["cum", "rel", "cumrel"] as const);

    const cum = f.slice(0, idx + 1).reduce((a, b) => a + b, 0);
    const rel = round((100 * f[idx]) / total, 2);
    const cumRel = round((100 * cum) / total, 2);

    const asked =
      form === "cum"
        ? `cumulative frequency through class ${idx + 1}`
        : form === "rel"
          ? `relative frequency of class ${idx + 1}, as a percent`
          : `cumulative relative frequency through class ${idx + 1}, as a percent`;

    const steps =
      form === "cum"
        ? [
            `Add every frequency up to and including class ${idx + 1}:`,
            `$${f.slice(0, idx + 1).join(" + ")} = ${cum}$`,
          ]
        : form === "rel"
          ? [
              `$\\text{relative frequency} = \\dfrac{\\text{class frequency}}{\\text{total}}$`,
              `$= \\dfrac{${f[idx]}}{${total}} = ${round(f[idx] / total, 4)} = ${rel}\\%$`,
            ]
          : [
              `Cumulative frequency through class ${idx + 1}: $${f.slice(0, idx + 1).join(" + ")} = ${cum}$`,
              `$\\dfrac{${cum}}{${total}} = ${round(cum / total, 4)} = ${cumRel}\\%$`,
            ];

    return N(
      2,
      "cumrel",
      "Cumulative & Relative Frequency",
      pick([
        `A frequency distribution of ${c.plural} has class frequencies ${list(f)}, totaling ${total}. Find the ${asked}.`,
        `${cap(c.who)} organized ${c.plural} into ${k} classes with frequencies ${list(f)} (total ${total}). Find the ${asked}.`,
        `The classes of a distribution have frequencies ${list(f)}. With $n = ${total}$, find the ${asked}.`,
      ]),
      steps,
      form === "cum" ? cum : form === "rel" ? rel : cumRel,
      form === "cum" ? 0.01 : 0.05
    );
  },

  graphpick: () => {
    const [s, a] = pick(GRAPHS);
    return C(
      2,
      "graphpick",
      "Choosing a Graph",
      pick([`Which graph fits best? ${s}`, `${s} Which graph should you construct?`, `Choose the right graph. ${s}`]),
      GRAPH_CHOICES,
      a,
      [GRAPH_WHY[a]]
    );
  },

  /* ------------------------------------------------------------- chapter 3 */

  center: () => {
    const c = pick(CONTEXTS);
    // Build a set with exactly one mode so "find the mode" is unambiguous.
    let data: number[] = [];
    let modes: number[] = [];
    for (let attempt = 0; attempt < 80; attempt++) {
      const n = pick([5, 7, 9]);
      const base = randInt(2, 40);
      const d: number[] = [];
      for (let i = 0; i < n - 2; i++) d.push(base + randInt(0, 9));
      const dup = d[randInt(0, d.length - 1)];
      d.push(dup, dup);
      const counts: Record<number, number> = {};
      d.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const mx = Math.max(...Object.values(counts));
      const ms = Object.keys(counts)
        .filter((k) => counts[Number(k)] === mx)
        .map(Number);
      data = shuffle(d);
      modes = ms;
      if (ms.length === 1) break;
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const med = median(sorted);
    const midrange = (sorted[0] + sorted[n - 1]) / 2;

    const which =
      modes.length === 1 ? pick(["mean", "median", "mode", "midrange"]) : pick(["mean", "median", "midrange"]);
    const answer =
      which === "mean" ? round(mean, 4) : which === "median" ? med : which === "mode" ? modes[0] : midrange;

    const steps =
      which === "mean"
        ? [`Add all ${n} values: $${sum}$`, `$\\bar{x} = \\dfrac{${sum}}{${n}} = ${round(mean, 4)}$`]
        : which === "median"
          ? [`Sort: ${list(sorted)}`, `With $n = ${n}$ (odd), the median is the middle value: $${med}$`]
          : which === "mode"
            ? [`Sort: ${list(sorted)}`, `The value appearing most often is $${modes[0]}$`]
            : [
                `Sort: ${list(sorted)}`,
                `$\\text{midrange} = \\dfrac{\\text{lowest} + \\text{highest}}{2} = \\dfrac{${sorted[0]} + ${sorted[n - 1]}}{2} = ${midrange}$`,
              ];

    return N(
      3,
      "center",
      "Mean, Median, Mode",
      pick([
        `${setup(c, n)}: ${list(data)}. Find the ${which}.`,
        `The ${c.plural} below were recorded in ${c.unit}: ${list(data)}. What is the ${which}?`,
        `Find the ${which} of these ${n} ${c.plural} (${c.unit}): ${list(data)}`,
      ]),
      steps,
      answer,
      0.03
    );
  },

  spread: () => {
    const c = pick(CONTEXTS);
    const n = pick([5, 6, 7, 8]);
    const data: number[] = [];
    for (let i = 0; i < n; i++) data.push(randInt(12, 75));
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
        ? [
            `$\\text{range} = \\text{highest} - \\text{lowest}$`,
            `$= ${Math.max(...data)} - ${Math.min(...data)} = ${Math.max(...data) - Math.min(...data)}$`,
          ]
        : [
            `$\\bar{x} = ${round(mean, 4)}$`,
            `$\\sum (x - \\bar{x})^2 = ${round(ss, 4)}$`,
            `This is a SAMPLE, so divide by $n - 1$:`,
            `$s^2 = \\dfrac{${round(ss, 4)}}{${n} - 1} = ${round(variance, 4)}$`,
            ...(which === "standard deviation"
              ? [`$s = \\sqrt{${round(variance, 4)}} = ${round(Math.sqrt(variance), 4)}$`]
              : []),
          ];

    return N(
      3,
      "spread",
      "Variance & Standard Deviation",
      pick([
        `A SAMPLE of ${c.plural} (in ${c.unit}) was collected: ${list(data)}. Find the ${which}. Round to 2 or 3 decimals.`,
        `${setup(c, n)}. Treating these as a SAMPLE: ${list(data)}, find the ${which}. Round to 2 or 3 decimals.`,
        `For the SAMPLE ${list(data)}, find the ${which}. Round to 2 or 3 decimals.`,
      ]),
      steps,
      answer,
      which === "range" ? 0.01 : 0.05
    );
  },

  rules: () => {
    const c = pick(CONTEXTS);
    const mean = pick([50, 60, 70, 80, 100, 120, 150, 200]);
    const sd = pick([4, 5, 6, 8, 10, 12, 15, 20]);
    const useEmpirical = Math.random() < 0.5;

    if (useEmpirical) {
      const k = pick([1, 2, 3]);
      const pct = k === 1 ? 68 : k === 2 ? 95 : 99.7;
      const form = pick(["percent", "interval"] as const);

      if (form === "interval") {
        // Ask for one endpoint of the interval.
        const upper = Math.random() < 0.5;
        const answer = upper ? mean + k * sd : mean - k * sd;
        return N(
          3,
          "rules",
          "Empirical Rule & Chebyshev",
          `${cap(c.plural)} are bell-shaped with mean ${mean} ${c.unit} and standard deviation ${sd} ${c.unit}. About ${pct}% of the values fall between two numbers. Find the ${upper ? "UPPER" : "LOWER"} one.`,
          [
            `About ${pct}% of a bell-shaped distribution lies within ${k} standard deviation${k > 1 ? "s" : ""} of the mean.`,
            `$\\mu ${upper ? "+" : "-"} ${k}\\sigma = ${mean} ${upper ? "+" : "-"} ${k}(${sd}) = ${answer}$`,
          ],
          answer,
          0.01
        );
      }

      return N(
        3,
        "rules",
        "Empirical Rule & Chebyshev",
        `${cap(c.plural)} form a bell-shaped distribution with mean ${mean} ${c.unit} and standard deviation ${sd} ${c.unit}. Approximately what percent of values fall between ${mean - k * sd} and ${mean + k * sd} ${c.unit}? Answer as a number like 68.`,
        [
          `$${mean - k * sd}$ and $${mean + k * sd}$ are exactly $${k}$ standard deviation${k > 1 ? "s" : ""} below and above the mean.`,
          `The Empirical Rule gives approximately $${pct}\\%$ within $${k}\\sigma$.`,
        ],
        pct,
        0.05
      );
    }

    // Chebyshev: applies to ANY distribution, and gives a minimum.
    const k = pick([2, 3, 4]);
    const atLeast = round((1 - 1 / (k * k)) * 100, 2);
    return N(
      3,
      "rules",
      "Empirical Rule & Chebyshev",
      pick([
        `${cap(c.plural)} have mean ${mean} ${c.unit} and standard deviation ${sd} ${c.unit}. The shape is unknown. Using Chebyshev's theorem, AT LEAST what percent of values fall between ${mean - k * sd} and ${mean + k * sd} ${c.unit}?`,
        `Using Chebyshev's theorem, at least what percent of any data set lies within ${k} standard deviations of the mean?`,
      ]),
      [
        `Chebyshev applies to any distribution and gives a MINIMUM.`,
        `$1 - \\dfrac{1}{k^2}$ with $k = ${k}$:`,
        `$1 - \\dfrac{1}{${k}^2} = 1 - ${round(1 / (k * k), 4)} = ${round(1 - 1 / (k * k), 4)} = ${atLeast}\\%$`,
      ],
      atLeast,
      0.06
    );
  },

  zpos: () => {
    const c = pick(CONTEXTS);
    const mean = pick([50, 60, 70, 80, 100, 120, 45, 200]);
    const sd = pick([4, 5, 8, 10, 12, 15, 20]);
    const z = pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
    const value = mean + z * sd; // exact: z has one decimal, sd is an integer
    const form = pick(["forward", "reverse", "compare"] as const);

    if (form === "reverse") {
      return N(
        3,
        "zpos",
        "z-scores",
        `${cap(c.plural)} have mean ${mean} ${c.unit} and standard deviation ${sd} ${c.unit}. Find the ${c.short} whose z-score is ${z}.`,
        [
          `$z = \\dfrac{x - \\bar{x}}{s}$, so $x = \\bar{x} + z s$`,
          `$x = ${mean} + (${z})(${sd}) = ${round(value, 3)}$`,
        ],
        round(value, 3),
        0.05
      );
    }

    if (form === "compare") {
      // Two different distributions; which value is relatively higher?
      const mean2 = pick([30, 40, 55, 65, 75, 90]);
      const sd2 = pick([3, 6, 7, 9, 11]);
      const z2 = pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]);
      const value2 = mean2 + z2 * sd2;
      const bigger = z >= z2 ? 0 : 1;
      return C(
        3,
        "zpos",
        "z-scores",
        `On test A the class mean is ${mean} with standard deviation ${sd}; Ava scored ${round(value, 2)}. On test B the class mean is ${mean2} with standard deviation ${sd2}; Ben scored ${round(value2, 2)}. Who did relatively better?`,
        ["Ava", "Ben"],
        bigger,
        [
          `Ava: $z = \\dfrac{${round(value, 2)} - ${mean}}{${sd}} = ${round(z, 2)}$`,
          `Ben: $z = \\dfrac{${round(value2, 2)} - ${mean2}}{${sd2}} = ${round(z2, 2)}$`,
          `The larger z-score is relatively better, so ${bigger === 0 ? "Ava" : "Ben"} did better.`,
        ]
      );
    }

    return N(
      3,
      "zpos",
      "z-scores",
      pick([
        `${cap(c.plural)} have mean ${mean} ${c.unit} and standard deviation ${sd} ${c.unit}. Find the z-score for a ${c.short} of ${round(value, 2)} ${c.unit}.`,
        `A data set of ${c.plural} has $\\bar{x} = ${mean}$ and $s = ${sd}$. Convert the value ${round(value, 2)} to a z-score.`,
        `How many standard deviations from the mean is ${round(value, 2)}, if the mean is ${mean} and the standard deviation is ${sd}?`,
      ]),
      [`$z = \\dfrac{x - \\bar{x}}{s}$`, `$= \\dfrac{${round(value, 2)} - ${mean}}{${sd}} = ${round(z, 3)}$`],
      round(z, 3),
      0.05
    );
  },

  quart: () => {
    const c = pick(CONTEXTS);
    const n = pick([8, 10, 12]);
    const data: number[] = [];
    for (let i = 0; i < n; i++) data.push(randInt(5, 80));
    const sorted = [...data].sort((a, b) => a - b);
    const { Q1, Q2, Q3 } = quartiles(sorted);
    const iqr = Q3 - Q1;
    const which = pick(["Q1", "Q3", "the IQR", "the upper outlier fence", "the lower outlier fence", "the midquartile"]);
    const answer =
      which === "Q1"
        ? Q1
        : which === "Q3"
          ? Q3
          : which === "the IQR"
            ? round(iqr, 4)
            : which === "the upper outlier fence"
              ? round(Q3 + 1.5 * iqr, 4)
              : which === "the lower outlier fence"
                ? round(Q1 - 1.5 * iqr, 4)
                : round((Q1 + Q3) / 2, 4);
    const half = n / 2;

    const steps = [
      `Sort: ${list(sorted)}`,
      `Median $Q_2 = ${Q2}$`,
      `$Q_1 = $ median of the lower half (${list(sorted.slice(0, half))}) $= ${Q1}$`,
      `$Q_3 = $ median of the upper half (${list(sorted.slice(half))}) $= ${Q3}$`,
    ];
    if (which !== "Q1" && which !== "Q3") {
      steps.push(`$\\text{IQR} = Q_3 - Q_1 = ${Q3} - ${Q1} = ${round(iqr, 4)}$`);
    }
    if (which === "the upper outlier fence") {
      steps.push(`$\\text{upper fence} = Q_3 + 1.5(\\text{IQR}) = ${Q3} + 1.5(${round(iqr, 4)}) = ${round(Q3 + 1.5 * iqr, 4)}$`);
    }
    if (which === "the lower outlier fence") {
      steps.push(`$\\text{lower fence} = Q_1 - 1.5(\\text{IQR}) = ${Q1} - 1.5(${round(iqr, 4)}) = ${round(Q1 - 1.5 * iqr, 4)}$`);
    }
    if (which === "the midquartile") {
      steps.push(`$\\text{midquartile} = \\dfrac{Q_1 + Q_3}{2} = \\dfrac{${Q1} + ${Q3}}{2} = ${round((Q1 + Q3) / 2, 4)}$`);
    }

    return N(
      3,
      "quart",
      "Quartiles & Outliers",
      pick([
        `${setup(c, n)}: ${list(data)}. Find ${which}.`,
        `For these ${c.plural} (in ${c.unit}): ${list(data)}. Find ${which}.`,
        `Given the data ${list(data)}, determine ${which}.`,
      ]),
      steps,
      answer,
      0.05
    );
  },

  fivenum: () => {
    const c = pick(CONTEXTS);
    const n = pick([8, 10, 12]);
    const base: number[] = [];
    for (let i = 0; i < n - 1; i++) base.push(randInt(10, 45));
    // Half the time, plant a clear high outlier so outlier questions have a
    // definite answer instead of depending on luck.
    const withOutlier = Math.random() < 0.5;
    const data = withOutlier ? [...base, randInt(120, 190)] : [...base, randInt(10, 45)];
    const sorted = [...data].sort((a, b) => a - b);
    const { Q1, Q2, Q3 } = quartiles(sorted);
    const iqr = Q3 - Q1;
    const upper = Q3 + 1.5 * iqr;
    const lower = Q1 - 1.5 * iqr;
    const outliers = sorted.filter((v) => v > upper || v < lower);

    const form = pick(["min", "max", "median", "count-outliers", "whisker"] as const);

    if (form === "count-outliers") {
      return N(
        3,
        "fivenum",
        "Five-Number Summary & Boxplots",
        `${setup(c, n)}: ${list(data)}. Using the 1.5 x IQR rule, how many outliers are there?`,
        [
          `Sort: ${list(sorted)}`,
          `$Q_1 = ${Q1}$, $Q_3 = ${Q3}$, so $\\text{IQR} = ${round(iqr, 4)}$`,
          `Lower fence $= ${Q1} - 1.5(${round(iqr, 4)}) = ${round(lower, 3)}$`,
          `Upper fence $= ${Q3} + 1.5(${round(iqr, 4)}) = ${round(upper, 3)}$`,
          outliers.length
            ? `Outside the fences: ${list(outliers)}, that is ${outliers.length}.`
            : `Every value sits inside the fences, so there are 0 outliers.`,
        ],
        outliers.length,
        0.01
      );
    }

    if (form === "whisker") {
      // The whisker stops at the most extreme value that is NOT an outlier.
      const inside = sorted.filter((v) => v <= upper && v >= lower);
      const end = Math.max(...inside);
      return N(
        3,
        "fivenum",
        "Five-Number Summary & Boxplots",
        `${setup(c, n)}: ${list(data)}. On a boxplot that shows outliers separately, where does the RIGHT whisker end?`,
        [
          `Sort: ${list(sorted)}`,
          `$Q_1 = ${Q1}$, $Q_3 = ${Q3}$, $\\text{IQR} = ${round(iqr, 4)}$, upper fence $= ${round(upper, 3)}$`,
          `A whisker stops at the largest value that is NOT beyond the fence.`,
          `That value is $${end}$.`,
        ],
        end,
        0.01
      );
    }

    const asked = form === "min" ? "minimum" : form === "max" ? "maximum" : "median";
    const answer = form === "min" ? sorted[0] : form === "max" ? sorted[n - 1] : Q2;
    return N(
      3,
      "fivenum",
      "Five-Number Summary & Boxplots",
      pick([
        `${setup(c, n)}: ${list(data)}. The five-number summary is the minimum, Q1, the median, Q3, and the maximum. Find the ${asked}.`,
        `Write the five-number summary for ${list(data)}. Report just the ${asked}.`,
      ]),
      [
        `Sort: ${list(sorted)}`,
        `Minimum $= ${sorted[0]}$, $Q_1 = ${Q1}$, median $= ${Q2}$, $Q_3 = ${Q3}$, maximum $= ${sorted[n - 1]}$`,
        `The ${asked} is $${answer}$.`,
      ],
      answer,
      0.01
    );
  },

  /* ------------------------------------------------------------- chapter 4 */

  basicprob: () => {
    const kinds = pick(["marbles", "cards", "die", "spinner"] as const);

    if (kinds === "marbles") {
      const colors = shuffle(["red", "blue", "green", "yellow", "white"]).slice(0, 3);
      // Counts chosen so the answer does not reduce to another listed count.
      const counts = [randInt(3, 9), randInt(3, 9), randInt(3, 9)];
      const total = counts[0] + counts[1] + counts[2];
      const i = randInt(0, 2);
      const complement = Math.random() < 0.5;
      const p = counts[i] / total;
      const answer = round(complement ? 1 - p : p, 4);
      return N(
        4,
        "basicprob",
        "Basic Probability",
        `A bag holds ${counts[0]} ${colors[0]}, ${counts[1]} ${colors[1]}, and ${counts[2]} ${colors[2]} marbles. One is drawn at random. Find P(${complement ? `NOT ${colors[i]}` : colors[i]}), as a decimal.`,
        [
          `Total marbles $= ${counts[0]} + ${counts[1]} + ${counts[2]} = ${total}$`,
          `$P(${colors[i]}) = \\dfrac{${counts[i]}}{${total}} = ${round(p, 4)}$`,
          ...(complement
            ? [`$P(\\text{not } ${colors[i]}) = 1 - ${round(p, 4)} = ${answer}$`]
            : []),
        ],
        answer,
        0.005
      );
    }

    if (kinds === "cards") {
      const cases: [string, number][] = [
        ["a heart", 13],
        ["a face card (J, Q, K)", 12],
        ["an ace", 4],
        ["a red card", 26],
        ["a spade or a club", 26],
        ["a card below 5 (aces high, so 2, 3, or 4)", 12],
      ];
      const [desc, favorable] = pick(cases);
      const answer = round(favorable / 52, 4);
      return N(
        4,
        "basicprob",
        "Basic Probability",
        `One card is drawn from a standard 52-card deck. Find P(${desc}), as a decimal.`,
        [
          `Favorable outcomes: $${favorable}$`,
          `$P = \\dfrac{${favorable}}{52} = ${answer}$`,
        ],
        answer,
        0.005
      );
    }

    if (kinds === "die") {
      const cases: [string, number][] = [
        ["a number greater than 4", 2],
        ["an even number", 3],
        ["a number less than 3", 2],
        ["a multiple of 3", 2],
        ["an odd number", 3],
      ];
      const [desc, favorable] = pick(cases);
      const answer = round(favorable / 6, 4);
      return N(
        4,
        "basicprob",
        "Basic Probability",
        `A fair six-sided die is rolled once. Find P(${desc}), as a decimal.`,
        [`Favorable outcomes out of 6: $${favorable}$`, `$P = \\dfrac{${favorable}}{6} = ${answer}$`],
        answer,
        0.005
      );
    }

    const sectors = pick([8, 10, 12]);
    const win = randInt(2, Math.floor(sectors / 2));
    const answer = round(win / sectors, 4);
    return N(
      4,
      "basicprob",
      "Basic Probability",
      `A spinner has ${sectors} equal sectors, ${win} of which are winners. Find P(win) on one spin, as a decimal.`,
      [`$P(\\text{win}) = \\dfrac{${win}}{${sectors}} = ${answer}$`],
      answer,
      0.005
    );
  },

  addition: () => {
    const scenarios = [
      { total: "customers", a: "want email offers", b: "want text offers", both: "want both" },
      { total: "students", a: "take a lab science", b: "take a foreign language", both: "take both" },
      { total: "commuters", a: "ride the bus", b: "ride the train", both: "use both" },
      { total: "households", a: "own a dog", b: "own a cat", both: "own both" },
      { total: "employees", a: "work remotely", b: "work weekends", both: "do both" },
      { total: "diners", a: "ordered an appetizer", b: "ordered dessert", both: "ordered both" },
    ];
    const s = pick(scenarios);
    const total = pick([100, 150, 200, 250, 300, 400, 500]);
    const countA = Math.round(total * pick([0.2, 0.3, 0.35, 0.4, 0.5]));
    const countB = Math.round(total * pick([0.2, 0.25, 0.3, 0.35]));
    const overlaps = Math.random() < 0.6;
    let both = 0;
    if (overlaps) {
      const maxBoth = Math.min(countA, countB);
      const opts = [0.05, 0.1, 0.15, 0.2].filter((d) => Math.round(total * d) <= maxBoth && Math.round(total * d) > 0);
      both = opts.length ? Math.round(total * pick(opts)) : Math.min(1, maxBoth);
    }
    const pA = countA / total;
    const pB = countB / total;
    const pBoth = both / total;
    const answer = round(pA + pB - pBoth, 4);

    return N(
      4,
      "addition",
      "Addition Rule",
      overlaps
        ? `Out of ${total} ${s.total}, ${countA} ${s.a}, ${countB} ${s.b}, and ${both} ${s.both}. Find the probability that a randomly chosen one ${s.a} OR ${s.b}.`
        : `Out of ${total} ${s.total}, ${countA} ${s.a} and ${countB} ${s.b}. No one does both. Find the probability that a randomly chosen one ${s.a} OR ${s.b}.`,
      [
        `$P(A) = \\dfrac{${countA}}{${total}} = ${round(pA, 4)}$`,
        `$P(B) = \\dfrac{${countB}}{${total}} = ${round(pB, 4)}$`,
        overlaps
          ? `$P(A \\text{ and } B) = \\dfrac{${both}}{${total}} = ${round(pBoth, 4)}$`
          : "The events are mutually exclusive, so there is no overlap to subtract.",
        overlaps
          ? `$P(A \\text{ or } B) = ${round(pA, 4)} + ${round(pB, 4)} - ${round(pBoth, 4)} = ${answer}$`
          : `$P(A \\text{ or } B) = ${round(pA, 4)} + ${round(pB, 4)} = ${answer}$`,
      ],
      answer,
      0.006
    );
  },

  multiplication: () => {
    const form = pick(["without", "with", "independent"] as const);

    if (form === "independent") {
      const p1 = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
      const p2 = pick([0.15, 0.25, 0.35, 0.45, 0.55, 0.65]);
      const answer = round(p1 * p2, 4);
      const s = pick([
        { a: "a flight departs on time", b: "the connecting flight departs on time" },
        { a: "a machine passes inspection", b: "a second, unrelated machine passes" },
        { a: "it rains on Saturday", b: "it rains on the following Saturday" },
      ]);
      return N(
        4,
        "multiplication",
        "Multiplication Rule",
        `The probability that ${s.a} is ${p1}. Independently, the probability that ${s.b} is ${p2}. Find the probability that BOTH happen.`,
        [
          `Independent events, so multiply directly:`,
          `$P(A \\text{ and } B) = P(A) \\cdot P(B) = ${p1} \\times ${p2} = ${answer}$`,
        ],
        answer,
        0.005
      );
    }

    const containers = pick([
      { box: "a box of raffle tickets", good: "winners", n: pick([10, 12, 15, 20]) },
      { box: "a drawer of batteries", good: "charged", n: pick([8, 10, 12, 16]) },
      { box: "a bin of light bulbs", good: "working", n: pick([9, 12, 15, 18]) },
      { box: "a deck of prize cards", good: "prizes", n: pick([10, 14, 20, 25]) },
    ]);
    const total = containers.n;
    const good = randInt(3, Math.max(3, Math.floor(total / 2)));

    if (form === "with") {
      const p = good / total;
      const answer = round(p * p, 4);
      return N(
        4,
        "multiplication",
        "Multiplication Rule",
        `${cap(containers.box)} holds ${total} items, ${good} of which are ${containers.good}. Two are drawn WITH replacement. Find the probability that both are ${containers.good}.`,
        [
          `With replacement, the second draw sees the same box, so the events are independent.`,
          `$P = \\dfrac{${good}}{${total}} \\times \\dfrac{${good}}{${total}} = ${answer}$`,
        ],
        answer,
        0.004
      );
    }

    const p1 = good / total;
    const p2 = (good - 1) / (total - 1);
    const answer = round(p1 * p2, 4);
    return N(
      4,
      "multiplication",
      "Multiplication Rule",
      `${cap(containers.box)} holds ${total} items, ${good} of which are ${containers.good}. Two are drawn WITHOUT replacement. Find the probability that both are ${containers.good}.`,
      [
        `$P(\\text{1st is } ${containers.good}) = \\dfrac{${good}}{${total}} = ${round(p1, 4)}$`,
        `Without replacement, both counts drop by one:`,
        `$P(\\text{2nd} \\mid \\text{1st}) = \\dfrac{${good - 1}}{${total - 1}} = ${round(p2, 4)}$`,
        `$P(\\text{both}) = ${round(p1, 4)} \\times ${round(p2, 4)} = ${answer}$`,
      ],
      answer,
      0.004
    );
  },

  conditional: () => {
    const form = pick(["percent", "table"] as const);

    if (form === "percent") {
      const s = pick([
        { a: "visited a therapist", b: "used a non-prescription sleep aid" },
        { a: "owns a bicycle", b: "commutes by bike at least weekly" },
        { a: "subscribes to the newsletter", b: "made a purchase this month" },
        { a: "attended the review session", b: "passed the exam" },
      ]);
      const pA = pick([0.2, 0.25, 0.3, 0.4, 0.45, 0.5]);
      const pB = pick([0.3, 0.35, 0.4, 0.5, 0.55]);
      // Keep the intersection genuinely possible: at most the smaller marginal.
      const pBoth = round(Math.min(pA, pB) * pick([0.3, 0.4, 0.5, 0.6]), 4);
      const answer = round(pBoth / pA, 4);
      return N(
        4,
        "conditional",
        "Conditional Probability",
        `Among all adults surveyed, ${round(pA * 100, 1)}% ${s.a}, ${round(pB * 100, 1)}% ${s.b}, and ${round(pBoth * 100, 1)}% did both. Given that a randomly chosen adult ${s.a}, find the probability that the person also ${s.b}.`,
        [
          `$P(B \\mid A) = \\dfrac{P(A \\text{ and } B)}{P(A)}$`,
          `$= \\dfrac{${pBoth}}{${pA}} = ${answer}$`,
          `Note the denominator is $P(A)$, not the overall total: you are now working only inside the group that ${s.a}.`,
        ],
        answer,
        0.006
      );
    }

    // Two-way table.
    const rows = pick([
      { r: ["Freshman", "Sophomore"], c: ["Lives on campus", "Lives off campus"] },
      { r: ["Full-time", "Part-time"], c: ["Has insurance", "No insurance"] },
      { r: ["Male", "Female"], c: ["Prefers tea", "Prefers coffee"] },
    ]);
    const a11 = randInt(8, 40);
    const a12 = randInt(8, 40);
    const a21 = randInt(8, 40);
    const a22 = randInt(8, 40);
    const rowTot = a11 + a12;
    const grand = a11 + a12 + a21 + a22;
    const colTot = a11 + a21;
    const givenRow = Math.random() < 0.5;
    const answer = givenRow ? round(a11 / rowTot, 4) : round(a11 / colTot, 4);

    return N(
      4,
      "conditional",
      "Conditional Probability",
      `A survey produced this table:\n\n| | ${rows.c[0]} | ${rows.c[1]} |\n|---|---|---|\n| ${rows.r[0]} | ${a11} | ${a12} |\n| ${rows.r[1]} | ${a21} | ${a22} |\n\nGiven that a randomly chosen person ${givenRow ? `is ${rows.r[0].toLowerCase()}` : `${rows.c[0].toLowerCase()}`}, find the probability that the person ${givenRow ? `${rows.c[0].toLowerCase()}` : `is ${rows.r[0].toLowerCase()}`}. Give a decimal.`,
      [
        `Conditioning restricts you to one row or column, and that becomes the new denominator.`,
        givenRow
          ? `Row total for ${rows.r[0]}: $${a11} + ${a12} = ${rowTot}$`
          : `Column total for ${rows.c[0]}: $${a11} + ${a21} = ${colTot}$`,
        `$P = \\dfrac{${a11}}{${givenRow ? rowTot : colTot}} = ${answer}$`,
        `(The grand total ${grand} is NOT the denominator here.)`,
      ],
      answer,
      0.006
    );
  },

  atleastone: () => {
    const s = pick([
      { n: "components", verb: "fails", event: "at least one works" },
      { n: "servers", verb: "goes offline", event: "at least one stays online" },
      { n: "seeds", verb: "fails to sprout", event: "at least one sprouts" },
      { n: "smoke alarms", verb: "fails to sound", event: "at least one sounds" },
    ]);
    const n = randInt(2, 5);
    const pFail = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35]);
    const allFail = Math.pow(pFail, n);
    const answer = round(1 - allFail, 4);
    return N(
      4,
      "atleastone",
      "At Least One",
      pick([
        `${n} ${s.n} operate independently. Each ${s.verb} with probability ${pFail}. Find the probability that ${s.event}.`,
        `A system uses ${n} independent ${s.n}, each of which ${s.verb} with probability ${pFail}. What is the probability that ${s.event}?`,
      ]),
      [
        `"At least one" is the complement of "none", which is much easier to compute.`,
        `$P(\\text{all fail}) = ${pFail}^{${n}} = ${round(allFail, 6)}$`,
        `$P(\\text{at least one}) = 1 - ${round(allFail, 6)} = ${answer}$`,
      ],
      answer,
      0.005
    );
  },

  /* ------------------------------------------------------------- chapter 5 */

  validdist: () => {
    const bad = Math.random() < 0.5;
    const story = pick(RV_STORIES);

    if (bad) {
      const kind = pick(["sum", "negative"] as const);
      if (kind === "sum") {
        const P = [0.2, 0.3, 0.4, 0.3]; // sums to 1.2
        return C(
          5,
          "validdist",
          "Is It a Distribution?",
          `Let X be ${story.name}. Is this a valid probability distribution?\n\nP(0) = ${P[0]}, P(1) = ${P[1]}, P(2) = ${P[2]}, P(3) = ${P[3]}`,
          ["Yes, it is valid", "No, the probabilities do not sum to 1", "No, a probability is negative"],
          1,
          [
            `$\\sum P(X) = ${P.join(" + ")} = ${round(P.reduce((a, b) => a + b, 0), 4)}$`,
            "Every probability is between 0 and 1, but the total must be exactly 1. It is not, so this is not a valid distribution.",
          ]
        );
      }
      return C(
        5,
        "validdist",
        "Is It a Distribution?",
        `Let X be ${story.name}. Is this a valid probability distribution?\n\nP(0) = 0.5, P(1) = 0.7, P(2) = -0.2`,
        ["Yes, it is valid", "No, the probabilities do not sum to 1", "No, a probability is negative"],
        2,
        [
          "The values do sum to $0.5 + 0.7 - 0.2 = 1$, so the sum condition passes.",
          "But $P(2) = -0.2$, and a probability can never be negative. Both conditions must hold.",
        ]
      );
    }

    const d = pick(DISTRIBUTIONS);
    return C(
      5,
      "validdist",
      "Is It a Distribution?",
      `Let X be ${story.name}. Is this a valid probability distribution?\n\n${d.X.map((x, i) => `P(${x}) = ${d.P[i]}`).join(", ")}`,
      ["Yes, it is valid", "No, the probabilities do not sum to 1", "No, a probability is negative"],
      0,
      [
        `$\\sum P(X) = ${d.P.join(" + ")} = ${round(d.P.reduce((a, b) => a + b, 0), 4)}$`,
        "Every probability is between 0 and 1 and they total exactly 1, so both conditions hold.",
      ]
    );
  },

  meanvariance: () => {
    const d = pick(DISTRIBUTIONS);
    const story = pick(RV_STORIES);
    const mean = d.X.reduce((a, x, i) => a + x * d.P[i], 0);
    const eX2 = d.X.reduce((a, x, i) => a + x * x * d.P[i], 0);
    const variance = eX2 - mean * mean;
    const which = pick(["mean", "variance", "standard deviation"] as const);
    const answer =
      which === "mean" ? round(mean, 4) : which === "variance" ? round(variance, 4) : round(Math.sqrt(variance), 4);

    const steps = [
      `$\\mu = \\sum x \\cdot P(x) = ${d.X.map((x, i) => `${x}(${d.P[i]})`).join(" + ")} = ${round(mean, 4)}$`,
    ];
    if (which !== "mean") {
      steps.push(`$\\sum x^2 P(x) = ${round(eX2, 4)}$`);
      steps.push(`$\\sigma^2 = \\sum x^2 P(x) - \\mu^2 = ${round(eX2, 4)} - (${round(mean, 4)})^2 = ${round(variance, 4)}$`);
    }
    if (which === "standard deviation") {
      steps.push(`$\\sigma = \\sqrt{${round(variance, 4)}} = ${round(Math.sqrt(variance), 4)}$`);
    }

    return N(
      5,
      "meanvariance",
      "Mean & Variance",
      pick([
        `Let X be ${story.name}, with ${d.X.map((x, i) => `P(${x}) = ${d.P[i]}`).join(", ")}. Find the ${which}.`,
        `A discrete random variable X has ${d.X.map((x, i) => `P(${x}) = ${d.P[i]}`).join(", ")}. Find the ${which}.`,
        `For the probability distribution ${d.X.map((x, i) => `P(${x}) = ${d.P[i]}`).join(", ")}, compute the ${which}.`,
      ]),
      steps,
      answer,
      0.03
    );
  },

  "binomial-exact": () => {
    const story = pick([
      { n: "students", event: "passes on the first attempt" },
      { n: "customers", event: "opens the email" },
      { n: "seeds", event: "germinates" },
      { n: "free throws", event: "goes in" },
      { n: "calls", event: "is answered within 30 seconds" },
      { n: "parts", event: "passes inspection" },
    ]);
    const n = randInt(6, 14);
    const p = pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75]);
    const form = pick(["exact", "atmost", "atleast"] as const);

    // Keep x near the middle of the distribution. A far-tail x produces a
    // probability like 0.00002, which teaches nothing and cannot be graded
    // sensibly against any reasonable tolerance.
    const mu = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    let x = Math.round(mu + pick([-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) * sd);
    x = Math.max(1, Math.min(n - 1, x));

    if (form === "exact") {
      const answer = round(binomPMF(n, p, x), 5);
      return N(
        5,
        "binomial-exact",
        "Binomial Probability",
        `In a group of ${n} ${story.n}, each independently ${story.event} with probability ${p}. Find the probability that EXACTLY ${x} of them do.`,
        [
          `$P(X = x) = \\binom{n}{x} p^x q^{n-x}$ with $n = ${n}$, $p = ${p}$, $x = ${x}$`,
          `$\\binom{${n}}{${x}} = ${nCr(n, x)}$`,
          `$p^{${x}} = ${round(Math.pow(p, x), 7)}$, $q^{${n - x}} = ${round(Math.pow(1 - p, n - x), 7)}$`,
          `$P(X = ${x}) = ${nCr(n, x)} \\times ${round(Math.pow(p, x), 7)} \\times ${round(Math.pow(1 - p, n - x), 7)} = ${answer}$`,
        ],
        answer,
        // Tolerance scales with the answer but never exceeds a fifth of it, so
        // typing 0 can never be accepted as correct.
        Math.max(0.0005, Math.min(0.01, answer * 0.2)),
        );
    }

    if (form === "atmost") {
      const answer = round(binomCDF(n, p, x), 5);
      const terms = [];
      for (let i = 0; i <= x; i++) terms.push(`P(${i}) = ${round(binomPMF(n, p, i), 5)}`);
      return N(
        5,
        "binomial-exact",
        "Binomial Probability",
        `In a group of ${n} ${story.n}, each independently ${story.event} with probability ${p}. Find the probability that AT MOST ${x} of them do.`,
        [
          `"At most ${x}" means $X = 0, 1, \\ldots, ${x}$, so add those terms.`,
          terms.join(", "),
          `$P(X \\le ${x}) = ${answer}$`,
        ],
        answer,
        Math.max(0.0005, Math.min(0.01, answer * 0.2))
      );
    }

    const answer = round(1 - binomCDF(n, p, x - 1), 5);
    return N(
      5,
      "binomial-exact",
      "Binomial Probability",
      `In a group of ${n} ${story.n}, each independently ${story.event} with probability ${p}. Find the probability that AT LEAST ${x} of them do.`,
      [
        `"At least ${x}" is everything from ${x} up. It is quicker to subtract the other side.`,
        `$P(X \\ge ${x}) = 1 - P(X \\le ${x - 1})$`,
        `$P(X \\le ${x - 1}) = ${round(binomCDF(n, p, x - 1), 5)}$`,
        `$P(X \\ge ${x}) = 1 - ${round(binomCDF(n, p, x - 1), 5)} = ${answer}$`,
      ],
      answer,
      Math.max(0.0005, Math.min(0.01, answer * 0.2))
    );
  },

  "binomial-meansd": () => {
    const story = pick([
      "customers who redeem a coupon",
      "flights that arrive early",
      "students who join the study group",
      "devices that pass a stress test",
      "voters who return a ballot",
    ]);
    const n = randInt(12, 60);
    const p = pick([0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    const mean = n * p;
    const variance = n * p * (1 - p);
    const which = pick(["mean", "variance", "standard deviation"] as const);
    const answer =
      which === "mean" ? round(mean, 4) : which === "variance" ? round(variance, 4) : round(Math.sqrt(variance), 4);

    const steps =
      which === "mean"
        ? [`$\\mu = np = ${n}(${p}) = ${round(mean, 4)}$`]
        : which === "variance"
          ? [`$\\sigma^2 = npq = ${n}(${p})(${round(1 - p, 2)}) = ${round(variance, 4)}$`]
          : [
              `$\\sigma^2 = npq = ${n}(${p})(${round(1 - p, 2)}) = ${round(variance, 4)}$`,
              `$\\sigma = \\sqrt{${round(variance, 4)}} = ${round(Math.sqrt(variance), 4)}$`,
            ];

    return N(
      5,
      "binomial-meansd",
      "Binomial Mean & SD",
      pick([
        `A binomial experiment counts ${story}, with $n = ${n}$ and $p = ${p}$. Find the ${which}.`,
        `For a binomial distribution with $n = ${n}$ and $p = ${p}$, find the ${which}.`,
        `${cap(story)} follow a binomial distribution with ${n} trials and success probability ${p}. Find the ${which}.`,
      ]),
      steps,
      answer,
      0.05
    );
  },

  /* ------------------------------------------------------------- chapter 6 */

  "area-from-z": () => {
    const c = pick(CONTEXTS);
    const mu = pick([50, 60, 70, 100, 120, 200, 500]);
    const sigma = pick([5, 8, 10, 12, 15, 20, 25]);
    const form = pick(["left", "right", "between"] as const);

    if (form === "between") {
      const zLo = pick([-2, -1.5, -1, -0.5]);
      const zHi = pick([0.5, 1, 1.5, 2]);
      const xLo = mu + zLo * sigma;
      const xHi = mu + zHi * sigma;
      const areaLo = normalCDF(zLo);
      const areaHi = normalCDF(zHi);
      const answer = round(areaHi - areaLo, 4);
      return N(
        6,
        "area-from-z",
        "Area from a Value",
        `${cap(c.plural)} are normally distributed with $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. Find the probability that a randomly chosen ${c.short} falls BETWEEN ${round(xLo, 2)} and ${round(xHi, 2)} ${c.unit}.`,
        [
          `$z_1 = \\dfrac{${round(xLo, 2)} - ${mu}}{${sigma}} = ${round(zLo, 3)}$, $z_2 = \\dfrac{${round(xHi, 2)} - ${mu}}{${sigma}} = ${round(zHi, 3)}$`,
          `Table E areas: $${round(areaLo, 4)}$ and $${round(areaHi, 4)}$`,
          `Between means subtract: $${round(areaHi, 4)} - ${round(areaLo, 4)} = ${answer}$`,
        ],
        answer,
        areaTol(answer)
      );
    }

    const z = pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]);
    const X = mu + z * sigma;
    const areaLeft = normalCDF(z);
    const answer = form === "left" ? round(areaLeft, 4) : round(1 - areaLeft, 4);
    return N(
      6,
      "area-from-z",
      "Area from a Value",
      pick([
        `${cap(c.plural)} are normally distributed with $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. Find the probability that a randomly chosen ${c.short} is ${form === "left" ? "LESS" : "GREATER"} than ${round(X, 2)} ${c.unit}.`,
        `A normal distribution has $\\mu = ${mu}$ and $\\sigma = ${sigma}$. For $X = ${round(X, 2)}$, find the area to the ${form === "left" ? "LEFT" : "RIGHT"}, as a probability between 0 and 1.`,
      ]),
      [
        `$z = \\dfrac{${round(X, 2)} - ${mu}}{${sigma}} = ${round(z, 3)}$`,
        `Table E gives the area to the LEFT of $z$: $${round(areaLeft, 4)}$`,
        form === "right"
          ? `The table is always left-tail, so subtract: $1 - ${round(areaLeft, 4)} = ${answer}$`
          : `That is already what was asked: $${answer}$`,
      ],
      answer,
      areaTol(answer)
    );
  },

  "value-from-area": () => {
    const c = pick(CONTEXTS);
    const mu = pick([50, 60, 70, 100, 120, 200, 500]);
    const sigma = pick([5, 8, 10, 12, 15, 20, 25]);
    const form = pick(["percentile", "top"] as const);

    if (form === "top") {
      const topPct = pick([1, 2.5, 5, 10, 20, 25]);
      const areaLeft = 1 - topPct / 100;
      const z = normalInv(areaLeft);
      const X = round(mu + z * sigma, 3);
      return N(
        6,
        "value-from-area",
        "Value from a Percentile",
        `${cap(c.plural)} are normally distributed with $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. Find the cutoff ${c.short} that separates the TOP ${topPct}% from the rest.`,
        [
          `Top ${topPct}% means an area of $${round(areaLeft, 4)}$ to the LEFT.`,
          `Table E: the z for that area is about $${round(z, 3)}$`,
          `$X = \\mu + z\\sigma = ${mu} + (${round(z, 3)})(${sigma}) = ${X}$`,
        ],
        X,
        // Roughly one Table E row of slack in z, converted back to X units.
        round(Math.max(0.2, 0.02 * sigma), 3)
      );
    }

    const areaLeft = pick([0.05, 0.1, 0.2, 0.25, 0.75, 0.8, 0.9, 0.95, 0.99]);
    const z = normalInv(areaLeft);
    const X = round(mu + z * sigma, 3);
    return N(
      6,
      "value-from-area",
      "Value from a Percentile",
      pick([
        `${cap(c.plural)} are normally distributed with $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. Find the ${round(areaLeft * 100, 0)}th percentile.`,
        `A normal distribution has $\\mu = ${mu}$ and $\\sigma = ${sigma}$. Find the value X with an area of ${areaLeft} to its left.`,
      ]),
      [
        `Look up the area $${areaLeft}$ inside Table E; the z-score is about $${round(z, 3)}$`,
        `$X = \\mu + z\\sigma = ${mu} + (${round(z, 3)})(${sigma}) = ${X}$`,
      ],
      X,
      round(Math.max(0.2, 0.02 * sigma), 3)
    );
  },

  clt: () => {
    const c = pick(CONTEXTS);
    const mu = pick([40, 50, 60, 70, 100, 200]);
    const sigma = pick([8, 10, 12, 15, 20, 24]);
    const n = pick([4, 9, 16, 25, 36, 49, 64, 100]);
    const se = sigma / Math.sqrt(n);
    const form = pick(["z", "se", "prob"] as const);

    if (form === "se") {
      return N(
        6,
        "clt",
        "Central Limit Theorem",
        `${cap(c.plural)} have $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. Samples of size $n = ${n}$ are taken. Find the standard error of the sample mean.`,
        [
          `$\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}}$`,
          `$= \\dfrac{${sigma}}{\\sqrt{${n}}} = \\dfrac{${sigma}}{${Math.sqrt(n)}} = ${round(se, 4)}$`,
          `Larger samples give a smaller standard error, which is why sample means cluster more tightly than individual values.`,
        ],
        round(se, 4),
        0.02
      );
    }

    // Choose a z, then derive xbar from it EXACTLY so the displayed work and
    // the graded answer cannot disagree. (Rounding xbar first and then keying
    // the nominal z is what used to make the two drift apart.)
    const z = pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]);
    const xbar = mu + z * se;
    const xbarShown = round(xbar, 4);
    const zExact = (xbarShown - mu) / se;

    if (form === "prob") {
      const answer = round(normalCDF(zExact), 4);
      return N(
        6,
        "clt",
        "Central Limit Theorem",
        `${cap(c.plural)} have $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. For a sample of $n = ${n}$, find the probability that the sample mean is LESS than ${xbarShown} ${c.unit}.`,
        [
          `$\\sigma_{\\bar{x}} = \\dfrac{${sigma}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
          `$z = \\dfrac{\\bar{x} - \\mu}{\\sigma_{\\bar{x}}} = \\dfrac{${xbarShown} - ${mu}}{${round(se, 4)}} = ${round(zExact, 3)}$`,
          `Area to the left of $z = ${round(zExact, 3)}$ is $${answer}$`,
        ],
        answer,
        areaTol(answer)
      );
    }

    return N(
      6,
      "clt",
      "Central Limit Theorem",
      `${cap(c.plural)} have $\\mu = ${mu}$ and $\\sigma = ${sigma}$ ${c.unit}. A sample of $n = ${n}$ has sample mean $\\bar{x} = ${xbarShown}$. Find the z-score for this sample mean.`,
      [
        `Use the standard error, NOT $\\sigma$, this is a sample mean, not a single value.`,
        `$\\sigma_{\\bar{x}} = \\dfrac{${sigma}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$z = \\dfrac{${xbarShown} - ${mu}}{${round(se, 4)}} = ${round(zExact, 3)}$`,
      ],
      round(zExact, 3),
      0.05
    );
  },
};

Object.assign(generators, ch7Generators, ch8Generators, ch10Generators);


export function generateProblem(ch: number, topicKey?: string): PracticeProblem {
  const topics = topicsByChapter[ch] || topicsByChapter[4];
  const key = topicKey && generators[topicKey] ? topicKey : pick(topics).key;
  return generators[key]();
}

/** Exposed for testing: generate one of every topic. */
export const allTopicKeys = Object.keys(generators);
