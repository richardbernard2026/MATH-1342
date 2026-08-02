/**
 * The 18 section lessons for Chapters 1-6.
 *
 * `formula` strings are rendered by <FormulaBlock>, one line at a time, and may
 * contain LaTeX between $...$ delimiters. `idea` is plain prose written to be
 * read before the formula, not after it.
 */

export type Lesson = {
  id: string;
  ch: number;
  title: string;
  idea: string;
  formula: string;
  buildsOn: string;
  buildsToward: string;
  diagram?: string;
};

const L = (
  id: string,
  ch: number,
  title: string,
  idea: string,
  formula: string,
  buildsOn: string,
  buildsToward: string,
  diagram?: string
): Lesson => ({ id, ch, title, idea, formula, buildsOn, buildsToward, diagram });

export const lessons: Lesson[] = [
  L(
    "1.1",
    1,
    "Descriptive & Inferential Statistics",
    "Descriptive statistics summarizes data you already collected, without going beyond it. Inferential statistics uses a sample to generalize or predict about a larger population, and always carries some uncertainty. The quick test: if a statement only reports what was observed, it is descriptive. If it makes a claim or prediction beyond what was measured, it is inferential.",
    "Population $=$ the entire group being studied\nSample $=$ a subset actually measured\nParameter $=$ a number describing a POPULATION\nStatistic $=$ a number describing a SAMPLE",
    "Nothing before this. It is the first idea in the course.",
    "Chapters 2 and 3 are the descriptive tools; Chapters 4 through 6 build the probability machinery that makes inference possible.",
    "ladder"
  ),
  L(
    "1.2",
    1,
    "Variables & Types of Data",
    "A variable is a characteristic that varies between individuals. Qualitative means a category; quantitative means a number. Quantitative splits again into discrete (countable, with gaps between values) and continuous (any value in a range). Separately from that, every variable has a level of measurement, which decides what arithmetic is actually meaningful on it.",
    "Nominal: categories only, no order\nOrdinal: can be ranked, but gaps are not equal\nInterval: equal gaps, but zero is arbitrary\nRatio: equal gaps AND a true zero\n\nFast test: does zero mean none? If yes and the gaps are equal, it is ratio.",
    "1.1's idea that data describes individuals in a population or a sample.",
    "The level of measurement decides which graph (Chapter 2) and which summary statistic (Chapter 3) are legitimate to use.",
    "ladder"
  ),
  L(
    "2.1",
    2,
    "Organizing Data",
    "Raw data is a shapeless list of values. A frequency distribution sorts those values into classes and counts how many land in each. Use a categorical distribution for labels, an ungrouped one when there are only a few distinct values, and a grouped one when the range is wide.",
    "$\\text{range} = \\text{highest} - \\text{lowest}$\n$\\text{class width} = \\dfrac{\\text{range}}{\\text{number of classes}}$, always rounded UP to a whole number\n$\\text{class midpoint} = \\dfrac{\\text{lower limit} + \\text{upper limit}}{2}$\nClass boundaries $=$ limits shifted by $0.5$ so the bars touch\nCheck: width $\\times$ number of classes must reach the largest value",
    "1.2's levels of measurement, which decide whether classes are categories or numeric ranges.",
    "2.2 turns this exact table into a histogram, a frequency polygon, or an ogive.",
    "histogram"
  ),
  L(
    "2.2",
    2,
    "Histograms, Polygons & Ogives",
    "A histogram uses touching bars drawn at class boundaries, with height equal to frequency. A frequency polygon plots one point per class at its midpoint and connects them, which makes comparing two distributions easy. An ogive plots cumulative frequency at each upper boundary, so it always rises, and it answers the question how many values fall below this point.",
    "Histogram: bar height $=$ frequency, drawn at class BOUNDARIES\nFrequency polygon: point plotted at the class MIDPOINT\nOgive: point at the upper BOUNDARY, height $=$ cumulative frequency\n$\\text{relative frequency} = \\dfrac{\\text{class frequency}}{\\text{total}}$",
    "The frequency distribution table built in 2.1.",
    "The shape you see here is exactly what Chapter 3 measures numerically, and what Chapter 6's normal curve formalizes.",
    "histogram"
  ),
  L(
    "2.3",
    2,
    "Other Types of Graphs",
    "Bar graphs show categorical frequencies with gaps between the bars. A Pareto chart is a bar graph sorted highest to lowest, so the dominant category is obvious. Time series graphs always put time on the horizontal axis. Pie graphs show parts of a whole. Dotplots and stem-and-leaf plots preserve every original value, which a histogram cannot do.",
    "Categorical $\\rightarrow$ bar graph, Pareto chart, or pie graph\nOver time $\\rightarrow$ time series graph (time on the $x$-axis)\nKeep every raw value $\\rightarrow$ dotplot or stem-and-leaf plot",
    "2.2's principle that the graph should match the type of data.",
    "Stem-and-leaf plots and dotplots feed directly into Chapter 3's boxplots and five-number summaries.",
    "pareto"
  ),
  L(
    "3.1",
    3,
    "Measures of Central Tendency",
    "The mean uses every value, so a single outlier drags it. The median depends only on position, so it resists outliers. The mode is the most frequent value. The midrange uses only the two extremes, so outliers wreck it. Comparing the mean to the median reveals the shape: mean above median means skewed right, mean below means skewed left.",
    "$\\bar{x} = \\dfrac{\\sum x}{n}$ (sample mean), $\\mu$ for a population\nMedian $=$ the middle value of SORTED data\nMode $=$ the most frequent value\n$\\text{midrange} = \\dfrac{\\text{lowest} + \\text{highest}}{2}$",
    "The shape you saw in 2.2's histogram now gets a number attached to it.",
    "3.2 measures how spread out the data is around this center, and 5.2's expected value is this same weighted-average idea applied to probabilities.",
    "skew"
  ),
  L(
    "3.2",
    3,
    "Measures of Variation",
    "Two data sets can share a mean and look nothing alike. Variance averages the squared distances from the mean, squaring so that positive and negative deviations do not cancel. Standard deviation is its square root, which puts it back in the original units, so it is the spread measure you actually interpret. Sample formulas divide by n minus 1, which corrects for a sample tending to underestimate the true spread.",
    "$\\text{range} = \\text{highest} - \\text{lowest}$\n$s^2 = \\dfrac{\\sum (x - \\bar{x})^2}{n - 1}$ and $s = \\sqrt{s^2}$ (sample)\n$\\sigma^2 = \\dfrac{\\sum (x - \\mu)^2}{N}$ (population, divides by $N$)\n\nEmpirical Rule (bell-shaped only): $68\\%$ / $95\\%$ / $99.7\\%$ within $1$ / $2$ / $3$ standard deviations\nChebyshev (any shape): at least $1 - \\dfrac{1}{k^2}$ within $k$ standard deviations",
    "3.1's mean, which every deviation is measured from.",
    "The Empirical Rule here becomes Chapter 6's exact normal-curve areas, and the standard deviation is the denominator of every z-score you will ever compute.",
    "empirical"
  ),
  L(
    "3.3",
    3,
    "Measures of Position",
    "A z-score says how many standard deviations a value sits from the mean, which lets you compare scores measured on completely different scales. Percentiles cut ordered data into 100 groups. Quartiles cut it into four: Q1 is the 25th percentile, Q2 is the median, Q3 is the 75th. The interquartile range measures the middle 50% and is the basis for flagging outliers.",
    "$z = \\dfrac{x - \\bar{x}}{s}$\n$Q_1 = $ median of the lower half, $Q_3 = $ median of the upper half\n$\\text{IQR} = Q_3 - Q_1$\n$\\text{lower fence} = Q_1 - 1.5(\\text{IQR})$\n$\\text{upper fence} = Q_3 + 1.5(\\text{IQR})$\nAnything outside the fences is an outlier.",
    "3.1's median and 3.2's standard deviation are both used directly here.",
    "This z-score is exactly the same z-score as Chapter 6. Learn it once here and Chapter 6 is already half done.",
    "boxplot"
  ),
  L(
    "3.4",
    3,
    "Exploratory Data Analysis",
    "EDA gets a fast feel for a data set before any formal test. Its core tool is the five-number summary, drawn as a boxplot: a box from Q1 to Q3 with the median marked inside, whiskers reaching to the most extreme non-outlier values, and true outliers plotted as separate points. The shape reads at a glance, since a median near Q1 with a long right whisker means skewed right.",
    "Five-number summary: minimum, $Q_1$, median, $Q_3$, maximum\n\nThe box spans $Q_1$ to $Q_3$ (the IQR)\nThe line inside the box is the median\nWhiskers reach the most extreme NON-outlier values\nOutliers are plotted as separate points",
    "3.3's quartiles, IQR, and outlier fences are the entire input to a boxplot.",
    "Recognizing skew versus symmetry here is what tells you whether Chapter 6's normal-distribution methods are even appropriate.",
    "boxplot"
  ),
  L(
    "4.1",
    4,
    "Sample Spaces & Probability Rules",
    "Probability runs from 0 (impossible) to 1 (certain). There are three ways to get that number: classical (count equally-likely outcomes), empirical (use observed frequency from data), and subjective (an informed guess). The complement rule says everything that can possibly happen adds up to 1.",
    "$P(A) = \\dfrac{\\text{number of favorable outcomes}}{\\text{total number of outcomes}}$\n$P(\\bar{A}) = 1 - P(A)$",
    "1.1's population-and-sample framing: probability is how we quantify the uncertainty in moving between them.",
    "Every later formula is a more advanced way of answering this same question: how likely is this?",
    "venn-me"
  ),
  L(
    "4.2",
    4,
    "Addition Rules",
    "For the probability that A or B happens, you add. But if A and B can happen at the same time, plain addition double-counts the overlap, so you subtract it back out once.",
    "Mutually exclusive: $P(A \\text{ or } B) = P(A) + P(B)$\nNot mutually exclusive: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$",
    "The basic probability values from 4.1 are exactly what you are adding together.",
    "Contingency-table problems on the exam are addition-rule problems in disguise; you are just reading the pieces off a table.",
    "venn-ov"
  ),
  L(
    "4.3",
    4,
    "Multiplication & Conditional Probability",
    "For the probability that A and B both happen, you multiply. If A happening changes the odds of B, the events are dependent and you must use the updated, conditional probability. If they do not affect each other, they are independent and you multiply the original probabilities.",
    "Independent: $P(A \\text{ and } B) = P(A) \\cdot P(B)$\nDependent: $P(A \\text{ and } B) = P(A) \\cdot P(B \\mid A)$\nConditional: $P(B \\mid A) = \\dfrac{P(A \\text{ and } B)}{P(A)}$",
    "The idea of a trial with a fixed probability, from 4.1.",
    "The biggest bridge in the course: the binomial formula in 5.3 is this multiplication rule combined with counting.",
    "tree-dep"
  ),
  L(
    "5.1",
    5,
    "Random Variables & Distributions",
    "A random variable assigns a number to every outcome of an experiment. A discrete probability distribution lists every possible value next to its probability. To be valid, each probability must be between 0 and 1, and they must all sum to exactly 1.",
    "A distribution is valid when $0 \\le P(X) \\le 1$ for every $X$, and $\\sum P(X) = 1$",
    "4.1's probability scale and the rule that everything possible sums to 1.",
    "5.2's mean and variance and 5.3's binomial distribution are both built on this same skeleton.",
    "histogram"
  ),
  L(
    "5.2",
    5,
    "Mean, Variance & Expected Value",
    "Once you have a valid distribution, find its center of gravity by weighting each outcome by how likely it is. That is the expected value: what to expect on average over many repetitions. This is exactly how insurance pricing and fair-game problems work.",
    "$\\mu = E(X) = \\sum [X \\cdot P(X)]$\n$\\sigma^2 = \\sum [X^2 \\cdot P(X)] - \\mu^2$\n$\\sigma = \\sqrt{\\sigma^2}$\n\nA game is fair when $E(X) = 0$",
    "The distribution table from 5.1, and the same weighted-average logic as 3.1's mean.",
    "The Central Limit Theorem in 6.3 is about the mean and standard deviation of SAMPLE MEANS, which is this idea at a bigger scale.",
    "skew"
  ),
  L(
    "5.3",
    5,
    "The Binomial Distribution",
    "The most common discrete distribution on this exam. It applies whenever you have a fixed number of identical, independent trials, each with only two outcomes and the same probability of success every time. The formula counts every arrangement of successes and multiplies by the probability of any one arrangement.",
    "$P(X) = \\binom{n}{x} p^x q^{\\,n-x}$ where $q = 1 - p$\n$\\mu = np$\n$\\sigma^2 = npq$\n$\\sigma = \\sqrt{npq}$",
    "4.3's multiplication rule (for the $p^x q^{n-x}$ part) and Chapter 4's counting (for the $\\binom{n}{x}$ part).",
    "6.1's normal curve is what the binomial distribution starts to look like as $n$ gets large.",
    "binom-strip"
  ),
  L(
    "6.1",
    6,
    "The Normal Distribution & z-scores",
    "The normal distribution is the bell curve for a continuous variable. Since every normal curve has its own center and width, you convert a raw value into a z-score first. Once everything is in standardized units, one universal table gives you the area under the curve, and that area is the probability or the percentile.",
    "$z = \\dfrac{X - \\mu}{\\sigma}$\n$\\text{area right} = 1 - \\text{area left}$\n$\\text{area between} = \\text{larger area} - \\text{smaller area}$",
    "This is the SAME z-score formula from 3.3, now used to look up exact areas instead of just describing position.",
    "6.2 runs this exact process backward, going from a percentage to a raw score.",
    "curve-left"
  ),
  L(
    "6.2",
    6,
    "Applications: Values from Areas",
    "Sometimes you are given a percentile or a cutoff percentage and asked for the actual value. Look up the z-score matching that area, then solve the z-score formula for X.",
    "$X = \\mu + z\\sigma$",
    "6.1's z-score formula and area table, rearranged to solve for $X$.",
    "6.3 uses this same reverse logic, but for sample means rather than individual values.",
    "curve-between"
  ),
  L(
    "6.3",
    6,
    "Central Limit Theorem & Sample Means",
    "Take random samples of size n from any population at all and compute each sample's mean. Those sample means form a normal distribution as n grows, even if the original data was nowhere near normal. The spread of those sample means, called the standard error, shrinks as n grows, which is why bigger samples give more precise estimates.",
    "$\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}}$ (the standard error)\n$z = \\dfrac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}$",
    "6.1's z-score logic with $\\sigma$ replaced by the standard error, plus 5.2's idea of a mean.",
    "The capstone of Chapters 4 through 6, and the foundation for confidence intervals in Chapter 7.",
    "clt"
  ),
];

export function getLesson(id: string) {
  return lessons.find((l) => l.id === id);
}

export function lessonsForChapter(ch: number) {
  return lessons.filter((l) => l.ch === ch);
}
