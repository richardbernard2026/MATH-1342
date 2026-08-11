/**
 * Chapter 8: Hypothesis Testing.
 *
 * Sourced from the course deck ("Chapter 8 Hypothesis Testing.pptx"),
 * "Worksheet 8 (Ch. 8).pdf", and the "Formulas&Tables Packet.pdf" that is
 * available on test day (Table E for z, Table F for t).
 *
 * What the deck actually teaches, and therefore what this file teaches:
 *
 *   8.1  Steps in Hypothesis Testing, TRADITIONAL METHOD (five steps).
 *   8.2  z Test for a Mean, worked BOTH ways: the traditional five steps and
 *        the P-value five steps. The deck gives each method its own summary
 *        slide and its own worked examples.
 *   8.3  t Test for a Mean, again worked BOTH ways.
 *
 * Sections 8.4 (z test for a proportion) and 8.5 (chi-square test for a
 * variance) do NOT appear in the deck and are not covered here.
 *
 * Worksheet 8 confirms the split: problems 1, 2 and 5 ask for critical values,
 * problems 3, 4 and 6 ask for the P-value. Every problem is answered in the
 * same five parts, so every guided example below is built around those parts:
 *
 *   a. State the hypotheses and identify the claim.
 *   b. Find the critical value(s), or find the P-value.
 *   c. Compute the test value.
 *   d. Make the decision.
 *   e. Summarize the results.
 *
 * Part (e) is the step students drop, so it is always its own gated step here
 * and it is always graded on the deck's exact sentence pattern:
 *
 *   "Since [the test value lies in the critical region / the P-value is less
 *   than or equal to the level of significance], the null hypothesis is
 *   rejected. So, there is enough evidence to [support / reject] the claim
 *   that ..."
 *
 * "Support the claim" when the claim sits in H1, "reject the claim" when the
 * claim sits in H0. The deck never says "accept the null hypothesis".
 *
 * All LaTeX is written between $...$ delimiters, matching the rest of the app.
 */

import { normalCDF, pick, randInt, round, shuffle, tCDF, tInv } from "@/lib/math";
import type { Lesson } from "@/lib/data/lessons";
import type { Question } from "@/lib/data/testBank";
import type { Flashcard } from "@/lib/data/flashcards";
import type { GuidedExample, GuidedStep } from "@/lib/data/guidedExamples";
import type { PracticeProblem } from "@/lib/practiceGenerators";

/* =========================================================== table lookups */

/**
 * Critical z values, exactly as the deck's summary slide lists them.
 *
 * These are Table E values rounded to 2 decimals, which is the convention this
 * course grades on. Every entry here reproduces a closest-area scan of Table E
 * except the two that need 1.645, which is the textbook's own documented
 * rounding:
 *
 *   alpha = 0.05 one-tailed, and alpha = 0.10 two-tailed (which is the same
 *   0.05 in one tail). A raw closest-area scan of Table E lands on 1.64 (area
 *   0.9495, off by 0.0005) rather than 1.65 (area 0.9505, off by 0.0005).
 *   Bluman resolves that dead tie by rounding the exact 1.645 up, and the
 *   deck's summary slide prints 1.65 for both. The Table F footnote in the
 *   packet says the same thing: "This value has been rounded to 1.65 in the
 *   textbook."
 *
 * Read the map as ONE[alpha] for a one-tailed test (use the negative of it for
 * a left-tailed test) and TWO[alpha] for the positive half of a two-tailed
 * pair. 0.02 and 0.03 are included because Worksheet 8 uses a nonstandard
 * alpha, and both were verified against Table E the same way.
 */
export const Z_CRIT_ONE: Record<string, number> = {
  "0.01": 2.33,
  "0.02": 2.05,
  "0.03": 1.88,
  "0.05": 1.65,
  "0.1": 1.28,
};

export const Z_CRIT_TWO: Record<string, number> = {
  "0.01": 2.58,
  "0.02": 2.33,
  "0.03": 2.17,
  "0.05": 1.96,
  "0.1": 1.65,
};

/** Critical z. `tails` is 1 or 2; the value returned is always positive. */
export function zCritical(alpha: number, tails: 1 | 2): number {
  const key = String(alpha);
  const v = tails === 1 ? Z_CRIT_ONE[key] : Z_CRIT_TWO[key];
  if (v === undefined) throw new Error(`No Table E critical value stored for alpha = ${alpha}`);
  return v;
}

/**
 * The degrees-of-freedom rows Table F actually prints in the packet.
 *
 * Every whole number from 1 to 30, then it thins out. Bluman's rule when the
 * exact df is missing from the table is to drop to the NEXT SMALLER row, which
 * is the conservative choice (a larger critical value, so it is harder to
 * reject). That rule is what `tableDf` implements.
 */
export const TABLE_F_DF: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 32, 34, 36, 38, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 500, 1000,
];

/** Snap a df down to the nearest row Table F actually prints. */
export function tableDf(df: number): number {
  let best = TABLE_F_DF[0];
  for (const row of TABLE_F_DF) {
    if (row <= df) best = row;
    else break;
  }
  return best;
}

/**
 * Positive critical t, read the way Table F is read.
 *
 * `tInv` and `tCDF` are imported rather than reimplemented. Two small wrappers
 * sit around them so this file is immune to the one thing about those two
 * functions that is genuinely ambiguous: whether "area" means the area to the
 * LEFT (mirroring `normalCDF` and `normalInv`) or the area to the RIGHT.
 *
 * For the critical value, taking the absolute value settles it. The t curve is
 * symmetric, so a left-area reading returns $+t$ and a right-area reading
 * returns $-t$ for the same input; both have the same magnitude, which is the
 * number Table F prints.
 */
export function tCritical(alpha: number, df: number, tails: 1 | 2): number {
  const areaInOneTail = tails === 1 ? alpha : alpha / 2;
  return round(Math.abs(tInv(1 - areaInOneTail, tableDf(df))), 3);
}

/**
 * Area to the LEFT of t, whichever way `tCDF` happens to be defined.
 *
 * The left area at a positive t must be more than $0.5$, and at a negative t
 * must be less than $0.5$. That single fact picks the right orientation.
 */
export function tAreaLeft(t: number, df: number): number {
  const a = tCDF(t, tableDf(df));
  return t >= 0 ? Math.max(a, 1 - a) : Math.min(a, 1 - a);
}

/** P-value for a z test. Table E areas are 4 decimals, so the result is too. */
export function zPValue(z: number, tail: "left" | "right" | "two"): number {
  const areaLeft = round(normalCDF(z), 4);
  if (tail === "left") return round(areaLeft, 4);
  if (tail === "right") return round(1 - areaLeft, 4);
  return round(2 * (1 - round(normalCDF(Math.abs(z)), 4)), 4);
}

/** P-value for a t test, rounded to 3 decimals the way the deck reports them. */
export function tPValue(t: number, df: number, tail: "left" | "right" | "two"): number {
  const areaLeft = tAreaLeft(t, df);
  if (tail === "left") return round(areaLeft, 3);
  if (tail === "right") return round(1 - areaLeft, 3);
  return round(2 * (1 - tAreaLeft(Math.abs(t), df)), 3);
}

/* ================================================================= lessons */

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

export const ch8Lessons: Lesson[] = [
  L(
    "8.1",
    8,
    "Steps in Hypothesis Testing (Traditional Method)",
    "A hypothesis test is a fixed five-step procedure, and almost every point lost in this chapter is lost on form rather than on arithmetic. The null hypothesis H0 ALWAYS contains the equality. The alternative hypothesis H1 is its mathematical opposite and never contains an equal sign. Read the sentence before you write anything: 'differs from' or 'is not equal to' gives a two-tailed test, 'less than' or 'decreased' gives a left-tailed test, 'greater than' or 'increased' gives a right-tailed test. Then separately decide which of the two hypotheses holds the claim, because that is what decides the wording of your final sentence. Rejecting H0 when H0 is actually true is a Type I error, and the level of significance alpha is exactly the probability of making one.",
    "Two-tailed: $H_0: \\mu = k$ and $H_1: \\mu \\neq k$\nLeft-tailed: $H_0: \\mu = k$ and $H_1: \\mu < k$\nRight-tailed: $H_0: \\mu = k$ and $H_1: \\mu > k$\n\nTraditional method, five steps:\n1. State the hypotheses and identify the claim\n2. Find the critical value(s)\n3. Compute the test value\n4. Make the decision (reject or do not reject $H_0$)\n5. Summarize the results\n\nDecision rule: reject $H_0$ when the test value falls in the critical region\n\n$\\alpha = 1 - C$, so $C = 95\\%$ means $\\alpha = 0.05$\nType I error: rejecting $H_0$ when $H_0$ is true, with probability $\\alpha$\nType II error: not rejecting $H_0$ when $H_1$ is true",
    "Chapter 6's normal curve and Chapter 7's idea of using a sample to say something about a parameter.",
    "8.2 and 8.3 both plug a test value into this same five-step frame; the only thing that changes is which formula and which table.",
    "curve-between"
  ),
  L(
    "8.2",
    8,
    "z Test for a Mean",
    "Use the z test when the population standard deviation sigma is KNOWN, and either the sample size is at least 30 or the population is normally distributed. The test value is just a z-score for a sample mean, which is Chapter 6's standard-error formula with the hypothesized mu in the numerator. Once you have the test value you can finish two different ways. The traditional method compares the test value against a critical value from Table E. The P-value method converts the test value into a probability and compares that probability against alpha. Both are examinable, and Worksheet 8 asks for each of them by name, so read part (b) of the problem before you start: it tells you which method the instructor wants.",
    "$z = \\dfrac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}}$\n\nCritical values from Table E (2 decimals):\nOne-tailed: $\\alpha = 0.10 \\rightarrow 1.28$, $\\alpha = 0.05 \\rightarrow 1.65$, $\\alpha = 0.01 \\rightarrow 2.33$\nTwo-tailed: $\\alpha = 0.10 \\rightarrow \\pm 1.65$, $\\alpha = 0.05 \\rightarrow \\pm 1.96$, $\\alpha = 0.01 \\rightarrow \\pm 2.58$\n\nP-value method, five steps:\n1. State the hypotheses and identify the claim\n2. Compute the test value\n3. Find the P-value\n4. Make the decision\n5. Summarize the results\n\nP-value from Table E:\nRight-tailed: $P = 1 - (\\text{area left of } z)$\nLeft-tailed: $P = \\text{area left of } z$\nTwo-tailed: $P = 2 \\times (\\text{area in the tail beyond } |z|)$\n\nDecision rule: if $P \\le \\alpha$, reject $H_0$. If $P > \\alpha$, do not reject $H_0$.",
    "6.3's $z = \\dfrac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}$, which is literally the same formula, and 8.1's five steps.",
    "8.3 swaps sigma for s and Table E for Table F. Nothing else about the procedure moves.",
    "curve-mid"
  ),
  L(
    "8.3",
    8,
    "t Test for a Mean",
    "When sigma is UNKNOWN you estimate it with the sample standard deviation s, and the extra uncertainty in that estimate means the normal curve is no longer right. Use the t distribution instead, with degrees of freedom equal to n minus 1. The population should be approximately normally distributed. The formula is identical to the z test with s in place of sigma, and both the traditional method and the P-value method run exactly as they did in 8.2. The only new mechanical skill is reading Table F: find your df row, then choose the 'One tail' column or the 'Two tails' column to match your alpha. If your df is not printed (the table thins out after 30), drop to the next SMALLER df row.",
    "$t = \\dfrac{\\bar{X} - \\mu}{s / \\sqrt{n}}$ with $\\text{d.f.} = n - 1$\n\nUse $t$ when $\\sigma$ is unknown, $z$ when $\\sigma$ is known\n\nReading Table F:\nGo down to your $\\text{d.f.}$ row\nUse the 'One tail' row of alphas for a left- or right-tailed test\nUse the 'Two tails' row of alphas for a two-tailed test\nIf your $\\text{d.f.}$ is missing, use the next SMALLER $\\text{d.f.}$\n\nExample: $n = 16$, two-tailed, $\\alpha = 0.05$, so $\\text{d.f.} = 15$ and the critical values are $\\pm 2.131$",
    "8.2's z test, with $\\sigma$ replaced by $s$, and Chapter 7's t-interval use of Table F and $\\text{d.f.} = n - 1$.",
    "Everything after this chapter (two-sample tests, correlation in Chapter 10) reuses this same five-step shape.",
    "curve-left"
  ),
];

/* =============================================================== questions */

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

/**
 * 14 questions, deliberately weighted toward FORM.
 *
 * Seven of them never ask for a number at all, because stating H0 and H1,
 * naming the tail, and writing the summary sentence are where the points
 * actually go. Every numeric tolerance below is smaller than the distance to
 * the nearest plausible WRONG method, which is noted in each explanation.
 */
export const ch8Questions: Question[] = [
  M(
    8,
    "A manager suspects the mean wait time, which has historically been 9 minutes, has INCREASED. State the hypotheses.",
    [
      "$H_0: \\mu = 9$ and $H_1: \\mu > 9$",
      "$H_0: \\mu = 9$ and $H_1: \\mu < 9$",
      "$H_0: \\mu = 9$ and $H_1: \\mu \\neq 9$",
      "$H_0: \\mu > 9$ and $H_1: \\mu = 9$",
    ],
    0,
    "\"Increased\" points one direction, upward, so H1 uses the > sign. The last option puts the equality in H1, which is never allowed."
  ),
  M(
    8,
    "Which hypothesis ALWAYS contains the equality?",
    [
      "The null hypothesis $H_0$",
      "The alternative hypothesis $H_1$",
      "Whichever one holds the claim",
      "Neither, on a two-tailed test",
    ],
    0,
    "H0 always carries the equal sign. The claim can sit in either hypothesis, but that never moves the equality out of H0."
  ),
  M(
    8,
    "A researcher wants to test whether the mean weight DIFFERS FROM 26.5 pounds. This calls for a...",
    ["Two-tailed test", "Left-tailed test", "Right-tailed test", "One-tailed test, direction unknown"],
    0,
    "\"Differs from\" gives H1: mu is not equal to 26.5, which puts a critical region in BOTH tails."
  ),
  M(
    8,
    "For $H_1: \\mu < 100$, where is the critical region?",
    ["Entirely in the left tail", "Entirely in the right tail", "Split evenly between both tails", "There is no critical region"],
    0,
    "The critical region always goes on the side the inequality in H1 points to. The < sign points left, so the whole of alpha sits in the left tail."
  ),
  M(
    8,
    "Under the P-value method, when do you reject $H_0$?",
    [
      "When the P-value is less than or equal to $\\alpha$",
      "When the P-value is greater than $\\alpha$",
      "When the P-value is greater than $0.5$",
      "When the P-value equals the test value",
    ],
    0,
    "A small P-value means the sample would be unlikely if H0 were true, so a small P-value is evidence against H0. P less than or equal to alpha means reject."
  ),
  M(
    8,
    "A researcher CLAIMS the mean is greater than 55, so the claim is in $H_1$. The test value falls in the critical region. Which summary is correct?",
    [
      "The null hypothesis is rejected. There is enough evidence to support the claim that the mean is greater than 55.",
      "The null hypothesis is rejected. There is not enough evidence to support the claim that the mean is greater than 55.",
      "The null hypothesis is accepted. There is enough evidence to support the claim that the mean is greater than 55.",
      "The null hypothesis is not rejected. There is enough evidence to reject the claim that the mean is greater than 55.",
    ],
    0,
    "In the critical region means reject H0. The claim is in H1, so rejecting H0 SUPPORTS the claim. Note that we never say the null is accepted."
  ),
  M(
    8,
    "A textbook CLAIMS the mean is equal to 163, so the claim is in $H_0$. The P-value is 0.090 and $\\alpha = 0.05$. Which summary is correct?",
    [
      "The null hypothesis is not rejected. There is not enough evidence to reject the claim that the mean is equal to 163.",
      "The null hypothesis is not rejected. There is enough evidence to support the claim that the mean is equal to 163.",
      "The null hypothesis is rejected. There is enough evidence to reject the claim that the mean is equal to 163.",
      "The null hypothesis is not rejected, which proves the mean is 163.",
    ],
    0,
    "P = 0.090 is greater than alpha = 0.05, so do not reject H0. The claim is in H0, so the wording is \"not enough evidence to REJECT the claim\". Failing to reject never proves anything."
  ),
  U(
    8,
    "Find the critical value for a RIGHT-tailed z test with $\\alpha = 0.01$ (Table E, 2 decimals).",
    2.33,
    0.02,
    "Put all 0.01 in the right tail, so look up an area of 0.9900 in Table E. The closest area is 0.9901 at z = 2.33. The nearest wrong answers are 2.58 (that is the two-tailed value) and 1.65, both far outside the tolerance."
  ),
  U(
    8,
    "Find the POSITIVE critical value for a TWO-tailed z test with $\\alpha = 0.05$ (Table E, 2 decimals).",
    1.96,
    0.02,
    "Split alpha: 0.05/2 = 0.025 per tail, so look up an area of 0.9750. Table E gives exactly 0.9750 at z = 1.96. The nearest wrong answer is 1.65, the one-tailed value, which is 0.31 away."
  ),
  U(
    8,
    "Find the POSITIVE critical value for a TWO-tailed z test with $\\alpha = 0.03$ (Table E, 2 decimals).",
    2.17,
    0.02,
    "0.03/2 = 0.015 per tail, so look up an area of 0.0150 in the left half of Table E. That area sits at z = -2.17, so the pair is plus or minus 2.17. The one-tailed value for alpha = 0.03 would be 1.88, which is 0.29 away."
  ),
  U(
    8,
    "The mean number of followers is claimed to be 422 with $\\sigma = 50.5$. A sample of $n = 65$ has $\\bar{X} = 440$. Compute the z test value (2 decimals).",
    2.87,
    0.02,
    "z = (440 - 422) / (50.5 / sqrt(65)) = 18 / 6.2638 = 2.87. Dividing by sigma alone instead of the standard error gives 0.36, which the tolerance excludes."
  ),
  U(
    8,
    "A TWO-tailed z test gives a test value of $z = 1.17$. Find the P-value using Table E (4 decimals).",
    0.242,
    0.002,
    "Table E gives 0.8790 to the left of 1.17, so one tail holds 1 - 0.8790 = 0.1210. A two-tailed test needs BOTH tails, so P = 2(0.1210) = 0.2420. Forgetting to double leaves 0.1210, which is 0.121 away."
  ),
  U(
    8,
    "Find the POSITIVE critical value for a TWO-tailed t test with $\\alpha = 0.05$ and $n = 16$ (Table F, 3 decimals).",
    2.131,
    0.005,
    "d.f. = n - 1 = 15. In Table F, the d.f. 15 row under 'Two tails, alpha = 0.05' gives 2.131. Using d.f. = 16 by mistake gives 2.120, and using the one-tail column gives 1.753."
  ),
  U(
    8,
    "A process historically averages 75 minutes. A sample of $n = 14$ has $\\bar{X} = 72$ and $s = 9$. Compute the t test value (3 decimals).",
    -1.247,
    0.02,
    "sigma is unknown, so use t = (72 - 75) / (9 / sqrt(14)) = -3 / 2.4054 = -1.247. Dividing by s alone gives -0.333, and dropping the minus sign gives +1.247; both are excluded."
  ),
];

/* ============================================================== flashcards */

const F = (id: string, ch: number, front: string, back: string, why: string): Flashcard => ({
  id,
  ch,
  front,
  back,
  why,
});

export const ch8Flashcards: Flashcard[] = [
  F(
    "c8-1",
    8,
    "Null hypothesis $H_0$",
    "The currently accepted value. It ALWAYS contains the equality.",
    "If you wrote an $H_0$ without an equal sign, you already lost the point."
  ),
  F(
    "c8-2",
    8,
    "Alternative hypothesis $H_1$",
    "The research hypothesis, the mathematical opposite of $H_0$: $<$, $>$, or $\\neq$",
    "It never contains an equal sign, and it is what decides which tail you use."
  ),
  F(
    "c8-3",
    8,
    "Which tail does the wording want?",
    "\"differs from\", \"is not\" $\\rightarrow$ two-tailed. \"less than\", \"decreased\" $\\rightarrow$ left. \"greater than\", \"increased\" $\\rightarrow$ right.",
    "Read the sentence twice before writing anything. This is the single most common place to lose the whole problem."
  ),
  F(
    "c8-4",
    8,
    "The five steps",
    "1. Hypotheses and claim, 2. critical value(s) OR test value, 3. test value OR P-value, 4. decision, 5. summarize",
    "The two methods differ only in steps 2 and 3. Step 5 is a full sentence and is never optional."
  ),
  F(
    "c8-5",
    8,
    "P-value decision rule",
    "If $P \\le \\alpha$, reject $H_0$. If $P > \\alpha$, do not reject $H_0$.",
    "A small P-value means the data would be surprising if $H_0$ were true."
  ),
  F(
    "c8-6",
    8,
    "Type I error",
    "Rejecting $H_0$ when $H_0$ is actually TRUE",
    "Its probability is exactly $\\alpha$, chosen by the researcher before any data is collected."
  ),
  F(
    "c8-7",
    8,
    "Type II error",
    "NOT rejecting $H_0$ when $H_1$ is actually true",
    "Its probability is $\\beta$. As $\\alpha$ goes up, $\\beta$ goes down, and the other way round."
  ),
  F(
    "c8-8",
    8,
    "Level of significance",
    "$\\alpha = 1 - C$, so $C = 95\\%$ gives $\\alpha = 0.05$",
    "It is the size of the critical region, split in half when the test is two-tailed."
  ),
  F(
    "c8-9",
    8,
    "z test for a mean",
    "$z = \\dfrac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}}$, used when $\\sigma$ is KNOWN and $n \\ge 30$ or the population is normal",
    "It is Chapter 6's sample-mean z-score with the hypothesized $\\mu$ in the numerator."
  ),
  F(
    "c8-10",
    8,
    "Common critical z values (Table E)",
    "One-tailed: $1.28$, $1.65$, $2.33$ for $\\alpha = 0.10$, $0.05$, $0.01$. Two-tailed: $\\pm 1.65$, $\\pm 1.96$, $\\pm 2.58$.",
    "Memorize the six. Reading Table E under time pressure is where the arithmetic errors come from."
  ),
  F(
    "c8-11",
    8,
    "t test for a mean",
    "$t = \\dfrac{\\bar{X} - \\mu}{s / \\sqrt{n}}$ with $\\text{d.f.} = n - 1$, used when $\\sigma$ is UNKNOWN",
    "In Table F, if your $\\text{d.f.}$ is not printed, drop to the next SMALLER $\\text{d.f.}$ row."
  ),
  F(
    "c8-12",
    8,
    "How to word the conclusion",
    "Claim in $H_1$: reject $\\rightarrow$ \"enough evidence to SUPPORT the claim\". Claim in $H_0$: reject $\\rightarrow$ \"enough evidence to REJECT the claim\".",
    "We never \"accept\" $H_0$. Like a jury, we say not guilty, never innocent."
  ),
];

/* ======================================================== guided examples */

const S = (
  ask: string,
  kind: "numeric" | "choice",
  answer: number,
  hint: string,
  why: string,
  extra?: { choices?: string[]; tol?: number }
): GuidedStep => ({ ask, kind, answer, hint, why, ...extra });

export const ch8Guided: GuidedExample[] = [
  {
    sectionId: "8.1",
    title: "Setting up a test without computing anything",
    scenario:
      "An old medical textbook states that the mean sodium level for healthy adults is 142 mEq per liter of blood. A medical researcher believes that, because of modern dietary habits, the mean sodium level for healthy adults now DIFFERS from the value in the textbook. She plans to test this at the 0.05 level of significance. No numbers are needed for any step below. Slow down and read the scenario twice before each answer.",
    steps: [
      S(
        "Write the null hypothesis. Which of these is $H_0$?",
        "choice",
        1,
        "The null hypothesis is the value currently accepted, and it always carries the equality.",
        "$H_0: \\mu = 142$. The textbook's 142 is the currently accepted value, and $H_0$ always contains the equal sign. Options with $<$, $>$, or $\\neq$ can never be $H_0$.",
        { choices: ["$H_0: \\mu \\neq 142$", "$H_0: \\mu = 142$", "$H_0: \\mu > 142$", "$H_0: \\mu < 142$"] }
      ),
      S(
        "Now write the alternative hypothesis. Which of these is $H_1$?",
        "choice",
        2,
        "Find the exact word in the scenario that says what the researcher believes, then translate only that word.",
        "$H_1: \\mu \\neq 142$. The word in the scenario is \"differs\", which translates to \"not equal to\". It does not say higher and it does not say lower, so neither $<$ nor $>$ is defensible here.",
        { choices: ["$H_1: \\mu = 142$", "$H_1: \\mu > 142$", "$H_1: \\mu \\neq 142$", "$H_1: \\mu < 142$"] }
      ),
      S(
        "Which hypothesis holds the CLAIM being tested?",
        "choice",
        1,
        "The claim is what the researcher set out to show, not what the textbook already says.",
        "The claim is in $H_1$. The researcher's belief is that the mean differs, and that is $H_1$. This matters only at the very end: because the claim is in $H_1$, rejecting $H_0$ would let you say \"enough evidence to SUPPORT the claim\".",
        { choices: ["$H_0$", "$H_1$", "Both of them", "Neither of them"] }
      ),
      S(
        "Is this a one-tailed or a two-tailed test, and where is the critical region?",
        "choice",
        2,
        "Look at the sign in $H_1$ and ask which direction it points.",
        "Two-tailed, with the critical region SPLIT between both tails. The $\\neq$ sign does not point anywhere, so the 0.05 gets divided into 0.025 in each tail. That halving is the step people forget, and it is why the critical values here would be $\\pm 1.96$ rather than $1.65$.",
        {
          choices: [
            "One-tailed, critical region in the left tail",
            "One-tailed, critical region in the right tail",
            "Two-tailed, critical region split between both tails",
            "Two-tailed, critical region in the right tail only",
          ],
        }
      ),
      S(
        "Suppose she rejects $H_0$, but the textbook's 142 was correct all along. What error is that?",
        "choice",
        0,
        "Line up the decision she made against the reality, then read the definition.",
        "A Type I error: rejecting $H_0$ when $H_0$ is true. Its probability is exactly $\\alpha$, which here is 0.05. A Type II error is the other mistake, failing to reject $H_0$ when $H_1$ is really true.",
        { choices: ["Type I error", "Type II error", "No error at all", "Both errors at once"] }
      ),
      S(
        "Final step. Suppose the test value lands in the critical region. Choose the correct summary sentence.",
        "choice",
        1,
        "Two decisions to get right: reject or do not reject, and then support or reject the claim.",
        "In the critical region means reject $H_0$, and the claim was in $H_1$, so the correct wording is: \"Since the test value falls in the critical region, the null hypothesis is rejected. So, there is enough evidence to support the claim that the mean adult sodium level differs from 142 mEq per liter.\" Notice that we never write \"accept $H_0$\", and we never say the result proves anything.",
        {
          choices: [
            "The null hypothesis is not rejected. There is not enough evidence to support the claim.",
            "The null hypothesis is rejected. There is enough evidence to support the claim that the mean sodium level differs from 142.",
            "The null hypothesis is accepted. There is enough evidence to reject the claim.",
            "The null hypothesis is rejected. There is enough evidence to reject the claim that the mean sodium level differs from 142.",
          ],
        }
      ),
    ],
    takeaway:
      "Nothing in this example needed a calculator, and it is still worth most of the marks on a worksheet problem. Write $H_0$ with the equality, translate the one direction word into $H_1$, note which hypothesis carries the claim, and only then start computing.",
  },

  {
    sectionId: "8.2",
    title: "z test worked both ways, critical value and P-value",
    scenario:
      "Some people believe that the average number of followers is 422. The population standard deviation is 50.5. A random sample of 65 high school students revealed an average of 440 followers. At $\\alpha = 0.01$, is there sufficient evidence to conclude that the mean number of followers is GREATER than 422? Since $\\sigma$ is known and $n = 65$, this is a z test.",
    steps: [
      S(
        "Step 1. State the hypotheses. Which pair is right, and what kind of test is it?",
        "choice",
        0,
        "The question asks about \"greater than\", which is a one-directional word.",
        "$H_0: \\mu = 422$ and $H_1: \\mu > 422$, a right-tailed test. The claim sits in $H_1$, so remember that for the last step. The pair with $\\neq$ would give you the wrong critical value and probably the wrong decision.",
        {
          choices: [
            "$H_0: \\mu = 422$, $H_1: \\mu > 422$, right-tailed",
            "$H_0: \\mu = 422$, $H_1: \\mu < 422$, left-tailed",
            "$H_0: \\mu = 422$, $H_1: \\mu \\neq 422$, two-tailed",
            "$H_0: \\mu > 422$, $H_1: \\mu = 422$, right-tailed",
          ],
        }
      ),
      S(
        "Step 2. Find the critical value from Table E (2 decimals). Enter it as a positive number.",
        "numeric",
        2.33,
        "All of $\\alpha = 0.01$ goes in the right tail, so look up an area of $0.9900$ in the body of Table E.",
        "2.33. The closest area in Table E to 0.9900 is 0.9901, which sits at $z = 2.33$. Do NOT split alpha here: this test is one-tailed, so 2.58 would be wrong.",
        { tol: 0.02 }
      ),
      S(
        "Step 3. Compute the test value (2 decimals).",
        "numeric",
        2.87,
        "$z = \\dfrac{\\bar{X} - \\mu}{\\sigma / \\sqrt{n}}$. Compute the denominator completely before you divide.",
        "$z = \\dfrac{440 - 422}{50.5 / \\sqrt{65}} = \\dfrac{18}{6.2638} = 2.87$. Dividing 18 by 50.5 instead of by the standard error gives 0.36, which would flip the decision.",
        { tol: 0.02 }
      ),
      S(
        "Step 4. Make the decision. What do you do with $H_0$?",
        "choice",
        0,
        "Compare 2.87 against the critical value 2.33. Which side of it does the test value fall on?",
        "Reject $H_0$. The test value 2.87 is bigger than the critical value 2.33, so it lies inside the right-tail critical region. Note that this is a comparison, not a computation, and it is the step people skip past on the way to writing an answer.",
        { choices: ["Reject $H_0$", "Do not reject $H_0$", "Accept $H_0$", "Reject $H_1$"] }
      ),
      S(
        "Now do the same problem the P-value way. Using the rounded test value $z = 2.87$, find the P-value (4 decimals).",
        "numeric",
        0.0021,
        "Right-tailed, so the P-value is the area to the RIGHT of 2.87. Table E gives areas to the left.",
        "Table E gives 0.9979 to the left of 2.87, so $P = 1 - 0.9979 = 0.0021$. Since $0.0021 \\le 0.01$, the P-value method rejects $H_0$ too. The two methods always agree; do not double this one, because the test is one-tailed.",
        { tol: 0.0004 }
      ),
      S(
        "Step 5, the one that gets dropped. Choose the correct summary sentence.",
        "choice",
        0,
        "You rejected $H_0$, and the claim was in $H_1$. So did the evidence support the claim or reject it?",
        "\"Since the test value falls in the critical region, the null hypothesis is rejected. So, there is enough evidence to support the claim that the mean number of followers is greater than 422.\" The claim was in $H_1$, so rejecting $H_0$ supports it. Writing \"reject the claim\" here would be backwards, and writing \"accept $H_0$\" is never allowed.",
        {
          choices: [
            "The null hypothesis is rejected. There is enough evidence to support the claim that the mean number of followers is greater than 422.",
            "The null hypothesis is rejected. There is enough evidence to reject the claim that the mean number of followers is greater than 422.",
            "The null hypothesis is not rejected. There is not enough evidence to support the claim that the mean number of followers is greater than 422.",
            "The null hypothesis is accepted. The mean number of followers is proven to be 422.",
          ],
        }
      ),
    ],
    takeaway:
      "One problem, two finishes. The traditional method compares 2.87 against 2.33; the P-value method compares 0.0021 against 0.01. They can never disagree. Whichever one the worksheet asks for, the last thing you write is always a full sentence naming the decision AND the claim.",
  },

  {
    sectionId: "8.3",
    title: "t test when sigma is unknown",
    scenario:
      "The U.S. Bureau of Labor Statistics reported that a person between the ages of 18 and 34 has had an average of 10.1 jobs. A researcher sampled 8 workers in that age range and asked how many different places they had worked. The results were 9, 11, 13, 2, 7, 9, 10, 4, giving $\\bar{X} = 8.125$ and $s = 3.643$. At $\\alpha = 0.10$, can it be concluded that the mean IS 10.1? The population standard deviation is not given, so this is a t test.",
    steps: [
      S(
        "Step 1. State the hypotheses. Which pair is right, and what kind of test is it?",
        "choice",
        2,
        "The question asks whether the mean IS 10.1. The opposite of \"is\" is \"is not\", which points in no particular direction.",
        "$H_0: \\mu = 10.1$ and $H_1: \\mu \\neq 10.1$, a two-tailed test. Here the CLAIM is the reported value 10.1, so the claim is in $H_0$ this time. That flips the wording of the last step from \"support\" to \"reject\", which is why identifying the claim is its own step.",
        {
          choices: [
            "$H_0: \\mu = 10.1$, $H_1: \\mu > 10.1$, right-tailed",
            "$H_0: \\mu = 10.1$, $H_1: \\mu < 10.1$, left-tailed",
            "$H_0: \\mu = 10.1$, $H_1: \\mu \\neq 10.1$, two-tailed",
            "$H_0: \\mu \\neq 10.1$, $H_1: \\mu = 10.1$, two-tailed",
          ],
        }
      ),
      S(
        "Step 2a. Find the degrees of freedom.",
        "numeric",
        7,
        "$\\text{d.f.} = n - 1$, and there are 8 workers in the sample.",
        "$\\text{d.f.} = 8 - 1 = 7$. Using 8 by mistake would send you to the wrong row of Table F and give 1.860 instead of 1.895.",
        { tol: 0 }
      ),
      S(
        "Step 2b. Find the critical value from Table F (3 decimals). Enter it as a positive number.",
        "numeric",
        1.895,
        "Go to the $\\text{d.f.} = 7$ row, then use the 'Two tails' row of alphas to find the $0.10$ column.",
        "1.895, so the critical values are $\\pm 1.895$. If you had used the 'One tail' 0.10 column by mistake you would get 1.415, which is a completely different cutoff. Match the tail count to the correct row of the table header every single time.",
        { tol: 0.005 }
      ),
      S(
        "Step 3. Compute the test value (3 decimals). Keep the sign.",
        "numeric",
        -1.533,
        "$t = \\dfrac{\\bar{X} - \\mu}{s / \\sqrt{n}}$, with $\\bar{X} = 8.125$, $\\mu = 10.1$, $s = 3.643$, $n = 8$.",
        "$t = \\dfrac{8.125 - 10.1}{3.643 / \\sqrt{8}} = \\dfrac{-1.975}{1.288} = -1.533$. The negative sign is not optional; it says the sample mean landed BELOW the hypothesized mean. Dividing by 3.643 alone gives -0.542.",
        { tol: 0.02 }
      ),
      S(
        "Step 4. Make the decision.",
        "choice",
        1,
        "Is $-1.533$ beyond $-1.895$, or between $-1.895$ and $+1.895$?",
        "Do not reject $H_0$. On a two-tailed test the critical region is everything below $-1.895$ or above $+1.895$, and $-1.533$ sits between them, in the noncritical region. Compare magnitudes if that is easier: $1.533 < 1.895$.",
        { choices: ["Reject $H_0$", "Do not reject $H_0$", "Accept $H_0$", "Reject $H_1$"] }
      ),
      S(
        "Step 5. Choose the correct summary sentence.",
        "choice",
        1,
        "You did NOT reject, and this time the claim was in $H_0$, not $H_1$.",
        "\"Since the test value does not fall in the critical region, the null hypothesis is not rejected. So, there is not enough evidence to reject the claim that the mean number of jobs is 10.1.\" Because the claim lives in $H_0$ here, the verb is \"reject the claim\", not \"support the claim\". And failing to reject is not proof: it only means this sample did not give enough evidence.",
        {
          choices: [
            "The null hypothesis is rejected. There is enough evidence to reject the claim that the mean number of jobs is 10.1.",
            "The null hypothesis is not rejected. There is not enough evidence to reject the claim that the mean number of jobs is 10.1.",
            "The null hypothesis is not rejected. There is enough evidence to support the claim that the mean number of jobs is 10.1.",
            "The null hypothesis is accepted, which proves the mean number of jobs is 10.1.",
          ],
        }
      ),
    ],
    takeaway:
      "Same five steps as the z test. Only three things changed: $s$ replaced $\\sigma$, Table F replaced Table E, and you had to compute $\\text{d.f.} = n - 1$ first. The trap in this one is the last step, where the claim sits in $H_0$, so the sentence says \"not enough evidence to REJECT the claim\".",
  },
];

/* ============================================================== generators */

type Ctx = { what: string; unit: string; who: string };

const CTX: Ctx[] = [
  { what: "wait time", unit: "minutes", who: "customers at a restaurant chain" },
  { what: "lifetime", unit: "months", who: "light bulbs from one manufacturer" },
  { what: "sodium level", unit: "mEq per liter", who: "healthy adults" },
  { what: "completion time", unit: "minutes", who: "runs of a manufacturing process" },
  { what: "commute distance", unit: "miles", who: "employees at a logistics firm" },
  { what: "battery life", unit: "hours", who: "phones in a testing lab" },
  { what: "monthly bill", unit: "dollars", who: "households on one street" },
  { what: "repair cost", unit: "dollars", who: "cars at an auto shop" },
  { what: "prison term", unit: "years", who: "randomly selected sentences" },
  { what: "birth weight", unit: "pounds", who: "babies born at full term" },
];

const N = (
  topic: string,
  topicLabel: string,
  prompt: string,
  steps: string[],
  answer: number,
  tol: number
): PracticeProblem => ({ ch: 8, topic, topicLabel, prompt, steps, kind: "numeric", answer, tol });

const C = (
  topic: string,
  topicLabel: string,
  prompt: string,
  choices: string[],
  answer: number,
  steps: string[]
): PracticeProblem => ({ ch: 8, topic, topicLabel, prompt, steps, kind: "choice", answer, tol: 0, choices });

/** Phrasings that force a particular tail. */
const WORDINGS: { phrase: string; sign: string; tail: "left" | "right" | "two" }[] = [
  { phrase: "has increased", sign: ">", tail: "right" },
  { phrase: "is greater than", sign: ">", tail: "right" },
  { phrase: "is now more than", sign: ">", tail: "right" },
  { phrase: "has decreased", sign: "<", tail: "left" },
  { phrase: "is less than", sign: "<", tail: "left" },
  { phrase: "is now smaller than", sign: "<", tail: "left" },
  { phrase: "differs from", sign: "\\neq", tail: "two" },
  { phrase: "is not equal to", sign: "\\neq", tail: "two" },
  { phrase: "is different from", sign: "\\neq", tail: "two" },
];

/**
 * Eight generators, four of which never ask for a number.
 *
 * Chapter 8 punishes form errors far harder than arithmetic errors, so the
 * generators that drill hypothesis setup, tail identification and conclusion
 * wording carry the same weight as the ones that drill the formulas.
 */
export const ch8Generators: Record<string, () => PracticeProblem> = {
  "hyp-setup": () => {
    const c = pick(CTX);
    const k = randInt(5, 90);
    const w = pick(WORDINGS);
    const correct = w.sign === ">" ? 0 : w.sign === "<" ? 1 : 2;
    return C(
      "hyp-setup",
      "Stating H0 and H1",
      `The mean ${c.what} for ${c.who} has historically been ${k} ${c.unit}. A researcher believes the mean ${c.what} ${w.phrase} ${k} ${c.unit}. State the hypotheses.`,
      [
        `$H_0: \\mu = ${k}$ and $H_1: \\mu > ${k}$`,
        `$H_0: \\mu = ${k}$ and $H_1: \\mu < ${k}$`,
        `$H_0: \\mu = ${k}$ and $H_1: \\mu \\neq ${k}$`,
        `$H_0: \\mu \\neq ${k}$ and $H_1: \\mu = ${k}$`,
      ],
      correct,
      [
        `The phrase to translate is "${w.phrase}", which becomes $${w.sign}$ in $H_1$.`,
        `$H_0$ always carries the equality, so $H_0: \\mu = ${k}$ and $H_1: \\mu ${w.sign} ${k}$.`,
        `The fourth option is always wrong no matter what the wording says, because it puts the equal sign in $H_1$.`,
      ]
    );
  },

  "tail-id": () => {
    const k = randInt(5, 90);
    const w = pick(WORDINGS);
    const correct = w.tail === "left" ? 0 : w.tail === "right" ? 1 : 2;
    return C(
      "tail-id",
      "Which Tail?",
      `A test uses $H_1: \\mu ${w.sign} ${k}$. Identify the type of test and where the critical region goes.`,
      [
        "Left-tailed, with the entire critical region in the left tail",
        "Right-tailed, with the entire critical region in the right tail",
        "Two-tailed, with the critical region split evenly between both tails",
      ],
      correct,
      [
        `The sign in $H_1$ is $${w.sign}$.`,
        w.tail === "two"
          ? `A $\\neq$ points in no direction, so $\\alpha$ is split into $\\alpha/2$ in each tail.`
          : `The inequality points ${w.tail}, so all of $\\alpha$ sits in the ${w.tail} tail.`,
        `The critical region always goes on the side the inequality in $H_1$ points to.`,
      ]
    );
  },

  "z-critical": () => {
    const alpha = pick([0.01, 0.02, 0.05, 0.1]);
    const tails = pick([1, 2]) as 1 | 2;
    const cv = zCritical(alpha, tails);
    const label = tails === 1 ? pick(["left-tailed", "right-tailed"]) : "two-tailed";
    const area = tails === 1 ? 1 - alpha : 1 - alpha / 2;
    return N(
      "z-critical",
      "Critical z Value",
      `Find the POSITIVE critical value for a ${label} z test with $\\alpha = ${alpha}$. Use Table E and round to 2 decimals.`,
      [
        tails === 1
          ? `One-tailed, so all of $\\alpha = ${alpha}$ goes in one tail.`
          : `Two-tailed, so split it: $\\alpha/2 = ${round(alpha / 2, 4)}$ in each tail.`,
        `Look up an area of $${round(area, 4)}$ in the body of Table E.`,
        `The closest entry gives $z = ${cv}$${tails === 2 ? `, so the pair is $\\pm ${cv}$` : ""}.`,
      ],
      cv,
      0.02
    );
  },

  "z-testvalue": () => {
    const c = pick(CTX);
    const mu = randInt(20, 90);
    const sigma = pick([2.1, 3.3, 4.1, 5.5, 8, 9.1, 12, 14]);
    const n = pick([31, 36, 40, 44, 50, 60, 65, 70]);
    const shift = pick([-3, -2, -1.5, 1.4, 2, 3]);
    const xbar = round(mu + shift, 2);
    const se = sigma / Math.sqrt(n);
    const z = round((xbar - mu) / se, 2);
    return N(
      "z-testvalue",
      "z Test Value",
      `The mean ${c.what} for ${c.who} is claimed to be ${mu} ${c.unit}, with $\\sigma = ${sigma}$. A sample of $n = ${n}$ gives $\\bar{X} = ${xbar}$. Compute the z test value, to 2 decimals.`,
      [
        `$\\sigma$ is known and $n \\ge 30$, so this is a z test.`,
        `Standard error $= \\dfrac{${sigma}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$z = \\dfrac{${xbar} - ${mu}}{${round(se, 4)}} = ${z}$`,
        `Dividing by $\\sigma$ alone instead of the standard error is the usual error here.`,
      ],
      z,
      0.02
    );
  },

  "z-pvalue": () => {
    const tail = pick(["left", "right", "two"] as const);
    const mag = round(randInt(40, 290) / 100, 2);
    const z = tail === "left" ? -mag : mag;
    const p = zPValue(z, tail);
    const areaLeft = round(normalCDF(z), 4);
    const areaMag = round(normalCDF(mag), 4);
    const oneTail = round(1 - areaMag, 4);
    const steps =
      tail === "two"
        ? [
            `Table E gives an area of $${areaMag}$ to the left of $${mag}$.`,
            `One tail beyond $|z| = ${mag}$ holds $1 - ${areaMag} = ${oneTail}$.`,
            `The test is two-tailed, so DOUBLE it: $P = 2(${oneTail}) = ${p}$.`,
          ]
        : tail === "right"
          ? [
              `Table E gives an area of $${areaLeft}$ to the left of $${z}$.`,
              `Right-tailed, so $P = 1 - ${areaLeft} = ${p}$.`,
              `Do NOT double this one; only a two-tailed test doubles.`,
            ]
          : [
              `Left-tailed, so the P-value IS the area to the left of $${z}$.`,
              `Table E gives $P = ${p}$ directly, with no subtraction needed.`,
            ];
    return N(
      "z-pvalue",
      "P-value from z",
      `A ${tail === "two" ? "two-tailed" : tail + "-tailed"} z test gives a test value of $z = ${z}$. Find the P-value using Table E, to 4 decimals.`,
      steps,
      p,
      Math.max(0.00025, round(p * 0.08, 5))
    );
  },

  "t-critical": () => {
    const alpha = pick([0.01, 0.02, 0.05, 0.1]);
    const tails = pick([1, 2]) as 1 | 2;
    const n = randInt(5, 16);
    const df = n - 1;
    const cv = tCritical(alpha, df, tails);
    const label = tails === 1 ? pick(["left-tailed", "right-tailed"]) : "two-tailed";
    return N(
      "t-critical",
      "Critical t Value",
      `Find the POSITIVE critical value for a ${label} t test with $\\alpha = ${alpha}$ and $n = ${n}$. Use Table F and round to 3 decimals.`,
      [
        `$\\text{d.f.} = n - 1 = ${n} - 1 = ${df}$`,
        `Go to the $\\text{d.f.} = ${df}$ row, then use the '${tails === 1 ? "One tail" : "Two tails"}' header row to find the $${alpha}$ column.`,
        `Table F gives $${cv}$${tails === 2 ? `, so the pair is $\\pm ${cv}$` : ""}.`,
        `Using $\\text{d.f.} = ${n}$ or the wrong header row are the two ways to miss this.`,
      ],
      cv,
      0.003
    );
  },

  "t-testvalue": () => {
    const c = pick(CTX);
    const mu = randInt(20, 90);
    const s = pick([2.4, 3.1, 4.5, 6, 7.5, 9, 12]);
    const n = randInt(6, 25);
    const shift = pick([-4, -3, -2, 2, 3, 4]);
    const xbar = round(mu + shift, 2);
    const se = s / Math.sqrt(n);
    const t = round((xbar - mu) / se, 3);
    return N(
      "t-testvalue",
      "t Test Value",
      `The mean ${c.what} for ${c.who} is claimed to be ${mu} ${c.unit}. A sample of $n = ${n}$ gives $\\bar{X} = ${xbar}$ and $s = ${s}$. The population standard deviation is unknown. Compute the test value, to 3 decimals.`,
      [
        `$\\sigma$ is unknown, so use $t$, not $z$, with $\\text{d.f.} = ${n - 1}$.`,
        `$\\dfrac{s}{\\sqrt{n}} = \\dfrac{${s}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$t = \\dfrac{${xbar} - ${mu}}{${round(se, 4)}} = ${t}$`,
        `Keep the sign. It tells you which side of the hypothesized mean the sample landed on.`,
      ],
      t,
      0.02
    );
  },

  conclusion: () => {
    const c = pick(CTX);
    const k = randInt(5, 90);
    const w = pick(WORDINGS);
    const claimInH1 = pick([true, false]);
    const reject = pick([true, false]);
    const claimText = claimInH1
      ? `the mean ${c.what} ${w.phrase} ${k} ${c.unit}`
      : `the mean ${c.what} is ${k} ${c.unit}`;
    const verb = claimInH1 ? "support" : "reject";
    const otherVerb = claimInH1 ? "reject" : "support";
    const correct = reject
      ? `The null hypothesis is rejected. There is enough evidence to ${verb} the claim that ${claimText}.`
      : `The null hypothesis is not rejected. There is not enough evidence to ${verb} the claim that ${claimText}.`;
    // Shuffled, because the practice page renders `choices` in the order it is
    // given. Without this the correct sentence would sit at index 0 every
    // single time, and the student would learn the position instead of the
    // rule, which is the exact failure mode this generator exists to fix.
    const options = shuffle([
      correct,
      reject
        ? `The null hypothesis is rejected. There is enough evidence to ${otherVerb} the claim that ${claimText}.`
        : `The null hypothesis is not rejected. There is not enough evidence to ${otherVerb} the claim that ${claimText}.`,
      reject
        ? `The null hypothesis is not rejected. There is not enough evidence to ${verb} the claim that ${claimText}.`
        : `The null hypothesis is rejected. There is enough evidence to ${verb} the claim that ${claimText}.`,
      `The null hypothesis is accepted, which proves that ${claimText}.`,
    ]);
    return C(
      "conclusion",
      "Wording the Conclusion",
      `A researcher tests the claim that ${claimText}. The claim is in $H_${claimInH1 ? "1" : "0"}$. The test value ${reject ? "falls inside" : "does not fall inside"} the critical region. Write the summary.`,
      options,
      options.indexOf(correct),
      [
        `${reject ? "Inside" : "Outside"} the critical region means ${reject ? "REJECT" : "DO NOT REJECT"} $H_0$.`,
        `The claim is in $H_${claimInH1 ? "1" : "0"}$, so the verb is "${verb} the claim".`,
        `The last option is never correct: we never accept $H_0$ and a test never proves anything.`,
      ]
    );
  },
};

export const ch8Topics: { key: string; label: string }[] = [
  { key: "hyp-setup", label: "Stating H0 and H1" },
  { key: "tail-id", label: "Which Tail?" },
  { key: "z-critical", label: "Critical z Value" },
  { key: "z-testvalue", label: "z Test Value" },
  { key: "z-pvalue", label: "P-value from z" },
  { key: "t-critical", label: "Critical t Value" },
  { key: "t-testvalue", label: "t Test Value" },
  { key: "conclusion", label: "Wording the Conclusion" },
];

/** Mirrors `generateProblem` in practiceGenerators.ts, scoped to Chapter 8. */
export function generateCh8Problem(topicKey?: string): PracticeProblem {
  const key = topicKey && ch8Generators[topicKey] ? topicKey : pick(ch8Topics).key;
  return ch8Generators[key]();
}
