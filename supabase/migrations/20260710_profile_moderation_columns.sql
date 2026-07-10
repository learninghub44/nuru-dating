-- =============================================================================
-- Moderation columns for profiles.
--
-- 'verified' already existed and is shown as a badge everywhere (profile,
-- discover, matches, chat) — and the landing page claims "All profiles are
-- verified" — but nothing in the codebase ever set it. 'banned' didn't exist
-- at all, so a resolved report had no actual enforcement action behind it.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned) WHERE banned = TRUE;
