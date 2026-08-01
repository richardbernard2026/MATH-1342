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
];

export function getChapter(num: number) {
  return chapters.find((c) => c.num === num);
}

/** Which chapters each exam covers, per the course calendar. */
export const examScopes = [
  { key: "t1", label: "Test 1 (Ch 1-3)", chapters: [1, 2, 3] },
  { key: "t2", label: "Test 2 (Ch 4-6)", chapters: [4, 5, 6] },
  { key: "cum", label: "Cumulative (all 60)", chapters: [1, 2, 3, 4, 5, 6] },
];
