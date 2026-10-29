
-- Create review_reactions table for likes, dislikes, kudos
CREATE TABLE public.review_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'kudos')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reactions
CREATE POLICY "Anyone can view reactions"
ON public.review_reactions FOR SELECT
TO authenticated
USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add reactions"
ON public.review_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON public.review_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
