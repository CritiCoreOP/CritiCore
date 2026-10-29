
-- Friendships table (bidirectional friend requests)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- Activity feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_id TEXT,
  media_type TEXT,
  media_poster TEXT,
  target_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shared watchlists
CREATE TABLE public.shared_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.shared_watchlist_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES public.shared_watchlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, user_id)
);

CREATE TABLE public.shared_watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES public.shared_watchlists(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_title TEXT NOT NULL,
  media_poster TEXT,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_friend(_user_id UUID, _friend_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _user_id AND addressee_id = _friend_id)
        OR (requester_id = _friend_id AND addressee_id = _user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_shared_watchlist_member(_user_id UUID, _watchlist_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_watchlist_members
    WHERE watchlist_id = _watchlist_id AND user_id = _user_id
  )
$$;

-- RLS: friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id AND requester_id != addressee_id);

CREATE POLICY "Users can update own friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS: activity_feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity viewable by friends and self" ON public.activity_feed
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_friend(auth.uid(), user_id)
  );

CREATE POLICY "Users can insert own activity" ON public.activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity" ON public.activity_feed
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: shared_watchlists
ALTER TABLE public.shared_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Watchlist viewable by members" ON public.shared_watchlists
  FOR SELECT USING (is_shared_watchlist_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Users can create watchlists" ON public.shared_watchlists
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update watchlist" ON public.shared_watchlists
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete watchlist" ON public.shared_watchlists
  FOR DELETE USING (auth.uid() = created_by);

-- RLS: shared_watchlist_members
ALTER TABLE public.shared_watchlist_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by watchlist members" ON public.shared_watchlist_members
  FOR SELECT USING (is_shared_watchlist_member(auth.uid(), watchlist_id));

CREATE POLICY "Creator can add members" ON public.shared_watchlist_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.shared_watchlists WHERE id = watchlist_id AND created_by = auth.uid())
    AND is_friend(auth.uid(), user_id)
  );

CREATE POLICY "Creator can remove members" ON public.shared_watchlist_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.shared_watchlists WHERE id = watchlist_id AND created_by = auth.uid())
    OR auth.uid() = user_id
  );

-- RLS: shared_watchlist_items
ALTER TABLE public.shared_watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items viewable by watchlist members" ON public.shared_watchlist_items
  FOR SELECT USING (is_shared_watchlist_member(auth.uid(), watchlist_id));

CREATE POLICY "Members can add items" ON public.shared_watchlist_items
  FOR INSERT WITH CHECK (
    auth.uid() = added_by
    AND is_shared_watchlist_member(auth.uid(), watchlist_id)
  );

CREATE POLICY "Members can remove own items" ON public.shared_watchlist_items
  FOR DELETE USING (
    auth.uid() = added_by
    OR EXISTS (SELECT 1 FROM public.shared_watchlists WHERE id = watchlist_id AND created_by = auth.uid())
  );

-- Index for performance
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX idx_shared_watchlist_members_user ON public.shared_watchlist_members(user_id);
CREATE INDEX idx_shared_watchlist_items_watchlist ON public.shared_watchlist_items(watchlist_id);

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
