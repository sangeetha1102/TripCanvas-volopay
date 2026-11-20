-- TripCanvas Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Location: supabase/schema.sql
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  destination text not null check (char_length(trim(destination)) > 0),
  start_date date not null,
  end_date date not null,
  travellers integer not null default 1 check (travellers >= 1),
  budget numeric(12, 2) not null default 0 check (budget >= 0),
  currency text not null default 'USD' check (char_length(trim(currency)) between 3 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_valid_date_range check (end_date >= start_date)
);

create table if not exists public.itinerary_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day integer not null check (day >= 1),
  title text not null check (char_length(trim(title)) > 0),
  location text not null default '',
  time text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Personal Access Tokens for user-scoped MCP clients (Claude Desktop / Remote MCP)
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  token_hash text not null unique,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_trips_user_id_start_date
  on public.trips (user_id, start_date asc);

create index if not exists idx_itinerary_activities_trip_id_day_time
  on public.itinerary_activities (trip_id, day asc, time asc);

create index if not exists idx_itinerary_activities_user_id
  on public.itinerary_activities (user_id);

create index if not exists idx_mcp_tokens_user_id
  on public.mcp_tokens (user_id);

create index if not exists idx_mcp_tokens_token_hash
  on public.mcp_tokens (token_hash);

-- ---------------------------------------------------------------------------
-- 3. Automatic updated_at Trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
  before update on public.trips
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_itinerary_activities_updated_at on public.itinerary_activities;
create trigger set_itinerary_activities_updated_at
  before update on public.itinerary_activities
  for each row
  execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- ---------------------------------------------------------------------------

alter table public.trips enable row level security;
alter table public.itinerary_activities enable row level security;
alter table public.mcp_tokens enable row level security;

-- Trips policies
drop policy if exists "Users can view their own trips" on public.trips;
create policy "Users can view their own trips"
  on public.trips for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own trips" on public.trips;
create policy "Users can create their own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own trips" on public.trips;
create policy "Users can update their own trips"
  on public.trips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own trips" on public.trips;
create policy "Users can delete their own trips"
  on public.trips for delete
  using (auth.uid() = user_id);

-- Itinerary Activities policies (enforces both user_id and parent trip ownership)
drop policy if exists "Users can view their own itinerary activities" on public.itinerary_activities;
create policy "Users can view their own itinerary activities"
  on public.itinerary_activities for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert itinerary activities into their own trips" on public.itinerary_activities;
create policy "Users can insert itinerary activities into their own trips"
  on public.itinerary_activities for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own itinerary activities" on public.itinerary_activities;
create policy "Users can update their own itinerary activities"
  on public.itinerary_activities for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own itinerary activities" on public.itinerary_activities;
create policy "Users can delete their own itinerary activities"
  on public.itinerary_activities for delete
  using (auth.uid() = user_id);

-- MCP Tokens policies
drop policy if exists "Users can view their own MCP tokens" on public.mcp_tokens;
create policy "Users can view their own MCP tokens"
  on public.mcp_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own MCP tokens" on public.mcp_tokens;
create policy "Users can create their own MCP tokens"
  on public.mcp_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own MCP tokens" on public.mcp_tokens;
create policy "Users can delete their own MCP tokens"
  on public.mcp_tokens for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Enable Realtime (keeps TripCanvas live-synced with MCP edits)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'itinerary_activities'
  ) then
    alter publication supabase_realtime add table public.itinerary_activities;
  end if;
end $$;
