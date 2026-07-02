-- CasinoWow guilds. Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Same anonymous-device model as leaderboard.sql — no real user accounts, identity is
-- the device_id already used for the leaderboard, so guild membership survives a
-- reinstall the same way a leaderboard score does (and is just as spoofable by a
-- determined client — fine for a casual guild feature).

create table if not exists public.guilds (
    id           uuid primary key default gen_random_uuid(),
    name         text not null unique,
    description  text not null default '',
    icon         text not null default 'ti-shield',
    color        text not null default 'from-indigo-500 via-violet-600 to-purple-900',
    is_open      boolean not null default true,
    level        int not null default 1,
    xp           double precision not null default 0,
    contribution_points double precision not null default 0,
    leader_id    text not null,
    member_count int not null default 1,
    created_at   timestamptz not null default now()
);

-- Migration for tables created before contribution points existed as a pool
-- separate from guild level XP.
alter table public.guilds add column if not exists contribution_points double precision not null default 0;

create table if not exists public.guild_members (
    guild_id     uuid not null references public.guilds(id) on delete cascade,
    device_id    text not null,
    name         text not null default 'Player',
    avatar       text not null default '',
    role         text not null default 'MEMBER', -- 'LEADER' | 'OFFICER' | 'MEMBER'
    contribution double precision not null default 0,
    joined_at    timestamptz not null default now(),
    primary key (guild_id, device_id)
);

-- A device can only be in one guild at a time.
create unique index if not exists guild_members_device_idx on public.guild_members (device_id);

create index if not exists guilds_xp_idx  on public.guilds (xp desc);
create index if not exists guilds_contribution_idx on public.guilds (contribution_points desc);
create index if not exists guilds_name_idx on public.guilds (name);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;

drop policy if exists "guilds read"   on public.guilds;
drop policy if exists "guilds insert" on public.guilds;
drop policy if exists "guilds update" on public.guilds;
drop policy if exists "guilds delete" on public.guilds;
create policy "guilds read"   on public.guilds for select using (true);
create policy "guilds insert" on public.guilds for insert with check (true);
create policy "guilds update" on public.guilds for update using (true) with check (true);
create policy "guilds delete" on public.guilds for delete using (true);

drop policy if exists "guild_members read"   on public.guild_members;
drop policy if exists "guild_members insert" on public.guild_members;
drop policy if exists "guild_members update" on public.guild_members;
drop policy if exists "guild_members delete" on public.guild_members;
create policy "guild_members read"   on public.guild_members for select using (true);
create policy "guild_members insert" on public.guild_members for insert with check (true);
create policy "guild_members update" on public.guild_members for update using (true) with check (true);
create policy "guild_members delete" on public.guild_members for delete using (true);

notify pgrst, 'reload schema';
