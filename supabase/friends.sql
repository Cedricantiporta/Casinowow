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

-- Row Level Security. Identity is the anonymous auth uid (device_id == auth.uid).
-- A client can only see/touch rows it PARTICIPATES in (as sender or recipient),
-- so nobody can enumerate every device id off these tables, mark another
-- player's gifts claimed, or forge requests "from" someone else. The old
-- using(true)/with check(true) policies allowed all of that.
alter table public.friend_requests enable row level security;
alter table public.friend_gifts enable row level security;

drop policy if exists "friend_requests read"   on public.friend_requests;
drop policy if exists "friend_requests insert" on public.friend_requests;
drop policy if exists "friend_requests update" on public.friend_requests;
-- Read/act only on requests you sent or received.
create policy "friend_requests read"   on public.friend_requests for select
    using (from_device = auth.uid()::text or to_device = auth.uid()::text);
-- Can only create a request FROM yourself.
create policy "friend_requests insert" on public.friend_requests for insert
    with check (auth.uid() is not null and from_device = auth.uid()::text);
-- Either participant may update the row (recipient accepts; sender acks).
create policy "friend_requests update" on public.friend_requests for update
    using (from_device = auth.uid()::text or to_device = auth.uid()::text)
    with check (from_device = auth.uid()::text or to_device = auth.uid()::text);

drop policy if exists "friend_gifts read"   on public.friend_gifts;
drop policy if exists "friend_gifts insert" on public.friend_gifts;
drop policy if exists "friend_gifts update" on public.friend_gifts;
create policy "friend_gifts read"   on public.friend_gifts for select
    using (from_device = auth.uid()::text or to_device = auth.uid()::text);
-- Can only send a gift FROM yourself.
create policy "friend_gifts insert" on public.friend_gifts for insert
    with check (auth.uid() is not null and from_device = auth.uid()::text);
-- Only the recipient may claim (flip claimed) their own gift.
create policy "friend_gifts update" on public.friend_gifts for update
    using (to_device = auth.uid()::text)
    with check (to_device = auth.uid()::text);

notify pgrst, 'reload schema';
