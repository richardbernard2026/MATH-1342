/**
 * Guided worked examples: one per section.
 *
 * These are not "read the solution" examples. The student is shown the problem
 * and then walked through it one step at a time, entering or choosing the next
 * move themselves. Each step checks their answer, says what was right or wrong,
 * and explains WHY that step exists before moving on.
 *
 * Every numeric `answer` below is verified against a computation script, so a
 * step can never drift out of sync with its own prompt.
 */

import { ch7Guided } from "@/lib/data/ch7";
import { ch8Guided } from "@/lib/data/ch8";
import { ch10Guided } from "@/lib/data/ch10";


export type GuidedStep = {
  /** What the student is being asked to produce at this step. */
  ask: string;
  kind: "numeric" | "choice";
  choices?: string[];
  /** Numeric value, or the index of the correct choice. */
  answer: number;
  tol?: number;
  /** Nudge shown on request or after a wrong attempt. */
  hint: string;
  /** Shown once the step is correct: why this step matters. */
  why: string;
};

export type GuidedExample = {
  sectionId: string;
  title: string;
  scenario: string;
  steps: GuidedStep[];
  /** Plain-language wrap-up shown after the last step. */
  takeaway: string;
};

const S = (
  ask: string,
  kind: "numeric" | "choice",
  answer: number,
  hint: string,
  why: string,
  extra?: { choices?: string[]; tol?: number }
): GuidedStep => ({ ask, kind, answer, hint, why, ...extra });

export const guidedExamples: GuidedExample[] = [
  {
    sectionId: "1.1",
    title: "Reading a study correctly",
    scenario:
      "A researcher wants to know how many hours the 8,000 students at a college sleep per night. She surveys 200 of them and finds that they sleep 6.4 hours on average. She writes: \"Students at this college are sleep deprived.\"",
    steps: [
      S(
        "How many individuals are in the POPULATION?",
        "numeric",
        8000,
        "The population is everyone the researcher wants to draw a conclusion about, not just the people she measured.",
        "The population is the whole group of interest. She cares about all 8,000 students, even though she could only reach some of them.",
        { tol: 0 }
      ),
      S(
        "How many individuals are in the SAMPLE?",
        "numeric",
        200,
        "The sample is the subset she actually measured.",
        "The sample is what you can afford to measure. Everything in statistics is about what a sample can legitimately tell you about a population.",
        { tol: 0 }
      ),
      S(
        "The value 6.4 hours was computed from the sample. Is it a parameter or a statistic?",
        "choice",
        1,
        "Parameter goes with population; statistic goes with sample. Both start with the same letter as their partner.",
        "It is a statistic, because it came from the sample. If she had somehow measured all 8,000, that same number would be a parameter.",
        { choices: ["A parameter", "A statistic"] }
      ),
      S(
        "Her sentence \"Students at this college are sleep deprived\" is an example of...",
        "choice",
        1,
        "Does that sentence only report what she measured, or does it make a claim about people she never surveyed?",
        "It is inferential. She measured 200 people and made a claim about all 8,000. That leap from sample to population is the entire point of inferential statistics, and it is why uncertainty always comes along with it.",
        { choices: ["Descriptive statistics", "Inferential statistics"] }
      ),
    ],
    takeaway:
      "Descriptive stops at the data. Inferential goes past it. Every time you see a conclusion, ask: did they measure the group they are talking about, or a slice of it?",
  },

  {
    sectionId: "1.2",
    title: "Classifying a variable completely",
    scenario:
      "A gym records, for each member: their membership tier (Bronze, Silver, Gold), the number of visits they made last month, and their body weight in pounds.",
    steps: [
      S(
        "\"Membership tier\" is which kind of variable?",
        "choice",
        0,
        "Is Bronze a number you can do arithmetic on, or a name for a category?",
        "It is qualitative. The values are labels. You cannot average Bronze and Gold.",
        { choices: ["Qualitative", "Quantitative discrete", "Quantitative continuous"] }
      ),
      S(
        "But tiers do have an order. What is the LEVEL of measurement for membership tier?",
        "choice",
        1,
        "You can rank the tiers, but is the gap from Bronze to Silver the same size as Silver to Gold?",
        "Ordinal. You can rank them, but the gaps are not measurable or equal, so you cannot treat the difference as a number.",
        { choices: ["Nominal", "Ordinal", "Interval", "Ratio"] }
      ),
      S(
        "\"Number of visits last month\" is which kind of variable?",
        "choice",
        1,
        "Can a member have made 7.5 visits?",
        "Quantitative discrete. It is a count, so it lands on whole numbers with gaps between them.",
        { choices: ["Qualitative", "Quantitative discrete", "Quantitative continuous"] }
      ),
      S(
        "\"Body weight in pounds\" is at which level of measurement?",
        "choice",
        3,
        "Does zero pounds mean no weight at all? And is 200 lbs genuinely twice 100 lbs?",
        "Ratio. There is a true zero, so ratios are meaningful. This is the highest level, and every arithmetic operation is legitimate on it.",
        { choices: ["Nominal", "Ordinal", "Interval", "Ratio"] }
      ),
    ],
    takeaway:
      "Two separate questions, always. First: category or number (and if number, countable or measurable)? Second: what level of measurement? The level is what decides which graphs and statistics you are allowed to use later.",
  },

  {
    sectionId: "2.1",
    title: "Building a grouped frequency distribution",
    // The original scenario ran 12 to 87 with 5 classes. 75/5 is exactly 15,
    // and classes of width 15 starting at 12 end at 86, leaving the value 87
    // with nowhere to go. That edge case depends on a convention this course
    // never states, and the professor's own worked solutions never hit it, so
    // the highest value moved to 89 and the arithmetic is now unambiguous.
    scenario:
      "You collect 40 exam scores. The lowest is 12 and the highest is 89. You want to organize them into 5 classes.",
    steps: [
      S(
        "First, find the range.",
        "numeric",
        77,
        "Range is just the highest value minus the lowest.",
        "The range tells you how much ground the classes have to cover in total. Everything else follows from it.",
        { tol: 0.01 }
      ),
      S(
        "Now find the class width. Remember the rounding rule.",
        "numeric",
        16,
        "Divide the range by the number of classes, then round UP.",
        "77 divided by 5 is 15.4, which rounds up to 16. You always round up, because rounding down would leave the largest values with no class to fall into. Check it: five classes of width 16 starting at 12 reach 91, which comfortably covers 89.",
        { tol: 0.01 }
      ),
      S(
        "The first class starts at 12 and is 16 wide. What is its UPPER class LIMIT?",
        "numeric",
        27,
        "The first class covers 12 through 27, which is 16 values counting both ends.",
        "12 to 27 inclusive is 16 values. Limits are the numbers you actually write in the table; boundaries come next.",
        { tol: 0.01 }
      ),
      S(
        "What is the LOWER class BOUNDARY of that first class?",
        "numeric",
        11.5,
        "Boundaries sit half a unit outside the limits, so the classes touch with no gap.",
        "11.5. Boundaries exist so a histogram's bars can touch. Limits leave a visual gap between 26 and 27; boundaries close it.",
        { tol: 0.01 }
      ),
    ],
    takeaway:
      "Range, then width (always rounding up), then limits, then boundaries. The boundary step is the one students skip, and it is the one that makes the histogram in 2.2 draw correctly.",
  },

  {
    sectionId: "2.2",
    title: "From a table to three different graphs",
    scenario:
      "Twenty delivery times are grouped as: 10-19 (frequency 5), 20-29 (frequency 9), 30-39 (frequency 6).",
    steps: [
      S(
        "To plot a frequency polygon, you need class midpoints. Find the midpoint of the SECOND class (20-29).",
        "numeric",
        24.5,
        "Average the lower and upper limits of that class.",
        "(20 + 29)/2 = 24.5. A frequency polygon plots a single point per class, and the midpoint is where that point goes horizontally.",
        { tol: 0.01 }
      ),
      S(
        "To plot an ogive, you need cumulative frequency. What is the cumulative frequency through the second class?",
        "numeric",
        14,
        "Add up every frequency from the first class through this one.",
        "5 + 9 = 14. Cumulative frequency answers \"how many delivery times were under 29.5 minutes?\" It can only grow, which is why an ogive always rises.",
        { tol: 0.01 }
      ),
      S(
        "What is the relative frequency of the THIRD class, as a percent?",
        "numeric",
        30,
        "Divide that class's frequency by the total number of data values, then convert to a percent.",
        "6/20 = 0.30 = 30%. Relative frequency lets you compare two data sets fairly even when they have different sample sizes.",
        { tol: 0.5 }
      ),
      S(
        "You want to answer \"what percent of deliveries took under 30 minutes?\" Which graph is built for that?",
        "choice",
        2,
        "You need a running total, not individual class counts.",
        "The ogive. It plots cumulative frequency at each upper boundary, so reading it at 29.5 immediately gives you the count below that point.",
        { choices: ["Histogram", "Frequency polygon", "Ogive", "Pareto chart"] }
      ),
    ],
    takeaway:
      "One table, three graphs, three different jobs. Midpoints feed the polygon, boundaries feed the histogram, cumulative totals feed the ogive.",
  },

  {
    sectionId: "2.3",
    title: "Picking the right graph on purpose",
    scenario:
      "A detailing shop wants four different pictures of its business: which service earns the most, how revenue changed over 12 months, what share of jobs each service represents, and the exact number of jobs completed each month for six months.",
    steps: [
      S(
        "\"Which service earns the most\". They want the biggest category to jump out immediately. Best graph?",
        "choice",
        1,
        "A plain bar graph works, but one variant sorts the bars so the winner is unmistakable.",
        "A Pareto chart. It is a bar graph with the bars ordered highest to lowest, so the dominant category is the leftmost bar every time.",
        { choices: ["Histogram", "Pareto chart", "Pie graph", "Ogive"] }
      ),
      S(
        "\"How revenue changed over 12 months\". Best graph?",
        "choice",
        2,
        "Anything measured across time has a standard presentation.",
        "A time series graph, with time on the horizontal axis. That convention is fixed, and putting time anywhere else makes the trend unreadable.",
        { choices: ["Pareto chart", "Stem-and-leaf plot", "Time series graph", "Histogram"] }
      ),
      S(
        "\"What share of jobs each service represents\". Best graph?",
        "choice",
        1,
        "They want parts of a whole, expressed as percentages.",
        "A pie graph. Each wedge is sized by that category's percentage of the total. It is weak for comparing similar-sized categories, but strong for showing composition.",
        { choices: ["Time series graph", "Pie graph", "Ogive", "Histogram"] }
      ),
      // Reworded: "the number of jobs each month" is data over time, and this
      // example had already established that time data gets a time series
      // graph, so the original version had two defensible answers. The point
      // being tested is "keep every original value", so the scenario now has
      // no time ordering to compete with it.
      S(
        "\"The exact repair cost of all 40 jobs, with every original value still readable\". Best graph?",
        "choice",
        3,
        "A histogram would bucket the values into ranges and lose the individual numbers.",
        "A stem-and-leaf plot. It shows the distribution's shape while preserving every exact data value, which a histogram cannot do because it groups values into classes. A dotplot also keeps every value, and for a small data set it is just as good a choice.",
        { choices: ["Histogram", "Pie graph", "Pareto chart", "Stem-and-leaf plot"] }
      ),
    ],
    takeaway:
      "The graph is chosen by the question and the data type, never by taste. Categorical, over time, part-of-whole, and preserve-every-value are four different jobs with four different answers.",
  },

  {
    sectionId: "3.1",
    title: "When the mean lies to you",
    scenario:
      "A business records project turnaround times, in days: 4, 7, 5, 4, 20, 6, 4.",
    steps: [
      S(
        "Add all seven values to get the total.",
        "numeric",
        50,
        "4 + 7 + 5 + 4 + 20 + 6 + 4.",
        "The sum is the numerator of the mean. Notice that one value, 20, contributes a huge share of it.",
        { tol: 0.01 }
      ),
      S(
        "Now find the mean (round to 2 decimals).",
        "numeric",
        7.14,
        "Divide the total by how many values there are.",
        "50/7 is about 7.14 days. Hold onto that number, because you are about to see it misrepresent this data.",
        { tol: 0.02 }
      ),
      S(
        "Sort the data and find the median.",
        "numeric",
        5,
        "Sorted: 4, 4, 4, 5, 6, 7, 20. With 7 values, the median is the 4th one.",
        "The median is 5 days. It sits well below the mean of 7.14, and it only cares about position, so the 20 could have been 200 and the median would not move.",
        { tol: 0.01 }
      ),
      S(
        "The mean is above the median. What does that tell you about the shape?",
        "choice",
        0,
        "A few unusually large values pull the mean in their direction.",
        "Skewed right. The single 20-day project drags the mean up while the median stays put. For this data, the median is the honest description of a typical project.",
        { choices: ["Skewed right", "Skewed left", "Perfectly symmetric"] }
      ),
    ],
    takeaway:
      "The mean uses every value, which is its strength and its weakness. When mean and median disagree, that gap is telling you an outlier exists, and the median is usually the number you should report.",
  },

  {
    sectionId: "3.2",
    title: "Computing a sample standard deviation",
    scenario:
      "Weekly revenue over five weeks, in hundreds of dollars: 40, 45, 38, 50, 42. Treat this as a SAMPLE.",
    steps: [
      S(
        "Find the mean.",
        "numeric",
        43,
        "Add all five and divide by 5.",
        "215/5 = 43. Every deviation from here on is measured against this number.",
        { tol: 0.01 }
      ),
      S(
        "Find the sum of the squared deviations from the mean.",
        "numeric",
        88,
        "The deviations are -3, 2, -5, 7, -1. Square each one, then add them up.",
        "9 + 4 + 25 + 49 + 1 = 88. Squaring does two jobs: it stops positives and negatives from cancelling, and it makes big deviations count for much more than small ones.",
        { tol: 0.01 }
      ),
      S(
        "Now find the SAMPLE variance. Watch the denominator.",
        "numeric",
        22,
        "For a sample you divide by n-1, not n. Here n is 5.",
        "88/(5-1) = 22. Dividing by 4 rather than 5 makes the answer slightly larger, which corrects for the fact that a sample tends to underestimate the spread of the population it came from.",
        { tol: 0.05 }
      ),
      S(
        "Find the sample standard deviation (2 decimals).",
        "numeric",
        4.69,
        "Take the square root of the variance.",
        "The square root of 22 is about 4.69, so roughly $469. The square root undoes the squaring and puts the answer back into the original units, which is exactly why standard deviation is the number you interpret rather than variance.",
        { tol: 0.02 }
      ),
    ],
    takeaway:
      "Mean, then squared deviations, then divide by n-1, then square root. If an exam question says \"sample,\" the n-1 is worth real points.",
  },

  {
    sectionId: "3.3",
    title: "Finding an outlier with the fences",
    scenario:
      "Eight project costs, in thousands, already sorted: 10, 12, 14, 15, 18, 20, 22, 50.",
    steps: [
      S(
        "Find Q1, the median of the lower half.",
        "numeric",
        13,
        "With 8 values, the lower half is 10, 12, 14, 15. Find the median of those four.",
        "The lower half is 10, 12, 14, 15, and its median is (12+14)/2 = 13. This course splits the data in half and takes the median of each half.",
        { tol: 0.01 }
      ),
      S(
        "Find Q3, the median of the upper half.",
        "numeric",
        21,
        "The upper half is 18, 20, 22, 50. Find the median of those four.",
        "(20+22)/2 = 21. Notice that the 50 barely influences Q3, because quartiles depend on position rather than magnitude.",
        { tol: 0.01 }
      ),
      S(
        "Find the IQR.",
        "numeric",
        8,
        "IQR is Q3 minus Q1.",
        "21 - 13 = 8. That is the spread of the middle 50% of the data, deliberately ignoring the extremes at both ends.",
        { tol: 0.01 }
      ),
      S(
        "Find the UPPER fence.",
        "numeric",
        33,
        "Upper fence is Q3 plus 1.5 times the IQR.",
        "21 + 1.5(8) = 21 + 12 = 33. The 1.5 multiplier is the standard convention for how far past the middle half a value must sit before it counts as unusual.",
        { tol: 0.05 }
      ),
      S(
        "Is the 50 an outlier?",
        "choice",
        0,
        "Compare 50 against the upper fence you just computed.",
        "Yes. 50 is well past the fence at 33, so it gets flagged. This is a rule, not a judgement call, which is exactly why the fences exist.",
        { choices: ["Yes, it is an outlier", "No, it is within the fences"] }
      ),
    ],
    takeaway:
      "Q1, Q3, IQR, fences, verdict. The same five steps work on any data set, and they turn \"that number looks weird\" into a defensible answer.",
  },

  {
    sectionId: "3.4",
    title: "Building a boxplot and reading its shape",
    scenario:
      "Nine completion times in days, already sorted: 5, 6, 7, 8, 9, 10, 11, 12, 30.",
    steps: [
      S(
        "Find the median.",
        "numeric",
        9,
        "With 9 values, the median is the 5th one.",
        "The median is 9. With an odd count, the median is an actual data value, and it is excluded from both halves when you find the quartiles next.",
        { tol: 0.01 }
      ),
      S(
        "Find Q1 (median of the lower half, excluding the median itself).",
        "numeric",
        6.5,
        "The lower half is 5, 6, 7, 8.",
        "(6+7)/2 = 6.5. The median value of 9 is set aside and belongs to neither half.",
        { tol: 0.01 }
      ),
      S(
        "Find Q3.",
        "numeric",
        11.5,
        "The upper half is 10, 11, 12, 30.",
        "(11+12)/2 = 11.5. Again the extreme value of 30 hardly matters, because you are counting positions.",
        { tol: 0.01 }
      ),
      S(
        "Find the upper fence to decide where the right whisker stops.",
        "numeric",
        19,
        "IQR is 11.5 - 6.5 = 5. Upper fence is Q3 + 1.5(IQR).",
        "11.5 + 1.5(5) = 19. So 30 is an outlier and gets its own dot. The right whisker stops at 12, the largest value that is NOT an outlier.",
        { tol: 0.05 }
      ),
      // The stem used to claim the median sat left of center with a long right
      // whisker. Neither was true of this data: Q1 to median and median to Q3
      // are both 2.5, and the LEFT whisker is the longer one. The shape here is
      // driven entirely by the outlier, so the question now says so.
      S(
        "The box itself is symmetric and the whiskers are short, but 30 sits far out on its own. What shape is this distribution?",
        "choice",
        0,
        "Ignore the box for a moment. Which direction does the extreme value pull?",
        "Skewed right. The box is balanced and the whiskers are short, so on its own the middle looks symmetric, but the outlier at 30 sits far above everything else and drags the tail to the right. A single extreme value is enough to skew a distribution, which is exactly why you plot it separately instead of hiding it inside a whisker.",
        { choices: ["Skewed right", "Skewed left", "Symmetric"] }
      ),
    ],
    takeaway:
      "The five-number summary is the whole boxplot. Whiskers stop at the last non-outlier, not at the true maximum, and that detail is what makes an outlier visible instead of hidden.",
  },

  {
    sectionId: "4.1",
    title: "Classical probability and the complement",
    scenario: "A bag holds 4 red marbles, 3 blue, and 5 green. You draw one at random.",
    steps: [
      S(
        "How many marbles are there in total?",
        "numeric",
        12,
        "Add all three colours.",
        "4 + 3 + 5 = 12. This total is the denominator of every probability in this problem.",
        { tol: 0 }
      ),
      S(
        "Find P(blue) as a decimal.",
        "numeric",
        0.25,
        "Favourable outcomes over total outcomes.",
        "3/12 = 0.25. This is classical probability: it works because every marble is equally likely to be drawn.",
        { tol: 0.005 }
      ),
      S(
        "Find P(not blue) as a decimal.",
        "numeric",
        0.75,
        "You could count the 9 non-blue marbles, or use the complement rule.",
        "1 - 0.25 = 0.75. Counting 9/12 gives the same answer, but the complement rule is faster and becomes essential later when the direct count is hard.",
        { tol: 0.005 }
      ),
    ],
    takeaway:
      "Total first, then favourable over total. The complement rule looks trivial here, but in Chapter 5 it is what turns an impossible \"at least one\" calculation into a one-line answer.",
  },

  {
    sectionId: "4.2",
    title: "The addition rule with an overlap",
    scenario:
      "Of 250 customers surveyed, 150 want email marketing, 100 want social media ads, and 60 want both.",
    steps: [
      S(
        "Find P(email) as a decimal.",
        "numeric",
        0.6,
        "150 out of 250.",
        "150/250 = 0.6.",
        { tol: 0.005 }
      ),
      S(
        "Find P(social) as a decimal.",
        "numeric",
        0.4,
        "100 out of 250.",
        "100/250 = 0.4.",
        { tol: 0.005 }
      ),
      S(
        "Find P(both) as a decimal.",
        "numeric",
        0.24,
        "60 out of 250.",
        "60/250 = 0.24. This overlap is the whole reason the next step is not simply 0.6 + 0.4.",
        { tol: 0.005 }
      ),
      S(
        "Now find P(email OR social).",
        "numeric",
        0.76,
        "Add the two, then subtract the overlap once.",
        "0.6 + 0.4 - 0.24 = 0.76. Adding alone gives 1.0, which would wrongly claim every single customer wants one or the other. The 60 people who want both got counted twice, so you remove one copy.",
        { tol: 0.005 }
      ),
    ],
    takeaway:
      "If the two groups can overlap, plain addition always overcounts. The giveaway word is \"both\" in the problem, and if a probability comes out above 1 you certainly forgot to subtract.",
  },

  {
    sectionId: "4.3",
    title: "Drawing without replacement",
    scenario:
      "A box has 12 raffle tickets, 5 of which are winners. You draw two tickets without replacing the first.",
    steps: [
      S(
        "Find P(the first ticket is a winner), to 4 decimals.",
        "numeric",
        0.4167,
        "5 winners out of 12 tickets.",
        "5/12 is about 0.4167. Nothing unusual yet; this is straight classical probability.",
        { tol: 0.001 }
      ),
      S(
        "Given the first was a winner, find P(the second is also a winner), to 4 decimals.",
        "numeric",
        0.3636,
        "One winner is gone AND one ticket is gone. Both numbers change.",
        "4/11 is about 0.3636. This is the step students miss: the numerator drops to 4 and the denominator drops to 11. Because the first draw changed the second, these events are dependent.",
        { tol: 0.001 }
      ),
      S(
        "Find P(both are winners), to 4 decimals.",
        "numeric",
        0.1515,
        "Multiply the two probabilities you just found.",
        "0.4167 x 0.3636 is about 0.1515. \"And\" means multiply, and for dependent events the second factor must be the conditional probability.",
        { tol: 0.002 }
      ),
    ],
    takeaway:
      "\"Without replacement\" is the signal for dependence. Check whether the denominator shrinks between draws; if it does, the second probability must be conditional.",
  },

  {
    sectionId: "5.1",
    title: "Checking whether a distribution is valid",
    scenario:
      "Someone claims this is a probability distribution: P(0) = 0.1, P(1) = 0.3, P(2) = 0.4, P(3) = 0.2.",
    steps: [
      S(
        "Add all four probabilities.",
        "numeric",
        1,
        "0.1 + 0.3 + 0.4 + 0.2.",
        "They sum to exactly 1. This is the requirement students actually check, and it means the list accounts for every possible outcome with nothing left over.",
        { tol: 0.005 }
      ),
      S(
        "Is every individual probability between 0 and 1?",
        "choice",
        0,
        "Scan the four values. Any negatives? Anything above 1?",
        "Yes, all four sit between 0 and 1. This is the second requirement, and it is the one people forget to state. A list could sum to 1 while containing a negative value, and that would still be invalid.",
        { choices: ["Yes, all of them", "No, at least one is out of range"] }
      ),
      S(
        "So is this a valid probability distribution?",
        "choice",
        0,
        "Both conditions had to hold. Did they?",
        "Valid, because both conditions hold: every probability is in range AND they sum to 1. On an exam you should say both, not just the sum.",
        { choices: ["Valid", "Not valid"] }
      ),
    ],
    takeaway:
      "Two conditions, always stated together: each probability between 0 and 1, and the total exactly 1. This is the same complement-rule logic from Chapter 4 applied to a whole list of outcomes.",
  },

  {
    sectionId: "5.2",
    title: "Mean and variance of a distribution",
    scenario:
      "Using that same valid distribution: P(0) = 0.1, P(1) = 0.3, P(2) = 0.4, P(3) = 0.2.",
    steps: [
      S(
        "Find the mean, E(X).",
        "numeric",
        1.7,
        "Multiply each X by its probability, then add: 0(0.1) + 1(0.3) + 2(0.4) + 3(0.2).",
        "0 + 0.3 + 0.8 + 0.6 = 1.7. This is a weighted average: outcomes that are more likely pull the centre toward themselves.",
        { tol: 0.02 }
      ),
      S(
        "Now find E(X squared): multiply each X SQUARED by its probability and add.",
        "numeric",
        3.7,
        "0(0.1) + 1(0.3) + 4(0.4) + 9(0.2).",
        "0 + 0.3 + 1.6 + 1.8 = 3.7. Note you square the X value but you do NOT square the probability.",
        { tol: 0.02 }
      ),
      S(
        "Find the variance.",
        "numeric",
        0.81,
        "Variance is E(X squared) minus the mean squared. Careful: square the mean, do not use the mean of the squares.",
        "3.7 - (1.7)squared = 3.7 - 2.89 = 0.81. The most common error here is subtracting 1.7 instead of 2.89.",
        { tol: 0.02 }
      ),
      S(
        "Find the standard deviation.",
        "numeric",
        0.9,
        "Square root of the variance.",
        "The square root of 0.81 is exactly 0.9. Same relationship as Chapter 3: standard deviation is the interpretable one because it is back in the original units.",
        { tol: 0.02 }
      ),
    ],
    takeaway:
      "Expected value is a weighted average, not a plain one. And the variance shortcut is E(X squared) minus mean squared, where the squaring of the mean happens last.",
  },

  {
    sectionId: "5.3",
    title: "A full binomial problem",
    scenario:
      "A fair coin is flipped 6 times. You want the probability of exactly 3 heads. Here n = 6, p = 0.5, x = 3.",
    steps: [
      S(
        "First, confirm this is binomial. How many of the four requirements does it satisfy?",
        "numeric",
        4,
        "Fixed number of trials? Two outcomes? Constant probability? Independent trials?",
        "All 4. Six flips is fixed, heads/tails is two outcomes, a fair coin keeps p at 0.5 throughout, and flips do not affect each other. If even one failed, the formula would not apply.",
        { tol: 0 }
      ),
      S(
        "Find the number of arrangements, 6C3.",
        "numeric",
        20,
        "6! divided by (3! times 3!).",
        "720/(6 x 6) = 20. There are 20 different orders in which 3 heads could appear among 6 flips, and every one of them counts.",
        { tol: 0 }
      ),
      S(
        "Find p^x, that is 0.5 cubed.",
        "numeric",
        0.125,
        "0.5 x 0.5 x 0.5.",
        "0.125. This is the probability of getting heads on the three specific flips you designated.",
        { tol: 0.001 }
      ),
      S(
        "Find q^(n-x), that is 0.5 to the power 3 again (since q = 1 - 0.5).",
        "numeric",
        0.125,
        "There are 6 - 3 = 3 tails, each with probability 0.5.",
        "0.125. Multiplying this by the previous value gives the probability of ONE specific arrangement.",
        { tol: 0.001 }
      ),
      S(
        "Put it together: find P(X = 3).",
        "numeric",
        0.3125,
        "Multiply all three pieces: 20 x 0.125 x 0.125.",
        "0.3125. The structure is always the same: count the arrangements, multiply by the probability of any single arrangement.",
        { tol: 0.002 }
      ),
      S(
        "Finally, find the mean of this binomial distribution.",
        "numeric",
        3,
        "Mean is n times p.",
        "6(0.5) = 3 heads, which matches intuition perfectly. The shortcut np saves you from building the entire distribution table.",
        { tol: 0.01 }
      ),
    ],
    takeaway:
      "Check the four requirements, then the formula is mechanical: nCx counts the arrangements, p^x q^(n-x) prices one of them. Mean np and variance npq are shortcuts you should never compute the long way.",
  },

  {
    sectionId: "6.1",
    title: "From a raw score to a probability",
    scenario:
      "IQ scores are normally distributed with mean 100 and standard deviation 15. What is the probability a randomly chosen person scores above 130?",
    steps: [
      S(
        "Convert 130 into a z-score.",
        "numeric",
        2,
        "Subtract the mean, then divide by the standard deviation.",
        "(130 - 100)/15 = 2. A score of 130 sits exactly 2 standard deviations above average. Standardizing is what lets one table serve every normal distribution.",
        { tol: 0.02 }
      ),
      S(
        "Look up z = 2.00. What is the area to the LEFT, to 4 decimals?",
        "numeric",
        0.9772,
        "Table E always gives the area to the left of z.",
        "0.9772. That means about 97.72% of people score below 130. The table only ever gives you the left area, and everything else is built from it.",
        { tol: 0.003 }
      ),
      S(
        "The question asked for ABOVE 130. Find the area to the right.",
        "numeric",
        0.0228,
        "The total area under the curve is 1.",
        "1 - 0.9772 = 0.0228, so about 2.28%. Reading the table and forgetting to flip to the right side is the single most common error in this chapter.",
        { tol: 0.003 }
      ),
    ],
    takeaway:
      "Standardize, look up the left area, then adjust to whatever the question actually asked for. Always sketch the curve and shade the region first, so you know whether to subtract.",
  },

  {
    sectionId: "6.2",
    title: "Working backward from a percentile",
    scenario:
      "Test scores are normally distributed with mean 500 and standard deviation 100. A scholarship goes to the top 10%. What score do you need?",
    steps: [
      S(
        "The top 10% means how much area lies to the LEFT of the cutoff? Give it as a decimal.",
        "numeric",
        0.9,
        "If 10% is above the cutoff, the rest is below it.",
        "0.90. The table is organized by left area, so the first move in every backward problem is translating the question into a left area.",
        { tol: 0.005 }
      ),
      S(
        "Look up which z-score corresponds to an area of 0.9000 to the left (2 decimals).",
        "numeric",
        1.28,
        "Search the body of Table E for 0.8997 or 0.9015 and read the z off the edges.",
        "z is about 1.28. This is a reverse lookup: instead of starting with z and finding area, you start with area and find z.",
        { tol: 0.03 }
      ),
      S(
        "Now convert that z back into an actual score.",
        "numeric",
        628,
        "X = mean + z times the standard deviation.",
        "500 + 1.28(100) = 628. You need at least a 628. This is just the z-score formula solved for X rather than for z.",
        { tol: 3 }
      ),
    ],
    takeaway:
      "Forward problems go score to z to area. Backward problems go area to z to score. Deciding which direction you are travelling before you touch the table prevents most mistakes in this section.",
  },

  {
    sectionId: "6.3",
    title: "A sample mean instead of one value",
    scenario:
      "A population has mean 50 and standard deviation 12. You take a random sample of 36 items. What is the probability the SAMPLE MEAN exceeds 53?",
    steps: [
      S(
        "First, find the standard error.",
        "numeric",
        2,
        "Standard error is sigma divided by the square root of n.",
        "12/sqrt(36) = 12/6 = 2. Sample means vary less than individual values do, and this is the number that captures that. It is the entire difference between this section and 6.1.",
        { tol: 0.02 }
      ),
      S(
        "Now find the z-score for a sample mean of 53.",
        "numeric",
        1.5,
        "Same z-score formula, but divide by the standard error instead of sigma.",
        "(53 - 50)/2 = 1.5. Using 12 in the denominator instead of 2 is the classic error here, and it would have given 0.25 instead.",
        { tol: 0.02 }
      ),
      S(
        "Find the area to the left of z = 1.50, to 4 decimals.",
        "numeric",
        0.9332,
        "Straight Table E lookup.",
        "0.9332. From here it is identical to any Chapter 6 problem.",
        { tol: 0.003 }
      ),
      S(
        "The question asked for the probability the sample mean EXCEEDS 53. Finish it.",
        "numeric",
        0.0668,
        "Subtract from 1.",
        "1 - 0.9332 = 0.0668, about 6.68%. Notice how much smaller this is than the chance a single item exceeds 53, precisely because averaging 36 values squeezes the spread down.",
        { tol: 0.003 }
      ),
    ],
    takeaway:
      "One question decides everything: is this about a single value or an average? If it is an average, sigma becomes sigma over root n, and every other step is unchanged.",
  },
];

guidedExamples.push(...ch7Guided, ...ch8Guided, ...ch10Guided);

export function getGuidedExample(sectionId: string) {
  return guidedExamples.find((g) => g.sectionId === sectionId);
}
