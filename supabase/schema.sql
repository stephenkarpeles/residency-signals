-- Residency Signals + Interview Picker
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Before you use the app:
-- 1. Create a project at https://supabase.com
-- 2. Authentication → Sign In / Providers → Email: leave Email enabled.
--    Turn OFF "Confirm email" if you want to sign in immediately.
--    Leave it on if you want a confirmation message first.
-- 3. Project Settings → API: copy the Project URL and the anon public key
--    into .env.local as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
-- 4. Restart the dev server.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_boards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- selections also stores specialties: string[] (the applicant's saved specialty choice)
  selections jsonb not null default '{}'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.picker_boards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  program_ids jsonb not null default '[]'::jsonb,
  orders jsonb not null default '{}'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  confirmed jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.signal_boards enable row level security;
alter table public.picker_boards enable row level security;

drop policy if exists "Read own profile" on public.profiles;
drop policy if exists "Insert own profile" on public.profiles;
drop policy if exists "Update own profile" on public.profiles;
drop policy if exists "Own signal board" on public.signal_boards;
drop policy if exists "Own picker board" on public.picker_boards;

create policy "Read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Own signal board"
  on public.signal_boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Own picker board"
  on public.picker_boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.signal_boards to authenticated;
grant select, insert, update, delete on public.picker_boards to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.signal_boards (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.picker_boards (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
