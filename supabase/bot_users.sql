-- Create table for Telegram bot users.
-- Run this in Supabase SQL Editor.

create table if not exists public.bot_users (
  id bigserial primary key,
  telegram_id bigint not null unique,
  chat_id bigint,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_bot boolean,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bot_users_set_updated_at on public.bot_users;
create trigger bot_users_set_updated_at
before update on public.bot_users
for each row
execute procedure public.set_updated_at();

