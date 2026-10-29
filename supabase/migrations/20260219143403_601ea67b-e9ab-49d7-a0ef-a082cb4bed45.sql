
CREATE OR REPLACE FUNCTION public.auto_approve_api_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.expected_requests = '< 100/day' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_low_volume_applications
  BEFORE INSERT ON public.api_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_api_application();
