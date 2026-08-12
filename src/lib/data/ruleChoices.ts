/**
 * Rule-selection data for the interleaved discrimination drill.
 *
 * The drill shows a REAL generated problem prompt and asks only one question:
 * which method does this call for? No arithmetic, no table lookups, no answer.
 * That is deliberate. Execution is not the weak link; picking the rule is.
 *
 * There is exactly one entry per generator topic key (all 46 of them), so a
 * prompt from any chapter can be dropped into the drill and always has a
 * correct option. `confusableWith` is the important field: it names the OTHER
 * methods a student actually reaches for by mistake on that kind of prompt, and
 * it is what `distractorsFor` draws from first. A distractor that nobody would
 * ever pick teaches nothing, so the traps are chosen on purpose:
 *
 *   sigma versus sigma over root n   (one individual value vs a sample mean)
 *   z interval versus t interval     (sigma known vs s from the sample)
 *   one-tailed versus two-tailed     (the inequality in H1, or alpha over 2)
 *   addition versus multiplication   (the word OR vs the word AND)
 *   independent versus dependent     (with replacement vs without)
 *   binomial versus a listed table   (fixed n identical trials vs a given P(x) list)
 *   population versus sample spread  (divide by N vs divide by n minus 1)
 *   correlation versus regression    (measure the link vs predict a value)
 *   Table E forwards versus backward (value in, area out vs area in, value out)
 *
 * `why` never explains theory. It points at the WORDS in the prompt, because on
 * an exam those words are the only thing available to decide on.
 */

export type RuleChoice = {
  /** The generator topic key. Must match `topicsByChapter` / `generators` exactly. */
  key: string;
  ch: number;
  /** SHORT name of the method, as it would be said out loud. */
  rule: string;
  /** One clause naming the decisive cue, in plain language. */
  detail: string;
  /** One or two sentences: what in the problem TEXT tells you it is this one. */
  why: string;
  /** Other topic keys most easily mistaken for this one. */
  confusableWith: string[];
};

export const ruleChoices: RuleChoice[] = [
  /* ------------------------------------------------------------- chapter 1 */
  {
    key: "desc-inf",
    ch: 1,
    rule: "The descriptive versus inferential test: did the statement leave the data it was measured on",
    detail: "a quoted sentence, and you decide whether it only reports or whether it generalizes",
    why: "The prompt hands you a sentence in quotation marks and asks which type of statistics it is. Words like 'in the sample' or 'last season the average was' stay inside the data (descriptive), while 'is likely to', 'is expected to', 'nationwide', or 'future patients' reach past it (inferential).",
    confusableWith: ["param-stat", "var-type", "level"],
  },
  {
    key: "param-stat",
    ch: 1,
    rule: "Population versus sample, parameter versus statistic: identify which group the number describes",
    detail: "a number or a group is named, and you label whose it is",
    why: "The prompt says 'the entire group you want to draw a conclusion about', 'the group that was actually measured', or shows a number and asks 'parameter or statistic'. It is about WHO was measured, not about what kind of statistics it is or what kind of variable was recorded.",
    confusableWith: ["desc-inf", "var-type", "level"],
  },
  {
    key: "var-type",
    ch: 1,
    rule: "Variable classification: qualitative, quantitative discrete, or quantitative continuous",
    detail: "the phrase 'what type of variable' or 'classify the variable'",
    why: "The prompt names one variable ('Number of pets in a household', 'Favorite pizza topping') and asks 'What type of variable is this?' Ask whether it is a number at all, then whether it is counted (discrete) or measured (continuous). It is not asking about ordering or about a true zero.",
    confusableWith: ["level", "param-stat", "graphpick"],
  },
  {
    key: "level",
    ch: 1,
    rule: "The measurement ladder: nominal, ordinal, interval, ratio",
    detail: "the words 'level of measurement' or 'measured at which level'",
    why: "The prompt uses the exact phrase 'level of measurement' or 'would be measured at which level'. Climb the ladder: can they be ordered, are the gaps equal, does zero mean none. 'Zip codes' and 'jersey numbers' are numbers but still nominal, which is why the variable-type question is a different question.",
    confusableWith: ["var-type", "param-stat", "graphpick"],
  },

  /* ------------------------------------------------------------- chapter 2 */
  {
    key: "classwidth",
    ch: 2,
    rule: "Class width equals the range divided by the number of classes, always rounded UP",
    detail: "a smallest value, a largest value, and a number of classes",
    why: "The prompt gives 'the smallest value is 37 and the largest is 131' together with a count of classes, or gives a width and asks how many classes cover the data. Only three numbers matter: high, low, and the class count. No individual data values are listed.",
    confusableWith: ["midbound", "cumrel", "spread"],
  },
  {
    key: "midbound",
    ch: 2,
    rule: "Class midpoints and class boundaries: average the two limits, or shift each limit by 0.5",
    detail: "one single class written as limits, such as 25-36",
    why: "The prompt zooms in on ONE class: 'One class of a grouped frequency distribution has limits 25-36'. Midpoint averages the two limits, boundaries push out half a unit each way. The whole data set is never mentioned, which is what separates this from class width.",
    confusableWith: ["classwidth", "cumrel", "center"],
  },
  {
    key: "cumrel",
    ch: 2,
    rule: "Cumulative frequency (running total) and relative frequency (frequency divided by n)",
    detail: "a list of class frequencies plus a total, and the word cumulative or relative",
    why: "The prompt lists frequencies like '7, 3, 6, 2, 11 (total 29)' and asks 'through class 5' (add them up) or 'as a percent' (divide by the total). The word 'through' means cumulative, the words 'relative' or 'as a percent' mean divide.",
    confusableWith: ["classwidth", "midbound", "basicprob"],
  },
  {
    key: "graphpick",
    ch: 2,
    rule: "Graph selection: match the picture to the data type and to what the question wants shown",
    detail: "the phrase 'which graph should you construct'",
    why: "The prompt describes a goal ('preserve every exact value', 'parts of a whole as percentages', 'how many fall below a point') and asks which graph. Decide first whether the data is categorical or numeric, then read the goal: below a point means ogive, exact values means stem-and-leaf, share of a whole means pie.",
    confusableWith: ["var-type", "level", "fivenum", "midbound"],
  },

  /* ------------------------------------------------------------- chapter 3 */
  {
    key: "center",
    ch: 3,
    rule: "Measures of center from a raw list: mean, median, mode, or midrange",
    detail: "a raw list of values and the word mean, median, mode, or midrange",
    why: "The prompt lists the actual data ('9 values: 10, 15, 10, 14, 13, 14, 12, 8, 10') and asks for one named center. Mean adds and divides, median needs sorting, mode is the repeat, midrange averages only the highest and lowest. No probabilities appear anywhere.",
    confusableWith: ["spread", "fivenum", "quart", "meanvariance"],
  },
  {
    key: "spread",
    ch: 3,
    rule: "Sample spread: range, or variance and standard deviation dividing by n minus 1",
    detail: "the capitalized word SAMPLE next to a raw list of values",
    why: "The prompt says 'A SAMPLE of wait times was collected' or 'Treating these as a SAMPLE' and then asks for range, variance, or standard deviation. That capitalized SAMPLE is the whole signal: divide by n minus 1, not by N. If the prompt gave probabilities instead of a list, it would be a different rule.",
    confusableWith: ["center", "meanvariance", "binomial-meansd", "rules"],
  },
  {
    key: "rules",
    ch: 3,
    rule: "Empirical Rule 68-95-99.7 if bell-shaped, Chebyshev 1 minus 1 over k squared if the shape is unknown",
    detail: "the words 'bell-shaped' versus 'the shape is unknown' and 'AT LEAST'",
    why: "The prompt gives a mean and a standard deviation and asks for a PERCENT between two values. 'Bell-shaped' plus 'approximately what percent' means the Empirical Rule. 'The shape is unknown' plus 'AT LEAST what percent' means Chebyshev. No table lookup is expected either way.",
    confusableWith: ["area-from-z", "spread", "zpos"],
  },
  {
    key: "zpos",
    ch: 3,
    rule: "z-score for one individual value: the value minus the mean, divided by the standard deviation",
    detail: "one single value, a mean, a standard deviation, and no sample size and no area",
    why: "The prompt says 'mean 120 minutes and standard deviation 12 minutes. Find the z-score for a wait time of 138' or runs it backwards ('find the value whose z-score is -1'), or compares two people on two tests. There is no n and no probability asked for, so you do not divide sigma by root n and you do not open Table E.",
    confusableWith: ["area-from-z", "clt", "center", "quart"],
  },
  {
    key: "quart",
    ch: 3,
    rule: "Quartiles, the IQR, and the 1.5 times IQR outlier fences",
    detail: "the words Q1, Q3, midquartile, IQR, or outlier fence",
    why: "The prompt lists the data and then names a quartile object: 'Find Q1', 'Find the upper outlier fence', 'determine the midquartile'. Fence questions are the giveaway: fences only exist here, and they need Q1, Q3, and 1.5 times the IQR.",
    confusableWith: ["fivenum", "center", "value-from-area"],
  },
  {
    key: "fivenum",
    ch: 3,
    rule: "Five-number summary and boxplot: minimum, Q1, median, Q3, maximum",
    detail: "the phrase 'five-number summary' or a question about a whisker",
    why: "The prompt either spells out 'The five-number summary is the minimum, Q1, the median, Q3, and the maximum' or asks 'where does the RIGHT whisker end'. It wants one of the five reported pieces or a boxplot feature, not a fence calculation and not a spread formula.",
    confusableWith: ["quart", "center", "graphpick"],
  },

  /* ------------------------------------------------------------- chapter 4 */
  {
    key: "basicprob",
    ch: 4,
    rule: "Classical probability: favorable outcomes divided by total outcomes, for one single trial",
    detail: "one draw, one roll, or one spin, with no OR, no AND, and no GIVEN",
    why: "The prompt describes a single action: 'One card is drawn from a standard 52-card deck. Find P(a heart)' or 'A spinner has 10 equal sectors, 2 of which are winners'. Count the winners, count everything, divide. Nothing is combined and nothing is conditioned on.",
    confusableWith: ["addition", "multiplication", "conditional"],
  },
  {
    key: "addition",
    ch: 4,
    rule: "Addition Rule for OR: P(A) plus P(B), minus P(A and B) when they overlap",
    detail: "the word OR, plus a stated overlap such as 'and 15 use both'",
    why: "The prompt asks for 'the probability that a randomly chosen one rides the bus OR rides the train' and separately tells you '15 use both'. That overlap sentence is the instruction to subtract. If it instead says 'No one does both', the events are mutually exclusive and you just add.",
    confusableWith: ["multiplication", "basicprob", "conditional", "atleastone"],
  },
  {
    key: "multiplication",
    ch: 4,
    rule: "Multiplication Rule for AND: P(A) times P(B) if independent, P(A) times P(B given A) if not",
    detail: "the word BOTH, plus WITH replacement (independent) or WITHOUT replacement (dependent)",
    why: "The prompt asks 'Find the probability that BOTH happen' or 'that both are winners'. Then read the replacement clause: 'Two are drawn WITH replacement' or the word 'Independently' means multiply the two original probabilities, while 'WITHOUT replacement' means the second fraction loses one from the top and one from the bottom.",
    confusableWith: ["addition", "conditional", "atleastone", "binomial-exact"],
  },
  {
    key: "conditional",
    ch: 4,
    rule: "Conditional probability: P(A and B) divided by P(A)",
    detail: "the word GIVEN, which shrinks the denominator to one row or one column",
    why: "The prompt says 'Given that a randomly chosen adult attended the review session, find the probability that the person also passed' or gives a two-way table and conditions on one row. 'Given' tells you the total is no longer everybody, it is only the group named after 'given'.",
    confusableWith: ["multiplication", "addition", "basicprob"],
  },
  {
    key: "atleastone",
    ch: 4,
    rule: "At least one: 1 minus the probability that none of them happen",
    detail: "the exact phrase 'at least one' across several independent trials",
    why: "The prompt contains the phrase 'at least one' and gives one failure probability repeated over n independent items ('5 independent smoke alarms, each of which fails to sound with probability 0.1'). Raise the not-happening probability to the n, then subtract from 1. Adding the individual probabilities is the classic wrong move here.",
    confusableWith: ["multiplication", "binomial-exact", "addition"],
  },

  /* ------------------------------------------------------------- chapter 5 */
  {
    key: "validdist",
    ch: 5,
    rule: "The two requirements for a probability distribution: every P between 0 and 1, and all the P values summing to 1",
    detail: "a short list of P(x) values with the question 'is this valid'",
    why: "The prompt literally asks 'Is this a valid probability distribution?' and then lists P(0) = 0.5, P(1) = 0.7, P(2) = -0.2. You are only checking two things: is any probability negative or above 1, and do they total exactly 1. Nothing is computed from the distribution.",
    confusableWith: ["meanvariance", "basicprob", "binomial-exact"],
  },
  {
    key: "meanvariance",
    ch: 5,
    rule: "Mean and variance of a listed discrete distribution: sum of x times P(x), then sum of x squared times P(x) minus mu squared",
    detail: "an explicit table of P(x) values, with no n and no p",
    why: "The prompt hands you the whole distribution ('P(0) = 0.05, P(1) = 0.2, P(2) = 0.4, P(3) = 0.25, P(4) = 0.1') and asks for the mean, variance, or standard deviation. Because the probabilities are listed one by one rather than generated by a fixed number of identical trials, the binomial shortcuts do not apply.",
    confusableWith: ["binomial-meansd", "validdist", "spread", "center"],
  },
  {
    key: "binomial-exact",
    ch: 5,
    rule: "Binomial probability formula: n choose x, times p to the x, times q to the n minus x",
    detail: "a fixed number of independent identical trials, the same p each time, and a count of successes",
    why: "The prompt says 'In a group of 6 calls, each independently is answered within 30 seconds with probability 0.7' and then asks for EXACTLY, AT MOST, or AT LEAST a number of them. Fixed n, same p, independent, two outcomes: that is binomial. AT MOST and AT LEAST mean you add several of these terms, not that you switch rules.",
    confusableWith: ["meanvariance", "multiplication", "atleastone", "binomial-meansd"],
  },
  {
    key: "binomial-meansd",
    ch: 5,
    rule: "Binomial shortcuts: mu equals n times p, and sigma squared equals n times p times q",
    detail: "the word binomial together with n and p, and a request for mean, variance, or standard deviation",
    why: "The prompt says 'a binomial distribution with n = 37 and p = 0.15' and asks for the mean, variance, or standard deviation, with no specific number of successes named. Because it is binomial you never build the table: multiply. If a full P(x) list had been given instead, you would have to use the summation formulas.",
    confusableWith: ["meanvariance", "binomial-exact", "spread"],
  },

  /* ------------------------------------------------------------- chapter 6 */
  {
    key: "area-from-z",
    ch: 6,
    rule: "Standardize one value, then read Table E forwards: value in, area out",
    detail: "'a randomly chosen' single item, with LESS than, GREATER than, or BETWEEN",
    why: "The prompt says 'normally distributed with mu = 200 and sigma = 5' and asks for the probability that 'a randomly chosen battery' is LESS than 205. One individual, so divide by sigma itself with no root n. Table E always gives the area to the LEFT, so GREATER means subtract from 1 and BETWEEN means subtract the two areas.",
    confusableWith: ["value-from-area", "clt", "zpos", "rules"],
  },
  {
    key: "value-from-area",
    ch: 6,
    rule: "Read Table E backwards, then X equals mu plus z times sigma: area in, value out",
    detail: "the words percentile, cutoff, or TOP some percent",
    why: "The prompt asks for 'the 80th percentile' or 'the cutoff price that separates the TOP 5% from the rest'. You are given the area and asked for the value, which is the reverse direction: hunt the area INSIDE the body of Table E first, then rebuild X. TOP 5% has to be flipped to an area of 0.95 on the left before you look anything up.",
    confusableWith: ["area-from-z", "clt", "quart", "ci-critical"],
  },
  {
    key: "clt",
    ch: 6,
    rule: "Central Limit Theorem: standard error is sigma divided by the square root of n, then a normal probability for the sample MEAN",
    detail: "the words 'a sample of n equals' and 'the sample mean' appearing together",
    why: "The prompt says 'For a sample of n = 64, find the probability that the SAMPLE MEAN is LESS than 52.8' or asks for the standard error outright. The phrase 'a sample of' plus 'mean' is the trigger to divide sigma by root n. Drop the root n and you are answering the question about one individual value instead.",
    confusableWith: ["area-from-z", "ci-mean-z", "z-testvalue", "ci-margin"],
  },

  /* ------------------------------------------------------------- chapter 7 */
  {
    key: "ci-tails",
    ch: 7,
    rule: "Alpha and alpha over 2 for an interval: 1 minus the confidence level, then split between the two tails",
    detail: "a confidence level with a question about area, not about a critical value",
    why: "The prompt says 'building a 95% confidence interval' and asks 'What is alpha (the TOTAL area outside the interval)' or 'How much area lies in EACH tail'. It stops at the area. An interval always has two ends, so alpha splits in half, and the area you hunt in the BODY of Table E for the negative critical value is alpha over 2.",
    confusableWith: ["ci-critical", "z-critical", "tail-id"],
  },
  {
    key: "ci-critical",
    ch: 7,
    rule: "Confidence interval critical value: always alpha over 2 in each tail, Table E for z if sigma is known, Table F for t if it is not",
    detail: "the phrase 'sigma is known' versus 'sigma is unknown' next to a confidence level",
    why: "The prompt names the table and the symbol: 'Using Table E, find z sub alpha over 2 for a 98% confidence interval' or 'sigma is unknown, using Table F, find t sub alpha over 2'. The deciding words are POPULATION standard deviation known (z) against sigma unknown (t, with d.f. equal to n minus 1). An interval is never one-tailed, so it is always alpha over 2.",
    confusableWith: ["ci-tails", "z-critical", "t-critical", "value-from-area"],
  },
  {
    key: "ci-margin",
    ch: 7,
    rule: "Standard error versus margin of error: E is the critical value times the standard error",
    detail: "the phrase 'STANDARD ERROR only' versus 'maximum error of estimate E'",
    why: "Both forms give n and a standard deviation, and the ONLY difference is the last sentence. 'Find the STANDARD ERROR only' means divide the standard deviation by root n and stop. 'Find the maximum error of estimate E for a 95% confidence interval' means take that same standard error and multiply it by the critical value first.",
    confusableWith: ["clt", "ci-mean-z", "ci-mean-t", "ci-samplesize"],
  },
  {
    key: "ci-mean-z",
    ch: 7,
    rule: "z confidence interval for mu: x-bar plus or minus z times sigma over the square root of n",
    detail: "the capitalized phrase POPULATION standard deviation sigma",
    why: "The prompt says 'The POPULATION standard deviation is sigma = 14' and asks for the UPPER or LOWER limit of the interval. The Greek sigma being handed to you is the single reason this is z and not t. Some versions run backwards and give you the finished interval, asking for the sample mean (average the two limits) or E (half the width).",
    confusableWith: ["ci-mean-t", "ci-margin", "ci-samplesize", "z-testvalue"],
  },
  {
    key: "ci-mean-t",
    ch: 7,
    rule: "t confidence interval for mu: x-bar plus or minus t times s over the square root of n, with d.f. equal to n minus 1",
    detail: "the capitalized phrase SAMPLE standard deviation s, plus 'assume the population is approximately normal'",
    why: "The prompt says 'with a SAMPLE standard deviation of s = 34' and adds 'Assume the population is approximately normal'. The letter s instead of sigma is the whole decision, and it stays t even when n is large, so do not let n = 49 talk you into using z.",
    confusableWith: ["ci-mean-z", "ci-margin", "t-testvalue", "ci-critical"],
  },
  {
    key: "ci-samplesize",
    ch: 7,
    rule: "Sample size for a mean: n equals z times sigma over E, all squared, always rounded UP",
    detail: "the phrase 'how large a sample is needed' with an accuracy stated as 'to within'",
    why: "The prompt asks 'How large a sample is needed to estimate the mean commute time to within 4 minutes with 95% confidence, if sigma = 18'. There is no x-bar anywhere, because you are planning the study rather than reporting one. The answer is a count of people, so any decimal at all rounds UP.",
    confusableWith: ["ci-margin", "ci-mean-z", "ci-critical"],
  },
  {
    key: "t-area",
    ch: 7,
    rule: "Areas under the t curve from degrees of freedom: area in one direction, or the cutoff c in the other",
    detail: "a stated number of degrees of freedom and a probability statement about t itself",
    why: "The prompt is stripped of any story: 'A t distribution has 24 degrees of freedom. Find the value c such that P(t > c) = 0.98' or 'Compute P(-1.2 < t < 0.8)'. There is no sample mean, no claim, and no confidence level, so it is pure curve reading. Notice which side is asked for, since a large area on the right pushes c negative.",
    confusableWith: ["ci-critical", "t-critical", "z-pvalue", "area-from-z"],
  },

  /* ------------------------------------------------------------- chapter 8 */
  {
    key: "hyp-setup",
    ch: 8,
    rule: "Stating H0 and H1: equality always goes in H0, and the researcher's direction goes in H1",
    detail: "a historical value plus 'a researcher believes' followed by a direction word",
    why: "The prompt gives the old value ('has historically been 23 months') and then the belief ('a researcher believes the mean lifetime is now more than 23 months'). 'More than' becomes the greater-than sign in H1, 'smaller than' becomes less-than, and 'has changed' or 'is different' becomes not-equal. H0 keeps the equals sign no matter what.",
    confusableWith: ["tail-id", "conclusion", "ci-tails"],
  },
  {
    key: "tail-id",
    ch: 8,
    rule: "Reading the inequality in H1 to place the critical region: left, right, or split across both tails",
    detail: "H1 is already written for you, and only the direction is in question",
    why: "The prompt hands you the finished alternative ('A test uses H1: mu < 29') and asks for the type of test and where the critical region goes. The arrow points at the tail: less-than is left, greater-than is right, not-equal splits the region evenly between both tails. Nothing is computed and no table is opened.",
    confusableWith: ["hyp-setup", "z-critical", "ci-tails", "z-pvalue"],
  },
  {
    key: "z-critical",
    ch: 8,
    rule: "Critical z for a hypothesis test from Table E: all of alpha in one tail if one-tailed, alpha over 2 in each if two-tailed",
    detail: "the words left-tailed, right-tailed, or two-tailed z test next to an alpha",
    why: "The prompt says 'Find the POSITIVE critical value for a two-tailed z test with alpha = 0.01. Use Table E'. Sigma is not mentioned and no data is given, so this is only a table lookup. Splitting alpha when the test is one-tailed, or failing to split it when the test is two-tailed, is the mistake this drills.",
    confusableWith: ["t-critical", "ci-critical", "z-pvalue", "tail-id"],
  },
  {
    key: "z-testvalue",
    ch: 8,
    rule: "One-sample z test statistic: x-bar minus mu, divided by sigma over the square root of n",
    detail: "a claimed mean plus a given sigma and a sample result",
    why: "The prompt says 'is claimed to be 71 dollars, with sigma = 14. A sample of n = 31 gives X-bar = 74. Compute the z test value'. The word 'claimed' makes it a hypothesis test rather than an interval, and sigma being handed to you makes it z rather than t. Root n stays in the denominator because x-bar is a sample mean.",
    confusableWith: ["t-testvalue", "clt", "ci-mean-z", "zpos"],
  },
  {
    key: "z-pvalue",
    ch: 8,
    rule: "P-value from Table E: take the tail area past the test value, and double it for a two-tailed test",
    detail: "a test value is already computed, and the tail type is stated in the sentence",
    why: "The prompt says 'A right-tailed z test gives a test value of z = 0.49. Find the P-value using Table E'. The z is already done, so nothing is standardized here. Read the words before 'z test': left-tailed takes the area as is, right-tailed subtracts from 1, and two-tailed doubles the smaller tail.",
    confusableWith: ["z-critical", "area-from-z", "t-area", "conclusion"],
  },
  {
    key: "t-critical",
    ch: 8,
    rule: "Critical t for a hypothesis test from Table F, using d.f. equal to n minus 1 and the stated tail",
    detail: "a sample size n given alongside alpha and the phrase 'Table F'",
    why: "The prompt says 'Find the POSITIVE critical value for a right-tailed t test with alpha = 0.01 and n = 16. Use Table F'. The presence of n at all is the tell: z critical values never need a sample size, t values do, because you must convert n = 16 into 15 degrees of freedom before entering the row.",
    confusableWith: ["z-critical", "ci-critical", "t-area", "t-testvalue"],
  },
  {
    key: "t-testvalue",
    ch: 8,
    rule: "One-sample t test statistic: x-bar minus mu, divided by s over the square root of n",
    detail: "the sentence 'the population standard deviation is unknown', with s given instead",
    why: "The prompt says 'A sample of n = 17 gives X-bar = 52 and s = 7.5. The population standard deviation is unknown.' The letter s and that explicit unknown-sigma sentence are the decision, and the arithmetic is otherwise identical to the z test value, which is exactly why it gets picked wrong.",
    confusableWith: ["z-testvalue", "ci-mean-t", "t-critical", "corr-sig"],
  },
  {
    key: "conclusion",
    ch: 8,
    rule: "Wording the conclusion: reject or do not reject, then say support or reject the CLAIM depending on where the claim sits",
    detail: "the sentence naming whether the claim is in H0 or H1, plus whether the test value fell in the critical region",
    why: "The prompt states both facts outright: 'The claim is in H0' and 'The test value falls inside the critical region'. Inside the region means reject H0. Then, because the claim was H0, rejecting means there is enough evidence to REJECT the claim. Nothing is ever proved and H0 is never accepted, so any option using those words is wrong on sight.",
    confusableWith: ["hyp-setup", "corr-sig", "z-pvalue", "tail-id"],
  },

  /* ------------------------------------------------------------ chapter 10 */
  {
    key: "corr-r",
    ch: 10,
    rule: "Pearson correlation coefficient r from the sums of squares, measuring strength and direction only",
    detail: "paired data and the words 'correlation coefficient' or a request for SS sub xy",
    why: "The prompt lists pairs like '(4, 80), (6, 72), (7, 69)' and asks to 'Find the correlation coefficient r' or 'Find SS sub xy'. It wants one number describing the link, with no line and no prediction. The sign of r tells you direction, so watch for a context where y falls as x rises.",
    confusableWith: ["reg-line", "corr-sig", "corr-concept", "center"],
  },
  {
    key: "corr-sig",
    ch: 10,
    rule: "Significance test for r: t equals r times the square root of n minus 2, over the square root of 1 minus r squared, against Table F at d.f. equal to n minus 2",
    detail: "an r already given, plus alpha, a critical value, or the word decision",
    why: "The prompt gives r as a finished number ('gives r = -0.939') and then asks for the t test value for the correlation coefficient, or states a Table F critical value and asks 'What is the decision?'. Degrees of freedom are n minus 2 here, not n minus 1, because two things were estimated. If r is not significant, the best prediction of y is y-bar rather than a line.",
    confusableWith: ["corr-r", "t-testvalue", "t-critical", "conclusion"],
  },
  {
    key: "reg-line",
    ch: 10,
    rule: "Least-squares regression line: compute the slope b and the y-intercept a for y prime equals a plus b x",
    detail: "the request for the slope b or the intercept a, with r already declared significant",
    why: "The prompt lists the pairs, adds 'and r has already been shown to be significant', and then asks for 'the slope b' or 'the y-intercept a'. That significance sentence is permission to build a line at all. You are producing the equation, not a strength number and not a predicted value.",
    confusableWith: ["corr-r", "reg-predict", "corr-concept"],
  },
  {
    key: "reg-predict",
    ch: 10,
    rule: "Prediction: substitute the given x into y prime equals a plus b x",
    detail: "the word predict together with a specific x value",
    why: "The prompt ends with 'Using the regression line, predict y when x = 5'. A specific x is named, which means the line is only a step on the way to a number. Build a and b first, then substitute, and check the given x sits inside the range of the data before trusting the answer.",
    confusableWith: ["reg-line", "corr-r", "corr-concept"],
  },
  {
    key: "corr-concept",
    ch: 10,
    rule: "Interpreting r and the line in words: strength, the meaning of the slope, and the limits of prediction",
    detail: "a conclusion or interpretation is asked for, with nothing left to compute",
    why: "The prompt asks 'What should be concluded?', 'How is that slope interpreted?', 'which letter is the slope?', or describes an upside-down U shape with r near zero. Every number needed is already supplied, so the task is judgment: r only measures LINEAR fit, a slope is the change in y per one unit of x, and predicting outside the x range of the data is not justified.",
    confusableWith: ["corr-r", "reg-line", "corr-sig", "reg-predict"],
  },
];

/** Chapters in the order the course covers them. Chapter 9 is not in this app. */
const CHAPTER_ORDER: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 10];

const byKey: Map<string, RuleChoice> = new Map(ruleChoices.map((r) => [r.key, r]));

/** Look up one entry by generator topic key. */
export function ruleFor(key: string): RuleChoice | undefined {
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
 * Pick `n` wrong-answer rule strings for a question whose correct key is `key`.
 *
 * Tiers, in order, each shuffled inside itself so the same trap does not always
 * land in the same slot:
 *   1. the hand-picked `confusableWith` traps
 *   2. anything else from the same chapter
 *   3. anything from an adjacent chapter (adjacent in CHAPTER_ORDER, so 8 and 10 count)
 *   4. anything at all, purely so the function can always return n options
 *
 * Never returns the correct rule, and never returns the same string twice.
 */
export function distractorsFor(key: string, n: number): string[] {
  const self = byKey.get(key);
  if (!self || n <= 0) return [];

  const out: string[] = [];
  const used = new Set<string>([self.rule]);

  const drawFrom = (keys: string[]) => {
    for (const k of shuffledCopy(keys)) {
      if (out.length >= n) return;
      const rc = byKey.get(k);
      if (!rc || rc.key === self.key) continue;
      if (used.has(rc.rule)) continue;
      used.add(rc.rule);
      out.push(rc.rule);
    }
  };

  drawFrom(self.confusableWith);
  if (out.length < n) {
    drawFrom(ruleChoices.filter((r) => r.ch === self.ch).map((r) => r.key));
  }
  if (out.length < n) {
    const i = CHAPTER_ORDER.indexOf(self.ch);
    const adjacent = [CHAPTER_ORDER[i - 1], CHAPTER_ORDER[i + 1]].filter(
      (c): c is number => typeof c === "number"
    );
    drawFrom(ruleChoices.filter((r) => adjacent.includes(r.ch)).map((r) => r.key));
  }
  if (out.length < n) {
    drawFrom(ruleChoices.map((r) => r.key));
  }

  return out;
}

/**
 * The four options for one drill question: the correct rule plus `n` traps,
 * shuffled, with the index of the right one.
 */
export function optionsFor(
  key: string,
  n = 3
): { options: string[]; answer: number } | undefined {
  const self = byKey.get(key);
  if (!self) return undefined;
  const options = shuffledCopy([self.rule, ...distractorsFor(key, n)]);
  return { options, answer: options.indexOf(self.rule) };
}
