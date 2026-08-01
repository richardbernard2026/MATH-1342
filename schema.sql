-- StatLab database schema
--
-- Run these in the Neon SQL editor at console.neon.tech, one statement at a
-- time. The embedded Vercel "Query" browser is read-only and will reject
-- CREATE TABLE with "cannot execute CREATE TABLE in a read-only transaction".
--
-- Every statement is safe to re-run.
--
-- PRIVACY NOTE: the profiles table stores a first name. That makes this
-- personal data, not anonymous data. Anyone you share the site with should be
-- told that their name, their quiz scores, and their study activity are all
-- recorded and visible to you.

-- ---------------------------------------------------------------- profiles
-- One row per person. The uuid is generated in their browser and is what links
-- a returning visitor back to their profile.
CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  uuid        TEXT UNIQUE NOT NULL,
  first_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  last_seen   TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------- section progress
-- One row per person per section. Tracks how far through a section they got.
CREATE TABLE IF NOT EXISTS section_progress (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  section_id        TEXT NOT NULL,
  viewed            BOOLEAN DEFAULT false,
  guided_completed  BOOLEAN DEFAULT false,
  guided_first_try  INTEGER,
  guided_steps      INTEGER,
  explained         BOOLEAN DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, section_id)
);

-- ---------------------------------------------------------- practice stats
-- Running accuracy per chapter, used to work out which chapter is weakest.
CREATE TABLE IF NOT EXISTS practice_stats (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  chapter     INTEGER NOT NULL,
  attempted   INTEGER DEFAULT 0,
  correct     INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, chapter)
);

-- ------------------------------------------------------------ exam results
-- One row per completed test review, with the per-chapter breakdown stored as
-- JSON so it works for any exam scope without new columns.
-- `total > 0` is enforced here as well as in the API, because every percentage
-- on the dashboard divides by it.
CREATE TABLE IF NOT EXISTS exam_results (
  id           SERIAL PRIMARY KEY,
  profile_id   INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  scope        TEXT NOT NULL,
  score        INTEGER NOT NULL,
  total        INTEGER NOT NULL CHECK (total > 0),
  seconds      INTEGER,
  breakdown    JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------ indexes
CREATE INDEX IF NOT EXISTS idx_profiles_uuid       ON profiles(uuid);
CREATE INDEX IF NOT EXISTS idx_section_profile     ON section_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_practice_profile    ON practice_stats(profile_id);
CREATE INDEX IF NOT EXISTS idx_exam_profile        ON exam_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_exam_created        ON exam_results(created_at);

-- --------------------------------------------------------- useful queries
-- Delete one person's data entirely (cascades to every table):
--   DELETE FROM profiles WHERE first_name = 'Name';
--
-- Wipe everything at the end of the semester:
--   TRUNCATE profiles CASCADE;
