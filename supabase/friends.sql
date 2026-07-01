-- CasinoWow friends system: real cross-device friend requests + gifting.
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
--
-- Anonymous devices are identified by cw_device_id (see leaderboardService.ts).
-- Adding a real player (device id starting with "d_") sends a request row here;
-- the recipient polls for pending requests addressed to their device, accepts,
-- and both sides become friends locally. Sending a gift writes a row the
-- recipient later claims from their Inbox.

create table if not exists public.friend_requests (
    id           bigint generated always as identity primary key,
    from_device  text not null,
    to_device    text not null,
    from_name    text not null default 'Player',
    from_avatar  text not null default '',
    from_level   int  not null default 1,
    status       text not null default 'pending', -- pending | accepted
    sender_ack   boolean not null default false,   -- sender has locally added the friend
    created_at   timestamptz not null default now()
);

create table if not exists public.friend_gifts (
    id           bigint generated always as identity primary key,
    from_device  text not null,
    to_device    text not null,
    from_name    text not null default 'Player',
    amount       bigint not null default 0,
    claimed      boolean not null default false,
    created_at   timestamptz not null default now()
);

create index if not exists friend_requests_to_idx   on public.friend_requests (to_device, status);
create index if not exists friend_requests_from_idx on public.friend_requests (from_device, status, sender_ack);
create index if not exists friend_gifts_to_idx       on public.friend_gifts (to_device, claimed);

-- Row Level Security: anonymous game, no user accounts — anon key can read/write
-- freely, same trust model as the leaderboard table.
alter table public.friend_requests enable row level security;
alter table public.friend_gifts enable row level security;

drop policy if exists "friend_requests read"   on public.friend_requests;
drop policy if exists "friend_requests insert" on public.friend_requests;
drop policy if exists "friend_requests update" on public.friend_requests;
create policy "friend_requests read"   on public.friend_requests for select using (true);
create policy "friend_requests insert" on public.friend_requests for insert with check (true);
create policy "friend_requests update" on public.friend_requests for update using (true) with check (true);

drop policy if exists "friend_gifts read"   on public.friend_gifts;
drop policy if exists "friend_gifts insert" on public.friend_gifts;
drop policy if exists "friend_gifts update" on public.friend_gifts;
create policy "friend_gifts read"   on public.friend_gifts for select using (true);
create policy "friend_gifts insert" on public.friend_gifts for insert with check (true);
create policy "friend_gifts update" on public.friend_gifts for update using (true) with check (true);

notify pgrst, 'reload schema';
