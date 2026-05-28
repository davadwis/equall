-- Supabase SQL setup for equall split bill app
-- Run this in your Supabase project's SQL editor

-- 1. Create the sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS sessions_slug_idx ON public.sessions (slug);

-- 2. Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 3. Policy: allow public read (SELECT)
DROP POLICY IF EXISTS "allow public read" ON public.sessions;
CREATE POLICY "allow public read"
  ON public.sessions
  FOR SELECT
  USING (true);

-- 4. Policy: allow public insert
DROP POLICY IF EXISTS "allow public insert" ON public.sessions;
CREATE POLICY "allow public insert"
  ON public.sessions
  FOR INSERT
  WITH CHECK (true);

-- 5. Policy: allow public update
DROP POLICY IF EXISTS "allow public update" ON public.sessions;
CREATE POLICY "allow public update"
  ON public.sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- AUTO-DELETE: sessions older than 48 hours
-- Uses pg_cron (available on all Supabase plans)
-- Run steps 6 and 7 separately in the SQL editor
-- ============================================================

-- 6. Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 7. Schedule cleanup job: runs every hour, deletes sessions > 48 hours old
-- To change retention: replace INTERVAL '48 hours' with e.g. INTERVAL '24 hours'
SELECT cron.schedule(
  'delete-old-equall-sessions',         -- job name (unique)
  '0 * * * *',                          -- cron: every hour at :00
  $$
    DELETE FROM public.sessions
    WHERE created_at < NOW() - INTERVAL '48 hours';
  $$
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('delete-old-equall-sessions');
