-- AutoExport dealer-grade calculation foundation.
-- Run this file in Supabase SQL Editor.
-- It is intentionally non-destructive: no truncate/drop, only safe creates/adds.

create extension if not exists pgcrypto;

-- Shared updated_at trigger helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Extend cars with fields needed for accurate calculations and dealer checks.
alter table public.cars add column if not exists power_hp integer;
alter table public.cars add column if not exists power_source text;
alter table public.cars add column if not exists power_note text;
alter table public.cars add column if not exists hybrid_type text;
alter table public.cars add column if not exists usage_type text;
alter table public.cars add column if not exists is_rental boolean;
alter table public.cars add column if not exists is_taxi boolean;
alter table public.cars add column if not exists is_commercial boolean;
alter table public.cars add column if not exists accident_history jsonb not null default '{}'::jsonb;
alter table public.cars add column if not exists insurance_history jsonb not null default '{}'::jsonb;
alter table public.cars add column if not exists insurance_payout_count integer;
alter table public.cars add column if not exists insurance_payout_total_krw bigint;
alter table public.cars add column if not exists owners_count integer;
alter table public.cars add column if not exists inspection_status text;
alter table public.cars add column if not exists vehicle_no text;
alter table public.cars add column if not exists source_detail_payload jsonb not null default '{}'::jsonb;
alter table public.cars add column if not exists data_confidence numeric(5,2);
alter table public.cars add column if not exists data_warnings text[] not null default '{}'::text[];

create index if not exists cars_power_hp_idx on public.cars(power_hp);
create index if not exists cars_usage_type_idx on public.cars(usage_type);
create index if not exists cars_data_confidence_idx on public.cars(data_confidence);
create index if not exists cars_source_detail_payload_gin_idx on public.cars using gin(source_detail_payload);

-- 2) Currency rates. Keep a history, never overwrite silently.
create table if not exists public.currency_rates (
  id bigserial primary key,
  rate_date date not null,
  base_currency text not null,
  quote_currency text not null,
  nominal numeric(18,6) not null default 1,
  rate numeric(18,8) not null,
  source text not null,
  source_url text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (rate_date, base_currency, quote_currency, source)
);

create index if not exists currency_rates_lookup_idx
  on public.currency_rates(rate_date desc, base_currency, quote_currency, source);

-- 3) Utilization fee rules. Data-driven replacement for hardcoded util coefficients.
create table if not exists public.util_rules (
  id bigserial primary key,
  country_code text not null default 'RU',
  importer_type text not null default 'individual',
  vehicle_age_from_months numeric(8,2) not null,
  vehicle_age_to_months numeric(8,2),
  power_hp_from integer not null,
  power_hp_to integer,
  base_rate_rub numeric(14,2) not null default 20000,
  coefficient numeric(12,4) not null,
  valid_from date not null,
  valid_to date,
  source text,
  source_url text,
  rule_version text not null default 'manual-2026-06-27',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists util_rules_set_updated_at on public.util_rules;
create trigger util_rules_set_updated_at
before update on public.util_rules
for each row
execute procedure public.set_updated_at();

create index if not exists util_rules_lookup_idx
  on public.util_rules(country_code, importer_type, valid_from, valid_to, vehicle_age_from_months, vehicle_age_to_months, power_hp_from, power_hp_to);

create unique index if not exists util_rules_unique_idx
  on public.util_rules(country_code, importer_type, rule_version, valid_from, vehicle_age_from_months, coalesce(vehicle_age_to_months, -1), power_hp_from, coalesce(power_hp_to, -1));

-- 4) Customs duty rules. Supports percent-of-value and minimum EUR/cc logic.
create table if not exists public.customs_rules (
  id bigserial primary key,
  country_code text not null,
  importer_type text not null default 'individual',
  vehicle_age_from_months numeric(8,2) not null,
  vehicle_age_to_months numeric(8,2),
  engine_cc_from integer not null,
  engine_cc_to integer,
  duty_percent numeric(8,5) not null default 0,
  min_eur_per_cc numeric(8,3),
  fixed_fee_rub numeric(14,2),
  valid_from date not null,
  valid_to date,
  source text,
  source_url text,
  rule_version text not null default 'manual-2026-06-27',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists customs_rules_set_updated_at on public.customs_rules;
create trigger customs_rules_set_updated_at
before update on public.customs_rules
for each row
execute procedure public.set_updated_at();

create index if not exists customs_rules_lookup_idx
  on public.customs_rules(country_code, importer_type, valid_from, valid_to, vehicle_age_from_months, vehicle_age_to_months, engine_cc_from, engine_cc_to);

create unique index if not exists customs_rules_unique_idx
  on public.customs_rules(country_code, importer_type, rule_version, valid_from, vehicle_age_from_months, coalesce(vehicle_age_to_months, -1), engine_cc_from, coalesce(engine_cc_to, -1));

-- 5) Customs clearance fees by vehicle value in USD.
create table if not exists public.customs_fee_rules (
  id bigserial primary key,
  country_code text not null default 'RU',
  importer_type text not null default 'individual',
  value_usd_from numeric(14,2) not null default 0,
  value_usd_to numeric(14,2),
  fee_rub numeric(14,2) not null,
  valid_from date not null,
  valid_to date,
  source text,
  source_url text,
  rule_version text not null default 'manual-2026-06-27',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists customs_fee_rules_set_updated_at on public.customs_fee_rules;
create trigger customs_fee_rules_set_updated_at
before update on public.customs_fee_rules
for each row
execute procedure public.set_updated_at();

create index if not exists customs_fee_rules_lookup_idx
  on public.customs_fee_rules(country_code, importer_type, valid_from, valid_to, value_usd_from, value_usd_to);

create unique index if not exists customs_fee_rules_unique_idx
  on public.customs_fee_rules(country_code, importer_type, rule_version, valid_from, value_usd_from, coalesce(value_usd_to, -1));

-- 6) Logistics tariffs. These are business tariffs, not official government data.
create table if not exists public.logistics_rates (
  id bigserial primary key,
  origin_country text not null default 'KR',
  origin_city text,
  destination_country text not null,
  destination_city text not null,
  route_name text,
  freight_usd numeric(14,2),
  freight_rub numeric(14,2),
  local_delivery_rub numeric(14,2),
  port_fee_rub numeric(14,2),
  currency text not null default 'RUB',
  valid_from date not null,
  valid_to date,
  source text,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists logistics_rates_set_updated_at on public.logistics_rates;
create trigger logistics_rates_set_updated_at
before update on public.logistics_rates
for each row
execute procedure public.set_updated_at();

create index if not exists logistics_rates_lookup_idx
  on public.logistics_rates(destination_country, destination_city, valid_from, valid_to);

create unique index if not exists logistics_rates_unique_idx
  on public.logistics_rates(destination_country, destination_city, coalesce(route_name, ''), valid_from, coalesce(source, ''));

-- 7) Broker and document fees.
create table if not exists public.broker_fees (
  id bigserial primary key,
  country_code text not null,
  importer_type text not null default 'individual',
  service_name text not null,
  amount_rub numeric(14,2),
  amount_local numeric(14,2),
  currency text not null default 'RUB',
  valid_from date not null,
  valid_to date,
  source text,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists broker_fees_set_updated_at on public.broker_fees;
create trigger broker_fees_set_updated_at
before update on public.broker_fees
for each row
execute procedure public.set_updated_at();

create index if not exists broker_fees_lookup_idx
  on public.broker_fees(country_code, importer_type, service_name, valid_from, valid_to);

create unique index if not exists broker_fees_unique_idx
  on public.broker_fees(country_code, importer_type, service_name, valid_from, coalesce(source, ''));

-- 8) Immutable calculation snapshots. This is the evidence trail for dealer/client quotes.
create table if not exists public.calc_snapshots (
  id bigserial primary key,
  quote_id uuid default gen_random_uuid(),
  car_encar_id text,
  car_id bigint,
  country_code text not null,
  importer_type text not null default 'individual',
  destination_city text,
  calc_version text not null,
  inputs jsonb not null,
  rates jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  result jsonb not null,
  car_price_rub bigint,
  customs_duty_rub bigint,
  customs_fee_rub bigint,
  util_rub bigint,
  freight_rub bigint,
  broker_rub bigint,
  total_rub bigint,
  total_local bigint,
  currency text,
  source text not null default 'autoexport',
  notes text,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists calc_snapshots_car_encar_id_idx on public.calc_snapshots(car_encar_id);
create index if not exists calc_snapshots_quote_id_idx on public.calc_snapshots(quote_id);
create index if not exists calc_snapshots_calculated_at_idx on public.calc_snapshots(calculated_at desc);
create index if not exists calc_snapshots_result_gin_idx on public.calc_snapshots using gin(result);

-- 9) Audit cases compare AutoExport against Korex/broker/manual reference numbers.
create table if not exists public.calc_audit_cases (
  id bigserial primary key,
  source text not null,
  source_url text,
  car_name text not null,
  car_encar_id text,
  country_code text not null default 'RU',
  importer_type text not null default 'individual',
  price_krw bigint not null,
  year integer not null,
  month integer not null default 6,
  engine_cc integer not null,
  power_hp integer,
  brand text,
  model text,
  badge_detail text,
  fuel_type text,
  expected_car_price_rub bigint,
  expected_customs_duty_rub bigint,
  expected_customs_fee_rub bigint,
  expected_util_rub bigint,
  expected_freight_rub bigint,
  expected_broker_rub bigint,
  expected_total_rub bigint not null,
  actual_total_rub bigint,
  actual_result jsonb,
  delta_rub bigint,
  delta_percent numeric(8,4),
  status text not null default 'pending',
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists calc_audit_cases_set_updated_at on public.calc_audit_cases;
create trigger calc_audit_cases_set_updated_at
before update on public.calc_audit_cases
for each row
execute procedure public.set_updated_at();

create index if not exists calc_audit_cases_status_idx on public.calc_audit_cases(status);
create index if not exists calc_audit_cases_car_encar_id_idx on public.calc_audit_cases(car_encar_id);

-- 10) Optional seed values matching current app defaults.
-- Keep them as manual source until replaced by confirmed official/business tables.
insert into public.util_rules (
  country_code,
  importer_type,
  vehicle_age_from_months,
  vehicle_age_to_months,
  power_hp_from,
  power_hp_to,
  base_rate_rub,
  coefficient,
  valid_from,
  source,
  source_url,
  rule_version,
  notes
) values
  -- Age < 3 years.
  ('RU', 'individual', 0, 36, 0, 90, 20000, 5.93, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 91, 150, 20000, 17.07, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 151, 200, 20000, 44.24, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 201, 300, 20000, 140.52, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 301, 400, 20000, 149.44, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 401, 500, 20000, 347.18, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 501, null, 20000, 714.94, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  -- Age 3 to 4.5 years.
  ('RU', 'individual', 36, 54, 0, 90, 20000, 1.67, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 91, 150, 20000, 6.31, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 151, 200, 20000, 12.98, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 201, 300, 20000, 17.57, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 301, 400, 20000, 35.14, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 401, 500, 20000, 60.75, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 54, 501, null, 20000, 122.38, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  -- Age >= 4.5 years.
  ('RU', 'individual', 54, null, 0, 90, 20000, 1.67, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 91, 150, 20000, 6.31, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 151, 200, 20000, 74.64, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 201, 300, 20000, 91.92, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 301, 400, 20000, 107.44, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 401, 500, 20000, 234.21, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 54, null, 501, null, 20000, 469.42, date '2026-06-27', 'manual', null, 'manual-2026-06-27', 'Current app formula')
on conflict do nothing;

insert into public.customs_rules (
  country_code,
  importer_type,
  vehicle_age_from_months,
  vehicle_age_to_months,
  engine_cc_from,
  engine_cc_to,
  duty_percent,
  min_eur_per_cc,
  valid_from,
  source,
  rule_version,
  notes
) values
  -- Age < 3 years: 48%, but not less than EUR/cc.
  ('RU', 'individual', 0, 36, 0, 1000, 0.48, 2.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 1001, 1500, 0.48, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 1501, 1800, 0.48, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 1801, 2300, 0.48, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 2301, 3000, 0.48, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 0, 36, 3001, null, 0.48, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  -- Age 3 to 5 years.
  ('RU', 'individual', 36, 60, 0, 1000, 0.154, 1.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 60, 1001, 1500, 0.154, 1.7, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 60, 1501, 1800, 0.154, 2.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 60, 1801, 2300, 0.154, 2.7, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 60, 2301, 3000, 0.154, 3.0, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 36, 60, 3001, null, 0.154, 3.6, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  -- Age > 5 years.
  ('RU', 'individual', 60, null, 0, 1000, 0.2, 3.0, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 60, null, 1001, 1500, 0.2, 3.2, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 60, null, 1501, 1800, 0.2, 3.5, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 60, null, 1801, 2300, 0.2, 4.8, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 60, null, 2301, 3000, 0.2, 5.0, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 60, null, 3001, null, 0.2, 5.7, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula')
on conflict do nothing;

insert into public.customs_fee_rules (
  country_code,
  importer_type,
  value_usd_from,
  value_usd_to,
  fee_rub,
  valid_from,
  source,
  rule_version,
  notes
) values
  ('RU', 'individual', 0, 10000, 6187, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 10000.01, 20000, 10500, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 20000.01, 40000, 14256, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula'),
  ('RU', 'individual', 40000.01, null, 20608, date '2026-06-27', 'manual', 'manual-2026-06-27', 'Current app formula')
on conflict do nothing;

insert into public.logistics_rates (
  destination_country,
  destination_city,
  route_name,
  freight_usd,
  valid_from,
  source,
  notes
) values
  ('RU', 'Владивосток', 'KR port -> Vladivostok', 1200, date '2026-06-27', 'manual', 'Current app default'),
  ('KZ', 'Алматы', 'KR port -> Almaty', 1560, date '2026-06-27', 'manual', 'Current app default'),
  ('KG', 'Бишкек', 'KR port -> Bishkek', 1200, date '2026-06-27', 'manual', 'Current app default'),
  ('UZ', 'Ташкент', 'KR port -> Tashkent', 1950, date '2026-06-27', 'manual', 'Current app default')
on conflict do nothing;

insert into public.broker_fees (
  country_code,
  importer_type,
  service_name,
  amount_rub,
  valid_from,
  source,
  notes
) values
  ('RU', 'individual', 'broker_sbkts_epts', 90000, date '2026-06-27', 'manual', 'Current app default'),
  ('KZ', 'individual', 'documents', 14190, date '2026-06-27', 'manual', 'Current app default: 200 USD * 70.95'),
  ('KG', 'individual', 'documents', 14190, date '2026-06-27', 'manual', 'Current app default: 200 USD * 70.95'),
  ('UZ', 'individual', 'documents', 14190, date '2026-06-27', 'manual', 'Current app default: 200 USD * 70.95')
on conflict do nothing;
