/**
 * 60 exam-style questions, 10 per chapter, written to match the style of the
 * course worksheets: a mix of concept identification and worked computation.
 *
 * Numeric answers are graded with a tolerance, so a student rounding at a
 * different step still gets credit.
 */

export type Question =
  | {
      ch: number;
      type: "mc";
      prompt: string;
      options: string[];
      answer: number;
      explain: string;
    }
  | {
      ch: number;
      type: "num";
      prompt: string;
      answer: number;
      tol: number;
      explain: string;
    };

const M = (ch: number, prompt: string, options: string[], answer: number, explain: string): Question => ({
  ch,
  type: "mc",
  prompt,
  options,
  answer,
  explain,
});

const U = (ch: number, prompt: string, answer: number, tol: number, explain: string): Question => ({
  ch,
  type: "num",
  prompt,
  answer,
  tol,
  explain,
});

export const testBank: Question[] = [
  // Chapter 1
  M(1, "\"In a sample of 100 people, 36% preferred brand A.\" This is...", ["Descriptive", "Inferential", "A parameter", "A prediction"], 0, "It only reports what was observed in the sample."),
  M(1, "\"Experts say mortgage rates may soon hit bottom.\" This is...", ["Descriptive", "Inferential", "A census", "A parameter"], 1, "It predicts beyond the measured data."),
  M(1, "A numerical value describing a POPULATION is called a...", ["Statistic", "Parameter", "Sample", "Variable"], 1, "Parameter goes with population; statistic with sample."),
  M(1, "Number of children in a family is...", ["Qualitative", "Quantitative discrete", "Quantitative continuous", "Nominal"], 1, "Countable whole numbers with gaps between them."),
  M(1, "Time to run a race is...", ["Quantitative continuous", "Quantitative discrete", "Qualitative", "Ordinal"], 0, "Any value in a range, limited only by measurement precision."),
  M(1, "Eye color is measured at which level?", ["Nominal", "Ordinal", "Interval", "Ratio"], 0, "Pure categories with no order."),
  M(1, "Rankings of golfers (1st, 2nd, 3rd) are...", ["Nominal", "Ordinal", "Interval", "Ratio"], 1, "Ordered, but the gaps between ranks are not equal."),
  M(1, "Temperature in degrees Fahrenheit is...", ["Nominal", "Ordinal", "Interval", "Ratio"], 2, "Equal gaps, but zero is arbitrary."),
  M(1, "The weight of a phone is...", ["Nominal", "Ordinal", "Interval", "Ratio"], 3, "True zero, so ratios are meaningful."),
  M(1, "Extending a conclusion from a sample to the whole population is called...", ["Generalization", "Description", "Tabulation", "Enumeration"], 0, "This is the core move of inferential statistics."),

  // Chapter 2
  U(2, "A data set runs from 12 to 87. Using 5 classes, find the class width (round up).", 15, 0.01, "range = 87 - 12 = 75, and 75/5 = 15."),
  U(2, "A data set runs from 3 to 48. Using 6 classes, find the class width (round up).", 8, 0.01, "range = 45, and 45/6 = 7.5, which rounds UP to 8."),
  U(2, "A class runs 20-29. Find its midpoint.", 24.5, 0.01, "(20 + 29)/2 = 24.5."),
  U(2, "A class runs 10-19. Find its LOWER class boundary.", 9.5, 0.01, "Shift the lower limit down by 0.5."),
  U(2, "Class frequencies are 4, 8, 6, 2. Find the cumulative frequency through class 3.", 18, 0.01, "4 + 8 + 6 = 18."),
  U(2, "Class frequencies are 4, 8, 6, 2 (total 20). Find the relative frequency of class 2, as a percent.", 40, 0.5, "8/20 = 0.40 = 40%."),
  M(2, "Which graph answers \"how many values fall below X\"?", ["Histogram", "Ogive", "Pie graph", "Pareto chart"], 1, "Ogives plot cumulative frequency."),
  M(2, "In a histogram, the bars...", ["Have gaps between them", "Touch each other", "Are always equal height", "Are sorted by size"], 1, "They touch because they are drawn at class boundaries."),
  M(2, "A Pareto chart is a bar graph that is...", ["Sorted highest to lowest", "Always circular", "Plotted over time", "Cumulative"], 0, "Sorting makes the dominant category obvious."),
  M(2, "On a time series graph, what always goes on the horizontal axis?", ["Frequency", "Time", "Percentage", "Category"], 1, "Time is always the x-axis."),

  // Chapter 3
  U(3, "Find the mean of 4, 6, 5, 7, 3.", 5, 0.05, "25/5 = 5."),
  U(3, "Find the median of 8, 12, 8, 10, 14, 8.", 9, 0.05, "Sorted: 8, 8, 8, 10, 12, 14. The middle two are 8 and 10, so (8+10)/2 = 9."),
  U(3, "Find the mode of 3, 7, 3, 9, 4, 3.", 3, 0.01, "3 appears three times."),
  U(3, "A data set has minimum 15 and maximum 63. Find the midrange.", 39, 0.05, "(15 + 63)/2 = 39."),
  U(3, "Find the range of 4, 6, 5, 7, 3.", 4, 0.01, "7 - 3 = 4."),
  U(3, "The sample 4, 6, 5, 7, 3 has mean 5. Find the SAMPLE variance.", 2.5, 0.05, "Squared deviations sum to 10, and 10/(5-1) = 2.5."),
  U(3, "A sample variance is 2.5. Find the sample standard deviation (2 decimals).", 1.58, 0.02, "sqrt(2.5) is about 1.58."),
  U(3, "A distribution has mean 22000 and standard deviation 4000. Find the z-score for the value 30000.", 2, 0.05, "(30000 - 22000)/4000 = 2."),
  U(3, "Q1 = 18 and Q3 = 42. Find the IQR.", 24, 0.05, "42 - 18 = 24."),
  U(3, "Q1 = 18, Q3 = 42, IQR = 24. Find the UPPER outlier fence.", 78, 0.5, "42 + 1.5(24) = 42 + 36 = 78."),

  // Chapter 4
  M(4, "A bag has 4 red, 3 blue, and 5 green marbles. Using classical probability, find P(blue).", ["1/4", "3/12", "5/12", "7/12"], 0, "3/12 reduces to 1/4."),
  M(4, "\"Based on last year's data, there is a 70% chance.\" What type of probability is this?", ["Classical", "Empirical", "Subjective", "Conditional"], 1, "It comes from observed data, so it is empirical."),
  U(4, "P(A) = 0.4. Find P(not A).", 0.6, 0.01, "1 - 0.4 = 0.6."),
  U(4, "A and B are mutually exclusive, P(A) = 0.3 and P(B) = 0.25. Find P(A or B).", 0.55, 0.01, "0.3 + 0.25 = 0.55."),
  U(4, "P(A) = 0.5, P(B) = 0.4, P(A and B) = 0.15. Find P(A or B).", 0.75, 0.01, "0.5 + 0.4 - 0.15 = 0.75."),
  M(4, "A and B are independent when...", ["P(A and B) = 0", "P(B|A) = P(B)", "P(A or B) = 1", "P(A) = P(B)"], 1, "Knowing A happened does not change the probability of B."),
  U(4, "A and B are independent, P(A) = 0.6 and P(B) = 0.5. Find P(A and B).", 0.3, 0.01, "0.6 x 0.5 = 0.3."),
  U(4, "Two cards are drawn without replacement. P(1st King) = 4/52 and P(2nd King | 1st King) = 3/51. Find P(both Kings), to 4 decimals.", 0.0045, 0.001, "(4/52)(3/51) is about 0.0045."),
  U(4, "Three independent trials each have a 0.2 chance of failure. Find P(at least one success), to 3 decimals.", 0.992, 0.005, "1 - 0.2^3 = 1 - 0.008 = 0.992."),
  M(4, "The conditional probability P(B|A) equals...", ["P(A) x P(B)", "P(A) + P(B)", "P(A and B)/P(A)", "P(A and B)/P(B)"], 2, "Divide the joint probability by P(A)."),

  // Chapter 5
  M(5, "What must be true for a valid discrete probability distribution?", ["Every P(X) = 0.5", "Each P(X) is between 0 and 1, and they sum to 1", "There are exactly 2 outcomes", "The mean equals the variance"], 1, "Both conditions must hold."),
  U(5, "P(0) = 0.1, P(1) = 0.3, P(2) = 0.4, P(3) = 0.2. Find the mean.", 1.7, 0.05, "0 + 0.3 + 0.8 + 0.6 = 1.7."),
  U(5, "For that same distribution (mean 1.7), find the variance.", 0.81, 0.03, "E(X^2) = 3.7, so 3.7 - 2.89 = 0.81."),
  M(5, "A fair game has an expected value of...", ["The cost to play", "0", "The maximum payout", "1"], 1, "Fair means no average gain or loss."),
  U(5, "A game costs \\$5 to play. You win \\$100 with probability 0.03, otherwise nothing. Find the expected net value.", -2, 0.5, "100(0.03) - 5 = 3 - 5 = -2."),
  M(5, "Which of these is NOT a binomial requirement?", ["A fixed number of trials", "Two outcomes per trial", "Constant probability p", "Trials that depend on each other"], 3, "Binomial trials must be INDEPENDENT."),
  U(5, "A binomial experiment has n = 10 and p = 0.3. Find P(X = 4), to 3 decimals.", 0.2, 0.01, "10C4 (0.3)^4 (0.7)^6 is about 0.200."),
  U(5, "A binomial has n = 20 and p = 0.25. Find the mean.", 5, 0.1, "np = 20(0.25) = 5."),
  U(5, "A binomial has n = 20 and p = 0.25. Find the standard deviation, to 2 decimals.", 1.94, 0.05, "sqrt(npq) = sqrt(3.75) is about 1.94."),
  M(5, "Defects in 50 items, each with an independent 5% chance. Which distribution applies?", ["Normal", "Binomial", "Uniform", "Empirical"], 1, "Fixed n, two outcomes, constant p, independent trials."),

  // Chapter 6
  M(6, "Which is the formula for a z-score?", ["z = X - mu", "z = (X - mu)/sigma", "z = mu/X", "z = sigma/X"], 1, "Subtract the mean, then divide by the standard deviation."),
  U(6, "A normal distribution has mu = 100 and sigma = 15. Find the z-score for X = 130.", 2, 0.05, "(130 - 100)/15 = 2."),
  U(6, "For z = 2, find the area to the LEFT, to 4 decimals.", 0.9772, 0.005, "Table E gives 0.9772."),
  U(6, "The area to the left of z = 2 is 0.9772. Find the area to the RIGHT.", 0.0228, 0.005, "1 - 0.9772 = 0.0228."),
  U(6, "Find the area between z = -1 and z = 1.", 0.6826, 0.01, "About 68%, matching the Empirical Rule."),
  U(6, "A normal distribution has mu = 500 and sigma = 100. The 90th percentile has z about 1.28. Find X.", 628, 5, "500 + 1.28(100) = 628."),
  M(6, "Which formula finds a raw score from a z-score?", ["X = mu + z(sigma)", "X = mu - z", "X = z/sigma", "X = sigma/mu"], 0, "The z-score formula solved for X."),
  U(6, "A population has sigma = 20 and a sample of n = 25 is taken. Find the standard error.", 4, 0.1, "20/sqrt(25) = 20/5 = 4."),
  U(6, "mu = 50, sigma = 12, n = 36, and the sample mean is 53. Find the z-score.", 1.5, 0.05, "Standard error = 12/6 = 2, so z = 3/2 = 1.5."),
  M(6, "The Central Limit Theorem says that as n increases, sample means approach...", ["A binomial distribution", "The same shape as the population", "A normal distribution regardless of the population's shape", "A uniform distribution"], 2, "That is exactly what the CLT guarantees."),
];
