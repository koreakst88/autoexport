-- AutoExport vehicle specification registry.
-- Run in Supabase SQL Editor after 20260627_calc_foundation.sql.
-- This table is the source of truth for exact lot power matching.

create extension if not exists pgcrypto;

create table if not exists public.vehicle_specs (
  id bigserial primary key,
  brand text not null,
  model text not null,
  generation text,
  badge_detail text,
  badge_detail_norm text not null,
  fuel_type text,
  fuel_type_norm text not null default '',
  engine_cc integer not null,
  drive_type text,
  year_from integer,
  year_to integer,
  power_hp integer,
  source text not null default 'manual',
  source_url text,
  verification_status text not null default 'pending',
  confidence integer not null default 0,
  observed_power_hp integer,
  observed_power_source text,
  matched_count integer not null default 0,
  sample_encar_ids text[] not null default '{}'::text[],
  notes text,
  verified_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_specs_power_hp_check check (power_hp is null or power_hp > 0),
  constraint vehicle_specs_confidence_check check (confidence >= 0 and confidence <= 100),
  constraint vehicle_specs_verification_status_check check (
    verification_status in ('verified', 'pending', 'rejected')
  )
);

drop trigger if exists vehicle_specs_set_updated_at on public.vehicle_specs;
create trigger vehicle_specs_set_updated_at
before update on public.vehicle_specs
for each row
execute procedure public.set_updated_at();

create unique index if not exists vehicle_specs_unique_match_idx
  on public.vehicle_specs(
    lower(brand),
    lower(model),
    badge_detail_norm,
    fuel_type_norm,
    engine_cc,
    coalesce(drive_type, ''),
    coalesce(year_from, -1),
    coalesce(year_to, -1)
  );

create index if not exists vehicle_specs_lookup_idx
  on public.vehicle_specs(
    lower(brand),
    lower(model),
    badge_detail_norm,
    fuel_type_norm,
    engine_cc,
    verification_status
  );

create index if not exists vehicle_specs_status_idx
  on public.vehicle_specs(verification_status, confidence, matched_count desc);

alter table public.cars add column if not exists vehicle_spec_id bigint references public.vehicle_specs(id);
alter table public.cars add column if not exists power_verified boolean not null default false;

create index if not exists cars_vehicle_spec_id_idx on public.cars(vehicle_spec_id);
create index if not exists cars_power_verified_idx on public.cars(power_verified);
