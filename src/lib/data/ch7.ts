/**
 * Chapter 7: Confidence Intervals and Sample Size.
 *
 * Scope comes from the instructor's own deck ("Chapter 7 Confidence Intervals
 * and Sample Size.pptx") and the course calendar, which lists three days:
 *   7.1 Confidence Intervals and Sample Size
 *   7.2 Confidence Interval for the Mean (sigma known, z)
 *   7.3 Confidence Interval for the Mean (sigma unknown, t)
 * The deck stops at the t interval. It contains no proportion material, so
 * section 7.4 is deliberately absent here even though Worksheet 7 problems 7
 * through 9 ask about proportions.
 *
 * TABLE CONVENTIONS, not calculus. Everything the student is graded on has to
 * match the packet he is handed on test day:
 *   Table E is read to two decimals, so z is 1.28, 1.65, 1.96, 2.33, 2.58 for
 *   80, 90, 95, 98, 99 percent. The deck says this outright on the slide that
 *   shows the 99 percent and 90 percent lookups.
 *   Table F lists only 47 degrees-of-freedom rows and only five confidence
 *   columns. When the df you need is missing, Bluman's rule is to drop to the
 *   next SMALLER listed df, which is what tCriticalTableF does below.
 *
 * The Table F values are transcribed from the packet itself rather than
 * computed, because the table is the artifact being tested. `tInv` and `tCDF`
 * are imported from "@/lib/math" and used for the tail-area drills, which are
 * the ALEKS-style problems in the deck (Examples 4 through 6) where the df and
 * the area are both arbitrary and no table row exists.
 *
 * Every numeric answer below was recomputed by an independent script, and every
 * tolerance is smaller than the distance to the nearest WRONG method: using z
 * where t belongs, using n instead of n - 1 for df, skipping the square root,
 * or reporting the standard error without multiplying by the critical value.
 */

import type { Lesson } from "@/lib/data/lessons";
import type { Question } from "@/lib/data/testBank";
import type { Flashcard } from "@/lib/data/flashcards";
import type { GuidedExample, GuidedStep } from "@/lib/data/guidedExamples";
import type { PracticeProblem } from "@/lib/practiceGenerators";
import { round, pick, randInt, normalCDF, normalInv, tInv, tCDF } from "@/lib/math";

/* ------------------------------------------------------------------ tables */

/** Table E critical values for a TWO-tailed confidence interval, as the textbook rounds them. */
export const Z_TABLE_E: Record<number, number> = {
  80: 1.28,
  90: 1.65,
  95: 1.96,
  98: 2.33,
  99: 2.58,
};

/**
 * The z that cuts off alpha (not alpha/2) in ONE tail.
 *
 * Never a correct answer in this chapter. It exists only so a generator can
 * measure how far the right answer sits from the single most common mistake
 * this student makes, which is splitting the wrong area into the wrong tail.
 */
const Z_ONE_TAIL: Record<number, number> = {
  80: 0.84,
  90: 1.28,
  95: 1.65,
  98: 2.05,
  99: 2.33,
};

/** The five confidence columns Table F actually prints, in order. */
const TABLE_F_CONF = [80, 90, 95, 98, 99];

/**
 * Table F, transcribed from the Formulas and Tables packet.
 *
 * Note what is NOT here: 31, 33, 41 through 44, 47, everything between 100 and
 * 500. That is the whole point of the next-smaller-df rule.
 */
const TABLE_F: Record<number, number[]> = {
  1: [3.078, 6.314, 12.706, 31.821, 63.657],
  2: [1.886, 2.92, 4.303, 6.965, 9.925],
  3: [1.638, 2.353, 3.182, 4.541, 5.841],
  4: [1.533, 2.132, 2.776, 3.747, 4.604],
  5: [1.476, 2.015, 2.571, 3.365, 4.032],
  6: [1.44, 1.943, 2.447, 3.143, 3.707],
  7: [1.415, 1.895, 2.365, 2.998, 3.499],
  8: [1.397, 1.86, 2.306, 2.896, 3.355],
  9: [1.383, 1.833, 2.262, 2.821, 3.25],
  10: [1.372, 1.812, 2.228, 2.764, 3.169],
  11: [1.363, 1.796, 2.201, 2.718, 3.106],
  12: [1.356, 1.782, 2.179, 2.681, 3.055],
  13: [1.35, 1.771, 2.16, 2.65, 3.012],
  14: [1.345, 1.761, 2.145, 2.624, 2.977],
  15: [1.341, 1.753, 2.131, 2.602, 2.947],
  16: [1.337, 1.746, 2.12, 2.583, 2.921],
  17: [1.333, 1.74, 2.11, 2.567, 2.898],
  18: [1.33, 1.734, 2.101, 2.552, 2.878],
  19: [1.328, 1.729, 2.093, 2.539, 2.861],
  20: [1.325, 1.725, 2.086, 2.528, 2.845],
  21: [1.323, 1.721, 2.08, 2.518, 2.831],
  22: [1.321, 1.717, 2.074, 2.508, 2.819],
  23: [1.319, 1.714, 2.069, 2.5, 2.807],
  24: [1.318, 1.711, 2.064, 2.492, 2.797],
  25: [1.316, 1.708, 2.06, 2.485, 2.787],
  26: [1.315, 1.706, 2.056, 2.479, 2.779],
  27: [1.314, 1.703, 2.052, 2.473, 2.771],
  28: [1.313, 1.701, 2.048, 2.467, 2.763],
  29: [1.311, 1.699, 2.045, 2.462, 2.756],
  30: [1.31, 1.697, 2.042, 2.457, 2.75],
  32: [1.309, 1.694, 2.037, 2.449, 2.738],
  34: [1.307, 1.691, 2.032, 2.441, 2.728],
  36: [1.306, 1.688, 2.028, 2.434, 2.719],
  38: [1.304, 1.686, 2.024, 2.429, 2.712],
  40: [1.303, 1.684, 2.021, 2.423, 2.704],
  45: [1.301, 1.679, 2.014, 2.412, 2.69],
  50: [1.299, 1.676, 2.009, 2.403, 2.678],
  55: [1.297, 1.673, 2.004, 2.396, 2.668],
  60: [1.296, 1.671, 2.0, 2.39, 2.66],
  65: [1.295, 1.669, 1.997, 2.385, 2.654],
  70: [1.294, 1.667, 1.994, 2.381, 2.648],
  75: [1.293, 1.665, 1.992, 2.377, 2.643],
  80: [1.292, 1.664, 1.99, 2.374, 2.639],
  90: [1.291, 1.662, 1.987, 2.368, 2.632],
  100: [1.29, 1.66, 1.984, 2.364, 2.626],
  500: [1.283, 1.648, 1.965, 2.334, 2.586],
  1000: [1.282, 1.646, 1.962, 2.33, 2.581],
};

const TABLE_F_DFS = Object.keys(TABLE_F)
  .map(Number)
  .sort((a, b) => a - b);

/** The row Table F actually sends you to: the largest listed df that is not above yours. */
export function tableFRow(df: number): number {
  let row = TABLE_F_DFS[0];
  for (const d of TABLE_F_DFS) if (d <= df) row = d;
  return row;
}

/** Table E lookup for a confidence level given as a whole percent. */
export function zCriticalTableE(confPercent: number): number {
  return Z_TABLE_E[confPercent];
}

/**
 * Table F lookup. `df` is snapped DOWN to a printed row first.
 *
 * Rounding down is not an approximation for convenience. A smaller df gives a
 * larger critical value, so the interval comes out slightly too wide, which is
 * the safe direction to be wrong in.
 */
export function tCriticalTableF(confPercent: number, df: number): number {
  const col = TABLE_F_CONF.indexOf(confPercent);
  const row = tableFRow(Math.min(df, 1000));
  return TABLE_F[row][col];
}

/**
 * `tInv` and `tCDF` come from "@/lib/math". Their area convention is normalized
 * here so this file cannot break if the helper reports right-tail rather than
 * left-tail area. For `tInv` the magnitude is identical under either reading by
 * symmetry, so the sign is simply re-applied. For `tCDF` a one-time probe at
 * t = 1 settles it, since more than half the area is left of 1 for any df.
 */
function tRightTail(area: number, df: number): number {
  const mag = Math.abs(tInv(area, df));
  return area < 0.5 ? mag : -mag;
}

function tAreaLeft(x: number, df: number): number {
  const v = tCDF(x, df);
  return tCDF(1, 10) > 0.5 ? v : 1 - v;
}

/* ----------------------------------------------------------------- lessons */

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

export const ch7Lessons: Lesson[] = [
  L(
    "7.1",
    7,
    "Confidence Intervals & Sample Size",
    "A point estimate is one number, the sample mean, offered as the estimate of the population mean. It is almost certainly not exactly right, and by itself it tells you nothing about how far off it might be. A confidence interval fixes that by reporting a range instead: the point estimate plus and minus a margin of error. Read the margin of error as a product of two completely separate things. The critical value comes only from the confidence level and knows nothing about your data. The standard error comes only from your data and knows nothing about the confidence level. You have to multiply them, and that multiplication is the step people skip. Notice that the confidence level splits alpha into TWO tails, so each tail gets alpha over 2, never alpha. Finally, if you decide in advance how large a margin of error you can tolerate, the same formula solves backward for the sample size you need.",
    "$\\text{point estimate} = \\bar{x}$\n$\\text{confidence interval} = \\text{point estimate} \\pm \\text{margin of error}$\n$\\alpha = 1 - \\text{confidence level}$, and $\\dfrac{\\alpha}{2}$ goes in EACH tail\n$E = z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right)$ (the maximum error of estimate)\n$n = \\left(\\dfrac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^{2}$, and this ALWAYS rounds UP\n\nFrom the interval backward: $\\bar{x} = \\dfrac{\\text{upper} + \\text{lower}}{2}$ and $E = \\dfrac{\\text{upper} - \\text{lower}}{2}$",
    "6.3's standard error $\\sigma/\\sqrt{n}$ and the fact that sample means pile up in a normal shape. Chapter 6 went from a population to a sample; Chapter 7 turns around and goes from a sample back to the population.",
    "7.2 puts real numbers in this formula when $\\sigma$ is known, and 7.3 swaps $z$ for $t$ when it is not. Chapter 8 reuses these same critical values to test a claim instead of to estimate.",
    "curve-between"
  ),
  L(
    "7.2",
    7,
    "Confidence Interval for the Mean (sigma known)",
    "Use this when the problem hands you the population standard deviation sigma, and either the sample size is 30 or more or the population is stated to be normal. The recipe never changes. Convert the confidence level to a critical value from Table E, compute the standard error sigma over the square root of n, multiply those two to get the margin of error, then add and subtract it from the sample mean. The standard error is the piece worth slowing down on. Dividing by the square root of n is what says that an average of many measurements wanders less than a single measurement does. It also explains why precision is expensive: to cut the margin of error in half you have to quadruple the sample, because only the square root of n is helping you.",
    "$\\bar{x} - z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right) < \\mu < \\bar{x} + z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right)$\n\nTable E critical values (two tails):\n$90\\%: z_{\\alpha/2} = 1.65 \\qquad 95\\%: 1.96$\n$98\\%: z_{\\alpha/2} = 2.33 \\qquad 99\\%: 2.58$\n\nOrder of operations: critical value, THEN standard error, THEN multiply. Reporting $\\dfrac{\\sigma}{\\sqrt{n}}$ by itself is not a margin of error.",
    "7.1's structure of a confidence interval, and 6.3's sampling distribution of $\\bar{x}$, which is the reason $z$ is legitimate here at all.",
    "7.3 keeps every step and changes exactly two things: $s$ replaces $\\sigma$, and $t$ replaces $z$.",
    "clt"
  ),
  L(
    "7.3",
    7,
    "Confidence Interval for the Mean (sigma unknown)",
    "Most of the time nobody knows sigma, so the sample standard deviation s stands in for it. Estimating the spread from the same small sample adds a second source of error, so the normal curve is no longer wide enough to be honest. The t distribution is the fix: same bell shape, same symmetry about 0, but heavier in the tails, and a different curve for every degrees of freedom value n minus 1. As n grows the t curve settles onto the normal curve, which is why the bottom row of Table F is just the z values. Reading Table F is where points get lost. Use the top row labeled Confidence Intervals and nothing else. The One tail and Two tails rows below it belong to Chapter 8, and the slide deck says so explicitly. Then find your df in the left column, and if it is not printed, drop to the next SMALLER df that is.",
    "$\\bar{x} - t_{\\alpha/2}\\left(\\dfrac{s}{\\sqrt{n}}\\right) < \\mu < \\bar{x} + t_{\\alpha/2}\\left(\\dfrac{s}{\\sqrt{n}}\\right)$\n$\\text{d.f.} = n - 1$\n\nReading Table F:\nColumn: the CONFIDENCE INTERVALS row across the top ($80, 90, 95, 98, 99$)\nRow: your d.f., or the next SMALLER printed d.f. if yours is missing\n\n$\\sigma$ given $\\rightarrow$ $z$. Only $s$ given $\\rightarrow$ $t$. That single question decides the whole problem.",
    "7.2's interval, with 3.2's sample standard deviation $s$ now doing the work $\\sigma$ used to do.",
    "8.3's $t$ test uses this identical table and the identical $\\text{d.f.} = n - 1$, except there you WILL use the One tail and Two tails rows.",
    "curve-mid"
  ),
];

/* --------------------------------------------------------------- questions */

const M = (prompt: string, options: string[], answer: number, explain: string): Question => ({
  ch: 7,
  type: "mc",
  prompt,
  options,
  answer,
  explain,
});

const N = (prompt: string, answer: number, tol: number, explain: string): Question => ({
  ch: 7,
  type: "num",
  prompt,
  answer,
  tol,
  explain,
});

export const ch7Questions: Question[] = [
  M(
    "A margin of error was computed from a sample of size $n$. If the sample size is QUADRUPLED and nothing else changes, the margin of error is...",
    ["Halved", "Doubled", "Quartered", "Unchanged"],
    0,
    "The margin of error carries a square root of n in the denominator. Replacing n by 4n replaces sqrt(n) by 2*sqrt(n), so the whole margin of error is divided by 2. This is why buying twice the precision costs four times the data.",
  ),
  M(
    "You are building a 98% confidence interval. How much area is in EACH tail?",
    ["0.01", "0.02", "0.04", "0.98"],
    0,
    "alpha = 1 - 0.98 = 0.02, and that alpha is split between two tails, so each tail holds alpha/2 = 0.01. Answering 0.02 means putting the entire alpha in one tail, which is a Chapter 8 move, not a confidence interval move.",
  ),
  N(
    "Using Table E, find $z_{\\alpha/2}$ for a 90% confidence interval.",
    1.65,
    0.02,
    "alpha = 0.10, so alpha/2 = 0.05 sits in each tail. The area to the left of the negative critical value is 0.0500, which Table E puts between z = -1.64 and z = -1.65; the textbook uses 1.65. Answering 1.28 means you looked up 0.10 instead of 0.05, which is the one-tail value.",
  ),
  N(
    "Using Table E, find $z_{\\alpha/2}$ for a 98% confidence interval.",
    2.33,
    0.02,
    "alpha = 0.02, so alpha/2 = 0.01 in each tail. Table E gives 0.0099 at z = -2.33. Answering 2.05 means you looked up 0.02 in one tail instead of splitting it.",
  ),
  N(
    "A population has $\\sigma = 12$. A sample of $n = 36$ is taken and a 95% confidence interval is wanted. Find the maximum error of estimate $E$.",
    3.92,
    0.05,
    "Standard error = 12/sqrt(36) = 12/6 = 2. Then E = 1.96 * 2 = 3.92. Stopping at 2 is the standard error, not the margin of error. Dividing by 36 instead of 6 gives 0.65 and forgets the square root entirely.",
  ),
  M(
    "For $\\sigma = 12$ and $n = 36$, a student computes $12/\\sqrt{36} = 2$ and writes down $E = 2$. What did the student leave out?",
    [
      "Multiplying by the critical value $z_{\\alpha/2}$",
      "Dividing by $n$ instead of $\\sqrt{n}$",
      "Subtracting the sample mean",
      "Squaring the standard deviation",
    ],
    0,
    "The 2 is correct as far as it goes, but it is only the standard error. The margin of error is always the critical value TIMES the standard error. Without that multiplication the confidence level never enters the answer at all, which is a good way to catch the mistake: if your E would be identical at 90% and at 99%, you forgot the critical value.",
  ),
  N(
    "A sample of $n = 64$ has $\\bar{x} = 58.4$, and the population standard deviation is $\\sigma = 9.6$. Find the UPPER limit of the 99% confidence interval for $\\mu$.",
    61.496,
    0.05,
    "Standard error = 9.6/sqrt(64) = 9.6/8 = 1.2. E = 2.58 * 1.2 = 3.096. Upper limit = 58.4 + 3.096 = 61.496. Using z = 1.96 by habit would give 60.752, and stopping at the standard error would give 59.6.",
  ),
  N(
    "A 95% confidence interval for $\\mu$ is reported as $24.6 < \\mu < 31.4$. Find the maximum error of estimate $E$.",
    3.4,
    0.05,
    "The interval is the point estimate plus and minus E, so E is HALF the width: (31.4 - 24.6)/2 = 6.8/2 = 3.4. The full width 6.8 is a common slip. As a bonus, the sample mean is the midpoint, (24.6 + 31.4)/2 = 28.",
  ),
  N(
    "How large a sample is needed to estimate the population mean to within $3.50 with 90% confidence, if the population standard deviation is $8?",
    15,
    0.25,
    "n = (z*sigma/E)^2 = (1.65 * 8 / 3.5)^2 = (3.7714)^2 = 14.22, which rounds UP to 15. Rounding 14.22 down to 14 would leave the interval slightly too wide to meet the stated requirement, so sample size always rounds up no matter how small the decimal part is.",
  ),
  M(
    "A sample size calculation produces $n = 26.03$. The required sample size is...",
    ["27", "26", "26.03", "30"],
    0,
    "Sample size always rounds UP, even when the fractional part is tiny. 26 people would not quite deliver the requested margin of error, and you cannot survey 0.03 of a person. This is the one rounding rule in the course that ignores the usual round-to-nearest habit.",
  ),
  M(
    "A random sample of $n = 12$ is taken from a normally distributed population. The population standard deviation is NOT known, but the sample standard deviation $s$ is. Which critical value should be used?",
    [
      "$t$ from Table F with $\\text{d.f.} = 11$",
      "$z$ from Table E",
      "$t$ from Table F with $\\text{d.f.} = 12$",
      "Neither; no interval can be constructed",
    ],
    0,
    "Only s is available, so t is required, and degrees of freedom are n - 1 = 11, not 12. The small sample size is fine because the population is stated to be normal. Note that the deciding factor is sigma being unknown, not n being small: even with n = 200, if only s is given you still use t.",
  ),
  N(
    "Using Table F, find $t_{\\alpha/2}$ for a 95% confidence interval when $n = 22$.",
    2.08,
    0.002,
    "d.f. = 22 - 1 = 21. Go across the top row labeled Confidence Intervals to 95%, down the left column to 21, and read 2.080. Using d.f. = 22 by mistake gives 2.074, and reaching for z = 1.96 ignores the extra uncertainty that using s instead of sigma creates.",
  ),
  N(
    "Using Table F, find $t_{\\alpha/2}$ for a 99% confidence interval when $n = 48$.",
    2.69,
    0.002,
    "d.f. = 47, and Table F does not print a row for 47; it jumps from 45 to 50. The rule is to use the next SMALLER d.f., so read row 45 in the 99% column and get 2.690. Rounding up to row 50 would give 2.678, which is slightly too small and makes the interval narrower than you are entitled to claim.",
  ),
  N(
    "A sample of $n = 16$ has $\\bar{x} = 42.5$ and $s = 12$. The population is normal and $\\sigma$ is unknown. Find the UPPER limit of the 95% confidence interval for $\\mu$.",
    48.893,
    0.012,
    "Only s is given, so use t with d.f. = 15, giving t = 2.131. Standard error = 12/sqrt(16) = 12/4 = 3. E = 2.131 * 3 = 6.393. Upper limit = 42.5 + 6.393 = 48.893. Using z = 1.96 gives 48.38, and using d.f. = 16 gives 48.86.",
  ),
];

/* -------------------------------------------------------------- flashcards */

const F = (id: string, ch: number, front: string, back: string, why: string): Flashcard => ({
  id,
  ch,
  front,
  back,
  why,
});

export const ch7Flashcards: Flashcard[] = [
  F("c7-1", 7, "Point estimate of $\\mu$", "The sample mean $\\bar{x}$", "One number, no sense of how far off it might be."),
  F("c7-2", 7, "Confidence interval", "$\\text{point estimate} \\pm \\text{margin of error}$", "A range, plus a stated chance that the range caught $\\mu$."),
  F("c7-3", 7, "Confidence level", "$(1 - \\alpha) \\cdot 100\\%$", "The share of such intervals that would capture $\\mu$ on repeated sampling."),
  F("c7-4", 7, "How much area in EACH tail?", "$\\dfrac{\\alpha}{2}$, never $\\alpha$", "A confidence interval is always two-tailed. Splitting is the step people skip."),
  F("c7-5", 7, "Table E critical values", "$90\\%: 1.65$, $95\\%: 1.96$, $98\\%: 2.33$, $99\\%: 2.58$", "Memorize these four. They are the same four all through Chapter 8."),
  F("c7-6", 7, "Maximum error of estimate ($\\sigma$ known)", "$E = z_{\\alpha/2}\\left(\\dfrac{\\sigma}{\\sqrt{n}}\\right)$", "Critical value TIMES standard error. The standard error alone is not $E$."),
  F("c7-7", 7, "Why $\\sqrt{n}$ and not $n$?", "Averages wander less than single values, but only by $\\sqrt{n}$", "Quadruple the sample to halve the margin of error."),
  F("c7-8", 7, "Sample size for a mean", "$n = \\left(\\dfrac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^{2}$, round UP", "Always up, even for $26.03 \\rightarrow 27$. Rounding down misses the requested precision."),
  F("c7-9", 7, "$z$ or $t$?", "$\\sigma$ given $\\rightarrow z$. Only $s$ given $\\rightarrow t$", "It is about which standard deviation you were handed, not about $n$."),
  F("c7-10", 7, "Confidence interval when $\\sigma$ is unknown", "$\\bar{x} \\pm t_{\\alpha/2}\\left(\\dfrac{s}{\\sqrt{n}}\\right)$ with $\\text{d.f.} = n - 1$", "Same shape as the $z$ interval. Two symbols change, nothing else does."),
  F("c7-11", 7, "Which row of Table F?", "The top row labeled CONFIDENCE INTERVALS", "The One tail and Two tails rows are Chapter 8. Using them here is the classic wrong-tail error."),
  F("c7-12", 7, "Your d.f. is missing from Table F", "Use the next SMALLER printed d.f.", "Smaller d.f. gives a bigger $t$, so the interval errs wide, which is the safe direction."),
];

/* --------------------------------------------------------- guided examples */

const S = (
  ask: string,
  kind: "numeric" | "choice",
  answer: number,
  hint: string,
  why: string,
  extra?: { choices?: string[]; tol?: number }
): GuidedStep => ({ ask, kind, answer, hint, why, ...extra });

export const ch7Guided: GuidedExample[] = [
  {
    sectionId: "7.1",
    title: "How big does the sample have to be?",
    scenario:
      "A donut shop owner wants a 99% confidence interval for the true mean cost of a dozen donuts. She needs the estimate accurate to within $0.10. A previous study found the standard deviation of the price was $0.20. How large should her sample be?",
    steps: [
      S(
        "The confidence level is 99%. Which critical value does Table E give you?",
        "choice",
        3,
        "alpha = 1 - 0.99 = 0.01, and that splits into 0.005 in each tail. Look up an area of 0.0050 in Table E.",
        "2.58. Table E puts 0.0049 at z = -2.58, and the textbook rounds to 2.58. If you had used 2.33 you would have looked up 0.01 in a single tail, which answers a different question.",
        { choices: ["1.65", "1.96", "2.33", "2.58"] }
      ),
      S(
        "Compute the quantity inside the parentheses, $z_{\\alpha/2} \\cdot \\sigma / E$. Here $\\sigma = 0.20$ and $E = 0.10$.",
        "numeric",
        5.16,
        "Multiply 2.58 by 0.20 first, then divide by 0.10.",
        "2.58 * 0.20 = 0.516, and 0.516 / 0.10 = 5.16. Notice there is no sample mean anywhere in this formula. Sample size is planned BEFORE any data exists, so the only inputs are how confident you want to be, how much spread you expect, and how close you want to land.",
        { tol: 0.02 }
      ),
      S(
        "Now square it.",
        "numeric",
        26.6256,
        "$5.16^2$.",
        "26.6256. The squaring is why precision gets expensive so fast. Cutting E in half would multiply this whole answer by 4.",
        { tol: 0.05 }
      ),
      S(
        "Give the required sample size.",
        "numeric",
        27,
        "There is one rounding rule for sample size and it is not round to nearest.",
        "27. Sample size ALWAYS rounds up, even from 26.6256 and even from 26.03. Twenty-six dozen priced would leave her margin of error a hair above $0.10, which is not what she asked for. You also cannot price a fraction of a dozen.",
        { tol: 0 }
      ),
      S(
        "Suppose she tightened her requirement to $E = 0.05$, twice as precise, with everything else the same. The required sample size becomes...",
        "choice",
        1,
        "E sits in the denominator, and the whole thing gets squared.",
        "Four times as large: (2.58 * 0.20 / 0.05)^2 = 106.5, so 107. Halving E doubles the fraction and squaring doubles it again. This is the same square root relationship from the other direction, and it is the single most useful piece of intuition in this chapter.",
        { choices: ["Twice as large", "Four times as large", "Half as large", "Unchanged"] }
      ),
    ],
    takeaway:
      "Sample size planning uses no data at all, just the confidence level, an estimate of sigma, and the precision you are demanding. Compute, then round up, always.",
  },

  {
    sectionId: "7.2",
    title: "A z interval, one piece at a time",
    scenario:
      "A random sample of 65 tables at a popular restaurant revealed an average bill of $15.09 per table. The population standard deviation is known to be $3.99. Find the 98% confidence interval for the mean bill for all tables.",
    steps: [
      S(
        "The population standard deviation is given and $n = 65$. Which critical value belongs here?",
        "choice",
        0,
        "Ask one question only: were you handed sigma, or only s?",
        "z from Table E. Sigma is given, so there is no extra uncertainty to compensate for and no degrees of freedom to compute. If the problem had said the SAMPLE standard deviation was 3.99, this would have been a t problem with d.f. = 64.",
        { choices: ["$z$ from Table E", "$t$ from Table F with d.f. $= 64$", "$t$ from Table F with d.f. $= 65$"] }
      ),
      S(
        "Find $z_{\\alpha/2}$ for 98% confidence.",
        "numeric",
        2.33,
        "alpha = 1 - 0.98 = 0.02. Now split it: how much lands in each tail? Look that area up in Table E.",
        "2.33. alpha/2 = 0.01, and Table E shows 0.0099 at z = -2.33. Watch this specific trap: 0.02 in a single tail would give 2.05, and it looks just as plausible. A confidence interval always splits alpha in two, because the interval has two ends.",
        { tol: 0.02 }
      ),
      S(
        "Compute the standard error $\\sigma/\\sqrt{n}$, to four decimal places.",
        "numeric",
        0.4949,
        "Take the square root of 65 first, then divide 3.99 by it.",
        "sqrt(65) = 8.0623, and 3.99/8.0623 = 0.4949. Read what this number means: individual bills swing around by about $3.99, but the AVERAGE of 65 bills only swings by about $0.49. Averaging 65 tables squeezed the variability down by a factor of about 8, which is sqrt(65).",
        { tol: 0.002 }
      ),
      S(
        "Now find the maximum error of estimate $E$.",
        "numeric",
        1.1531,
        "You have both pieces now. The margin of error is the critical value times the standard error.",
        "2.33 * 0.4949 = 1.1531. This is the step that gets skipped. The standard error 0.4949 describes how much the sample mean wanders; only after multiplying by 2.33 does it describe how far out you have to reach to be 98% sure of catching mu.",
        { tol: 0.02 }
      ),
      S(
        "Give the LOWER limit of the confidence interval.",
        "numeric",
        13.9369,
        "Subtract E from the sample mean.",
        "15.09 - 1.1531 = 13.9369, so the interval is 13.94 < mu < 16.24. Say it correctly: you are 98% confident that the true mean bill for all tables falls in that range. Mu is not moving around inside the interval; the interval is what changes from sample to sample.",
        { tol: 0.03 }
      ),
    ],
    takeaway:
      "Critical value from the confidence level, standard error from the data, multiply for E, then add and subtract. Four moves, always in that order.",
  },

  {
    sectionId: "7.3",
    title: "Same interval, but sigma is missing",
    scenario:
      "A sample of 8 adult male giraffes had an average weight of 2,800 pounds. The standard deviation FOR THE SAMPLE was 11 pounds. Assume giraffe weights are approximately normal. Find the 95% confidence interval for the population mean weight.",
    steps: [
      S(
        "Only the sample standard deviation is available. Which distribution do you use?",
        "choice",
        1,
        "Sigma was never given. Something has to pay for that missing information.",
        "The t distribution. Using s in place of sigma adds a second layer of uncertainty, and t has heavier tails to absorb it. The n = 8 is allowed only because the problem states the population is approximately normal.",
        { choices: ["The standard normal $z$ distribution", "The $t$ distribution"] }
      ),
      S(
        "How many degrees of freedom?",
        "numeric",
        7,
        "$\\text{d.f.} = n - 1$.",
        "8 - 1 = 7. Using 8 here is the most common arithmetic slip in the section, and it silently makes your interval too narrow.",
        { tol: 0 }
      ),
      S(
        "Read $t_{\\alpha/2}$ from Table F: 95% confidence, d.f. $= 7$.",
        "numeric",
        2.365,
        "Use the TOP row labeled Confidence Intervals, not the One tail or Two tails rows underneath it. Then find row 7.",
        "2.365. Compare it to z = 1.96 for the same 95%. The t value is noticeably larger, and that difference is exactly the price of not knowing sigma. Also note that reading the One tail row for 0.05 would have landed you in the 90% column at 1.895, a completely different answer that looks perfectly reasonable on paper.",
        { tol: 0.01 }
      ),
      S(
        "Find the maximum error of estimate $E = t_{\\alpha/2}\\left(s/\\sqrt{n}\\right)$.",
        "numeric",
        9.1977,
        "Compute $11/\\sqrt{8}$ first, then multiply by 2.365.",
        "11/sqrt(8) = 3.8891, and 2.365 * 3.8891 = 9.1977. Stopping at 3.8891 is the standard error, not the margin of error. With only 8 giraffes, sqrt(8) is small, so almost none of the variability gets squeezed out.",
        { tol: 0.05 }
      ),
      S(
        "Give the UPPER limit of the interval.",
        "numeric",
        2809.1977,
        "Add E to the sample mean.",
        "2800 + 9.1977 = 2809.1977, so the interval is about 2790.8 < mu < 2809.2. Had you wrongly used z = 1.96, the upper limit would have been 2807.6, and you would have reported a tighter interval than your data can actually support.",
        { tol: 0.05 }
      ),
    ],
    takeaway:
      "Only two things change when sigma goes missing: s replaces sigma, and t with d.f. = n - 1 replaces z. Everything else about the procedure is identical to 7.2.",
  },
];

/* -------------------------------------------------------------- generators */

const P = (
  topic: string,
  topicLabel: string,
  prompt: string,
  steps: string[],
  answer: number,
  tol: number
): PracticeProblem => ({ ch: 7, topic, topicLabel, prompt, steps, kind: "numeric", answer, tol });

const CH = (
  topic: string,
  topicLabel: string,
  prompt: string,
  choices: string[],
  answer: number,
  steps: string[]
): PracticeProblem => ({ ch: 7, topic, topicLabel, prompt, steps, kind: "choice", answer, tol: 0, choices });

/**
 * A tolerance that provably cannot admit a wrong method.
 *
 * Pass the answers that the plausible mistakes would produce. The tolerance
 * returned is a quarter of the distance to the closest of them, capped so it
 * never gets silly on large-magnitude answers.
 */
function tolAgainst(answer: number, wrongs: number[], cap = 0.05): number {
  let gap = Infinity;
  for (const w of wrongs) {
    const d = Math.abs(answer - w);
    if (d > 1e-9 && d < gap) gap = d;
  }
  if (!isFinite(gap)) return cap;
  return Math.min(cap, 0.25 * gap);
}

type Ctx = { plural: string; unit: string; who: string; short: string };

const CONTEXTS: Ctx[] = [
  { plural: "restaurant bills", unit: "dollars", who: "tables at a popular restaurant", short: "bill" },
  { plural: "battery lifetimes", unit: "hours", who: "phones of one model", short: "lifetime" },
  { plural: "breaking strengths", unit: "pounds", who: "cables from one manufacturer", short: "strength" },
  { plural: "commute times", unit: "minutes", who: "employees at a logistics firm", short: "commute time" },
  { plural: "river depths", unit: "feet", who: "points along a river", short: "depth" },
  { plural: "repair costs", unit: "dollars", who: "vehicles at an auto shop", short: "repair cost" },
  { plural: "daily rainfall totals", unit: "millimeters", who: "days at a weather station", short: "rainfall" },
  { plural: "unhealthy air quality days", unit: "days", who: "metropolitan areas", short: "count of days" },
  { plural: "holiday gift totals", unit: "dollars", who: "shoppers in a mall survey", short: "amount spent" },
  { plural: "weights of adult giraffes", unit: "pounds", who: "giraffes at wildlife parks", short: "weight" },
  { plural: "call durations", unit: "seconds", who: "calls to a support center", short: "call duration" },
  { plural: "monthly electricity bills", unit: "dollars", who: "households on one street", short: "bill" },
  { plural: "germination times", unit: "days", who: "seedlings in a greenhouse trial", short: "germination time" },
  { plural: "download speeds", unit: "megabits per second", who: "homes in an internet survey", short: "speed" },
  { plural: "checkout wait times", unit: "minutes", who: "customers at a grocery store", short: "wait time" },
  { plural: "package weights", unit: "ounces", who: "parcels at a shipping counter", short: "weight" },
];

function cap1(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "an 80% interval" but "a 90% interval". */
function article(confPercent: number) {
  return confPercent === 80 ? "an" : "a";
}

const CONF_LEVELS = [90, 95, 98, 99];

/** Sample sizes whose square root is exact, so displayed work stays readable. */
const CLEAN_N = [16, 25, 36, 49, 64, 81, 100, 144, 169, 196, 225];

export const ch7Topics: { key: string; label: string }[] = [
  { key: "ci-tails", label: "Alpha & Which Tail" },
  { key: "ci-critical", label: "Critical Values (Tables E and F)" },
  { key: "ci-margin", label: "Standard Error vs Margin of Error" },
  { key: "ci-mean-z", label: "z Interval for the Mean" },
  { key: "ci-mean-t", label: "t Interval for the Mean" },
  { key: "ci-samplesize", label: "Sample Size for a Mean" },
  { key: "t-area", label: "t Distribution Areas" },
];

export const ch7Generators: Record<string, () => PracticeProblem> = {
  /**
   * Alpha, alpha/2, and which tail gets what.
   *
   * Built as its own topic because the diagnostic showed the student can read
   * Table E in both directions and still lose the problem here.
   */
  "ci-tails": () => {
    const conf = pick([80, 90, 95, 98, 99]);
    const alpha = round(1 - conf / 100, 4);
    const half = round(alpha / 2, 4);
    const form = pick(["each", "total", "left", "which"]);
    const c = pick(CONTEXTS);
    const n = randInt(8, 240);
    const a = article(conf);
    const lead = pick([
      `A researcher sampled ${n} ${c.who} and is building ${a} ${conf}% confidence interval for the mean ${c.short}.`,
      `From a sample of ${n} ${c.who}, ${a} ${conf}% confidence interval for the mean ${c.short} is being constructed.`,
      `${cap1(a)} ${conf}% confidence interval for the mean ${c.short} is being built from ${n} ${c.who}.`,
      `An analyst reports ${a} ${conf}% confidence interval for the mean ${c.short}, based on ${n} ${c.who}.`,
    ]);

    if (form === "each") {
      return P(
        "ci-tails",
        "Alpha & Which Tail",
        `${lead} How much area lies in EACH tail?`,
        [
          `$\\alpha = 1 - ${conf / 100} = ${alpha}$`,
          `A confidence interval has two ends, so $\\alpha$ splits in half.`,
          `$\\dfrac{\\alpha}{2} = \\dfrac{${alpha}}{2} = ${half}$`,
        ],
        half,
        tolAgainst(half, [alpha, conf / 100, 1 - half], 0.002)
      );
    }
    if (form === "total") {
      return P(
        "ci-tails",
        "Alpha & Which Tail",
        `${lead} What is $\\alpha$ (the TOTAL area outside the interval)?`,
        [`$\\alpha = 1 - \\text{confidence level} = 1 - ${conf / 100} = ${alpha}$`, `That total is then split, ${half} into each tail.`],
        alpha,
        tolAgainst(alpha, [half, conf / 100], 0.002)
      );
    }
    if (form === "left") {
      const area = round(half, 4);
      return P(
        "ci-tails",
        "Alpha & Which Tail",
        `${lead} What area do you look up in the BODY of Table E to find the negative critical value?`,
        [
          `$\\alpha = ${alpha}$, so each tail holds $\\dfrac{\\alpha}{2} = ${half}$.`,
          `Table E reports area to the LEFT, and the left tail holds exactly ${half}.`,
          `So you hunt for $${half}$ in the body of the table.`,
        ],
        area,
        tolAgainst(area, [alpha, 1 - half, 1 - alpha], 0.002)
      );
    }
    return CH(
      "ci-tails",
      "Alpha & Which Tail",
      `${lead} Which statement is correct?`,
      [
        `$\\alpha = ${alpha}$ and each tail holds $${half}$`,
        `$\\alpha = ${half}$ and each tail holds $${alpha}$`,
        `$\\alpha = ${alpha}$ and the entire $\\alpha$ sits in ONE tail`,
        `$\\alpha = ${conf / 100}$ and each tail holds $${round((conf / 100) / 2, 4)}$`,
      ],
      0,
      [
        `$\\alpha$ is what is left OVER after the confidence level: $1 - ${conf / 100} = ${alpha}$.`,
        `The interval has two ends, so that ${alpha} is split evenly: ${half} per tail.`,
        `Putting all of $\\alpha$ in one tail is a hypothesis-test move, not a confidence-interval move.`,
      ]
    );
  },

  /** Critical values from Table E and Table F, including the missing-df rule. */
  "ci-critical": () => {
    const useT = Math.random() < 0.55;
    const conf = pick(CONF_LEVELS);
    const alpha = round(1 - conf / 100, 4);
    const half = round(alpha / 2, 4);

    const c = pick(CONTEXTS);

    if (!useT) {
      const z = Z_TABLE_E[conf];
      const wrongs = CONF_LEVELS.filter((k) => k !== conf).map((k) => Z_TABLE_E[k]);
      wrongs.push(Z_ONE_TAIL[conf]);
      const nz = randInt(31, 400);
      const zLead = pick([
        `The mean ${c.short} is being estimated from ${nz} ${c.who}, and $\\sigma$ is known.`,
        `${cap1(c.plural)} were measured for ${nz} ${c.who}, and the POPULATION standard deviation is known.`,
        `You are estimating the mean ${c.short} from ${nz} ${c.who}, with $\\sigma$ given.`,
        `A study of ${nz} ${c.who} reports the population standard deviation of the ${c.plural}.`,
      ]);
      return P(
        "ci-critical",
        "Critical Values (Tables E and F)",
        `${zLead} Using Table E, find $z_{\\alpha/2}$ for a ${conf}% confidence interval.`,
        [
          `$\\alpha = 1 - ${conf / 100} = ${alpha}$, so $\\dfrac{\\alpha}{2} = ${half}$ in each tail.`,
          `Find the area $${half}$ in the body of Table E; it sits at $z = -${z}$.`,
          `$z_{\\alpha/2} = ${z}$ (report the positive value).`,
          `Looking up $${alpha}$ instead would give $${Z_ONE_TAIL[conf]}$, which is the one-tail value and belongs to Chapter 8.`,
        ],
        z,
        tolAgainst(z, wrongs, 0.02)
      );
    }

    // Small samples mostly land on a printed row; larger ones mostly do not,
    // which is where the next-smaller-df rule has to be applied.
    const n = Math.random() < 0.45 ? randInt(5, 31) : randInt(32, 260);
    const df = n - 1;
    const row = tableFRow(df);
    const t = tCriticalTableF(conf, df);
    const nextRowIdx = TABLE_F_DFS.indexOf(row) + 1;
    const col = TABLE_F_CONF.indexOf(conf);
    // The three mistakes worth pricing in: reaching for z, rounding the df UP
    // to the next printed row instead of down, and using n rather than n - 1.
    const wrongs = [Z_TABLE_E[conf], tCriticalTableF(conf, n)];
    if (nextRowIdx < TABLE_F_DFS.length) wrongs.push(TABLE_F[TABLE_F_DFS[nextRowIdx]][col]);

    return P(
      "ci-critical",
      "Critical Values (Tables E and F)",
      `${cap1(c.plural)} were recorded for a sample of size $n = ${n}$ ${c.who}, and $\\sigma$ is unknown. Using Table F, find $t_{\\alpha/2}$ for a ${conf}% confidence interval.`,
      [
        `$\\text{d.f.} = n - 1 = ${n} - 1 = ${df}$`,
        row === df
          ? `Row ${df} is printed in Table F. Use the top row labeled Confidence Intervals to find the ${conf}% column.`
          : `Table F has no row for ${df}, so drop to the next SMALLER printed d.f., which is ${row}.`,
        `$t_{\\alpha/2} = ${t}$`,
        `For comparison, $z_{\\alpha/2} = ${Z_TABLE_E[conf]}$ at this confidence level. The $t$ value is larger, and that gap is the cost of not knowing $\\sigma$.`,
      ],
      t,
      tolAgainst(t, wrongs, 0.02)
    );
  },

  /**
   * Standard error versus margin of error.
   *
   * The two are asked in alternating turns on purpose, so the student cannot
   * settle into computing one of them by reflex.
   */
  "ci-margin": () => {
    const c = pick(CONTEXTS);
    const conf = pick(CONF_LEVELS);
    const n = pick(CLEAN_N);
    const sd = randInt(6, 40);
    const known = Math.random() < 0.5;
    const df = n - 1;
    const crit = known ? Z_TABLE_E[conf] : tCriticalTableF(conf, df);
    const root = Math.sqrt(n);
    const se = sd / root;
    const E = crit * se;
    const sym = known ? "\\sigma" : "s";
    const source = known
      ? `the POPULATION standard deviation is $\\sigma = ${sd}$`
      : `the SAMPLE standard deviation is $s = ${sd}$`;

    if (Math.random() < 0.35) {
      return P(
        "ci-margin",
        "Standard Error vs Margin of Error",
        `${cap1(c.plural)} were recorded for a sample of $n = ${n}$ ${c.who}, and ${source} ${c.unit}. Find the STANDARD ERROR only.`,
        [
          `$\\dfrac{${sym}}{\\sqrt{n}} = \\dfrac{${sd}}{\\sqrt{${n}}} = \\dfrac{${sd}}{${root}} = ${round(se, 4)}$`,
          `Individual ${c.plural} vary by about ${sd} ${c.unit}, but the AVERAGE of ${n} of them varies by only about ${round(se, 2)}.`,
          `This is not yet a margin of error. Multiplying by the critical value is still to come.`,
        ],
        round(se, 4),
        tolAgainst(round(se, 4), [E, sd / n, sd, crit * sd], 0.02)
      );
    }

    return P(
      "ci-margin",
      "Standard Error vs Margin of Error",
      `${cap1(c.plural)} were recorded for a sample of $n = ${n}$ ${c.who}, and ${source} ${c.unit}. Find the maximum error of estimate $E$ for a ${conf}% confidence interval.`,
      [
        known
          ? `$\\sigma$ is given, so the critical value is $z_{\\alpha/2} = ${crit}$ from Table E.`
          : `Only $s$ is given, so use $t$ with $\\text{d.f.} = ${df}$ (Table F row ${tableFRow(df)}): $t_{\\alpha/2} = ${crit}$.`,
        `Standard error $= \\dfrac{${sd}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$E = ${crit} \\times ${round(se, 4)} = ${round(E, 4)}$`,
        `Reporting ${round(se, 4)} would be the standard error, which carries no confidence level in it at all.`,
      ],
      round(E, 4),
      tolAgainst(round(E, 4), [se, (sd / n) * crit, crit * sd, (known ? tCriticalTableF(conf, df) : Z_TABLE_E[conf]) * se], 0.05)
    );
  },

  /** Full z interval, asked forwards and backwards. */
  "ci-mean-z": () => {
    const c = pick(CONTEXTS);
    const conf = pick(CONF_LEVELS);
    const n = pick(CLEAN_N);
    const sigma = randInt(5, 40);
    const xbar = randInt(30, 400) + pick([0, 0.5, 0.25, 0.75]);
    const z = Z_TABLE_E[conf];
    const se = sigma / Math.sqrt(n);
    const E = z * se;
    const lower = xbar - E;
    const upper = xbar + E;
    const form = pick(["lower", "upper", "back-mean", "back-E"]);

    if (form === "back-mean" || form === "back-E") {
      const lo = round(lower, 2);
      const hi = round(upper, 2);
      const mid = round((lo + hi) / 2, 4);
      const halfWidth = round((hi - lo) / 2, 4);
      if (form === "back-mean") {
        return P(
          "ci-mean-z",
          "z Interval for the Mean",
          `A ${conf}% confidence interval for the mean ${c.short} is reported as $${lo} < \\mu < ${hi}$. Find the sample mean it was built from.`,
          [
            `The interval is $\\bar{x} \\pm E$, so $\\bar{x}$ sits exactly in the middle.`,
            `$\\bar{x} = \\dfrac{${lo} + ${hi}}{2} = ${mid}$`,
          ],
          mid,
          tolAgainst(mid, [halfWidth, hi - lo, lo, hi], 0.05)
        );
      }
      return P(
        "ci-mean-z",
        "z Interval for the Mean",
        `A ${conf}% confidence interval for the mean ${c.short} is reported as $${lo} < \\mu < ${hi}$. Find the maximum error of estimate $E$.`,
        [
          `$E$ is HALF the width of the interval, not the whole width.`,
          `$E = \\dfrac{${hi} - ${lo}}{2} = ${halfWidth}$`,
        ],
        halfWidth,
        tolAgainst(halfWidth, [round(hi - lo, 4), mid], 0.05)
      );
    }

    const target = form === "lower" ? lower : upper;
    return P(
      "ci-mean-z",
      "z Interval for the Mean",
      `A random sample of $n = ${n}$ ${c.who} gave a mean ${c.short} of $${xbar}$ ${c.unit}. The POPULATION standard deviation is $\\sigma = ${sigma}$ ${c.unit}. Find the ${form.toUpperCase()} limit of the ${conf}% confidence interval for $\\mu$.`,
      [
        `$\\sigma$ is given, so this is a $z$ interval. $z_{\\alpha/2} = ${z}$.`,
        `$\\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${sigma}}{${Math.sqrt(n)}} = ${round(se, 4)}$`,
        `$E = ${z} \\times ${round(se, 4)} = ${round(E, 4)}$`,
        `${form === "lower" ? "Lower" : "Upper"} limit $= ${xbar} ${form === "lower" ? "-" : "+"} ${round(E, 4)} = ${round(target, 4)}$`,
      ],
      round(target, 4),
      tolAgainst(
        round(target, 4),
        [
          form === "lower" ? xbar - se : xbar + se,
          form === "lower" ? xbar - (z * sigma) / n : xbar + (z * sigma) / n,
          xbar,
          form === "lower" ? xbar - tCriticalTableF(conf, n - 1) * se : xbar + tCriticalTableF(conf, n - 1) * se,
        ],
        0.05
      )
    );
  },

  /** Full t interval. Some sample sizes are chosen so Table F has no matching row. */
  "ci-mean-t": () => {
    const c = pick(CONTEXTS);
    const conf = pick(CONF_LEVELS);
    const n = pick([9, 16, 25, 36, 49, 64, 42, 48, 52, 63]);
    const s = randInt(6, 45);
    const xbar = randInt(40, 500) + pick([0, 0.5]);
    const df = n - 1;
    const row = tableFRow(df);
    const t = tCriticalTableF(conf, df);
    const se = s / Math.sqrt(n);
    const E = t * se;
    const wantUpper = Math.random() < 0.5;
    const target = wantUpper ? xbar + E : xbar - E;
    const zAlt = Z_TABLE_E[conf];
    const tWrongDf = tCriticalTableF(conf, n);

    return P(
      "ci-mean-t",
      "t Interval for the Mean",
      `A random sample of $n = ${n}$ ${c.who} gave a mean ${c.short} of $${xbar}$ ${c.unit} with a SAMPLE standard deviation of $s = ${s}$ ${c.unit}. Assume the population is approximately normal. Find the ${wantUpper ? "UPPER" : "LOWER"} limit of the ${conf}% confidence interval for $\\mu$.`,
      [
        `Only $s$ is given, so use $t$. $\\text{d.f.} = ${n} - 1 = ${df}$.`,
        row === df
          ? `Table F, ${conf}% column, row ${df}: $t_{\\alpha/2} = ${t}$.`
          : `Table F has no row ${df}, so use the next SMALLER printed d.f., row ${row}: $t_{\\alpha/2} = ${t}$.`,
        `$\\dfrac{s}{\\sqrt{n}} = \\dfrac{${s}}{\\sqrt{${n}}} = ${round(se, 4)}$`,
        `$E = ${t} \\times ${round(se, 4)} = ${round(E, 4)}$`,
        `${wantUpper ? "Upper" : "Lower"} limit $= ${xbar} ${wantUpper ? "+" : "-"} ${round(E, 4)} = ${round(target, 4)}$`,
        `Using $z = ${zAlt}$ here would give ${round(wantUpper ? xbar + zAlt * se : xbar - zAlt * se, 4)}, an interval narrower than the data supports.`,
      ],
      round(target, 4),
      tolAgainst(
        round(target, 4),
        [
          wantUpper ? xbar + zAlt * se : xbar - zAlt * se,
          wantUpper ? xbar + se : xbar - se,
          wantUpper ? xbar + tWrongDf * se : xbar - tWrongDf * se,
          wantUpper ? xbar + (t * s) / n : xbar - (t * s) / n,
          xbar,
        ],
        0.05
      )
    );
  },

  /** n = (z sigma / E)^2, always rounded up. */
  "ci-samplesize": () => {
    const c = pick(CONTEXTS);
    const conf = pick(CONF_LEVELS);
    const z = Z_TABLE_E[conf];
    const sigma = pick([0.2, 0.5, 2, 3.4, 4.38, 5, 6.2, 8, 9.5, 11, 12.5, 15, 18, 22, 31]);
    const E = pick([0.05, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5]);
    const raw = Math.pow((z * sigma) / E, 2);
    if (raw < 5 || raw > 4000) return ch7Generators["ci-samplesize"]();
    const answer = Math.ceil(raw);
    const form = pick(["n", "n", "n", "effect"]);

    if (form === "effect") {
      const tighter = Math.ceil(Math.pow((z * sigma) / (E / 2), 2));
      return CH(
        "ci-samplesize",
        "Sample Size for a Mean",
        `A study needs the mean ${c.short} estimated to within $${E}$ ${c.unit} with ${conf}% confidence, and $\\sigma = ${sigma}$. If the requirement is tightened to within $${round(E / 2, 4)}$ instead, the required sample size...`,
        ["Multiplies by about 4", "Doubles", "Is cut in half", "Does not change"],
        0,
        [
          `$n = \\left(\\dfrac{z\\sigma}{E}\\right)^{2}$, so $E$ is in the denominator AND the whole thing is squared.`,
          `Halving $E$ doubles the fraction, and squaring doubles it again: a factor of $4$.`,
          `Here that is ${answer} becoming ${tighter}.`,
        ]
      );
    }

    return P(
      "ci-samplesize",
      "Sample Size for a Mean",
      `How large a sample is needed to estimate the mean ${c.short} to within $${E}$ ${c.unit} with ${conf}% confidence, if $\\sigma = ${sigma}$ ${c.unit}?`,
      [
        `$z_{\\alpha/2} = ${z}$ for ${conf}% confidence.`,
        `$n = \\left(\\dfrac{z_{\\alpha/2}\\sigma}{E}\\right)^{2} = \\left(\\dfrac{${z} \\times ${sigma}}{${E}}\\right)^{2} = \\left(${round((z * sigma) / E, 4)}\\right)^{2} = ${round(raw, 4)}$`,
        `Round UP: $n = ${answer}$. Sample size always rounds up, even when the decimal part is tiny.`,
        `No sample mean appears anywhere. Sample size is planned before any data is collected.`,
      ],
      answer,
      tolAgainst(answer, [Math.floor(raw), round(raw, 4), (z * sigma) / E, Math.ceil(Math.pow((Z_TABLE_E[95] * sigma) / E, 2))], 0.25)
    );
  },

  /**
   * Areas and cutoffs on a t curve, in the style of the ALEKS problems in the
   * deck (Examples 4 through 6). These are the only items in the chapter where
   * no table row exists, so `tCDF` and `tInv` do the work.
   */
  "t-area": () => {
    const df = randInt(3, 45);
    const form = pick(["right", "between", "inv-right", "inv-two"]);
    /**
     * Answers here are reported to three decimals, so a "wrong method" that
     * lands within a rounding unit of the right answer is not a distinguishable
     * mistake and must not be allowed to squeeze the tolerance below what
     * correct rounding produces. Anything genuinely different still counts.
     */
    const distinct3 = (ans: number) => (w: number) => Math.abs(w - ans) > 0.0025;

    if (form === "right") {
      const a = round((randInt(0, 1) ? 1 : -1) * randInt(50, 280) / 100, 2);
      const ans = round(1 - tAreaLeft(a, df), 3);
      const normalAns = round(1 - normalCDF(a), 3);
      return P(
        "t-area",
        "t Distribution Areas",
        `A $t$ distribution has $${df}$ degrees of freedom. Find the area under the curve to the RIGHT of $t = ${a}$, to three decimal places.`,
        [
          `Area to the right $= 1 - $ area to the left.`,
          `$P(t > ${a}) = ${ans}$ with $\\text{d.f.} = ${df}$`,
          `The same cutoff on a standard normal curve would give $${normalAns}$. The $t$ curve carries more area in its tails, and the fewer the degrees of freedom, the bigger that difference gets.`,
        ],
        ans,
        tolAgainst(ans, [normalAns, round(tAreaLeft(a, df), 3)].filter(distinct3(ans)), 0.01)
      );
    }

    if (form === "between") {
      const c = round(randInt(50, 280) / 100, 2);
      const ans = round(2 * tAreaLeft(c, df) - 1, 3);
      const normalAns = round(2 * normalCDF(c) - 1, 3);
      return P(
        "t-area",
        "t Distribution Areas",
        `A $t$ distribution has $${df}$ degrees of freedom. Compute $P(-${c} < t < ${c})$, to three decimal places.`,
        [
          `$P(-${c} < t < ${c}) = P(t > -${c}) - P(t > ${c})$`,
          `By symmetry that is the same as $2 \\cdot P(t < ${c}) - 1$.`,
          `$= ${ans}$`,
          `The normal curve would give $${normalAns}$ for the same cutoffs.`,
        ],
        ans,
        tolAgainst(ans, [normalAns, round(tAreaLeft(c, df), 3)].filter(distinct3(ans)), 0.01)
      );
    }

    if (form === "inv-right") {
      const base = round(randInt(1, 45) / 100, 2);
      const area = Math.random() < 0.3 ? round(1 - base, 4) : base;
      const ans = round(tRightTail(area, df), 3);
      const normalAns = round(-normalInv(area), 3);
      return P(
        "t-area",
        "t Distribution Areas",
        `A $t$ distribution has $${df}$ degrees of freedom. Find the value $c$ such that $P(t > c) = ${area}$, to three decimal places.`,
        [
          `You are given the area in the RIGHT tail and asked for the cutoff, so this runs the lookup backward.`,
          area < 0.5
            ? `Less than half the area is to the right, so $c$ must be positive.`
            : `More than half the area is to the right, so $c$ must be NEGATIVE.`,
          `$c = ${ans}$ with $\\text{d.f.} = ${df}$`,
        ],
        ans,
        tolAgainst(ans, [normalAns, -ans].filter(distinct3(ans)), 0.02)
      );
    }

    const level = pick([0.8, 0.85, 0.9, 0.92, 0.95, 0.96, 0.98, 0.99]);
    const tail = round((1 - level) / 2, 4);
    const ans = round(tRightTail(tail, df), 3);
    const normalAns = round(-normalInv(tail), 3);
    const wrongTail = round(tRightTail(round(1 - level, 4), df), 3);
    return P(
      "t-area",
      "t Distribution Areas",
      `A $t$ distribution has $${df}$ degrees of freedom. Find the value $c$ such that $P(-c < t < c) = ${level}$, to three decimal places.`,
      [
        `The two tails together hold $1 - ${level} = ${round(1 - level, 4)}$.`,
        `By symmetry each tail holds half of that: $${tail}$.`,
        `So $c$ is the value cutting off $${tail}$ in the RIGHT tail: $c = ${ans}$.`,
        `Forgetting to halve would give $${wrongTail}$, which is the single most common error on this type.`,
      ],
      ans,
      tolAgainst(ans, [normalAns, wrongTail].filter(distinct3(ans)), 0.02)
    );
  },
};

/** Same shape as `generateProblem` in practiceGenerators, scoped to Chapter 7. */
export function generateCh7Problem(topicKey?: string): PracticeProblem {
  const key = topicKey && ch7Generators[topicKey] ? topicKey : pick(ch7Topics).key;
  return ch7Generators[key]();
}

export const ch7TopicKeys = Object.keys(ch7Generators);
