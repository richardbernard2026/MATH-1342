# StatLab — MATH 1342

A study system for Elementary Statistical Methods, covering Chapters 1 through 6.

Live at **https://math-1342.vercel.app**

## What's in it

**Every section has four tabs:**

- **Learn** — the concept in plain language, the formula rendered as real math, a diagram, and how it connects backward and forward to other sections
- **Work a problem** — a guided walkthrough where you produce each step yourself and get feedback before the next step unlocks
- **Playground** — sliders that move the math: watch a binomial become a bell curve, watch an outlier drag the mean while the median holds still, watch the standard error shrink as n grows
- **Explain it back** — write the concept in your own words and have it assessed against the section's actual material

**Plus five tools:**

- **Which Formula?** — yes/no questions that land you on the right formula for the problem in front of you
- **Practice** — infinite generated problems, every answer computed at generation time, with full worked solutions
- **Test Review** — timed mock exams (Test 1, Test 2, or cumulative) with per-chapter breakdowns
- **Flashcards** — Leitner spaced repetition, 60 cards, progress saved in your browser
- **AI Tutor** — Socratic by default, and scoped to whichever section you opened it from

## Running it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

All three are optional. Everything except the tutor works with none of them set.

| Variable | Purpose | If missing |
|---|---|---|
| `GROQ_API_KEY` | AI tutor and explain-it-back | Tutor shows a friendly "not connected" message |
| `DATABASE_URL` | Neon Postgres for profiles and progress | Progress stays in the browser only |
| `ADMIN_SECRET` | Passphrase for `/admin-1342` | Admin returns "not configured" |

**You do not need to run `schema.sql` by hand.** The app creates its tables on first use — the DDL is idempotent and lives in `ensureSchema()` in `src/lib/db.ts`. `schema.sql` is kept as readable reference and for anyone who prefers to set the database up explicitly; if you do run it, use the Neon SQL editor at console.neon.tech, since the Query browser embedded in Vercel is read-only and rejects `CREATE TABLE`.

If a database call does fail, the reason is written to the Vercel runtime logs (with credentials scrubbed) rather than swallowed. Look under **Logs** in the project, filtered to `/api/`.

For local development, copy `.env.example` to `.env.local` and fill it in. `.env.local` is gitignored and must never be committed.

On Vercel, set these under **Settings → Environment Variables**, then redeploy — environment variables only take effect on a new build.

Get a free Groq key at https://console.groq.com/keys. Generate a strong `ADMIN_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## Pushing this to GitHub

From inside this `statlab` folder:

```bash
git init
git add -A
git commit -m "StatLab: full six-chapter study app"
git branch -M main
git remote add origin https://github.com/richardbernard2026/MATH-1342.git
git push -u origin main --force
```

The `--force` is deliberate: it replaces the old static site in that repo. If you want to keep the old version, make a branch first:

```bash
git clone https://github.com/richardbernard2026/MATH-1342.git old-site-backup
```

Once pushed, connect the repo in Vercel (**Settings → Git**) and every future push deploys automatically.

## Project layout

```
src/
  app/
    page.tsx                     home
    chapter/[num]/page.tsx       chapter hub
    chapter/[num]/[section]/     the four-tab section page
    formula/                     decision-tree formula finder
    practice/                    infinite problem generator
    test-review/                 timed mock exams
    flashcards/                  spaced repetition
    tutor/                       AI tutor chat
    admin-1342/                  study-data dashboard (passphrase protected)
    api/
      tutor/                     streaming Groq chat, scoped per section
      profile/                   create/load a study profile
      progress/                  record sections, practice, exams
      admin/                     dashboard data
  components/
    kit.tsx                      shared UI, navbar, chapter colours
    fx.tsx                       spotlight cards, progress rings, sparkline
    NameGate.tsx                 first-visit name prompt
    MathText.tsx                 the single KaTeX renderer used everywhere
    Diagram.tsx                  17 hand-built SVG diagrams
    GuidedExample.tsx            step-by-step problem walkthrough
    Playground.tsx               interactive parameter explorers
    ExplainItBack.tsx            self-explanation with AI feedback
  lib/
    math.ts                      statistical helpers
    db.ts                        Neon client, validation, rate limiting
    practiceGenerators.ts        19 problem generators
    data/
      chapters.ts  lessons.ts  flashcards.ts
      testBank.ts  guidedExamples.ts  decisionTrees.ts
```

## Notes on the content

**Quartiles use the median-of-halves method** — Q1 is the median of the lower half, Q3 the median of the upper half, with the median itself excluded when n is odd. This matches how the course does boxplots in section 3.4. Other textbooks interpolate and will sometimes differ slightly.

**Everything numeric is verified.** All 51 numeric answers across the guided examples were independently recomputed and matched. The 60 test-bank questions were checked for valid answer indices, the 6 decision trees for unreachable nodes and cycles, and every practice generator computes its answer from the same random values used to build its prompt.

## Security notes

- Secrets are read from the server environment only and never reach the browser
- The admin dashboard renders all values through React, which escapes by default; the previous static version concatenated strings into `innerHTML` and was vulnerable to stored XSS
- Progress endpoints validate UUIDs properly and restrict section ids and exam scopes to a fixed allowlist
- Cross-origin writes are rejected by exact host match, not a suffix check
- The admin endpoint rate-limits per address and globally, and compares the passphrase in constant time over fixed-width hashes
- All database queries use parameterized tagged templates

## Privacy

**This stores real names.** On first visit the site asks for a first name and saves it, along with every section opened, every practice answer, and every mock exam score. All of it is visible to whoever holds the `ADMIN_SECRET` at `/admin-1342`.

That makes this personal data, not anonymous analytics. If you share the link with classmates, tell them directly — the notice on the name prompt is honest, but a person deserves to hear it from you rather than read it in a modal. What is *not* collected: emails, passwords, IP addresses, and anything that identifies a device.

To delete one person's data entirely:

```sql
DELETE FROM profiles WHERE first_name = 'Name';
```

Every other table cascades from that. To wipe everything at the end of the semester:

```sql
TRUNCATE profiles CASCADE;
```
