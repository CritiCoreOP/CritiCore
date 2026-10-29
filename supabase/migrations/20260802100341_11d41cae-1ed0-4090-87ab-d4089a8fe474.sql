CREATE TABLE public.api_status_events (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  service_name text not null,
  status text not null check (status in ('operational','degraded','down','unconfigured')),
  detail text,
  latency_ms integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX api_status_events_service_idx ON public.api_status_events (service_id, started_at DESC);
CREATE UNIQUE INDEX api_status_events_open_idx ON public.api_status_events (service_id) WHERE ended_at IS NULL;

GRANT SELECT ON public.api_status_events TO anon;
GRANT SELECT ON public.api_status_events TO authenticated;
GRANT ALL ON public.api_status_events TO service_role;

ALTER TABLE public.api_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status timeline is public" ON public.api_status_events FOR SELECT USING (true);