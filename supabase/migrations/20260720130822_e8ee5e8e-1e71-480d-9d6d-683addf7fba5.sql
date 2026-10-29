-- Restore ban_reason column-level SELECT so client queries on profiles no longer fail.
-- Row-level policy "Profiles viewable by everyone" already governs row access.
GRANT SELECT (ban_reason) ON public.profiles TO anon, authenticated;