
CREATE TABLE public.media_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_title TEXT NOT NULL,
  media_poster TEXT,
  status TEXT NOT NULL DEFAULT 'watched',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id, media_type)
);

ALTER TABLE public.media_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own status" ON public.media_status FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own status" ON public.media_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own status" ON public.media_status FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own status" ON public.media_status FOR DELETE TO authenticated USING (auth.uid() = user_id);
