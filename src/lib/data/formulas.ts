/**
 * The formula catalogue: one card per generator topic key, 46 in all.
 *
 * The drill this feeds works like this. The student is shown a REAL generated
 * problem and must pick the FORMULA, written the way he would write it on
 * paper, before computing anything. So every card carries the notation itself,
 * not a description of the notation.
 *
 * Notation policy, in priority order:
 *   1. If the Formulas and Tables Packet (Bluman's "Important Formulas" insert)
 *      prints the formula, this file matches the packet, because the packet is
 *      the only reference available on test day.
 *   2. If the packet does not print it, this file matches the lesson `formula`
 *      strings and the generator `steps`, which follow the instructor's slides.
 *   3. Where the two genuinely differ in appearance, `note` says so out loud,
 *      so the student is not surprised by the sheet in front of him.
 *
 * Some topics have no equation at all: levels of measurement, choosing a graph,
 * descriptive versus inferential, stating the hypotheses, wording a conclusion,
 * correlation concepts, and checking whether a table is a distribution. Those
 * still get a `latex` string, because the drill is a comparison of rendered
 * math and an empty option would give the answer away. For those the latex is
 * the closest thing the course has to a WRITTEN RULE in symbols: the H0 and H1
 * pair, the ordered measurement ladder, the two validity conditions, and so on.
 * Never prose, never blank.
 *
 * Two cards must never render the same latex string. Identical-looking options
 * would make an item unanswerable, and the distractors are the whole point.
 */

import { ruleChoices } from "@/lib/data/ruleChoices";

export type FormulaCard = {
  /** The generator topic key. Must match `topicsByChapter` / `generators` exactly. */
  key: string;
  ch: number;
  /** SHORT bold name, the way the formula is referred to out loud. */
  name: string;
  /** THE formula, LaTeX, with no surrounding $. The caller wraps it. */
  latex: string;
  /** One plain-language line, read under the name. */
  plain: string;
  /** Gray italic note: when to use it, naming the decisive cue in a problem. */
  note: string;
};

export const formulaCards: FormulaCard[] = [
  /* ------------------------------------------------------------- chapter 1 */
  {
    key: "desc-inf",
    ch: 1,
    name: "Descriptive vs Inferential",
    latex:
      "\\text{Descriptive: sample} \\to \\text{sample} \\qquad \\text{Inferential: sample} \\to \\text{population}",
    plain: "does the statement stay inside the data, or reach past it",
    note: "No equation exists for this one. Use the arrow test when a quoted sentence is handed to you: if it only reports what was measured it stops at the sample, and if it predicts, generalizes, or says nationwide it has crossed to the population.",
  },
  {
    key: "param-stat",
    ch: 1,
    name: "Parameter vs Statistic",
    latex:
      "\\mu,\\ \\sigma,\\ N \\ (\\text{parameter}) \\qquad \\bar{X},\\ s,\\ n \\ (\\text{statistic})",
    plain: "Greek letters describe a population, Roman letters describe a sample",
    note: "Use when a number is given and you must label whose it is. The decisive cue is WHO was measured: the entire group means parameter, the subset actually measured means statistic. These are exactly the symbols the packet uses everywhere else.",
  },
  {
    key: "var-type",
    ch: 1,
    name: "Variable Classification",
    latex:
      "\\text{Variable} \\to \\left\\{ \\text{Qualitative},\\ \\text{Quantitative} \\to \\left\\{ \\text{discrete (counted)},\\ \\text{continuous (measured)} \\right\\} \\right\\}",
    plain: "category, or number; and if a number, counted or measured",
    note: "No equation. Use it when the prompt says classify the variable or what type of variable. Ask is it a number at all, then can it land between two values. It is not asking about ordering or a true zero, which is the level of measurement question instead.",
  },
  {
    key: "level",
    ch: 1,
    name: "Measurement Ladder",
    latex:
      "\\text{Nominal} \\;<\\; \\text{Ordinal} \\;<\\; \\text{Interval} \\;<\\; \\text{Ratio}",
    plain: "no order, then order, then equal gaps, then a true zero",
    note: "No equation, so climb the ladder instead. The trigger phrase is level of measurement. Order possible pushes past nominal, equal gaps push past ordinal, and zero meaning none reaches ratio. Zip codes and jersey numbers are numbers but stay nominal.",
  },

  /* ------------------------------------------------------------- chapter 2 */
  {
    key: "classwidth",
    ch: 2,
    name: "Class Width",
    latex:
      "\\text{class width} = \\dfrac{\\text{range}}{\\text{number of classes}} = \\dfrac{\\text{highest} - \\text{lowest}}{k} \\quad (\\text{round UP})",
    plain: "range split into k classes, then always bumped up to a whole number",
    note: "Use when a smallest value, a largest value, and a class count are all given. Only those three numbers matter. Rounding up is not optional, since a width that is rounded down cannot reach the largest value. Not printed in the packet, so this comes from the slides.",
  },
  {
    key: "midbound",
    ch: 2,
    name: "Midpoint and Boundaries",
    latex:
      "X_m = \\dfrac{\\text{lower limit} + \\text{upper limit}}{2} \\qquad \\text{boundaries} = \\text{lower} - 0.5,\\ \\text{upper} + 0.5",
    plain: "average the two limits, or push each limit out half a unit",
    note: "Use when the prompt zooms in on ONE class written as limits, such as 25-36. The whole data set is never mentioned, which is what separates it from class width. The 0.5 shift is what makes histogram bars touch. Not in the packet.",
  },
  {
    key: "cumrel",
    ch: 2,
    name: "Cumulative and Relative Frequency",
    latex:
      "\\text{cf} = f_1 + f_2 + \\cdots + f_k \\qquad \\text{rf} = \\dfrac{f}{n} = \\dfrac{\\text{class frequency}}{\\text{total}}",
    plain: "a running total, or one class divided by everybody",
    note: "Use when a list of class frequencies plus a total is given. The word THROUGH means add up to that class, and the words RELATIVE or AS A PERCENT mean divide by the total. Not printed in the packet.",
  },
  {
    key: "graphpick",
    ch: 2,
    name: "Choosing a Graph",
    latex:
      "\\text{categorical} \\to \\text{bar},\\ \\text{Pareto},\\ \\text{pie} \\qquad \\text{numeric} \\to \\text{histogram},\\ \\text{polygon},\\ \\text{ogive}",
    plain: "match the picture to the data type, then to what is being shown",
    note: "No equation. Decide the data type first, then read the goal in the prompt: how many fall below a point means ogive, every exact value kept means stem-and-leaf or dotplot, share of a whole means pie, and over time means a time series.",
  },

  /* ------------------------------------------------------------- chapter 3 */
  {
    key: "center",
    ch: 3,
    name: "Measures of Center",
    latex:
      "\\bar{X} = \\dfrac{\\sum X}{n} \\qquad \\text{midrange} = \\dfrac{\\text{lowest} + \\text{highest}}{2}",
    plain: "add and divide for the mean, or average only the two extremes",
    note: "Use when a raw list of values is given and one named center is asked for. The median is a position, not a formula, so sort first and take the middle; the mode is the repeat. The packet prints the mean as X-bar equals the sum of X over n.",
  },
  {
    key: "spread",
    ch: 3,
    name: "Sample Variance and Standard Deviation",
    latex:
      "s^2 = \\dfrac{\\sum (X - \\bar{X})^2}{n - 1} \\qquad s = \\sqrt{\\dfrac{n(\\sum X^2) - (\\sum X)^2}{n(n - 1)}}",
    plain: "average squared distance from the mean, dividing by n minus 1",
    note: "The capitalized word SAMPLE next to a raw list is the cue: divide by n minus 1, never by N. The packet prints ONLY the second, computational form; the slides use the first, definitional form. They always agree, so use whichever is faster on the paper.",
  },
  {
    key: "rules",
    ch: 3,
    name: "Empirical Rule and Chebyshev",
    latex:
      "\\text{bell-shaped: } 68\\%,\\ 95\\%,\\ 99.7\\% \\text{ within } 1\\sigma,\\ 2\\sigma,\\ 3\\sigma \\qquad \\text{any shape: at least } 1 - \\dfrac{1}{k^2}",
    plain: "the fixed three percents if bell-shaped, otherwise the k formula",
    note: "Use when a mean and a standard deviation are given and a PERCENT is wanted with no table. Bell-shaped plus approximately means Empirical. The shape is unknown plus AT LEAST means Chebyshev. Neither is printed in the packet.",
  },
  {
    key: "zpos",
    ch: 3,
    name: "z-score for One Value",
    latex:
      "z = \\dfrac{X - \\bar{X}}{s} \\qquad \\text{or} \\qquad z = \\dfrac{X - \\mu}{\\sigma}",
    plain: "how many standard deviations one value sits from the mean",
    note: "Use when one single value, a mean, and a standard deviation are given, with no sample size and no area asked for. No n means no square root of n. Both forms are printed side by side in the packet under Standard score.",
  },
  {
    key: "quart",
    ch: 3,
    name: "IQR and Outlier Fences",
    latex:
      "\\text{IQR} = Q_3 - Q_1 \\qquad \\text{fences} = Q_1 - 1.5(\\text{IQR}) \\ \\text{ and } \\ Q_3 + 1.5(\\text{IQR})",
    plain: "the middle fifty percent, and the lines an outlier falls outside of",
    note: "Use when Q1, Q3, IQR, midquartile, or the word fence appears. Fences exist nowhere else in the course, so seeing the word settles it. Sort first, then split at the median. Not printed in the packet.",
  },
  {
    key: "fivenum",
    ch: 3,
    name: "Five-Number Summary",
    latex:
      "\\{\\,\\text{minimum},\\ Q_1,\\ \\text{median},\\ Q_3,\\ \\text{maximum}\\,\\}",
    plain: "the five reported pieces a boxplot is drawn from",
    note: "No equation, it is a list. Use it when the phrase five-number summary appears or a whisker is asked about. On a boxplot that shows outliers separately, a whisker stops at the most extreme value still INSIDE the fences, which is why the fence formula is a different card.",
  },

  /* ------------------------------------------------------------- chapter 4 */
  {
    key: "basicprob",
    ch: 4,
    name: "Classical Probability",
    latex:
      "P(A) = \\dfrac{\\text{number of favorable outcomes}}{\\text{total number of outcomes}} \\qquad P(\\bar{A}) = 1 - P(A)",
    plain: "count the winners over everything, for one single trial",
    note: "Use for one draw, one roll, one spin, with no OR, no AND, and no GIVEN in the sentence. The word NOT flips you to the complement. Both lines are printed in the packet under Chapter 4.",
  },
  {
    key: "addition",
    ch: 4,
    name: "Addition Rule 2",
    latex:
      "P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)",
    plain: "either event happens, with the double-counted overlap taken back out",
    note: "The word OR is the trigger, and a stated overlap such as and 15 use both is the instruction to subtract. If the prompt says no one does both, the events are mutually exclusive and Addition Rule 1 drops the last term entirely.",
  },
  {
    key: "multiplication",
    ch: 4,
    name: "Multiplication Rule 2",
    latex:
      "P(A \\text{ and } B) = P(A) \\cdot P(B \\mid A) \\qquad [\\,= P(A) \\cdot P(B) \\text{ if independent}\\,]",
    plain: "both events happen, and the first changes the second",
    note: "The word BOTH is the trigger, and the replacement clause decides the form. WITHOUT replacement means dependent, so the second fraction loses one from the top and one from the bottom. WITH replacement or independently means Multiplication Rule 1.",
  },
  {
    key: "conditional",
    ch: 4,
    name: "Conditional Probability",
    latex:
      "P(B \\mid A) = \\dfrac{P(A \\text{ and } B)}{P(A)}",
    plain: "the chance of B once you already know A happened",
    note: "The word GIVEN is the cue, and it shrinks the denominator to one row or one column of a table. The grand total is NOT the denominator any more. Printed in the packet exactly as shown.",
  },
  {
    key: "atleastone",
    ch: 4,
    name: "At Least One",
    latex:
      "P(\\text{at least one}) = 1 - P(\\text{none}) = 1 - q^{\\,n}",
    plain: "everything except the one case where nothing happens",
    note: "Use on the exact phrase at least one across n independent trials with the same probability each time. Adding the individual probabilities is the classic wrong move. Not printed in the packet, it is the complement rule applied to Multiplication Rule 1.",
  },

  /* ------------------------------------------------------------- chapter 5 */
  {
    key: "validdist",
    ch: 5,
    name: "Requirements for a Distribution",
    latex:
      "0 \\le P(X) \\le 1 \\ \\text{ for every } X \\qquad \\text{and} \\qquad \\sum P(X) = 1",
    plain: "no probability out of range, and everything totals one",
    note: "No calculation follows. Use it when the prompt asks outright is this a valid probability distribution. Check both conditions, since a list can sum to 1 and still be invalid because one entry is negative.",
  },
  {
    key: "meanvariance",
    ch: 5,
    name: "Mean and Variance of a Distribution",
    latex:
      "\\mu = \\sum [\\,X \\cdot P(X)\\,] \\qquad \\sigma^2 = \\sum [\\,X^2 \\cdot P(X)\\,] - \\mu^2",
    plain: "weight each outcome by how likely it is",
    note: "Use when an explicit table of P(X) values is given with no n and no p anywhere. Because the probabilities are listed one by one rather than generated by fixed identical trials, the binomial shortcuts do not apply. Printed in the packet, along with E(X) which is the same sum.",
  },
  {
    key: "binomial-exact",
    ch: 5,
    name: "Binomial Probability",
    latex:
      "P(X) = \\dfrac{n!}{(n - X)!\\,X!} \\cdot p^X \\cdot q^{\\,n-X}, \\qquad q = 1 - p",
    plain: "the chance of exactly X successes in n identical trials",
    note: "Use for a fixed number of independent identical trials with the same p and two outcomes, when a COUNT of successes is asked for. AT MOST and AT LEAST just mean adding several of these terms. The packet writes the factorial form shown; the slides write the same thing as n choose x.",
  },
  {
    key: "binomial-meansd",
    ch: 5,
    name: "Binomial Mean and Standard Deviation",
    latex:
      "\\mu = n \\cdot p \\qquad \\sigma^2 = n \\cdot p \\cdot q \\qquad \\sigma = \\sqrt{n \\cdot p \\cdot q}",
    plain: "the shortcuts that skip building the whole table",
    note: "Use when the word binomial appears with n and p, and the mean, variance, or standard deviation is wanted with no specific number of successes named. If a full P(X) list had been given instead, the summation formulas would be required. Printed in the packet.",
  },

  /* ------------------------------------------------------------- chapter 6 */
  {
    key: "area-from-z",
    ch: 6,
    name: "Area from a Value",
    latex:
      "z = \\dfrac{X - \\mu}{\\sigma} \\ \\Rightarrow \\ P(X < x) = \\text{area left},\\quad P(X > x) = 1 - \\text{area left}",
    plain: "standardize the value, then read Table E forwards",
    note: "Use when a randomly chosen single item is asked about with LESS than, GREATER than, or BETWEEN. One individual means divide by sigma itself, with no square root of n. Table E always reports the area to the LEFT, so GREATER subtracts from 1 and BETWEEN subtracts the two areas.",
  },
  {
    key: "value-from-area",
    ch: 6,
    name: "Value from an Area",
    latex:
      "X = \\mu + z\\sigma",
    plain: "area in, value out: the z-score formula solved for X",
    note: "Use on the words percentile, cutoff, or TOP some percent. Hunt the area INSIDE the body of Table E first to get z, then rebuild X. TOP 5% must be flipped to an area of 0.95 on the left before looking anything up. This is the packet's standard score formula rearranged.",
  },
  {
    key: "clt",
    ch: 6,
    name: "Central Limit Theorem",
    latex:
      "\\sigma_{\\bar{X}} = \\dfrac{\\sigma}{\\sqrt{n}} \\qquad z = \\dfrac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}}",
    plain: "sample means spread less than single values, by a factor of root n",
    note: "The trigger is a sample of n equals and the phrase the SAMPLE MEAN appearing together. Drop the square root of n and you have answered the question about one individual value instead. Both lines are printed in the packet under Chapter 6.",
  },

  /* ------------------------------------------------------------- chapter 7 */
  {
    key: "ci-tails",
    ch: 7,
    name: "Alpha and Alpha Over Two",
    latex:
      "\\alpha = 1 - \\text{confidence level} \\qquad \\dfrac{\\alpha}{2} \\ \\text{ in EACH tail}",
    plain: "the leftover area, split evenly between the two ends",
    note: "Use when a confidence level is given and the question stops at an AREA, not a critical value. An interval always has two ends, so alpha halves. Not printed in the packet, but it is the step behind every alpha over 2 subscript in it.",
  },
  {
    key: "ci-critical",
    ch: 7,
    name: "Interval Critical Value",
    latex:
      "\\sigma \\text{ known} \\to z_{\\alpha/2} \\ (\\text{Table E}) \\qquad \\sigma \\text{ unknown} \\to t_{\\alpha/2} \\ (\\text{Table F},\\ \\text{d.f.} = n - 1)",
    plain: "which table and which symbol, decided by whether sigma was handed to you",
    note: "The deciding words are POPULATION standard deviation known versus sigma unknown. An interval is never one-tailed, so it is always alpha over 2. On Table F use the CONFIDENCE INTERVALS row across the top, not the one tail or two tails rows.",
  },
  {
    key: "ci-margin",
    ch: 7,
    name: "Margin of Error",
    latex:
      "E = z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right) \\qquad \\text{vs} \\qquad \\text{standard error} = \\dfrac{\\sigma}{\\sqrt{n}}",
    plain: "critical value TIMES standard error, which is not the standard error alone",
    note: "The last sentence of the prompt decides it. Find the STANDARD ERROR only means divide and stop. Find the maximum error of estimate E means multiply that result by the critical value first. E is the packet's name for it.",
  },
  {
    key: "ci-mean-z",
    ch: 7,
    name: "z Confidence Interval for the Mean",
    latex:
      "\\bar{X} - z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right) < \\mu < \\bar{X} + z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right)",
    plain: "the sample mean, plus and minus the margin of error",
    note: "The capitalized phrase POPULATION standard deviation sigma is the only reason this is z and not t. Run backwards from a reported interval, the sample mean is the average of the two limits and E is half the width. Printed in the packet exactly as shown.",
  },
  {
    key: "ci-mean-t",
    ch: 7,
    name: "t Confidence Interval for the Mean",
    latex:
      "\\bar{X} - t_{\\alpha/2}\\left(\\dfrac{s}{\\sqrt{n}}\\right) < \\mu < \\bar{X} + t_{\\alpha/2}\\left(\\dfrac{s}{\\sqrt{n}}\\right), \\quad \\text{d.f.} = n - 1",
    plain: "same interval, with s in place of sigma and t in place of z",
    note: "The cue is the capitalized SAMPLE standard deviation s, usually with assume the population is approximately normal. It stays t even when n is large, so do not let n equal 49 talk you into z. The packet prints the interval; the d.f. line comes from the slides.",
  },
  {
    key: "ci-samplesize",
    ch: 7,
    name: "Sample Size for a Mean",
    latex:
      "n = \\left(\\dfrac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^{2} \\quad (\\text{round UP})",
    plain: "how many to collect to hit a target margin of error",
    note: "The cue is how large a sample is needed with an accuracy stated as to within. There is no sample mean anywhere, because the study is being planned rather than reported. The answer counts people, so any decimal at all rounds UP.",
  },
  {
    key: "t-area",
    ch: 7,
    name: "Areas Under the t Curve",
    latex:
      "P(t > c) = 1 - P(t < c) \\qquad P(a < t < b) = P(t < b) - P(t < a)",
    plain: "reading the t curve in either direction at a stated d.f.",
    note: "Use when degrees of freedom are stated outright and the question is about t itself, with no sample mean, no claim, and no confidence level. Notice which side is asked for, since a large area on the RIGHT pushes c negative. Not printed in the packet.",
  },

  /* ------------------------------------------------------------- chapter 8 */
  {
    key: "hyp-setup",
    ch: 8,
    name: "Stating H0 and H1",
    latex:
      "H_0: \\mu = k \\qquad H_1: \\mu \\neq k \\ \\text{ or } \\ \\mu < k \\ \\text{ or } \\ \\mu > k",
    plain: "equality always in H0, the researcher's direction in H1",
    note: "No calculation. The historical value is k, and the belief sentence supplies the sign: more than becomes greater-than, smaller than becomes less-than, has changed or is different becomes not-equal. H0 keeps the equal sign no matter what.",
  },
  {
    key: "tail-id",
    ch: 8,
    name: "Which Tail",
    latex:
      "H_1: \\mu < k \\to \\text{left} \\qquad H_1: \\mu > k \\to \\text{right} \\qquad H_1: \\mu \\neq k \\to \\text{both},\\ \\tfrac{\\alpha}{2} \\text{ each}",
    plain: "the inequality in H1 points at the critical region",
    note: "Use when H1 is already written for you and only the direction is in question. Nothing is computed and no table is opened. The arrow points at the tail, and not-equal splits the region evenly between the two.",
  },
  {
    key: "z-critical",
    ch: 8,
    name: "Critical z Value",
    latex:
      "\\text{one-tailed: } z_{\\alpha} \\qquad \\text{two-tailed: } \\pm z_{\\alpha/2} \\qquad (\\text{Table E})",
    plain: "all of alpha in one tail, or alpha split across two",
    note: "Use when left-tailed, right-tailed, or two-tailed z test sits next to an alpha and no data is given. Splitting alpha on a one-tailed test, or failing to split it on a two-tailed test, is the mistake this drills. Memorize 1.28, 1.65, 2.33 one-tailed and 1.65, 1.96, 2.58 two-tailed.",
  },
  {
    key: "z-testvalue",
    ch: 8,
    name: "One-Sample z Test Value",
    latex:
      "z = \\dfrac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}} \\quad \\text{where } \\mu \\text{ is the claimed value in } H_0",
    plain: "how far the sample mean sits from the claim, in standard errors",
    note: "The word CLAIMED makes it a test rather than an interval, and sigma being handed to you makes it z rather than t. Compute the whole denominator before dividing; dividing by sigma alone is the standard wrong answer.",
  },
  {
    key: "z-pvalue",
    ch: 8,
    name: "P-value from Table E",
    latex:
      "\\text{left: } P = \\text{area left of } z \\qquad \\text{right: } P = 1 - \\text{area left of } z \\qquad \\text{two-tailed: } P = 2 \\times \\text{tail area beyond } |z|",
    plain: "the tail area past the test value, doubled if two-tailed",
    note: "Use when the test value is already computed and the tail type is stated in the sentence, so nothing is standardized here. Then decide with P less than or equal to alpha means reject H0. Not printed in the packet; it is the P-value procedure table from the slides.",
  },
  {
    key: "t-critical",
    ch: 8,
    name: "Critical t Value",
    latex:
      "\\text{one tail: } t_{\\alpha} \\qquad \\text{two tails: } \\pm t_{\\alpha/2} \\qquad (\\text{Table F},\\ \\text{d.f.} = n - 1)",
    plain: "same idea as critical z, but the row depends on the sample size",
    note: "The presence of n at all is the tell, since z critical values never need a sample size. Convert n to n minus 1 degrees of freedom first, and if that row is missing use the next SMALLER printed d.f. Use the One tail or Two tails alpha rows here, not the confidence interval row.",
  },
  {
    key: "t-testvalue",
    ch: 8,
    name: "One-Sample t Test Value",
    latex:
      "t = \\dfrac{\\bar{X} - \\mu}{s / \\sqrt{n}}, \\qquad \\text{d.f.} = n - 1",
    plain: "the same test value, with s standing in for sigma",
    note: "The cue is the sentence the population standard deviation is unknown, with s given instead. The arithmetic is otherwise identical to the z test value, which is exactly why the wrong one gets picked. Printed in the packet with the d.f. beside it.",
  },
  {
    key: "conclusion",
    ch: 8,
    name: "Wording the Conclusion",
    latex:
      "\\text{in the critical region} \\Rightarrow \\text{reject } H_0 \\qquad \\text{claim in } H_0 \\Rightarrow \\text{reject the claim} \\qquad \\text{claim in } H_1 \\Rightarrow \\text{support the claim}",
    plain: "decide about H0 first, then translate that into a sentence about the claim",
    note: "Use when the prompt states outright where the claim sits and whether the test value landed inside the critical region. Nothing is ever proved and H0 is never accepted, so any wording using those words is wrong on sight.",
  },

  /* ------------------------------------------------------------ chapter 10 */
  {
    key: "corr-r",
    ch: 10,
    name: "Correlation Coefficient r",
    latex:
      "r = \\dfrac{SS_{xy}}{\\sqrt{SS_{x} \\cdot SS_{y}}} = \\dfrac{n(\\sum xy) - (\\sum x)(\\sum y)}{\\sqrt{[\\,n\\sum x^2 - (\\sum x)^2\\,][\\,n\\sum y^2 - (\\sum y)^2\\,]}}",
    plain: "one number for the strength and direction of a straight-line link",
    note: "Use when paired data is listed and r or SS sub xy is asked for, with no line and no prediction wanted. The instructor works through the sums of squares on the left; the packet prints only the expanded form on the right. They always agree.",
  },
  {
    key: "corr-sig",
    ch: 10,
    name: "t Test for r",
    latex:
      "t = r\\sqrt{\\dfrac{n - 2}{1 - r^2}}, \\qquad \\text{d.f.} = n - 2, \\qquad H_0: \\rho = 0",
    plain: "is the correlation real, or just sampling noise",
    note: "Use when r is already a finished number and alpha, a critical value, or the word decision appears. Degrees of freedom are n minus 2 here, not n minus 1, because two things were estimated. Reject H0 when the absolute value of t exceeds the two-tailed critical value.",
  },
  {
    key: "reg-line",
    ch: 10,
    name: "Least-Squares Regression Line",
    latex:
      "y' = a + bx, \\qquad b = \\dfrac{SS_{xy}}{SS_{x}}, \\qquad a = \\bar{y} - b\\bar{x}",
    plain: "the slope and the y-intercept of the best-fitting line",
    note: "The cue is a request for the slope b or the intercept a, with r already declared significant. Watch the letters: statistics writes a for the intercept and b for the slope, swapped from y equals mx plus b. The packet prints a and b as two expanded fractions instead.",
  },
  {
    key: "reg-predict",
    ch: 10,
    name: "Prediction from the Line",
    latex:
      "y'(x_0) = a + b\\,x_0 \\qquad (x_0 \\text{ inside the range of the observed } x)",
    plain: "substitute the given x into the finished line",
    note: "The cue is the word predict with a specific x value named. Build a and b first, then substitute. If r was NOT significant, the best prediction is y-bar rather than the line, and an x outside the data range is not justified.",
  },
  {
    key: "corr-concept",
    ch: 10,
    name: "Interpreting r and the Slope",
    latex:
      "-1 \\le r \\le 1, \\qquad r^2 = \\dfrac{\\text{explained variation}}{\\text{total variation}}, \\qquad b = \\dfrac{\\Delta y'}{\\Delta x}",
    plain: "what the numbers mean once every number is already computed",
    note: "Use when a conclusion or interpretation is wanted and nothing is left to compute. r measures LINEAR fit only, so an upside-down U can have r near zero and still be a relationship, and a large r never proves causation. The packet prints the r-squared line under Coefficient of determination.",
  },
];

/** Chapters in the order the course covers them. Chapter 9 is not in this app. */
const CHAPTER_ORDER: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 10];

const byKey: Map<string, FormulaCard> = new Map(formulaCards.map((f) => [f.key, f]));

/**
 * The confusable-key map, taken straight off `ruleChoices` rather than written
 * out a second time here. One source of truth for what traps a student, so the
 * rule drill and the formula drill can never drift apart.
 */
const confusableWith: Map<string, string[]> = new Map(
  ruleChoices.map((r) => [r.key, r.confusableWith])
);

/** Look up one card by generator topic key. */
export function formulaFor(key: string): FormulaCard | undefined {
  return byKey.get(key);
}

function shuffledCopy<T>(xs: T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `n` wrong-answer cards for a question whose correct key is `key`.
 *
 * Tiers, in order, each shuffled inside itself so the same trap does not always
 * land in the same slot:
 *   1. the hand-picked `confusableWith` traps, read off ruleChoices
 *   2. anything else from the same chapter
 *   3. anything from an adjacent chapter (adjacent in CHAPTER_ORDER, so 8 and 10 count)
 *   4. anything at all, purely so the function can always return n options
 *
 * Never returns the correct card, and never returns the same latex twice.
 */
function distractorCardsFor(key: string, n: number): FormulaCard[] {
  const self = byKey.get(key);
  if (!self || n <= 0) return [];

  const out: FormulaCard[] = [];
  const used = new Set<string>([self.latex]);

  const drawFrom = (keys: string[]) => {
    for (const k of shuffledCopy(keys)) {
      if (out.length >= n) return;
      const fc = byKey.get(k);
      if (!fc || fc.key === self.key) continue;
      if (used.has(fc.latex)) continue;
      used.add(fc.latex);
      out.push(fc);
    }
  };

  drawFrom(confusableWith.get(key) ?? []);
  if (out.length < n) {
    drawFrom(formulaCards.filter((f) => f.ch === self.ch).map((f) => f.key));
  }
  if (out.length < n) {
    const i = CHAPTER_ORDER.indexOf(self.ch);
    const adjacent = [CHAPTER_ORDER[i - 1], CHAPTER_ORDER[i + 1]].filter(
      (c): c is number => typeof c === "number"
    );
    drawFrom(formulaCards.filter((f) => adjacent.includes(f.ch)).map((f) => f.key));
  }
  if (out.length < n) {
    drawFrom(formulaCards.map((f) => f.key));
  }

  return out;
}

/**
 * The n + 1 options for one drill question: the correct card plus `n` traps,
 * shuffled, with the index of the right one.
 */
export function formulaOptionsFor(
  key: string,
  n = 3
): { options: FormulaCard[]; answer: number } | undefined {
  const self = byKey.get(key);
  if (!self) return undefined;
  const options = shuffledCopy([self, ...distractorCardsFor(key, n)]);
  return { options, answer: options.findIndex((f) => f.key === self.key) };
}
