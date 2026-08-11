/**
 * Shared math helpers.
 *
 * Every value the app grades against is computed here at runtime rather than
 * hard-coded, so a practice answer can never drift out of sync with its prompt.
 */

export function round(x: number, d = 4) {
  return Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
}

/** Abramowitz & Stegun 7.1.26 approximation. Max error ~1.5e-7. */
export function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

/** Area under the standard normal curve to the LEFT of z (what Table E gives). */
export function normalCDF(z: number) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

/** Inverse normal: given an area to the left, return z. Acklam's algorithm. */
export function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function factorial(n: number) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Combinations, written nCr or nCx in the course.
 *
 * Built up multiplicatively rather than as a ratio of factorials. Factorials
 * overflow a double at 171! and lose exactness long before that, so the ratio
 * form returns values that are subtly wrong for larger n — nCr(60,30) came out
 * 48 too high. This form stays exact well past anything this course needs.
 */
export function nCr(n: number, r: number) {
  if (r < 0 || r > n || n < 0) return 0;
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return Math.round(result);
}

/** Binomial probability of exactly x successes: nCx * p^x * q^(n-x). */
export function binomPMF(n: number, p: number, x: number) {
  return nCr(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
}

/** P(X <= x) for a binomial. */
export function binomCDF(n: number, p: number, x: number) {
  let total = 0;
  for (let i = 0; i <= x; i++) total += binomPMF(n, p, i);
  return total;
}

/**
 * Class width for a grouped frequency distribution.
 *
 * Divide the range by the number of classes and round UP. The reason for
 * rounding up is coverage: the classes have to reach the largest value. That
 * is also why an exact division still goes up a whole number — with range 75
 * and 5 classes, a width of 15 spans 12-26, 27-41, 42-56, 57-71, 72-86, and
 * the value 87 has nowhere to go. floor + 1 gives both cases at once.
 *
 * The course's own worked solutions only ever use ranges that do not divide
 * evenly, so nothing here is graded on that edge case; it is handled correctly
 * so the tool never demonstrates a distribution that fails to cover its data.
 */
export function classWidth(range: number, classes: number) {
  return Math.floor(range / classes) + 1;
}

/** Standard normal probability density, used to draw the bell curve. */
export function pdf(z: number) {
  return Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
}

/* ------------------------------------------------------------------ *
 * Student t distribution (Chapters 7 and 8)
 *
 * Both functions use the SAME orientation as normalCDF / normalInv:
 * an "area" is always the area to the LEFT. Table F in the course packet
 * is printed the other way (it lists right-tail areas at the top), so the
 * table helpers in ch7.ts and ch8.ts convert; nothing here assumes a table.
 * ------------------------------------------------------------------ */

/** Lanczos approximation of ln(gamma(x)). Accurate to ~1e-13 for x > 0. */
function logGamma(x: number): number {
  const g = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Continued fraction for the incomplete beta function (Numerical Recipes
 * betacf). Converges fast for x < (a+1)/(a+b+2); the caller flips when not.
 */
function betaCF(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3e-16;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (front * betaCF(a, b, x)) / a;
  return 1 - (front * betaCF(b, a, 1 - x)) / b;
}

/**
 * Area under the t curve to the LEFT of t, with df degrees of freedom.
 *
 * This is the t analogue of normalCDF. As df grows it converges to
 * normalCDF, which is exactly why Table F's bottom row matches Table E.
 */
export function tCDF(t: number, df: number): number {
  if (!isFinite(t)) return t > 0 ? 1 : 0;
  if (df <= 0) return NaN;
  const p = 0.5 * incompleteBeta(df / 2, 0.5, df / (df + t * t));
  return t > 0 ? 1 - p : p;
}

/**
 * Inverse t: given an area to the LEFT, return the t value.
 *
 * Bisection on tCDF rather than a closed form. It is called a handful of
 * times per problem, never in a render loop, so ~60 iterations of a
 * guaranteed-convergent method is the right trade against an approximation
 * that drifts in the tails where this course actually lives.
 */
export function tInv(area: number, df: number): number {
  if (area <= 0) return -Infinity;
  if (area >= 1) return Infinity;
  if (df <= 0) return NaN;
  if (Math.abs(area - 0.5) < 1e-15) return 0;
  let lo = -400;
  let hi = 400;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < area) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

/**
 * Two-tailed critical t for a confidence level, e.g. tCritical(0.95, 21).
 * Provided because it is the single most common lookup in Chapter 7 and
 * getting the tail split wrong is the most common way to lose those points.
 */
export function tCritical(confidence: number, df: number): number {
  return tInv(1 - (1 - confidence) / 2, df);
}

export function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Median of an ALREADY SORTED array. Returns NaN for an empty array. */
export function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const m = Math.floor(n / 2);
  return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/**
 * Quartiles by the median-of-halves method.
 *
 * This is the method this course uses (it is what produces the boxplots in
 * section 3.4). For an odd-length data set the median itself is excluded from
 * both halves. Note that other textbooks use interpolation and will sometimes
 * disagree by a small amount.
 */
export function quartiles(sorted: number[]) {
  const n = sorted.length;
  const m = Math.floor(n / 2);
  const lower = sorted.slice(0, m);
  const upper = n % 2 ? sorted.slice(m + 1) : sorted.slice(m);
  return { Q1: median(lower), Q2: median(sorted), Q3: median(upper) };
}

/** Fisher-Yates. Returns a new array; does not mutate the input. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
