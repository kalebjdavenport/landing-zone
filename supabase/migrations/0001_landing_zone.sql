create extension if not exists "pgcrypto";

create table if not exists nws_snapshots (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  lat double precision,
  lon double precision,
  generated_at timestamptz not null,
  last_success_at timestamptz not null,
  stale boolean not null default false,
  active_alerts integer not null default 0,
  severe_alerts integer not null default 0,
  top_events jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique(kind, lat, lon)
);

create table if not exists aviation_overlays (
  id text primary key,
  type text not null,
  title text not null,
  severity text not null,
  latitude double precision,
  longitude double precision,
  geometry jsonb,
  issued_at timestamptz,
  expires_at timestamptz,
  raw_text text not null,
  updated_at timestamptz not null default now()
);

create table if not exists station_observations (
  id uuid primary key default gen_random_uuid(),
  icao text not null unique,
  label text not null,
  temperature_f numeric,
  visibility_mi numeric,
  wind_speed_kt numeric,
  ceiling_ft numeric,
  category text not null default 'UNKNOWN',
  observed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists dispatcher_routes (
  id uuid primary key default gen_random_uuid(),
  route_id text not null unique,
  origin text not null,
  destination text not null,
  alternates text[] not null default '{}',
  risk text not null default 'low',
  last_computed_at timestamptz not null,
  stale boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists event_log (
  id uuid primary key,
  type text not null,
  severity text not null,
  summary text not null,
  route_id text,
  location_key text,
  occurred_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  delivery_id text not null,
  signature_ok boolean not null,
  status text not null,
  payload_hash text not null,
  processed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique(source, delivery_id)
);

alter publication supabase_realtime add table event_log;
alter publication supabase_realtime add table nws_snapshots;
alter publication supabase_realtime add table aviation_overlays;
