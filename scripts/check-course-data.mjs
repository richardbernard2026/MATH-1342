#!/usr/bin/env node
/**
 * Course data consistency check.
 *
 * src/lib/data/chapters.ts is the single source of truth for what this course
 * contains. A few places cannot import it (src/lib/db.ts is server-only and is
 * pulled into every API bundle, so it keeps literal allowlists) or must spell
 * values out for a tool that only reads literals (Tailwind cannot see a class
 * name built from a template string, so every chapter colour is written out).
 *
 * Those copies rot. When Chapters 7, 8 and 10 were added, section_progress
 * writes for 7.1 through 10.2 were rejected, Test 3 results were rejected, and
 * 34 flashcards had no way to be reached, all silently. This script asserts the
 * copies still match, and it runs as the first step of `npm run build`, so the
 * next chapter added either updates them or fails the build.
 *
 * It reads the sources as text on purpose: it has to work with no node_modules
 * installed and no TypeScript loader available.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

/* ------------------------------------------------------------- extraction */

/**
 * The contents of `export const NAME = [ ... ]`, as raw text.
 *
 * Brackets are counted rather than stopping at the first "]", because an entry
 * can hold a nested array of its own (examScopes carries a chapter list).
 * Quoted spans are skipped so a bracket inside a label cannot unbalance it.
 */
function arrayLiteral(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start === -1) return null;
  const open = source.indexOf("[", start);
  if (open === -1) return null;

  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

const quoted = (text) => [...text.matchAll(/"([^"]*)"/g)].map((m) => m[1]);

/** Keys of an object literal of the form `const NAME: Record<number, ...> = {...}`. */
function recordKeys(source, name) {
  const start = source.indexOf(`${name}: Record<number,`);
  if (start === -1) return null;
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n};", open);
  if (open === -1 || close === -1) return null;
  return new Set(
    [...source.slice(open, close).matchAll(/^\s*(\d+):/gm)].map((m) => Number(m[1]))
  );
}

const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const missing = (want, have) => [...want].filter((v) => !have.has(v));

/* ------------------------------------------------------------- the sources */

const chaptersSrc = read("src/lib/data/chapters.ts");
const dbSrc = read("src/lib/db.ts");
const pickerSrc = read("src/app/flashcards/page.tsx");
const kitSrc = read("src/components/kit.tsx");
const homeSrc = read("src/app/page.tsx");

const chapterNums = [...chaptersSrc.matchAll(/^\s*num:\s*(\d+),/gm)].map((m) => Number(m[1]));
const sectionIds = [...chaptersSrc.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);

const scopeBlock = arrayLiteral(chaptersSrc, "examScopes");
const scopeKeys = scopeBlock ? [...scopeBlock.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]) : [];

if (chapterNums.length === 0) fail("chapters.ts: could not find any chapter numbers");
if (sectionIds.length === 0) fail("chapters.ts: could not find any section ids");
if (scopeKeys.length === 0) fail("chapters.ts: could not find any examScopes keys");

/* ------------------------------------------ (a) ALLOWED_SECTIONS vs chapters */

const allowedSectionsText = arrayLiteral(dbSrc, "ALLOWED_SECTIONS");
if (allowedSectionsText === null) {
  fail("db.ts: ALLOWED_SECTIONS not found");
} else {
  const allowed = quoted(allowedSectionsText);
  const want = new Set(sectionIds);
  const have = new Set(allowed);
  const absent = missing(want, have);
  const extra = missing(have, want);
  if (absent.length) fail(`db.ts ALLOWED_SECTIONS is missing: ${absent.join(", ")}`);
  if (extra.length) fail(`db.ts ALLOWED_SECTIONS has sections not in chapters.ts: ${extra.join(", ")}`);
  if (allowed.length !== have.size) fail("db.ts ALLOWED_SECTIONS contains a duplicate");
  if (!absent.length && !extra.length) {
    notes.push(`ALLOWED_SECTIONS matches all ${want.size} section ids in chapters.ts`);
  }
}

/* ---------------------------------------------- (b) ALLOWED_SCOPES vs scopes */

const allowedScopesText = arrayLiteral(dbSrc, "ALLOWED_SCOPES");
if (allowedScopesText === null) {
  fail("db.ts: ALLOWED_SCOPES not found");
} else {
  const allowed = quoted(allowedScopesText);
  const want = new Set(scopeKeys);
  const have = new Set(allowed);
  const absent = missing(want, have);
  const extra = missing(have, want);
  if (absent.length) fail(`db.ts ALLOWED_SCOPES is missing: ${absent.join(", ")}`);
  if (extra.length) fail(`db.ts ALLOWED_SCOPES has scopes not in examScopes: ${extra.join(", ")}`);
  if (!absent.length && !extra.length) {
    notes.push(`ALLOWED_SCOPES matches all ${want.size} examScopes keys (${allowed.join(", ")})`);
  }
}

/* ------------------------- every chapter is reachable from some exam scope */

if (scopeBlock) {
  const covered = new Set(
    [...scopeBlock.matchAll(/chapters:\s*\[([^\]]*)\]/g)]
      .flatMap((m) => m[1].split(","))
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n))
  );
  const absent = missing(new Set(chapterNums), covered);
  if (absent.length) {
    fail(`no exam scope covers chapter ${absent.join(", ")}, so its questions can never be drawn`);
  }
}

/* --------------------------------------- (c) flashcards reachable per chapter */

const cardFiles = [
  "src/lib/data/flashcards.ts",
  "src/lib/data/ch7.ts",
  "src/lib/data/ch8.ts",
  "src/lib/data/ch10.ts",
];

const cardCounts = new Map();
for (const file of cardFiles) {
  const src = read(file);
  const inFlashcardArray = /Flashcard\[\]|flashcards: Flashcard/.test(src);
  if (!inFlashcardArray) continue;
  for (const m of src.matchAll(/\bF\(\s*"[^"]+"\s*,\s*(\d+)\s*,/g)) {
    const ch = Number(m[1]);
    cardCounts.set(ch, (cardCounts.get(ch) ?? 0) + 1);
  }
}

for (const num of chapterNums) {
  const n = cardCounts.get(num) ?? 0;
  if (n === 0) fail(`Chapter ${num} has no flashcards`);
}
notes.push(
  "flashcards per chapter: " +
    chapterNums.map((n) => `${n}:${cardCounts.get(n) ?? 0}`).join(" ")
);

// The chip row on the flashcards page must be built from `chapters`, not from a
// literal, or a new chapter's cards become unreachable.
if (!/const PICKER_CHAPTERS[^\n]*chapters\.map\(/.test(pickerSrc)) {
  fail("flashcards/page.tsx: PICKER_CHAPTERS must be derived from `chapters`");
}
if (/\[\s*1,\s*2,\s*3,\s*4,\s*5,\s*6\s*\]/.test(pickerSrc)) {
  fail("flashcards/page.tsx: hardcoded chapter list found");
}

/* ------------------------------- every chapter has the styling it needs */

const styleMaps = [
  ["src/components/kit.tsx", kitSrc, "badgeStyles"],
  ["src/components/kit.tsx", kitSrc, "chipActive"],
  ["src/components/kit.tsx", kitSrc, "barFill"],
  ["src/components/kit.tsx", kitSrc, "textCh"],
  ["src/components/kit.tsx", kitSrc, "borderCh"],
  ["src/components/kit.tsx", kitSrc, "gradCh"],
  ["src/app/page.tsx", homeSrc, "CH_HEX"],
];

for (const [file, src, name] of styleMaps) {
  const keys = recordKeys(src, name);
  if (!keys) {
    fail(`${file}: could not read ${name}`);
    continue;
  }
  const absent = missing(new Set(chapterNums), keys);
  if (absent.length) fail(`${file} ${name} has no entry for chapter ${absent.join(", ")}`);
}

/* --------------------------------------------------------------- report */

for (const n of notes) console.log(`  ${n}`);

if (failures.length) {
  console.error("\ncourse data check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nchapters.ts is the source of truth. Update the copies listed above to match it."
  );
  process.exit(1);
}

console.log("course data check passed");
