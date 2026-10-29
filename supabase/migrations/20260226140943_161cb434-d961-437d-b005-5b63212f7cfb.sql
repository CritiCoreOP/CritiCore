
-- Create a function that allows anyone to look up a ticket's public status by ID
-- This avoids needing a permissive SELECT policy on the full table
CREATE OR REPLACE FUNCTION public.lookup_ticket_status(ticket_id uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  category text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.subject, t.category, t.status, t.created_at
  FROM public.support_tickets t
  WHERE t.id = ticket_id
  LIMIT 1;
$$;
