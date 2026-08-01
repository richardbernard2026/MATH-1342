/** 60 flashcards, 10 per chapter. `back` may contain LaTeX between $...$. */

export type Flashcard = { id: string; ch: number; front: string; back: string; why: string };

const F = (id: string, ch: number, front: string, back: string, why: string): Flashcard => ({
  id,
  ch,
  front,
  back,
  why,
});

export const flashcards: Flashcard[] = [
  // Chapter 1
  F("c1-1", 1, "Descriptive statistics", "Summarizes data you already collected", "No claim beyond the data at hand."),
  F("c1-2", 1, "Inferential statistics", "Uses a sample to generalize about a population", "Always carries uncertainty."),
  F("c1-3", 1, "Population vs sample", "Population = entire group; sample = the subset measured", "Populations are usually impractical to measure."),
  F("c1-4", 1, "Parameter vs statistic", "Parameter describes a POPULATION; statistic describes a SAMPLE", "A statistic estimates the parameter."),
  F("c1-5", 1, "Qualitative variable", "A category, not a number", "Eye color, blood type, yes/no."),
  F("c1-6", 1, "Discrete vs continuous", "Countable with gaps vs any value in a range", "Number of children vs height."),
  F("c1-7", 1, "Nominal", "Categories with no meaningful order", "You can only count how many are in each."),
  F("c1-8", 1, "Ordinal", "Can be ranked, but the gaps are not equal", "1st / 2nd / 3rd place."),
  F("c1-9", 1, "Interval", "Equal gaps, but zero is arbitrary", "$0^\\circ$F does not mean no temperature."),
  F("c1-10", 1, "Ratio", "Equal gaps AND a true zero", "Height, weight, money. Ratios are meaningful."),

  // Chapter 2
  F("c2-1", 2, "Class width", "$\\left\\lceil \\dfrac{\\text{range}}{\\text{number of classes}} \\right\\rceil$", "Always round UP or the largest values will not fit."),
  F("c2-2", 2, "Range", "$\\text{highest} - \\text{lowest}$", "The first step in building a grouped table."),
  F("c2-3", 2, "Class midpoint", "$\\dfrac{\\text{lower limit} + \\text{upper limit}}{2}$", "Used to plot a frequency polygon."),
  F("c2-4", 2, "Class boundaries", "The limits shifted by $0.5$", "This is what makes histogram bars touch."),
  F("c2-5", 2, "Relative frequency", "$\\dfrac{\\text{class frequency}}{\\text{total}}$", "Lets you fairly compare samples of different sizes."),
  F("c2-6", 2, "Histogram", "Touching bars at class boundaries, height = frequency", "Bars touch because the classes are continuous."),
  F("c2-7", 2, "Frequency polygon", "A point plotted at each class MIDPOINT", "Best for comparing two distributions on one set of axes."),
  F("c2-8", 2, "Ogive", "Cumulative frequency at each UPPER boundary", "Always rises. Answers how many fall below a value."),
  F("c2-9", 2, "Pareto chart", "A bar graph sorted highest to lowest", "Makes the dominant category obvious."),
  F("c2-10", 2, "Stem-and-leaf plot", "Splits each value into a stem and a leaf", "Shows shape while keeping every exact value."),

  // Chapter 3
  F("c3-1", 3, "Sample mean", "$\\bar{x} = \\dfrac{\\sum x}{n}$", "Uses every value, so outliers drag it."),
  F("c3-2", 3, "Median", "The middle value of SORTED data", "Position-based, so it resists outliers."),
  F("c3-3", 3, "Midrange", "$\\dfrac{\\text{lowest} + \\text{highest}}{2}$", "Uses only the two extremes, so outliers wreck it."),
  F("c3-4", 3, "Mean above median means...", "Skewed right (positively skewed)", "A few high outliers pull the mean up."),
  F("c3-5", 3, "Sample variance", "$s^2 = \\dfrac{\\sum (x - \\bar{x})^2}{n - 1}$", "The $n-1$ corrects a sample underestimating spread."),
  F("c3-6", 3, "Standard deviation", "$s = \\sqrt{s^2}$", "Back in the original units, so it is interpretable."),
  F("c3-7", 3, "Empirical Rule", "$68\\%$ / $95\\%$ / $99.7\\%$ within $1$ / $2$ / $3$ sd", "Only valid for bell-shaped distributions."),
  F("c3-8", 3, "Chebyshev's Theorem", "At least $1 - \\dfrac{1}{k^2}$ within $k$ standard deviations", "Weaker, but true for ANY shape."),
  F("c3-9", 3, "IQR", "$Q_3 - Q_1$", "The spread of the middle 50% of the data."),
  F("c3-10", 3, "Outlier fences", "$Q_1 - 1.5(\\text{IQR})$ and $Q_3 + 1.5(\\text{IQR})$", "Anything outside these is flagged as an outlier."),

  // Chapter 4
  F("c4-1", 4, "P(A or B), mutually exclusive", "$P(A) + P(B)$", "No overlap to subtract."),
  F("c4-2", 4, "P(A or B), overlapping", "$P(A) + P(B) - P(A \\text{ and } B)$", "Subtract the double-counted overlap."),
  F("c4-3", 4, "P(A and B), independent", "$P(A) \\cdot P(B)$", "The events do not affect each other."),
  F("c4-4", 4, "P(A and B), dependent", "$P(A) \\cdot P(B \\mid A)$", "Use the updated, conditional probability."),
  F("c4-5", 4, "Conditional probability", "$P(B \\mid A) = \\dfrac{P(A \\text{ and } B)}{P(A)}$", "Of all the times A happens, how often is B there too?"),
  F("c4-6", 4, "Complement rule", "$P(\\bar{A}) = 1 - P(A)$", "Everything that can happen sums to 1."),
  F("c4-7", 4, "P(at least one success)", "$1 - P(\\text{none})$", "The complement is almost always easier to compute."),
  F("c4-8", 4, "Classical probability", "$\\dfrac{\\text{favorable}}{\\text{total}}$", "Requires equally-likely outcomes."),
  F("c4-9", 4, "Empirical probability", "$\\dfrac{\\text{observed frequency}}{\\text{total observations}}$", "Based on real collected data."),
  F("c4-10", 4, "Test for independence", "$P(B \\mid A) = P(B)$", "Knowing A happened tells you nothing about B."),

  // Chapter 5
  F("c5-1", 5, "Valid discrete distribution", "$0 \\le P(X) \\le 1$ for all $X$, and $\\sum P(X) = 1$", "The same complement logic applied to a whole list."),
  F("c5-2", 5, "Expected value", "$E(X) = \\sum [X \\cdot P(X)]$", "Weight each outcome by its probability."),
  F("c5-3", 5, "Variance (discrete)", "$\\sigma^2 = \\sum [X^2 \\cdot P(X)] - \\mu^2$", "Spread around the mean."),
  F("c5-4", 5, "A fair game means...", "$E(X) = 0$", "No average gain or loss over many plays."),
  F("c5-5", 5, "Binomial requirements", "Fixed $n$, two outcomes, constant $p$, independent trials", "All four must hold."),
  F("c5-6", 5, "Binomial probability", "$P(X) = \\binom{n}{x} p^x q^{\\,n-x}$", "Arrangements times the probability of one arrangement."),
  F("c5-7", 5, "Binomial mean", "$\\mu = np$", "Trials times the success probability."),
  F("c5-8", 5, "Binomial variance and sd", "$\\sigma^2 = npq$, $\\sigma = \\sqrt{npq}$", "The shortcut: no full table needed."),
  F("c5-9", 5, "Random variable", "Assigns a number to every outcome", "For example, the number of heads in 3 flips."),
  F("c5-10", 5, "Discrete vs continuous distribution", "A list of values vs area under a curve", "Chapter 5 is discrete, Chapter 6 is continuous."),

  // Chapter 6
  F("c6-1", 6, "z-score", "$z = \\dfrac{X - \\mu}{\\sigma}$", "Standardizes any value onto Table E."),
  F("c6-2", 6, "Raw score from z", "$X = \\mu + z\\sigma$", "The z-score formula solved for $X$."),
  F("c6-3", 6, "Area to the right of z", "$1 - (\\text{area to the left})$", "Total area under the curve is always 1."),
  F("c6-4", 6, "Area between two z-values", "(larger left area) $-$ (smaller left area)", "Subtract the smaller region from the bigger one."),
  F("c6-5", 6, "Empirical Rule, 1 sd", "about $68\\%$", "Fast estimate, no table needed."),
  F("c6-6", 6, "Empirical Rule, 2 sd", "about $95\\%$", "Fast estimate, no table needed."),
  F("c6-7", 6, "Empirical Rule, 3 sd", "about $99.7\\%$", "Fast estimate, no table needed."),
  F("c6-8", 6, "Standard error", "$\\sigma_{\\bar{x}} = \\dfrac{\\sigma}{\\sqrt{n}}$", "The spread of sample means, not of individuals."),
  F("c6-9", 6, "z for a SAMPLE MEAN", "$z = \\dfrac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}$", "Same formula, with $\\sigma$ replaced by the standard error."),
  F("c6-10", 6, "Central Limit Theorem", "Sample means approach a normal distribution as $n$ grows", "True no matter what shape the population has."),
];
