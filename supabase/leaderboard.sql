-- CasinoWow anonymous leaderboard.
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

create table if not exists public.leaderboard (
    device_id   text primary key,
    name        text        not null default 'Player',
    avatar      text        not null default '',
    level       int         not null default 1,
    vip_level   int         not null default 0,
    score       bigint      not null default 0,
    gems        bigint      not null default 0,
    total_won   bigint      not null default 0,
    max_jackpot bigint      not null default 0,
    max_win     bigint      not null default 0,
    updated_at  timestamptz not null default now()
);

-- Migration for an existing table created before these columns existed.
alter table public.leaderboard add column if not exists vip_level   int    not null default 0;
alter table public.leaderboard add column if not exists gems        bigint not null default 0;
alter table public.leaderboard add column if not exists total_won   bigint not null default 0;
alter table public.leaderboard add column if not exists max_jackpot bigint not null default 0;
alter table public.leaderboard add column if not exists max_win     bigint not null default 0;

-- Fast ordering for each ranked tab.
create index if not exists leaderboard_score_idx       on public.leaderboard (score desc);
create index if not exists leaderboard_total_won_idx   on public.leaderboard (total_won desc);
create index if not exists leaderboard_max_jackpot_idx on public.leaderboard (max_jackpot desc);
create index if not exists leaderboard_max_win_idx     on public.leaderboard (max_win desc);

-- Row Level Security: this is an anonymous game board (no user accounts), so the
-- anon key may read every row and upsert its own device row. Note this is
-- inherently spoofable by a determined client — fine for a casual leaderboard.
alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard read"   on public.leaderboard;
drop policy if exists "leaderboard insert" on public.leaderboard;
drop policy if exists "leaderboard update" on public.leaderboard;

create policy "leaderboard read"   on public.leaderboard for select using (true);
create policy "leaderboard insert" on public.leaderboard for insert with check (true);
create policy "leaderboard update" on public.leaderboard for update using (true) with check (true);
