/**
 * The starting state of the review queue, taken from the Calibration Run of
 * Aug 10 2026.
 *
 * A brand new spaced repetition system knows nothing and has to spend its
 * first few days finding out what you already know. That is days this course
 * does not have. The diagnostic already measured it, so the queue starts from
 * the answer rather than rediscovering it.
 *
 * `sureWrong` marks the items missed while confidence was 2 or 3 out of 3.
 * Those get priority in the queue and a fourth correct day before they retire.
 * That is the hypercorrection finding (Butterfield & Metcalfe): a confident
 * error corrects readily once surfaced, but comes back about a week later, so
 * one explanation is not enough. Nine items qualified.
 *
 * Provenance is on every line. Item ids are generator topic keys, so a seeded
 * item means "this method needs work", not "this exact question".
 */

import type { ItemKind } from "@/lib/scheduler";

export type SeedItem = { kind: ItemKind; id: string; sureWrong: boolean };

export const DIAGNOSTIC_SEED: SeedItem[] = [
  /* ---- missed the RULE, meaning the method itself was not identified ---- */
  { kind: "rule", id: "atleastone", sureWrong: false },      // A1, picked "add them all" in 9.5s
  { kind: "rule", id: "clt", sureWrong: true },              // A3, chose sigma/n instead of sigma/root n, confident
  { kind: "rule", id: "binomial-exact", sureWrong: false },  // A5, did not identify binomial
  { kind: "rule", id: "value-from-area", sureWrong: true },  // A6, took the 0.1000 side for a top 10% cutoff, confident
  { kind: "rule", id: "multiplication", sureWrong: true },   // A8, called cards without replacement independent, confident
  { kind: "rule", id: "classwidth", sureWrong: true },       // A9, rounded to nearest instead of up, marked CERTAIN
  { kind: "rule", id: "level", sureWrong: true },            // C1, jersey numbers read as interval, confident

  /* ---- missed the EXECUTION, meaning the arithmetic or table work failed ---- */
  { kind: "practice", id: "area-from-z", sureWrong: false }, // B2 typed 0 and gave up; C6 left blank
  { kind: "practice", id: "clt", sureWrong: false },         // B3 blank after 4.5 minutes
  { kind: "practice", id: "binomial-exact", sureWrong: false }, // B5, answered 0.72 against 0.6826
  { kind: "practice", id: "value-from-area", sureWrong: true },  // B6, landed at 179 for a cutoff above the mean
  { kind: "practice", id: "binomial-meansd", sureWrong: false }, // B9, 1.74 against 1.24
  { kind: "practice", id: "midbound", sureWrong: true },     // C2, answered 10 for a class boundary, confident
  { kind: "practice", id: "spread", sureWrong: false },      // C3, 312 seconds of correct variance work, no square root
  { kind: "practice", id: "atleastone", sureWrong: true },   // C4, P(E') = 0.48 marked CERTAIN, the easiest item on the run
  { kind: "practice", id: "multiplication", sureWrong: false },  // D2, left the without-replacement transfer item blank
  { kind: "practice", id: "ci-critical", sureWrong: false }, // D3, gave 1.56 for the 95% z
  { kind: "practice", id: "ci-margin", sureWrong: true },    // D4, computed sigma/root n exactly then never multiplied by 1.96

  /* ---- Chapters 1 to 3 scored 0 of 5 on items about three weeks old ----
     Not individually diagnosed, but the decay is measured, so these enter the
     queue as known-shaky rather than as unseen. */
  { kind: "rule", id: "midbound", sureWrong: false },
  { kind: "rule", id: "spread", sureWrong: false },
  { kind: "rule", id: "quart", sureWrong: false },           // A10 was correct but marked "guessing"
  { kind: "rule", id: "desc-inf", sureWrong: false },
  { kind: "rule", id: "var-type", sureWrong: false },
];

/**
 * Items answered correctly but with low confidence.
 *
 * Right answer, no belief behind it. That is fragile knowledge, and it is the
 * kind that fails first under exam pressure, so these enter the queue too,
 * just without the sureWrong penalty.
 */
export const FRAGILE_SEED: SeedItem[] = [
  { kind: "rule", id: "quart", sureWrong: false },           // A10 outlier fences, correct while "guessing"
  { kind: "practice", id: "atleastone", sureWrong: false },  // B1 correct after 215 seconds, "unsure"
  { kind: "practice", id: "addition", sureWrong: false },    // B4 correct after 249 seconds, "unsure"
  { kind: "practice", id: "value-from-area", sureWrong: false }, // D1 transfer item correct but "unsure"
];
