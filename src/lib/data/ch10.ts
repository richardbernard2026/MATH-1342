/**
 * Chapter 10: Correlation and Regression.
 *
 * Scope comes from the instructor's own deck ("Chapter 10 Correlation and
 * Regression.pptx") and Worksheet 10, not from the full Bluman chapter:
 *
 *   10.1 Correlation, including the t test for the significance of r
 *   10.2 Regression (the least-squares line and prediction)
 *
 * Section 10.3 (coefficient of determination, standard error of estimate,
 * prediction intervals) and 10.4 (multiple regression) appear nowhere in the
 * deck and nowhere on the worksheet, so nothing here teaches or tests them,
 * even though the Bluman formula insert happens to print those formulas.
 *
 * Two notational points, both taken from the deck rather than from the book:
 *
 *   1. The instructor works everything through sums of squares:
 *        SS_xy = sum(xy) - (sum x)(sum y)/n
 *        SS_x  = sum(x^2) - (sum x)^2/n
 *        SS_y  = sum(y^2) - (sum y)^2/n
 *        r = SS_xy / sqrt(SS_x * SS_y),  b = SS_xy / SS_x,  a = ybar - b*xbar
 *      The formula packet prints the algebraically expanded versions of the
 *      same three quantities. They always agree; both are shown in the lesson
 *      so the student recognises whichever one the exam prints.
 *
 *   2. Worksheet 10 says "use either the t-Test method or Table I". Table I
 *      (critical values of the correlation coefficient) is NOT in the course
 *      formula packet, which contains only Tables E, F and G. The t test is
 *      therefore taught as the primary method, since Table F is available.
 *
 * Every numeric answer below is verified against an independent recomputation.
 * Data sets are deliberately 5 to 7 pairs with integer sums of squares, because
 * the student works these by hand on paper.
 */

import { round, pick, randInt, tInv, tCDF } from "@/lib/math";
import type { Lesson } from "@/lib/data/lessons";
import type { Question } from "@/lib/data/testBank";
import type { Flashcard } from "@/lib/data/flashcards";
import type { GuidedExample, GuidedStep } from "@/lib/data/guidedExamples";
import type { PracticeProblem } from "@/lib/practiceGenerators";

/* ------------------------------------------------------------------ helpers */

/**
 * Every quantity in the sums table the course builds by hand, plus the three
 * sums of squares derived from it.
 *
 * These live here rather than in math.ts on purpose: math.ts is shared, and
 * nothing outside Chapter 10 needs them.
 */
export type Sums = {
  n: number;
  sumX: number;
  sumY: number;
  sumXY: number;
  sumX2: number;
  sumY2: number;
  xbar: number;
  ybar: number;
  SSxy: number;
  SSx: number;
  SSy: number;
};

/** Build the full sums table from paired data. Arrays must be the same length. */
export function sumsOf(xs: number[], ys: number[]): Sums {
  const n = xs.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }
  return {
    n,
    sumX,
    sumY,
    sumXY,
    sumX2,
    sumY2,
    xbar: sumX / n,
    ybar: sumY / n,
    SSxy: sumXY - (sumX * sumY) / n,
    SSx: sumX2 - (sumX * sumX) / n,
    SSy: sumY2 - (sumY * sumY) / n,
  };
}

/** Pearson's r, in the SS form the instructor uses. */
export function corrR(xs: number[], ys: number[]): number {
  const s = sumsOf(xs, ys);
  return s.SSxy / Math.sqrt(s.SSx * s.SSy);
}

/** Slope of the least-squares line: b = SS_xy / SS_x. */
export function regSlope(xs: number[], ys: number[]): number {
  const s = sumsOf(xs, ys);
  return s.SSxy / s.SSx;
}

/** y-intercept of the least-squares line: a = ybar - b * xbar. */
export function regIntercept(xs: number[], ys: number[]): number {
  const s = sumsOf(xs, ys);
  return s.ybar - (s.SSxy / s.SSx) * s.xbar;
}

/** Predicted value from the course's equation y' = a + bx. */
export function predictY(a: number, b: number, x: number): number {
  return a + b * x;
}

/**
 * Test value for the correlation coefficient: t = r * sqrt((n-2)/(1-r^2)),
 * with d.f. = n - 2. This is the formula printed in the course packet.
 */
export function corrT(r: number, n: number): number {
  return r * Math.sqrt((n - 2) / (1 - r * r));
}

/**
 * Two-tailed critical value for that test, read off Table F at d.f. = n - 2.
 *
 * Math.abs() is deliberate: it returns the positive critical value whichever
 * tail convention tInv uses, so the comparison |t| > C.V. is always correct.
 */
export function corrCriticalValue(alpha: number, n: number): number {
  return Math.abs(tInv(alpha / 2, n - 2));
}

/** Two-tailed P-value for the correlation test. Not on the worksheet, but handy. */
export function corrPValue(r: number, n: number): number {
  return 2 * (1 - tCDF(Math.abs(corrT(r, n)), n - 2));
}

/** True when |t| exceeds the two-tailed critical value, i.e. r is significant. */
export function isCorrSignificant(r: number, n: number, alpha: number): boolean {
  return Math.abs(corrT(r, n)) > corrCriticalValue(alpha, n);
}

/** "(2, 37), (4, 36), ..." for showing a small paired data set inside a prompt. */
function pairsLine(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `(${x}, ${ys[i]})`).join(", ");
}

/** The completed sums table, as one line of LaTeX. */
function sumsLine(s: Sums): string {
  return `$n = ${s.n}$, $\\sum x = ${round(s.sumX, 4)}$, $\\sum y = ${round(
    s.sumY,
    4
  )}$, $\\sum xy = ${round(s.sumXY, 4)}$, $\\sum x^2 = ${round(s.sumX2, 4)}$, $\\sum y^2 = ${round(
    s.sumY2,
    4
  )}$`;
}

/** The three sums of squares, as one line of LaTeX. */
function ssLine(s: Sums): string {
  return `$SS_{xy} = ${round(s.SSxy, 4)}$, $SS_{x} = ${round(s.SSx, 4)}$, $SS_{y} = ${round(
    s.SSy,
    4
  )}$`;
}

/* ------------------------------------------------------------------ lessons */

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

export const ch10Lessons: Lesson[] = [
  L(
    "10.1",
    10,
    "Correlation",
    "Every chapter before this one measured a single variable. Here you measure TWO things on the same individual, like hours studied and exam score, and ask whether they move together. Plot the pairs as points and you have a scatter plot: the x variable (called the independent or explanatory variable) goes across, the y variable (dependent or response) goes up. The correlation coefficient r puts one number on what that picture shows. Its SIGN is the direction: positive means y tends to rise as x rises, negative means y tends to fall. Its SIZE is the strength: the closer to 1 or to -1, the tighter the points hug a straight line. Four things matter more than the arithmetic. First, r can never leave the interval from -1 to 1, so an answer of 1.4 is arithmetic to go find. Second, r close to 0 means no LINEAR relationship, not no relationship at all: a perfect upside-down U has r near 0 and is obviously a relationship. Third, a big r never proves that x causes y. Fourth, r is not resistant, so one stray point can move it a lot. Finding r is only half of 10.1. Because r came from a sample, it is almost never exactly 0 by luck alone, so you then run a hypothesis test to decide whether the relationship is real in the population or just sampling noise. If that test says the relationship is not significant, you stop: you do not build a regression line.",
    "Sums table (build these five columns first): $x$, $y$, $xy$, $x^2$, $y^2$\n\n$SS_{xy} = \\sum xy - \\dfrac{(\\sum x)(\\sum y)}{n}$\n$SS_{x} = \\sum x^2 - \\dfrac{(\\sum x)^2}{n}$\n$SS_{y} = \\sum y^2 - \\dfrac{(\\sum y)^2}{n}$\n\n$r = \\dfrac{SS_{xy}}{\\sqrt{SS_{x} \\cdot SS_{y}}}$, and always $-1 \\le r \\le 1$\n\nThe formula packet prints the same thing expanded:\n$r = \\dfrac{n(\\sum xy) - (\\sum x)(\\sum y)}{\\sqrt{[\\,n\\sum x^2 - (\\sum x)^2\\,][\\,n\\sum y^2 - (\\sum y)^2\\,]}}$\n\nTesting whether $r$ is significant:\n$H_0: \\rho = 0$ (no linear relationship), $H_1: \\rho \\ne 0$\n$t = r\\sqrt{\\dfrac{n-2}{1-r^2}}$, with d.f. $= n - 2$\nTwo-tailed critical value from Table F. Reject $H_0$ when $|t| > $ C.V.",
    "Chapter 3's idea of measuring spread by squared distances (that is exactly what $SS_x$ and $SS_y$ are), and the t distribution and hypothesis-testing vocabulary from Chapter 8.",
    "10.2 only gets to run if this test says $r$ is significant. The whole point of testing $r$ first is to earn the right to draw the regression line.",
    "scatter"
  ),
  L(
    "10.2",
    10,
    "Regression",
    "Once the test in 10.1 says the relationship is real, you draw the single straight line that fits the points best. Every point has a vertical gap between where it actually is and where the line says it should be. That gap is the residual, y minus y prime. The line of best fit is the one that makes the SUM OF THE SQUARED residuals as small as possible, which is why it is called the least-squares regression line. Watch the letters: algebra writes a line as y equals mx plus b, but statistics writes it as y prime equals a plus bx, where a is the y-intercept and b is the slope. They are swapped from what you are used to, and that swap is the single most common lost point on this material. The slope b is the useful number to interpret: it says how much y prime changes for each one-unit increase in x. To predict, substitute an x value into the equation. Two rules bound that prediction. Do not use the line for an x outside the range of the data you collected, because you have no evidence the pattern continues out there. And if r was NOT significant, the line is meaningless, and the best prediction of y for any x is simply y-bar, the mean of the y values.",
    "$y' = a + bx$, where $a$ is the y-INTERCEPT and $b$ is the SLOPE\n\n$b = \\dfrac{SS_{xy}}{SS_{x}}$\n$a = \\bar{y} - b\\bar{x}$\n\nThe formula packet prints the same two numbers expanded:\n$b = \\dfrac{n(\\sum xy) - (\\sum x)(\\sum y)}{n(\\sum x^2) - (\\sum x)^2}$\n$a = \\dfrac{(\\sum y)(\\sum x^2) - (\\sum x)(\\sum xy)}{n(\\sum x^2) - (\\sum x)^2}$\n\nResidual $= y - y'$ (the vertical miss at one point)\n\nTo predict: substitute the $x$ value into $y' = a + bx$\nIf $r$ is NOT significant, the best prediction is $\\bar{y}$, not the line.",
    "10.1's sums table, which you have already built. $b$ reuses $SS_{xy}$ and $SS_{x}$ exactly as they were computed for $r$, so no new arithmetic is needed to get the slope.",
    "This is the last section of the course. Everything since Chapter 1 has been aimed at one thing: making a claim about a population from a sample and knowing how much to trust it. The regression line is that claim in its most usable form, a prediction.",
    "scatter"
  ),
];

/* ---------------------------------------------------------------- questions */

const M = (
  ch: number,
  prompt: string,
  options: string[],
  answer: number,
  explain: string
): Question => ({ ch, type: "mc", prompt, options, answer, explain });

const U = (ch: number, prompt: string, answer: number, tol: number, explain: string): Question => ({
  ch,
  type: "num",
  prompt,
  answer,
  tol,
  explain,
});

export const ch10Questions: Question[] = [
  M(
    10,
    "The correlation coefficient r must always fall between which two values?",
    ["-1 and 1", "0 and 1", "0 and 100", "-2 and 2"],
    0,
    "By construction r is a ratio that cannot exceed 1 in size, so -1 <= r <= 1. Any computed value outside that interval is an arithmetic error, not a finding."
  ),
  M(
    10,
    "For a set of paired data the correlation coefficient is r = 0.03. What is the correct conclusion?",
    [
      "There is no LINEAR relationship, but a curved relationship is still possible",
      "The two variables have no relationship of any kind",
      "There is a strong relationship, since r is positive",
      "One variable must cause the other",
    ],
    0,
    "r only measures LINEAR association. Data shaped like an upside-down U has r near 0 and a very obvious relationship. r near 0 rules out a line, nothing else."
  ),
  M(
    10,
    "A study of 200 towns finds r = 0.91 between monthly ice cream sales and monthly drowning deaths. What can legitimately be concluded?",
    [
      "There is a strong positive linear relationship, but neither variable is shown to cause the other",
      "Ice cream sales cause drownings",
      "Drownings cause ice cream sales",
      "Nothing, because r cannot be that large",
    ],
    0,
    "Correlation does not imply causation. Here a lurking variable (hot weather) drives both. A high r describes how the two move together, and says nothing about why."
  ),
  M(
    10,
    "A t test at alpha = 0.05 shows that r is NOT significant. A researcher still wants to predict y for a particular value of x. What is the best prediction?",
    [
      "y-bar, the mean of the y values",
      "The value given by the regression line y' = a + bx",
      "x-bar, the mean of the x values",
      "Zero, since there is no relationship",
    ],
    0,
    "If r is not significant there is no evidence that x helps predict y, so the regression line is meaningless. With nothing better to go on, the best single guess for y is its own mean, y-bar."
  ),
  M(
    10,
    "The x values in a study of delivery routes run from 4 stops to 13 stops. A student uses the regression line to predict the driving time for a route with 40 stops. This is...",
    [
      "Not appropriate, because x = 40 lies outside the range of the collected data",
      "Appropriate, because the regression line is a straight line and extends forever",
      "Appropriate, because r was significant",
      "Not appropriate, because 40 is not one of the observed x values",
    ],
    0,
    "The line is only evidence about the interval the data covers. Beyond it the pattern may bend or stop entirely, so extrapolating to x = 40 is unsupported. Note that predicting at an x INSIDE the range but not observed, such as 9 stops, is perfectly fine."
  ),
  M(
    10,
    "In the t test for the significance of the correlation coefficient, the degrees of freedom are...",
    ["n - 2", "n - 1", "n", "2n - 1"],
    0,
    "Two parameters are estimated from the data (the slope and the intercept), so d.f. = n - 2. With 6 pairs, look up Table F at d.f. = 4."
  ),
  U(
    10,
    "For a sample of n = 5 pairs, the sums are: sum x = 30, sum y = 100, sum xy = 680. Find SS(xy).",
    80,
    0.5,
    "SS(xy) = sum(xy) - (sum x)(sum y)/n = 680 - (30)(100)/5 = 680 - 600 = 80. Forgetting to divide by n gives -2320, which is the classic slip."
  ),
  U(
    10,
    "Find the correlation coefficient r for the paired data (2, 16), (4, 33), (5, 42), (8, 46), (11, 58). Round to 3 decimals.",
    0.947,
    0.005,
    "n = 5, sum x = 30, sum y = 195, sum xy = 1380, sum x^2 = 230, sum y^2 = 8589. Then SS(xy) = 1380 - 1170 = 210, SS(x) = 230 - 180 = 50, SS(y) = 8589 - 7605 = 984. So r = 210/sqrt(50 x 984) = 210/221.811 = 0.947."
  ),
  U(
    10,
    "For n = 5 pairs: sum x = 30, sum y = 185, sum xy = 1254, sum x^2 = 210, sum y^2 = 7605. Find the slope b of the regression line.",
    4.8,
    0.02,
    "SS(xy) = 1254 - (30)(185)/5 = 1254 - 1110 = 144, and SS(x) = 210 - 900/5 = 210 - 180 = 30. So b = SS(xy)/SS(x) = 144/30 = 4.8. Dividing by SS(y) instead (that is, swapping x and y) would give 0.189."
  ),
  U(
    10,
    "For n = 5 pairs, sum x = 35 and sum y = 225, and the slope has already been found to be b = 3.4. Find the y-intercept a.",
    21.2,
    0.05,
    "x-bar = 35/5 = 7 and y-bar = 225/5 = 45, so a = y-bar - b(x-bar) = 45 - 3.4(7) = 45 - 23.8 = 21.2. Reversing the means gives 7 - 3.4(45) = -146, which is the usual mistake."
  ),
  U(
    10,
    "A regression line is y' = 12.5 + 3.4x, and r was found to be significant. Predict y when x = 8.",
    39.7,
    0.05,
    "y' = 12.5 + 3.4(8) = 12.5 + 27.2 = 39.7. Reading a as the slope instead of the intercept gives 3.4 + 12.5(8) = 103.4, so keep straight that in y' = a + bx the FIRST number is the intercept."
  ),
  U(
    10,
    "A sample of n = 10 pairs gives r = 0.85. Find the t test value for the correlation coefficient. Round to 3 decimals.",
    4.564,
    0.05,
    "t = r sqrt((n-2)/(1-r^2)) = 0.85 sqrt(8/(1 - 0.7225)) = 0.85 sqrt(28.829) = 0.85(5.369) = 4.564. Using n instead of n - 2 gives 5.103."
  ),
];

/* --------------------------------------------------------------- flashcards */

const F = (id: string, ch: number, front: string, back: string, why: string): Flashcard => ({
  id,
  ch,
  front,
  back,
  why,
});

export const ch10Flashcards: Flashcard[] = [
  F(
    "c10-1",
    10,
    "Correlation coefficient r",
    "Measures the STRENGTH and DIRECTION of a LINEAR relationship between two quantitative variables",
    "Sign gives direction, size gives strength. Both come out of one number."
  ),
  F(
    "c10-2",
    10,
    "Range of r",
    "$-1 \\le r \\le 1$, always",
    "$r = 1$ is a perfect positive line, $r = -1$ a perfect negative one. A value outside this range is an arithmetic error."
  ),
  F(
    "c10-3",
    10,
    "r close to 0 means...",
    "No LINEAR relationship. It does NOT mean no relationship",
    "A perfect upside-down U gives $r$ near 0 and is obviously a relationship, just not a straight one."
  ),
  F(
    "c10-4",
    10,
    "Correlation and causation",
    "A large $|r|$ never proves that $x$ causes $y$",
    "A lurking variable can drive both. Ice cream sales and drownings correlate because of summer heat."
  ),
  F(
    "c10-5",
    10,
    "Sums of squares",
    "$SS_{xy} = \\sum xy - \\dfrac{(\\sum x)(\\sum y)}{n}$, $SS_{x} = \\sum x^2 - \\dfrac{(\\sum x)^2}{n}$, $SS_{y} = \\sum y^2 - \\dfrac{(\\sum y)^2}{n}$",
    "Build the five-column sums table once, then every other number in the chapter comes out of these three."
  ),
  F(
    "c10-6",
    10,
    "Formula for r",
    "$r = \\dfrac{SS_{xy}}{\\sqrt{SS_{x} \\cdot SS_{y}}}$",
    "Same value as the expanded version on the formula packet. Use whichever the exam prints."
  ),
  F(
    "c10-7",
    10,
    "Slope of the regression line",
    "$b = \\dfrac{SS_{xy}}{SS_{x}}$",
    "Divide by $SS_x$, not $SS_y$. Dividing by $SS_y$ is the line for predicting $x$ from $y$, a different line."
  ),
  F(
    "c10-8",
    10,
    "y-intercept of the regression line",
    "$a = \\bar{y} - b\\bar{x}$",
    "$y$-bar first, then subtract. Reversing the two means is the most common slip in 10.2."
  ),
  F(
    "c10-9",
    10,
    "Making a prediction",
    "$y' = a + bx$ (in statistics $a$ is the INTERCEPT and $b$ is the SLOPE)",
    "Only legitimate when $r$ is significant AND $x$ is inside the range of the data. If $r$ is not significant, the best prediction is $\\bar{y}$."
  ),
  F(
    "c10-10",
    10,
    "Testing whether r is significant",
    "$t = r\\sqrt{\\dfrac{n-2}{1-r^2}}$, d.f. $= n - 2$, two-tailed against Table F",
    "$H_0: \\rho = 0$. Reject when $|t| >$ C.V., which is what earns you the right to build the regression line."
  ),
];

/* --------------------------------------------------------- guided examples */

const G = (
  ask: string,
  kind: "numeric" | "choice",
  answer: number,
  hint: string,
  why: string,
  extra?: { choices?: string[]; tol?: number }
): GuidedStep => ({ ask, kind, answer, hint, why, ...extra });

export const ch10Guided: GuidedExample[] = [
  {
    sectionId: "10.1",
    title: "Finding r and testing whether it is significant",
    scenario:
      "Six students report how many hours they studied for an exam and what they scored. The pairs (hours x, score y) are (2, 37), (4, 36), (7, 59), (8, 52), (10, 55), (11, 79). Work at alpha = 0.05.",
    steps: [
      G(
        "Build the five-column sums table (x, y, xy, x squared, y squared). What is the sum of the xy column?",
        "numeric",
        2466,
        "Multiply each pair together first: 2(37), 4(36), 7(59), 8(52), 10(55), 11(79). Then add the six products.",
        "The completed table is: n = 6, sum x = 42, sum y = 318, sum xy = 2466, sum x squared = 354, sum y squared = 18116. Building this table is the whole chapter. Every remaining number in both 10.1 and 10.2 is squeezed out of these five sums, so if the table is right the rest is bookkeeping.",
        { tol: 0.5 }
      ),
      G(
        "Using sum xy = 2466, sum x = 42, sum y = 318 and n = 6, find SS(xy).",
        "numeric",
        240,
        "SS(xy) = sum(xy) minus (sum x)(sum y) divided by n. Do the division before the subtraction.",
        "SS(xy) = 2466 - (42)(318)/6 = 2466 - 2226 = 240. The two matching quantities, computed exactly the same way, are SS(x) = 354 - 42 squared/6 = 354 - 294 = 60 and SS(y) = 18116 - 318 squared/6 = 18116 - 16854 = 1262.",
        { tol: 0.5 }
      ),
      G(
        "With SS(xy) = 240, SS(x) = 60 and SS(y) = 1262, find r. Round to 3 decimals.",
        "numeric",
        0.872,
        "r = SS(xy) divided by the square root of SS(x) times SS(y). Multiply the two SS values under one square root sign.",
        "r = 240/sqrt(60 x 1262) = 240/sqrt(75720) = 240/275.173 = 0.872. It is positive, so more study hours go with higher scores, and it is close to 1, so the points sit near a straight line. Sanity check: r must land between -1 and 1, and it did.",
        { tol: 0.005 }
      ),
      G(
        "Now test whether that r is significant. Find the t test value. Round to 3 decimals.",
        "numeric",
        3.566,
        "t = r times the square root of (n - 2) over (1 - r squared). Here n = 6, so n - 2 = 4, and r squared is about 0.7607.",
        "t = 0.872 sqrt(4/(1 - 0.7607)) = 0.872 sqrt(16.715) = 0.872(4.088) = 3.566. Using n rather than n - 2 inside the square root would give about 4.37, which is why the degrees of freedom matter here and not just in the table lookup.",
        { tol: 0.05 }
      ),
      G(
        "Degrees of freedom are n - 2 = 4, and Table F gives a two-tailed critical value of 2.776 at alpha = 0.05. What is the decision?",
        "choice",
        0,
        "Compare the size of your test value, 3.566, with 2.776. Reject the null hypothesis when the test value is further out than the critical value.",
        "Reject H0. The hypotheses were H0: rho = 0 (no linear relationship in the population) against H1: rho is not 0. Since 3.566 > 2.776, the test value falls in the rejection region, so a correlation this strong is very unlikely to be sampling luck.",
        {
          choices: [
            "Reject H0. r is significant.",
            "Do not reject H0. There is not enough evidence of a linear relationship.",
            "Reject H1. The variables are unrelated.",
            "Accept H0, since 3.566 is bigger than 2.776.",
          ],
        }
      ),
      G(
        "Last step, and it is the one that earns the points: write the conclusion in words. Which sentence is correct?",
        "choice",
        0,
        "The sentence has to name the two actual variables, state the direction, and stop short of any claim the test did not make.",
        "There is a significant positive linear relationship between hours studied and exam score, so it is now legitimate to find the regression line in 10.2. That is the whole conclusion. It does not say studying CAUSES the higher score (this was not a controlled experiment), it does not promise the line will be exact for any one student, and it says nothing about study times far outside the 2-to-11-hour range that was actually observed.",
        {
          choices: [
            "There is a significant positive linear relationship between hours studied and exam score, so a regression line may now be used.",
            "Studying more hours causes exam scores to rise by a fixed amount.",
            "Because r is close to 1, every student who studies 9 hours will score exactly what the line predicts.",
            "Because r is significant, the relationship must stay linear at any number of hours, including 40.",
          ],
        }
      ),
    ],
    takeaway:
      "Sums table, then the three SS values, then r, then t, then a sentence. The test is not an optional extra: it is what decides whether 10.2 is allowed to happen at all. And the conclusion sentence is the step that gets dropped most often, so write it before you put the pencil down.",
  },

  {
    sectionId: "10.2",
    title: "Building the regression line and predicting with it",
    scenario:
      "A courier company records, for six delivery routes, the number of stops x and the total driving time y in minutes: (4, 28), (6, 46), (7, 44), (8, 35), (10, 59), (13, 76). A significance test has already been run and r = 0.915 is significant at alpha = 0.05, so a regression line is legitimate.",
    steps: [
      G(
        "Build the sums table again. What is the sum of the xy column?",
        "numeric",
        2554,
        "The six products are 4(28), 6(46), 7(44), 8(35), 10(59) and 13(76). Add them.",
        "The completed table is: n = 6, sum x = 48, sum y = 288, sum xy = 2554, sum x squared = 434, sum y squared = 15318. Notice that the regression line needs the same table that r needed, so on an exam you build it once and use it for both parts.",
        { tol: 0.5 }
      ),
      G(
        "Using sum x squared = 434, sum x = 48 and n = 6, find SS(x).",
        "numeric",
        50,
        "SS(x) = sum(x squared) minus (sum x) squared divided by n. Square the SUM, do not sum the squares again.",
        "SS(x) = 434 - 48 squared/6 = 434 - 2304/6 = 434 - 384 = 50. The other one you will need is SS(xy) = 2554 - (48)(288)/6 = 2554 - 2304 = 250.",
        { tol: 0.5 }
      ),
      G(
        "With SS(xy) = 250 and SS(x) = 50, find the slope b.",
        "numeric",
        5,
        "b = SS(xy) divided by SS(x). The denominator is the x one.",
        "b = 250/50 = 5. Dividing by SS(y) = 1494 instead would give 0.167, which is the slope of a completely different line (the one that predicts stops from driving time). The denominator tells you which variable you are predicting FROM.",
        { tol: 0.02 }
      ),
      G(
        "Now find the y-intercept a. You will need x-bar = 48/6 and y-bar = 288/6.",
        "numeric",
        8,
        "a = y-bar minus b times x-bar. Start from the mean of y, not the mean of x.",
        "x-bar = 8 and y-bar = 48, so a = 48 - 5(8) = 48 - 40 = 8. The equation is therefore y' = 8 + 5x. Reversing the means would give 8 - 5(48) = -232, so always start from y-bar.",
        { tol: 0.05 }
      ),
      G(
        "Use the equation y' = 8 + 5x to predict the driving time for a route with 9 stops.",
        "numeric",
        53,
        "Substitute x = 9. Remember that a is the intercept and b is the slope, so it is 8 + 5(9), not 5 + 8(9).",
        "y' = 8 + 5(9) = 8 + 45 = 53 minutes. Nine stops sits inside the observed range of 4 to 13 stops, so this prediction is supported by the data. Reading the letters backwards gives 5 + 8(9) = 77, and that swap is the most common lost point in this section.",
        { tol: 0.1 }
      ),
      G(
        "Final step: say what the line MEANS in plain English. Which sentence is correct?",
        "choice",
        0,
        "Interpret the slope as a rate of change per one extra stop, report the prediction, and claim nothing beyond the data.",
        "Each additional stop adds about 5 minutes to the driving time, and a route with 9 stops is predicted to take about 53 minutes. The intercept 8 is the model's driving time for a route with 0 stops, which is a base time rather than a meaningful prediction. Notice what the sentence avoids: it does not say the stops CAUSE the time (nothing here was controlled), it does not say the prediction is exact, and it would not be defensible for a 60-stop route, which is far outside the 4-to-13 range that was measured.",
        {
          choices: [
            "Each additional stop adds about 5 minutes to the driving time, and a route with 9 stops is predicted to take about 53 minutes.",
            "Each additional stop adds about 8 minutes, and a route with 9 stops takes exactly 53 minutes.",
            "Adding stops causes routes to take longer, which the regression line proves.",
            "The line predicts 53 minutes for 9 stops, and it would be just as reliable for a route with 60 stops.",
          ],
        }
      ),
    ],
    takeaway:
      "Same table, then SS(xy) and SS(x), then b, then a, then substitute, then interpret. Two guardrails never move: the line is only usable when r was significant, and only for x values inside the range you actually collected. Do not stop at the number 53. The sentence that explains it is the answer.",
  },
];

/* --------------------------------------------------------------- generators */

const NN = (
  ch: number,
  topic: string,
  topicLabel: string,
  prompt: string,
  steps: string[],
  answer: number,
  tol: number
): PracticeProblem => ({ ch, topic, topicLabel, prompt, steps, kind: "numeric", answer, tol });

const CC = (
  ch: number,
  topic: string,
  topicLabel: string,
  prompt: string,
  choices: string[],
  answer: number,
  steps: string[]
): PracticeProblem => ({ ch, topic, topicLabel, prompt, steps, kind: "choice", answer, tol: 0, choices });

export const ch10Topics: { key: string; label: string }[] = [
  { key: "corr-r", label: "Correlation Coefficient" },
  { key: "corr-sig", label: "Is r Significant?" },
  { key: "reg-line", label: "Regression Line" },
  { key: "reg-predict", label: "Prediction with y'" },
  { key: "corr-concept", label: "Correlation Concepts" },
];

/**
 * Cover stories for a pair of variables.
 *
 * `base` and `slope` set the underlying trend, `spread` the size of the random
 * wobble around it, and `yMin` a floor so no y value comes out absurd. Roughly
 * half the contexts have a negative slope, because a worksheet that only ever
 * produces positive r teaches the student to stop reading the sign.
 */
/**
 * `base`, `slope`, `spread` and `yMin` are the data generator and must not be
 * touched; the wording fields around them are written as whole sentences.
 *
 * The old shape held bare nouns and one shared frame, "For a chain of stores,
 * advertisements run per week is x (ads) and weekly sales is y (thousands of
 * dollars)", which is not a sentence anyone would write. Each story now carries
 * its own opening, its own sentence naming the two variables, and its own
 * prediction question, following the ALEKS items in the Chapter 10 deck ("For
 * each Cadet in the sample, we have listed both the mileage x (in thousands of
 * miles) ... and the price y (in thousands of dollars) at which the Cadet was
 * sold used") and Worksheet 10 ("Using y', if the player has 40 times at bat,
 * what is the number of hits the player gets?").
 */
type BiContext = {
  /** Opening sentence saying who is looking at what and why. */
  setup: string;
  /** Sentence naming $x$ and $y$ for one member of the sample. */
  variables: string;
  /** Plural noun phrase for the $x$ values, as in "pairs of hours studied and ...". */
  xName: string;
  /** Plural noun phrase for the $y$ values. */
  yName: string;
  /** Prediction question, worded for this story. */
  predict: (x0: number) => string;
  xUnit: string;
  yUnit: string;
  base: number;
  slope: number;
  spread: number;
  yMin: number;
};

const BIVARIATE: BiContext[] = [
  {
    setup:
      "A statistics instructor wants to determine whether the time a student spends studying is related to performance on the final exam.",
    variables:
      "For each student in a random sample, $x$ is the number of hours studied and $y$ is the score earned on the final exam.",
    xName: "hours studied",
    yName: "final exam scores",
    predict: (x0) => `Using $y'$, what final exam score is predicted for a student who studies ${x0} hours?`,
    xUnit: "hours",
    yUnit: "points",
    base: 40,
    slope: 4,
    spread: 6,
    yMin: 10,
  },
  {
    setup:
      "A courier company wants to determine whether the length of a delivery route is related to how long the route takes to drive.",
    variables:
      "For each route in a random sample, $x$ is the number of stops on the route and $y$ is the driving time in minutes.",
    xName: "stops on a route",
    yName: "driving times",
    predict: (x0) => `Using $y'$, what driving time is predicted for a route with ${x0} stops?`,
    xUnit: "stops",
    yUnit: "minutes",
    base: 8,
    slope: 5,
    spread: 6,
    yMin: 5,
  },
  {
    setup:
      "A plant manager wants to determine whether an assembly worker's experience is related to how much that worker produces.",
    variables:
      "For each worker in a random sample, $x$ is the number of years of experience and $y$ is the number of units produced in a week.",
    xName: "years of experience",
    yName: "weekly output totals",
    predict: (x0) =>
      `Using $y'$, how many units per week are predicted for a worker with ${x0} years of experience?`,
    xUnit: "years",
    yUnit: "units",
    base: 22,
    slope: 3,
    spread: 5,
    yMin: 5,
  },
  {
    setup: "A dealership wants to determine how the age of a used car is related to the price it sells for.",
    variables:
      "For each car in a random sample, $x$ is the age of the car in years and $y$ is the resale price in hundreds of dollars.",
    xName: "car ages",
    yName: "resale prices",
    predict: (x0) => `Using $y'$, what resale price is predicted for a car that is ${x0} years old?`,
    xUnit: "years",
    yUnit: "hundreds of dollars",
    base: 96,
    slope: -6,
    spread: 6,
    yMin: 8,
  },
  {
    setup:
      "School administrators wondered whether the number of classes a student misses is related to the grade the student finishes with.",
    variables:
      "For each student in a random sample, $x$ is the number of absences and $y$ is the final course average in percent.",
    xName: "absence counts",
    yName: "final course averages",
    predict: (x0) => `Using $y'$, what final course average is predicted for a student with ${x0} absences?`,
    xUnit: "absences",
    yUnit: "percent",
    base: 93,
    slope: -3,
    spread: 4,
    yMin: 40,
  },
  {
    setup: "A chain of stores wants to determine whether the advertising it runs is related to what it sells.",
    variables:
      "For each week in a random sample, $x$ is the number of advertisements run and $y$ is that week's sales in thousands of dollars.",
    xName: "advertisement counts",
    yName: "weekly sales totals",
    predict: (x0) => `Using $y'$, what weekly sales total is predicted for a week with ${x0} advertisements?`,
    xUnit: "ads",
    yUnit: "thousands of dollars",
    base: 14,
    slope: 3,
    spread: 4,
    yMin: 3,
  },
  {
    setup: "A fitness study asks whether the amount an adult exercises is related to that adult's resting heart rate.",
    variables:
      "For each adult in a random sample, $x$ is the number of hours of exercise per week and $y$ is the resting heart rate in beats per minute.",
    xName: "weekly exercise hours",
    yName: "resting heart rates",
    predict: (x0) =>
      `Using $y'$, what resting heart rate is predicted for an adult who exercises ${x0} hours per week?`,
    xUnit: "hours",
    yUnit: "beats per minute",
    base: 84,
    slope: -2,
    spread: 3,
    yMin: 45,
  },
  {
    setup:
      "A tutor wants to determine whether the number of practice problems a student completes is related to the quiz score that follows.",
    variables:
      "For each student in a random sample, $x$ is the number of practice problems completed and $y$ is the score on the quiz.",
    xName: "practice problem counts",
    yName: "quiz scores",
    predict: (x0) => `Using $y'$, what quiz score is predicted for a student who completes ${x0} practice problems?`,
    xUnit: "problems",
    yUnit: "points",
    base: 46,
    slope: 3,
    spread: 5,
    yMin: 10,
  },
];

/**
 * x values whose totals are divisible by n.
 *
 * That single property is what makes every problem in this chapter workable on
 * paper: if n divides both sum(x) and sum(y), then SS_xy, SS_x and SS_y all
 * come out as whole numbers, so the student never has to carry a repeating
 * decimal through four more steps. sum(y) is forced divisible below.
 */
const X_SETS: Record<number, number[][]> = {
  5: [
    [1, 3, 5, 7, 9],
    [2, 4, 5, 8, 11],
    [3, 4, 6, 7, 10],
    [2, 3, 5, 9, 11],
    [4, 6, 7, 9, 14],
    [1, 2, 5, 8, 9],
  ],
  6: [
    [2, 4, 7, 8, 10, 11],
    [4, 6, 7, 8, 10, 13],
    [1, 3, 5, 7, 9, 11],
    [3, 5, 8, 9, 10, 13],
    [2, 4, 6, 8, 10, 12],
    [1, 4, 6, 8, 11, 12],
  ],
  7: [
    [1, 2, 3, 4, 5, 6, 7],
    [2, 4, 6, 8, 10, 12, 14],
    [1, 3, 4, 6, 8, 9, 11],
    [3, 5, 7, 9, 11, 13, 15],
    [2, 3, 5, 7, 8, 10, 14],
  ],
};

/** One random data set for a context, with sum(y) nudged to be divisible by n. */
function buildData(ctx: BiContext, n: number): { xs: number[]; ys: number[] } {
  const xs = pick(X_SETS[n]);
  const ys = xs.map((x) =>
    Math.max(ctx.yMin, Math.round(ctx.base + ctx.slope * x) + randInt(-ctx.spread, ctx.spread))
  );
  const total = ys.reduce((t, v) => t + v, 0);
  const d = ((total % n) + n) % n;
  if (d !== 0) {
    let idx = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] > ys[idx]) idx = i;
    ys[idx] -= d;
    if (ys[idx] < ctx.yMin) ys[idx] += n;
  }
  return { xs, ys };
}

type Sample = { ctx: BiContext; xs: number[]; ys: number[]; s: Sums; r: number };

/**
 * Draw a data set whose |r| lands in a usable window.
 *
 * The upper bound matters as much as the lower one: at |r| above about 0.96 the
 * t test value becomes so sensitive to the third decimal of r that a correctly
 * worked answer can miss the tolerance, so those data sets are rejected rather
 * than graded unfairly. The fallback is the verified data set from the 10.1
 * guided example, so this function can never return junk.
 */
function sampleData(minAbsR: number, maxAbsR: number): Sample {
  for (let attempt = 0; attempt < 80; attempt++) {
    const ctx = pick(BIVARIATE);
    const n = pick([5, 6, 7]);
    const { xs, ys } = buildData(ctx, n);
    const s = sumsOf(xs, ys);
    if (s.SSx <= 0 || s.SSy <= 0) continue;
    const r = s.SSxy / Math.sqrt(s.SSx * s.SSy);
    if (!Number.isFinite(r)) continue;
    const ar = Math.abs(r);
    if (ar < minAbsR || ar > maxAbsR) continue;
    return { ctx, xs, ys, s, r };
  }
  const ctx = BIVARIATE[0];
  const xs = [2, 4, 7, 8, 10, 11];
  const ys = [37, 36, 59, 52, 55, 79];
  const s = sumsOf(xs, ys);
  return { ctx, xs, ys, s, r: s.SSxy / Math.sqrt(s.SSx * s.SSy) };
}

/** Statements the course keeps coming back to, with the trap they set. */
const CONCEPT_ITEMS: {
  prompt: string;
  choices: string[];
  answer: number;
  steps: string[];
}[] = [
  {
    prompt: "A data set gives $r = -0.94$. What does this say about the two variables?",
    choices: [
      "A strong negative linear relationship: as $x$ increases, $y$ tends to decrease",
      "A weak relationship, because $r$ is negative",
      "No relationship, because $r$ is below zero",
      "An error, because $r$ cannot be negative",
    ],
    answer: 0,
    steps: [
      "The SIGN of $r$ is the direction and the SIZE of $r$ is the strength. They are read separately.",
      "$|-0.94| = 0.94$ is close to 1, so the relationship is strong.",
      "The sign is negative, so the points slope downward: higher $x$ goes with lower $y$.",
    ],
  },
  {
    prompt: "A student computes $r = 1.28$ for a set of paired data. What should be concluded?",
    choices: [
      "There is an extremely strong positive relationship",
      "The computation is wrong, since $r$ can never exceed 1",
      "The data must be nonlinear",
      "The sample size was too small",
    ],
    answer: 1,
    steps: [
      "$r$ is always between $-1$ and $1$, inclusive.",
      "A value of $1.28$ is outside that range, so it is arithmetic to go find, not a finding.",
      "The usual culprit is squaring a sum instead of summing the squares in $SS_x$ or $SS_y$.",
    ],
  },
  {
    prompt:
      "Scatter plot points form a clear upside-down U shape, and $r$ comes out to $0.02$. What is the right conclusion?",
    choices: [
      "The variables are completely unrelated",
      "There is a strong linear relationship",
      "There is no LINEAR relationship, though a clear curved relationship exists",
      "The correlation coefficient was computed incorrectly",
    ],
    answer: 2,
    steps: [
      "$r$ only measures how close the points come to a straight LINE.",
      "A symmetric curve rises and then falls, so the upward and downward pieces cancel and $r$ lands near 0.",
      "$r$ near 0 rules out a line. It does not rule out a relationship, which is why the scatter plot is drawn first.",
    ],
  },
  {
    prompt:
      "Across many cities, the number of firefighters sent to a fire and the damage in dollars have $r = 0.89$. What follows?",
    choices: [
      "Sending firefighters causes more damage",
      "There is a strong positive linear relationship, but no cause is established",
      "Damage causes firefighters to exist",
      "The correlation is too high to be real",
    ],
    answer: 1,
    steps: [
      "Correlation measures how two variables move together. It cannot say why they do.",
      "Here the size of the fire is a lurking variable driving both numbers up at once.",
      "Only a controlled experiment can support a causal claim, and this was observational data.",
    ],
  },
  {
    prompt:
      "For a sample of $n = 8$ pairs, the t test gives $|t| = 1.42$ against a critical value of $2.447$. A prediction of $y$ is still wanted. What is the best prediction?",
    choices: [
      "$\\bar{y}$, the mean of the $y$ values",
      "The value from the regression line $y' = a + bx$",
      "$\\bar{x}$, the mean of the $x$ values",
      "0, since there is no relationship",
    ],
    answer: 0,
    steps: [
      "$|t| = 1.42$ does not exceed $2.447$, so $H_0: \\rho = 0$ is not rejected and $r$ is NOT significant.",
      "With no evidence that $x$ helps predict $y$, the regression line carries no information.",
      "The best single guess for $y$ is then its own mean, $\\bar{y}$.",
    ],
  },
  {
    prompt:
      "Data on studying were collected for $x$ between 2 and 11 hours, and $r$ was significant. Using the line to predict a score for 30 hours of study is...",
    choices: [
      "Fine, because the line is significant",
      "Fine, because a line extends forever",
      "Not appropriate, because 30 is outside the range of the collected data",
      "Not appropriate, because 30 was not one of the observed values",
    ],
    answer: 2,
    steps: [
      "The line is evidence only about the interval the data actually covers, here 2 to 11 hours.",
      "Outside that interval the pattern may bend or stop, and nothing in the sample rules that out.",
      "Predicting at an unobserved $x$ INSIDE the range, such as 6.5 hours, is perfectly acceptable.",
    ],
  },
  {
    prompt:
      "In the regression equation $y' = a + bx$ used in this course, which letter is the slope?",
    choices: ["$a$", "$b$", "Both, depending on the data", "Neither, the slope is $y'$"],
    answer: 1,
    steps: [
      "Algebra writes $y = mx + b$, where $b$ is the intercept. Statistics writes $y' = a + bx$.",
      "In the statistics version $a$ is the y-INTERCEPT and $b$ is the SLOPE.",
      "The letters are swapped from algebra, which is exactly why this is worth a point on the exam.",
    ],
  },
  {
    prompt:
      "A regression line of weekly sales on advertisements has slope $b = 3$. How is that slope interpreted?",
    choices: [
      "Sales are 3 times the number of ads",
      "Each additional advertisement is associated with an increase of about 3 units in predicted sales",
      "Three advertisements are needed before sales begin",
      "The correlation coefficient is 3",
    ],
    answer: 1,
    steps: [
      "The slope is a rate of change: how much $y'$ moves for a one-unit increase in $x$.",
      "So one more advertisement raises the PREDICTED sales by about 3 units.",
      "It is an association, not a promise about any single week, and not a causal claim.",
    ],
  },
];

export const ch10Generators: Record<string, () => PracticeProblem> = {
  "corr-r": () => {
    const form = pick(["r", "ssxy"] as const);
    // r = SS_xy/sqrt(SS_x*SS_y) and the wrong divisor SS_xy/SS_x land on the
    // same number when SS_x happens to equal SS_y, which would let the slope
    // formula score as r. Redraw when that happens.
    let d = sampleData(0.5, 0.99);
    if (form === "r") {
      for (let attempt = 0; attempt < 20 && Math.abs(d.r - d.s.SSxy / d.s.SSx) < 0.05; attempt++) {
        d = sampleData(0.5, 0.99);
      }
    }
    const { ctx, xs, ys, s, r } = d;
    const rr = round(r, 3);

    if (form === "ssxy") {
      return NN(
        10,
        "corr-r",
        "Correlation Coefficient",
        `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(xs, ys)}. Find $SS_{xy}$.`,
        [
          `Build the sums table first: ${sumsLine(s)}`,
          `$SS_{xy} = \\sum xy - \\dfrac{(\\sum x)(\\sum y)}{n} = ${round(s.sumXY, 4)} - \\dfrac{(${round(
            s.sumX,
            4
          )})(${round(s.sumY, 4)})}{${s.n}} = ${round(s.sumXY, 4)} - ${round(
            (s.sumX * s.sumY) / s.n,
            4
          )} = ${round(s.SSxy, 4)}$`,
          `Divide by $n$ BEFORE subtracting. Skipping that division is the single most common error in this chapter.`,
        ],
        round(s.SSxy, 4),
        0.5
      );
    }

    return NN(
      10,
      "corr-r",
      "Correlation Coefficient",
      `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(
        xs,
        ys
      )}. Find the correlation coefficient $r$, rounded to 3 decimals.`,
      [
        `Sums table: ${sumsLine(s)}`,
        `${ssLine(s)}`,
        `$r = \\dfrac{SS_{xy}}{\\sqrt{SS_{x} \\cdot SS_{y}}} = \\dfrac{${round(s.SSxy, 4)}}{\\sqrt{(${round(
          s.SSx,
          4
        )})(${round(s.SSy, 4)})}} = ${rr}$`,
        rr > 0
          ? `$r$ is positive, so ${ctx.xName} above their mean tend to be paired with ${ctx.yName} above their mean. Check that $r$ landed between $-1$ and $1$.`
          : `$r$ is negative, so ${ctx.xName} above their mean tend to be paired with ${ctx.yName} below their mean. Check that $r$ landed between $-1$ and $1$.`,
      ],
      rr,
      Math.min(0.005, Math.max(0.001, 0.3 * Math.abs(rr - s.SSxy / s.SSx)))
    );
  },

  "corr-sig": () => {
    const alpha = pick([0.05, 0.01]);
    let chosen = sampleData(0.5, 0.95);
    // Keep the decision unambiguous: a test value sitting almost exactly on the
    // critical value would make a correctly worked problem a coin flip.
    for (let attempt = 0; attempt < 20; attempt++) {
      const cv = corrCriticalValue(alpha, chosen.s.n);
      const t = corrT(round(chosen.r, 3), chosen.s.n);
      if (Number.isFinite(cv) && Math.abs(Math.abs(t) - cv) > 0.25) break;
      chosen = sampleData(0.5, 0.95);
    }
    const { ctx, xs, ys, s, r } = chosen;
    const df = s.n - 2;
    const rr = round(r, 3);
    // t is built from the DISPLAYED value of r, not the unrounded one, so the
    // work shown and the answer graded can never disagree. The tolerance below
    // then widens just enough to also accept a student who carried r at full
    // precision, while staying well clear of the n-instead-of-(n-2) error.
    const t = corrT(rr, s.n);
    const drift = Math.abs(t - corrT(r, s.n));
    const tTol = Math.max(0.06, Math.min(0.15, 4 * drift));
    const cv = corrCriticalValue(alpha, s.n);
    const form = pick(["t", "decision"] as const);

    if (form === "decision") {
      const significant = Math.abs(t) > cv;
      return CC(
        10,
        "corr-sig",
        "Is r Significant?",
        `A random sample of $n = ${s.n}$ pairs of ${ctx.xName} and ${ctx.yName} gives $r = ${rr}$. At $\\alpha = ${alpha}$, the two-tailed critical value from Table F at d.f. $= ${df}$ is $${round(
          cv,
          3
        )}$. Is there a significant linear relationship between the two variables?`,
        [
          "Reject $H_0$. $r$ IS significant, so a regression line may be used.",
          "Do not reject $H_0$. $r$ is NOT significant, so the best prediction of $y$ is $\\bar{y}$.",
        ],
        significant ? 0 : 1,
        [
          `$H_0: \\rho = 0$ against $H_1: \\rho \\ne 0$, with d.f. $= n - 2 = ${df}$.`,
          `$t = r\\sqrt{\\dfrac{n-2}{1-r^2}} = ${rr}\\sqrt{\\dfrac{${df}}{1 - ${round(
            r * r,
            4
          )}}} = ${round(t, 3)}$`,
          `Compare $|t| = ${round(Math.abs(t), 3)}$ with the critical value $${round(cv, 3)}$.`,
          significant
            ? `$|t|$ is larger, so reject $H_0$: there is a significant linear relationship, and 10.2 is now allowed.`
            : `$|t|$ is smaller, so do not reject $H_0$: there is not enough evidence of a linear relationship, and the best prediction of $y$ stays $\\bar{y}$.`,
        ]
      );
    }

    return NN(
      10,
      "corr-sig",
      "Is r Significant?",
      `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(
        xs,
        ys
      )}, and $r = ${rr}$. Using the $t$-test method, find the test value for the correlation coefficient, rounded to 3 decimals.`,
      [
        `$H_0: \\rho = 0$ against $H_1: \\rho \\ne 0$, with d.f. $= n - 2 = ${df}$.`,
        `$t = r\\sqrt{\\dfrac{n-2}{1-r^2}} = ${rr}\\sqrt{\\dfrac{${df}}{1 - ${round(r * r, 4)}}} = ${round(
          t,
          3
        )}$`,
        `Use $n - 2$, not $n$, inside the square root. At $\\alpha = ${alpha}$ the Table F critical value is $${round(
          cv,
          3
        )}$, so this $r$ ${Math.abs(t) > cv ? "IS" : "is NOT"} significant.`,
      ],
      round(t, 3),
      tTol
    );
  },

  "reg-line": () => {
    // a = ybar - b*xbar and the classic reversal a = xbar - b*ybar give the
    // SAME number whenever b is near -1, which would let the wrong method score.
    // Redraw when that happens, and tighten the tolerance if it somehow persists.
    let d = sampleData(0.55, 0.99);
    const aOf = (q: Sums) => q.ybar - (q.SSxy / q.SSx) * q.xbar;
    const aWrongOf = (q: Sums) => q.xbar - (q.SSxy / q.SSx) * q.ybar;
    for (let attempt = 0; attempt < 20 && Math.abs(aOf(d.s) - aWrongOf(d.s)) < 1; attempt++) {
      d = sampleData(0.55, 0.99);
    }
    const { ctx, xs, ys, s } = d;
    const b = s.SSxy / s.SSx;
    const a = s.ybar - b * s.xbar;
    const wrongB = s.SSxy / s.SSy;
    const aTol = Math.min(0.1, Math.max(0.01, 0.3 * Math.abs(a - aWrongOf(s))));
    const form = pick(["b", "a"] as const);

    if (form === "a") {
      return NN(
        10,
        "reg-line",
        "Regression Line",
        `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(
          xs,
          ys
        )}, and $r$ has already been shown to be significant. Find the y-intercept $a$ of the regression line $y' = a + bx$.`,
        [
          `Sums table: ${sumsLine(s)}`,
          `${ssLine(s)}`,
          `$b = \\dfrac{SS_{xy}}{SS_{x}} = \\dfrac{${round(s.SSxy, 4)}}{${round(s.SSx, 4)}} = ${round(b, 4)}$`,
          `$\\bar{x} = ${round(s.xbar, 4)}$ and $\\bar{y} = ${round(s.ybar, 4)}$`,
          `$a = \\bar{y} - b\\bar{x} = ${round(s.ybar, 4)} - (${round(b, 4)})(${round(s.xbar, 4)}) = ${round(
            a,
            4
          )}$`,
          `So $y' = ${round(a, 3)} + ${round(b, 3)}x$. Start from $\\bar{y}$, never from $\\bar{x}$.`,
        ],
        round(a, 4),
        aTol
      );
    }

    return NN(
      10,
      "reg-line",
      "Regression Line",
      `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(
        xs,
        ys
      )}, and $r$ has already been shown to be significant. Find the slope $b$ of the regression line $y' = a + bx$.`,
      [
        `Sums table: ${sumsLine(s)}`,
        `${ssLine(s)}`,
        `$b = \\dfrac{SS_{xy}}{SS_{x}} = \\dfrac{${round(s.SSxy, 4)}}{${round(s.SSx, 4)}} = ${round(b, 4)}$`,
        `The denominator is $SS_x$. Using $SS_y$ would give $${round(
          wrongB,
          4
        )}$, which is the slope of the other line, the one predicting $x$ from $y$.`,
      ],
      round(b, 4),
      Math.max(0.005, Math.min(0.02, 0.2 * Math.abs(b - wrongB)))
    );
  },

  "reg-predict": () => {
    // Reading y' = a + bx backwards gives b + ax, and the two agree whenever
    // a is close to b. Redraw so the wrong reading is always a wrong number,
    // and keep x inside the observed range so no problem teaches extrapolation.
    let d = sampleData(0.55, 0.99);
    const pickX = (xs: number[]) => {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      const inside = xs.filter((v) => v > lo && v < hi);
      return inside.length ? pick(inside) : Math.round((lo + hi) / 2);
    };
    let x0 = pickX(d.xs);
    const gapOf = (q: Sums, x: number) => {
      const bb = q.SSxy / q.SSx;
      const aa = q.ybar - bb * q.xbar;
      return Math.abs(aa + bb * x - (bb + aa * x));
    };
    for (let attempt = 0; attempt < 20 && gapOf(d.s, x0) < 1; attempt++) {
      d = sampleData(0.55, 0.99);
      x0 = pickX(d.xs);
    }
    const { ctx, xs, ys, s } = d;
    const b = s.SSxy / s.SSx;
    const a = s.ybar - b * s.xbar;
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const yhat = predictY(a, b, x0);
    const yTol = Math.min(0.2, Math.max(0.02, 0.3 * gapOf(s, x0)));

    return NN(
      10,
      "reg-predict",
      "Prediction with y'",
      `${ctx.setup} ${ctx.variables} The paired data are ${pairsLine(
        xs,
        ys
      )}, and $r$ has already been shown to be significant, so the regression line $y' = a + bx$ may be used. ${ctx.predict(x0)}`,
      [
        `Sums table: ${sumsLine(s)}`,
        `$b = \\dfrac{SS_{xy}}{SS_{x}} = \\dfrac{${round(s.SSxy, 4)}}{${round(s.SSx, 4)}} = ${round(b, 4)}$`,
        `$a = \\bar{y} - b\\bar{x} = ${round(s.ybar, 4)} - (${round(b, 4)})(${round(s.xbar, 4)}) = ${round(
          a,
          4
        )}$`,
        `$y' = a + bx = ${round(a, 4)} + (${round(b, 4)})(${x0}) = ${round(yhat, 3)}$ ${ctx.yUnit}`,
        `$x = ${x0}$ sits inside the observed range of ${lo} to ${hi}, so the prediction is supported. Outside that range the line is not evidence of anything.`,
      ],
      round(yhat, 3),
      yTol
    );
  },

  "corr-concept": () => {
    const item = pick(CONCEPT_ITEMS);
    return CC(
      10,
      "corr-concept",
      "Correlation Concepts",
      item.prompt,
      item.choices,
      item.answer,
      item.steps
    );
  },
};

/** Mirrors generateProblem() in practiceGenerators.ts, scoped to Chapter 10. */
export function generateCh10Problem(topicKey?: string): PracticeProblem {
  const key = topicKey && ch10Generators[topicKey] ? topicKey : pick(ch10Topics).key;
  return ch10Generators[key]();
}

/** Exposed for testing: generate one of every Chapter 10 topic. */
export const ch10TopicKeys = Object.keys(ch10Generators);
