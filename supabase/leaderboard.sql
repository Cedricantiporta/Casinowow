-- CasinoWow anonymous leaderboard.
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

-- Score-like columns are "double precision" rather than "bigint": this game's bet
-- scale runs well past bigint's ~9.22e18 ceiling, which made every write fail once
-- a player's balance got big enough. double precision holds up to ~1.8e308 — past
-- that point the app only ever needs the right order of magnitude for display
-- (formatK abbreviates to K/M/B/.../No), not exact-to-the-coin precision, so the
-- float rounding at extreme scale is a non-issue.
create table if not exists public.leaderboard (
    device_id   text primary key,
    name        text        not null default 'Player',
    avatar      text        not null default '',
    level       int         not null default 1,
    vip_level   int         not null default 0,
    score       double precision not null default 0,
    gems        double precision not null default 0,
    total_won   double precision not null default 0,
    max_jackpot double precision not null default 0,
    max_win     double precision not null default 0,
    updated_at  timestamptz not null default now()
);

-- Migration for an existing table created before these columns existed.
alter table public.leaderboard add column if not exists vip_level   int    not null default 0;
alter table public.leaderboard add column if not exists gems        double precision not null default 0;
alter table public.leaderboard add column if not exists total_won   double precision not null default 0;
alter table public.leaderboard add column if not exists max_jackpot double precision not null default 0;
alter table public.leaderboard add column if not exists max_win     double precision not null default 0;

-- Migration for an existing table where these were created as bigint — widen them
-- so writes stop failing once a player's numbers exceed bigint's range.
alter table public.leaderboard alter column score       type double precision;
alter table public.leaderboard alter column gems         type double precision;
alter table public.leaderboard alter column total_won    type double precision;
alter table public.leaderboard alter column max_jackpot  type double precision;
alter table public.leaderboard alter column max_win      type double precision;

-- Fast ordering for each ranked tab.
create index if not exists leaderboard_score_idx       on public.leaderboard (score desc);
create index if not exists leaderboard_total_won_idx   on public.leaderboard (total_won desc);
create index if not exists leaderboard_max_jackpot_idx on public.leaderboard (max_jackpot desc);
create index if not exists leaderboard_max_win_idx     on public.leaderboard (max_win desc);

-- Row Level Security. The board is publicly READABLE, but a device can only
-- write ITS OWN row: the row's device_id must equal the caller's anonymous
-- auth uid. This stops the old exploit where anyone could upsert with a
-- victim's device_id and overwrite their name/score. Identity comes from the
-- app's anonymous Supabase auth session (see supabaseClient.ensureAuthId).
alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard read"   on public.leaderboard;
drop policy if exists "leaderboard insert" on public.leaderboard;
drop policy if exists "leaderboard update" on public.leaderboard;

create policy "leaderboard read"   on public.leaderboard for select using (true);
create policy "leaderboard insert" on public.leaderboard for insert
    with check (auth.uid() is not null and device_id = auth.uid()::text);
create policy "leaderboard update" on public.leaderboard for update
    using (device_id = auth.uid()::text)
    with check (device_id = auth.uid()::text);

-- Sanity bounds on the numeric columns. These do NOT make the board tamper-proof
-- (that needs server-authoritative score submission — see the auth note), but
-- they reject the pathological injections a raw PostgREST call can otherwise
-- write: negatives and Infinity/near-float-overflow values like 1e308 that would
-- permanently pin the top of every ranked tab. 1e300 is astronomically above any
-- reachable in-game value, so no legitimate player is ever clipped.
do $$ begin
    alter table public.leaderboard add constraint leaderboard_sane_values check (
        level >= 0 and vip_level >= 0
        and score >= 0 and score < 1e300
        and gems >= 0 and gems < 1e300
        and total_won >= 0 and total_won < 1e300
        and max_jackpot >= 0 and max_jackpot < 1e300
        and max_win >= 0 and max_win < 1e300
    );
exception when duplicate_object then null; end $$;

-- PostgREST caches the table schema and won't see new columns (e.g. vip_level)
-- until it reloads. Force an immediate reload so the app doesn't 400 on writes
-- right after running this migration.
notify pgrst, 'reload schema';
