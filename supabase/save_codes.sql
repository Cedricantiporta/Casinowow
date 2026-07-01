-- CasinoWow save/transfer codes — lets a player migrate their full local save
-- (coins, level, missions, arena, friends, etc.) to a new device/reinstall by
-- generating a short code and redeeming it elsewhere.
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

create table if not exists public.save_codes (
    code        text primary key,
    data        jsonb not null,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null default (now() + interval '30 days')
);

create index if not exists save_codes_expires_idx on public.save_codes (expires_at);

-- Row Level Security: anonymous game, no user accounts — anon key can read/write
-- freely, same trust model as the leaderboard/friends tables. The code itself
-- is the only "auth" — treat it like a password and don't share it publicly.
alter table public.save_codes enable row level security;

drop policy if exists "save_codes read"   on public.save_codes;
drop policy if exists "save_codes insert" on public.save_codes;
drop policy if exists "save_codes update" on public.save_codes;
create policy "save_codes read"   on public.save_codes for select using (true);
create policy "save_codes insert" on public.save_codes for insert with check (true);
create policy "save_codes update" on public.save_codes for update using (true) with check (true);

notify pgrst, 'reload schema';
