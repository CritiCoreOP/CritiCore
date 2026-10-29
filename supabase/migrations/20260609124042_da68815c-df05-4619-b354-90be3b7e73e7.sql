-- 1) Friendships: stop broadcasting friendship row changes over Realtime.
-- No client subscribes to friendship channels; remove the table from the
-- realtime publication so requester/addressee/status changes are not broadcast.
ALTER PUBLICATION supabase_realtime DROP TABLE public.friendships;

-- 2) Press profiles: harden the user self-update policy with an explicit
-- WITH CHECK. Privileged flags (verified/trusted) are already forced back to
-- their previous values for non-admins by the protect_press_privileged_fields
-- trigger; this adds a policy-level guard so the write path is no longer
-- open-ended and the row must still belong to the user after the update.
DROP POLICY IF EXISTS "Users can update own press profile" ON public.press_profiles;
CREATE POLICY "Users can update own press profile"
ON public.press_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);