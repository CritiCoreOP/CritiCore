
-- Polls table
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  allow_anonymous boolean NOT NULL DEFAULT false,
  multiple_choice boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Poll options
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- Poll votes
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS for polls
CREATE POLICY "Polls viewable by everyone" ON public.polls FOR SELECT USING (status = 'active' OR status = 'closed' OR created_by = auth.uid());
CREATE POLICY "Admin/Press can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() = created_by AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'press')));
CREATE POLICY "Creators can update own polls" ON public.polls FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete own polls" ON public.polls FOR DELETE USING (auth.uid() = created_by);

-- RLS for poll_options
CREATE POLICY "Options viewable by everyone" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Poll creator can insert options" ON public.poll_options FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND created_by = auth.uid()));
CREATE POLICY "Poll creator can update options" ON public.poll_options FOR UPDATE USING (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND created_by = auth.uid()));
CREATE POLICY "Poll creator can delete options" ON public.poll_options FOR DELETE USING (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND created_by = auth.uid()));

-- RLS for poll_votes
CREATE POLICY "Votes viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
