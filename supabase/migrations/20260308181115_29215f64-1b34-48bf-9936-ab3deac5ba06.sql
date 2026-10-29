
-- Add optional text reason to poll_votes
ALTER TABLE public.poll_votes ADD COLUMN reason text;

-- Add text_prompt to polls (e.g. "Wieso hast du das ausgewählt?")
ALTER TABLE public.polls ADD COLUMN text_prompt text;
