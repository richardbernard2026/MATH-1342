/**
 * "Which formula do I use?" decision trees, one per chapter.
 *
 * Knowing the formulas is rarely the problem on an exam. Knowing WHICH formula
 * a word problem is asking for is. These trees make that choice explicit: a few
 * yes/no questions about the problem in front of you, ending at the right
 * formula with a diagram and a one-line reason.
 */

export type QNode = { q: string; yes: string; no: string };
export type FNode = { formula: string; why: string; diagram?: string };
export type TreeNode = QNode | FNode;
export type Tree = { start: string; nodes: Record<string, TreeNode> };

export function isQuestion(n: TreeNode): n is QNode {
  return (n as QNode).q !== undefined;
}

const Q = (q: string, yes: string, no: string): QNode => ({ q, yes, no });
const F = (formula: string, why: string, diagram?: string): FNode => ({ formula, why, diagram });

export const trees: Record<number, Tree> = {
  1: {
    start: "q1",
    nodes: {
      q1: Q("Are you deciding whether a STATEMENT is descriptive or inferential?", "q2", "q3"),
      q2: Q("Does it go beyond the data collected, predicting or generalizing to a larger group?", "f2", "f1"),
      f1: F("Descriptive statistics", "It only reports or summarizes what was actually observed."),
      f2: F("Inferential statistics", "It extends past the measured data to a claim about the wider population."),
      q3: Q("Are you classifying the VARIABLE itself?", "q4", "q6"),
      q4: Q("Is the variable naturally numeric, a count or a measurement?", "q5", "f3"),
      f3: F("Qualitative (categorical)", "It names a quality or category rather than a quantity.", "ladder"),
      q5: Q("Can it only take countable values, with gaps between them?", "f4", "f5"),
      f4: F("Quantitative, discrete", "Countable whole numbers. You cannot have 2.5 children."),
      f5: F("Quantitative, continuous", "Any value in a range, limited only by measurement precision."),
      q6: Q("Do you need the LEVEL OF MEASUREMENT?", "q7", "f9"),
      q7: Q("Can the values be put in a meaningful order?", "q8", "f6"),
      f6: F("Nominal", "Pure categories. All you can do is count how many fall in each.", "ladder"),
      q8: Q("Are the differences between values meaningful and equal?", "q9", "f7"),
      f7: F("Ordinal", "You can rank them, but the gaps are not equal or measurable.", "ladder"),
      q9: Q("Does zero mean none of the quantity?", "f8", "f10"),
      f8: F("Ratio", "A true zero, so ratios make sense: 10 lbs really is twice 5 lbs.", "ladder"),
      f10: F("Interval", "Equal gaps, but zero is arbitrary. $0^\\circ$F is not the absence of temperature.", "ladder"),
      f9: F("Parameter vs statistic", "A parameter describes a POPULATION. A statistic describes a SAMPLE and estimates the parameter."),
    },
  },

  2: {
    start: "q1",
    nodes: {
      q1: Q("Do you need to BUILD a frequency table rather than draw a graph?", "q2", "q4"),
      q2: Q("Is the data categorical, labels rather than numbers?", "f1", "q3"),
      f1: F("Categorical frequency distribution", "The classes are the categories themselves. Just tally each one."),
      q3: Q("Does the data span a wide range of many distinct values?", "f2", "f3"),
      f2: F(
        "Grouped frequency distribution\n\n$\\text{class width} = \\left\\lceil \\dfrac{\\text{range}}{\\text{number of classes}} \\right\\rceil$",
        "Too many distinct values to list individually, so group them into intervals."
      ),
      f3: F("Ungrouped frequency distribution", "Few enough distinct values that each can be its own class."),
      q4: Q("Is your data categorical rather than numeric?", "q5", "q7"),
      q5: Q("Do you want the categories ranked from most to least frequent?", "f4", "q6"),
      f4: F("Pareto chart", "A bar graph sorted highest to lowest, so the dominant category is obvious.", "pareto"),
      q6: Q("Do you want to show parts of a whole as percentages?", "f5", "f6"),
      f5: F("Pie graph", "Each wedge is sized by that category's share of the total."),
      f6: F("Bar graph", "Bars with GAPS, because the categories are not continuous intervals.", "bargraph"),
      q7: Q("Was the data collected over a period of time?", "f7", "q8"),
      f7: F("Time series graph", "Time always goes on the horizontal axis, which is what makes a trend readable."),
      q8: Q("Do you need to answer how many values fall BELOW a point?", "f8", "q9"),
      f8: F(
        "Ogive\n\nPlot cumulative frequency at each UPPER class boundary",
        "Cumulative frequency only grows, so an ogive always rises left to right.",
        "ogive"
      ),
      q9: Q("Do you need to preserve every original data value?", "f9", "q10"),
      f9: F("Stem-and-leaf plot, or a dotplot", "Shows the shape while keeping every exact value, which a histogram cannot."),
      q10: Q("Are you comparing two or more distributions on the same axes?", "f10", "f11"),
      f10: F(
        "Frequency polygon\n\nPlot frequency at each class MIDPOINT",
        "Lines overlay cleanly, whereas overlapping histograms become unreadable.",
        "histogram"
      ),
      f11: F(
        "Histogram\n\nBars touch, drawn at class BOUNDARIES",
        "The standard picture of a numeric frequency distribution.",
        "histogram"
      ),
    },
  },

  3: {
    start: "q1",
    nodes: {
      q1: Q("Are you describing where ONE specific value sits relative to the rest?", "q2", "q5"),
      q2: Q("Do you want how many standard deviations it is from the mean?", "f1", "q3"),
      f1: F("$z = \\dfrac{x - \\bar{x}}{s}$", "Standardizing lets you compare values measured on completely different scales."),
      q3: Q("Do you want quartiles, or the spread of the middle 50%?", "f2", "q4"),
      f2: F(
        "$Q_1 = $ median of the lower half\n$Q_3 = $ median of the upper half\n$\\text{IQR} = Q_3 - Q_1$",
        "The IQR deliberately ignores the extremes and measures only the middle half.",
        "boxplot"
      ),
      q4: Q("Are you checking whether a value counts as an outlier?", "f3", "f4"),
      f3: F(
        "$\\text{lower fence} = Q_1 - 1.5(\\text{IQR})$\n$\\text{upper fence} = Q_3 + 1.5(\\text{IQR})$",
        "Anything outside the fences is unusually far from the rest of the data.",
        "boxplot"
      ),
      f4: F("$P_k$ is the value below which $k\\%$ of the data falls", "The median is simply $P_{50}$, and the quartiles are $P_{25}$, $P_{50}$, $P_{75}$."),
      q5: Q("Do you want the CENTER of the data?", "q6", "q8"),
      q6: Q("Does the data contain outliers, or is it strongly skewed?", "f5", "q7"),
      f5: F("Median, the middle value of SORTED data", "Position-based, so even an extreme outlier cannot drag it.", "skew"),
      q7: Q("Do you specifically need the most frequently occurring value?", "f6", "f7"),
      f6: F("Mode, the most frequent value", "The only measure of center that works on categorical data."),
      f7: F("$\\bar{x} = \\dfrac{\\sum x}{n}$", "Uses every value, which makes it precise but sensitive to outliers."),
      q8: Q("Do you want the SPREAD of the data?", "q9", "f10"),
      q9: Q("Is your data a sample rather than the entire population?", "f8", "f9"),
      f8: F(
        "$s^2 = \\dfrac{\\sum (x - \\bar{x})^2}{n - 1}$, and $s = \\sqrt{s^2}$",
        "Dividing by $n-1$ corrects for a sample underestimating the true spread."
      ),
      f9: F(
        "$\\sigma^2 = \\dfrac{\\sum (x - \\mu)^2}{N}$, and $\\sigma = \\sqrt{\\sigma^2}$",
        "When you genuinely have every member of the population, divide by $N$."
      ),
      f10: F(
        "Five-number summary: min, $Q_1$, median, $Q_3$, max",
        "Drawn as a boxplot, this shows center, spread, and skew all at once.",
        "boxplot"
      ),
    },
  },

  4: {
    start: "q1",
    nodes: {
      q1: Q("Do you need the probability that A OR B happens?", "q2", "q3"),
      q2: Q("Can A and B happen at the same time?", "f2", "f1"),
      f1: F("$P(A \\text{ or } B) = P(A) + P(B)$", "Mutually exclusive events cannot overlap, so nothing gets double-counted.", "venn-me"),
      f2: F("$P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$", "Subtract the overlap once, since adding counted it twice.", "venn-ov"),
      q3: Q("Do you need the probability that A AND B both happen?", "q4", "q5"),
      q4: Q("Does A happening change the probability of B?", "f4", "f3"),
      f3: F("$P(A \\text{ and } B) = P(A) \\cdot P(B)$", "Independent events do not affect each other, so multiply the originals.", "tree-indep"),
      f4: F("$P(A \\text{ and } B) = P(A) \\cdot P(B \\mid A)$", "Dependent events change the odds, so the second factor must be conditional.", "tree-dep"),
      q5: Q("Do you know P(A and B) and want P(B given A already happened)?", "f5", "q6"),
      f5: F("$P(B \\mid A) = \\dfrac{P(A \\text{ and } B)}{P(A)}$", "Out of every time A happens, what fraction also includes B?", "tree-dep"),
      q6: Q("Do you need P(at least one success) across several independent trials?", "f6", "f7"),
      f6: F("$P(\\text{at least one}) = 1 - P(\\text{none})$", "Almost always far easier to find the complement and subtract from 1.", "venn-me"),
      f7: F("$P(\\bar{A}) = 1 - P(A)$", "The complement rule: everything that can possibly happen adds up to 1.", "venn-me"),
    },
  },

  5: {
    start: "q1",
    nodes: {
      q1: Q("Do you have a full list of X-values with their probabilities?", "q2", "q4"),
      q2: Q("Do you want the center, the mean or expected value?", "f1", "q3"),
      f1: F("$E(X) = \\sum [X \\cdot P(X)]$", "Weight each outcome by how likely it is, then add them up."),
      q3: Q("Do you want the spread, the variance or standard deviation?", "f2", "f1"),
      f2: F(
        "$\\sigma^2 = \\sum [X^2 \\cdot P(X)] - \\mu^2$, and $\\sigma = \\sqrt{\\sigma^2}$",
        "Measures how far outcomes typically stray from the mean. Square the mean last."
      ),
      q4: Q("Fixed number of identical yes/no trials, same p each time, independent?", "q5", "f0"),
      f0: F(
        "Not binomial. Build a distribution table (5.1), or use a Chapter 4 rule directly.",
        "The binomial formula only applies when all four requirements hold."
      ),
      q5: Q("Do you want the probability of exactly x successes?", "f3", "q6"),
      f3: F(
        "$P(X) = \\binom{n}{x} p^x q^{\\,n-x}$",
        "The binomial coefficient counts the arrangements; $p^x q^{n-x}$ prices any one of them.",
        "binom-strip"
      ),
      q6: Q("Do you want the average number of successes?", "f4", "f5"),
      f4: F("$\\mu = np$", "Trials multiplied by the probability of success."),
      f5: F("$\\sigma^2 = npq$, and $\\sigma = \\sqrt{npq}$", "The binomial shortcut, so you never build the full table."),
    },
  },

  6: {
    start: "q1",
    nodes: {
      q1: Q("Are you working with ONE individual value or measurement?", "q2", "q5"),
      q2: Q("Do you have a raw score X and want its area or percentile?", "f1", "q3"),
      f1: F(
        "$z = \\dfrac{X - \\mu}{\\sigma}$, then look up the area in Table E",
        "Standardizing puts every normal curve onto the same universal table.",
        "curve-left"
      ),
      q3: Q("Do you have a percentile or area and want the raw score X?", "f2", "q4"),
      f2: F("$X = \\mu + z\\sigma$, after finding z from the area", "The z-score formula solved backward for X.", "curve-mid"),
      q4: Q("Want the empirical-rule estimate instead of an exact table lookup?", "f3", "f1"),
      f3: F(
        "about $68\\%$ within 1 sd\nabout $95\\%$ within 2 sd\nabout $99.7\\%$ within 3 sd",
        "A fast estimate when the question does not need an exact value.",
        "empirical"
      ),
      q5: Q("Are you working with a SAMPLE MEAN, the average of n values?", "f4", "f1"),
      f4: F(
        "$\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}}$\n$z = \\dfrac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}$",
        "Identical z-score logic, but $\\sigma$ is replaced by the standard error.",
        "clt"
      ),
    },
  },
};
