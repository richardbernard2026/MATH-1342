export type SectionMeta = { id: string; title: string };

export type ChapterMeta = {
  num: number;
  title: string;
  blurb: string;
  sections: SectionMeta[];
};

export const chapters: ChapterMeta[] = [
  {
    num: 1,
    title: "The Nature of Probability & Statistics",
    blurb:
      "Descriptive vs inferential, populations vs samples, variable types and levels of measurement.",
    sections: [
      { id: "1.1", title: "Descriptive & Inferential Statistics" },
      { id: "1.2", title: "Variables & Types of Data" },
    ],
  },
  {
    num: 2,
    title: "Frequency Distributions & Graphs",
    blurb:
      "Organizing raw data into tables, then turning those tables into histograms, ogives, and other graphs.",
    sections: [
      { id: "2.1", title: "Organizing Data" },
      { id: "2.2", title: "Histograms, Polygons & Ogives" },
      { id: "2.3", title: "Other Types of Graphs" },
    ],
  },
  {
    num: 3,
    title: "Data Description",
    blurb: "Center, spread, position, and exploratory data analysis with boxplots.",
    sections: [
      { id: "3.1", title: "Measures of Central Tendency" },
      { id: "3.2", title: "Measures of Variation" },
      { id: "3.3", title: "Measures of Position" },
      { id: "3.4", title: "Exploratory Data Analysis" },
    ],
  },
  {
    num: 4,
    title: "Probability & Counting Rules",
    blurb:
      "Classical and empirical probability, addition and multiplication rules, conditional probability.",
    sections: [
      { id: "4.1", title: "Sample Spaces & Probability Rules" },
      { id: "4.2", title: "Addition Rules" },
      { id: "4.3", title: "Multiplication & Conditional Probability" },
    ],
  },
  {
    num: 5,
    title: "Discrete Probability Distributions",
    blurb: "Random variables, mean/variance/expected value, and the binomial distribution.",
    sections: [
      { id: "5.1", title: "Random Variables & Distributions" },
      { id: "5.2", title: "Mean, Variance & Expected Value" },
      { id: "5.3", title: "The Binomial Distribution" },
    ],
  },
  {
    num: 6,
    title: "The Normal Distribution",
    blurb: "z-scores, Table E area lookups, and the Central Limit Theorem.",
    sections: [
      { id: "6.1", title: "The Normal Distribution & z-scores" },
      { id: "6.2", title: "Applications: Values from Areas" },
      { id: "6.3", title: "Central Limit Theorem & Sample Means" },
    ],
  },
  {
    num: 7,
    title: "Confidence Intervals & Sample Size",
    blurb:
      "Turning a single sample mean into an interval estimate, with z when sigma is known and t when it is not.",
    sections: [
      { id: "7.1", title: "Confidence Intervals & Sample Size" },
      { id: "7.2", title: "CI for the Mean (sigma known)" },
      { id: "7.3", title: "CI for the Mean (sigma unknown)" },
    ],
  },
  {
    num: 8,
    title: "Hypothesis Testing",
    blurb:
      "Stating H0 and H1, choosing one tail or two, and reaching a conclusion by either the traditional method or the P-value method.",
    sections: [
      { id: "8.1", title: "Steps in Hypothesis Testing" },
      { id: "8.2", title: "z Test for a Mean" },
      { id: "8.3", title: "t Test for a Mean" },
    ],
  },
  {
    num: 10,
    title: "Correlation & Regression",
    blurb:
      "Measuring the strength of a linear relationship, testing whether it is real, and fitting a line to predict with.",
    sections: [
      { id: "10.1", title: "Correlation" },
      { id: "10.2", title: "Regression" },
    ],
  },
];

export function getChapter(num: number) {
  return chapters.find((c) => c.num === num);
}

/**
 * The chapters this course covers, written the way a person would say it:
 * "1-8, 10". Contiguous numbers collapse into a run and gaps are preserved,
 * because the course skips Chapter 9.
 *
 * Anywhere the site names its own scope should call this rather than spell out
 * a range, which is how "Chapters 1-6" survived three chapters past being true.
 */
export function chapterRangeLabel(nums: number[] = chapters.map((c) => c.num)): string {
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  const flush = () => runs.push(start === prev ? `${start}` : `${start}-${prev}`);

  for (const n of sorted.slice(1)) {
    if (n === prev + 1 || n === prev) {
      prev = n;
      continue;
    }
    flush();
    start = n;
    prev = n;
  }
  flush();
  return runs.join(", ");
}

/** Which chapters each exam covers, per the course calendar. */
export const examScopes = [
  { key: "t1", label: "Test 1 (Ch 1-3)", chapters: [1, 2, 3] },
  { key: "t2", label: "Test 2 (Ch 4-6)", chapters: [4, 5, 6] },
  { key: "t3", label: "Test 3 (Ch 7-8)", chapters: [7, 8] },
  { key: "cum", label: "Final (comprehensive)", chapters: [1, 2, 3, 4, 5, 6, 7, 8, 10] },
];

/**
 * Course calendar dates that the session planner reasons about.
 * Summer II 2026, MATH 1342.92L.
 */
export const examDates: Record<string, string> = {
  t3: "2026-08-18",
  final: "2026-08-21",
};

/**
 * The order sections are taught in, which is not the same as sorting the ids
 * as numbers (10.1 comes after 8.3, not after 1.2). Used by the scheduler to
 * decide what counts as "new" versus "review" on a given day.
 */
export const teachingOrder: string[] = [
  "1.1", "1.2",
  "2.1", "2.2", "2.3",
  "3.1", "3.2", "3.3", "3.4",
  "4.1", "4.2", "4.3",
  "5.1", "5.2", "5.3",
  "6.1", "6.2", "6.3",
  "7.1", "7.2", "7.3",
  "8.1", "8.2", "8.3",
  "10.1", "10.2",
];

/** The date each section was, or will be, covered in class. */
export const sectionTaughtOn: Record<string, string> = {
  "1.1": "2026-07-16", "1.2": "2026-07-17",
  "2.1": "2026-07-20", "2.2": "2026-07-21", "2.3": "2026-07-21",
  "3.1": "2026-07-22", "3.2": "2026-07-23", "3.3": "2026-07-24", "3.4": "2026-07-24",
  "4.1": "2026-07-29", "4.2": "2026-07-29", "4.3": "2026-07-30",
  "5.1": "2026-07-31", "5.2": "2026-07-31", "5.3": "2026-08-03",
  "6.1": "2026-08-04", "6.2": "2026-08-05", "6.3": "2026-08-05",
  "7.1": "2026-08-10", "7.2": "2026-08-10", "7.3": "2026-08-11",
  "8.1": "2026-08-12", "8.2": "2026-08-13", "8.3": "2026-08-14",
  "10.1": "2026-08-19", "10.2": "2026-08-19",
};
