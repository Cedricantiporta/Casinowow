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
    last_donated_date text not null default '',
    primary key (guild_id, device_id)
);

-- Migration for an existing table created before daily-donation tracking existed.
alter table public.guild_members add column if not exists last_donated_date text not null default '';

-- A device can only be in one guild at a time.
create unique index if not exists guild_members_device_idx on public.guild_members (device_id);

create index if not exists guilds_xp_idx  on public.guilds (xp desc);
create index if not exists guilds_contribution_idx on public.guilds (contribution_points desc);
create index if not exists guilds_name_idx on public.guilds (name);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;

-- Guild data is publicly READABLE (browse / rankings / profiles), but clients
-- can NOT write these tables directly — the old using(true) write policies let
-- anyone rename/disband any guild, kick members of guilds they weren't in, or
-- self-promote to LEADER. All mutations now go through the SECURITY DEFINER
-- RPCs below, which verify the caller's auth.uid() and role. With no anon write
-- policy, direct insert/update/delete is denied; the RPCs bypass RLS as owner.
drop policy if exists "guilds read"   on public.guilds;
drop policy if exists "guilds insert" on public.guilds;
drop policy if exists "guilds update" on public.guilds;
drop policy if exists "guilds delete" on public.guilds;
create policy "guilds read"   on public.guilds for select using (true);

drop policy if exists "guild_members read"   on public.guild_members;
drop policy if exists "guild_members insert" on public.guild_members;
drop policy if exists "guild_members update" on public.guild_members;
drop policy if exists "guild_members delete" on public.guild_members;
create policy "guild_members read"   on public.guild_members for select using (true);

-- Sanity bounds — reject negatives and float-overflow injections on the
-- contribution pools that drive monthly rank rewards. Not full anti-tamper
-- (see the auth note), just a floor/ceiling no legit guild reaches.
do $$ begin
    alter table public.guilds add constraint guilds_sane_values check (
        level >= 0 and member_count >= 0
        and xp >= 0 and xp < 1e300
        and contribution_points >= 0 and contribution_points < 1e300
    );
exception when duplicate_object then null; end $$;
do $$ begin
    alter table public.guild_members add constraint guild_members_sane_values check (
        contribution >= 0 and contribution < 1e300
    );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Guild write RPCs. Every mutation runs here, SECURITY DEFINER, keyed off the
-- caller's anonymous auth uid (me), with role checks the client can't bypass.
-- ─────────────────────────────────────────────────────────────────────────────

-- helper: caller's role in a guild, or null if not a member
create or replace function guild_my_role(p_guild_id uuid, p_me text)
returns text language sql stable security definer set search_path = public as $$
    select role from public.guild_members where guild_id = p_guild_id and device_id = p_me;
$$;

create or replace function guild_create(
    p_name text, p_description text, p_icon text, p_color text, p_is_open boolean,
    p_player_name text, p_avatar text
) returns uuid language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; gid uuid;
begin
    if me is null then raise exception 'not authenticated'; end if;
    if exists (select 1 from guild_members where device_id = me) then
        raise exception 'already in a guild';
    end if;
    insert into guilds (name, description, icon, color, is_open, leader_id, member_count)
        values (left(trim(p_name),40), left(trim(p_description),200), p_icon, p_color, coalesce(p_is_open,true), me, 1)
        returning id into gid;
    insert into guild_members (guild_id, device_id, name, avatar, role)
        values (gid, me, left(p_player_name,40), p_avatar, 'LEADER');
    return gid;
end $$;

create or replace function guild_join(p_guild_id uuid, p_player_name text, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; cnt int;
begin
    if me is null then raise exception 'not authenticated'; end if;
    if exists (select 1 from guild_members where device_id = me) then
        raise exception 'already in a guild';
    end if;
    select member_count into cnt from guilds where id = p_guild_id for update;
    if cnt is null then raise exception 'no such guild'; end if;
    if cnt >= 50 then raise exception 'guild full'; end if;
    insert into guild_members (guild_id, device_id, name, avatar, role)
        values (p_guild_id, me, left(p_player_name,40), p_avatar, 'MEMBER');
    update guilds set member_count = (select count(*) from guild_members where guild_id = p_guild_id)
        where id = p_guild_id;
end $$;

create or replace function guild_leave(p_guild_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; my_role text; remaining int;
begin
    if me is null then raise exception 'not authenticated'; end if;
    select role into my_role from guild_members where guild_id = p_guild_id and device_id = me;
    if my_role is null then return; end if;
    select count(*) into remaining from guild_members where guild_id = p_guild_id and device_id <> me;
    if my_role = 'LEADER' and remaining > 0 then
        raise exception 'leader must transfer or disband';
    end if;
    delete from guild_members where guild_id = p_guild_id and device_id = me;
    if remaining = 0 then
        delete from guilds where id = p_guild_id;
    else
        update guilds set member_count = remaining where id = p_guild_id;
    end if;
end $$;

create or replace function guild_transfer_leadership(p_guild_id uuid, p_to text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
    if guild_my_role(p_guild_id, me) <> 'LEADER' then raise exception 'not the leader'; end if;
    if not exists (select 1 from guild_members where guild_id = p_guild_id and device_id = p_to) then
        raise exception 'target not a member';
    end if;
    update guild_members set role = 'OFFICER' where guild_id = p_guild_id and device_id = me;
    update guild_members set role = 'LEADER'  where guild_id = p_guild_id and device_id = p_to;
    update guilds set leader_id = p_to where id = p_guild_id;
end $$;

create or replace function guild_kick(p_guild_id uuid, p_target text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; my_role text; target_role text;
begin
    my_role := guild_my_role(p_guild_id, me);
    target_role := guild_my_role(p_guild_id, p_target);
    if target_role is null or p_target = me then raise exception 'invalid target'; end if;
    if target_role = 'LEADER' then raise exception 'cannot kick the leader'; end if;
    -- LEADER may kick anyone (but the leader); OFFICER may kick only MEMBERs.
    if my_role = 'LEADER' or (my_role = 'OFFICER' and target_role = 'MEMBER') then
        delete from guild_members where guild_id = p_guild_id and device_id = p_target;
        update guilds set member_count = (select count(*) from guild_members where guild_id = p_guild_id)
            where id = p_guild_id;
    else
        raise exception 'insufficient rank';
    end if;
end $$;

create or replace function guild_set_role(p_guild_id uuid, p_target text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
    if guild_my_role(p_guild_id, me) <> 'LEADER' then raise exception 'not the leader'; end if;
    if p_role not in ('OFFICER','MEMBER') then raise exception 'bad role'; end if;
    if p_target = me then raise exception 'cannot change own role'; end if;
    if guild_my_role(p_guild_id, p_target) is null then raise exception 'target not a member'; end if;
    update guild_members set role = p_role where guild_id = p_guild_id and device_id = p_target;
end $$;

create or replace function guild_disband(p_guild_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
    if guild_my_role(p_guild_id, me) <> 'LEADER' then raise exception 'not the leader'; end if;
    delete from guilds where id = p_guild_id; -- cascades to members
end $$;

create or replace function guild_update_description(p_guild_id uuid, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; r text;
begin
    r := guild_my_role(p_guild_id, me);
    if r not in ('LEADER','OFFICER') then raise exception 'insufficient rank'; end if;
    update guilds set description = left(coalesce(p_description,''),200) where id = p_guild_id;
end $$;

-- guild_join/guild_create only snapshot the player's name/avatar at that moment —
-- this keeps the member row in sync whenever the player renames or changes avatar
-- later. Self-only (a member can only update their own row).
create or replace function guild_update_member_profile(p_guild_id uuid, p_name text, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
    if guild_my_role(p_guild_id, me) is null then raise exception 'not a member'; end if;
    update guild_members set name = left(coalesce(p_name, name), 40), avatar = coalesce(p_avatar, avatar)
        where guild_id = p_guild_id and device_id = me;
end $$;

-- Members contribute to guild LEVEL xp (capped) — returns the new level if it
-- leveled up, else null. Amount is clamped so a tampered client can't inject huge values.
create or replace function guild_contribute_xp(p_guild_id uuid, p_amount double precision)
returns int language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; amt double precision; v_xp double precision; v_lvl int; old_lvl int; need double precision;
begin
    if guild_my_role(p_guild_id, me) is null then raise exception 'not a member'; end if;
    amt := least(greatest(coalesce(p_amount,0), 0), 1e6);
    if amt <= 0 then return null; end if;
    select g.xp, g.level into v_xp, v_lvl from guilds g where g.id = p_guild_id for update;
    old_lvl := v_lvl; v_xp := v_xp + amt;
    loop
        need := round(1000 * power(1.35, v_lvl - 1));
        exit when v_lvl >= 10 or v_xp < need;
        v_xp := v_xp - need; v_lvl := v_lvl + 1;
    end loop;
    if v_lvl >= 10 then v_lvl := 10; v_xp := 0; end if;
    update guilds set xp = v_xp, level = v_lvl where id = p_guild_id;
    return case when v_lvl > old_lvl then v_lvl else null end;
end $$;

-- Members add to the guild's CONTRIBUTION pool (drives monthly rank rewards) and
-- their own contribution total. Amount clamped.
create or replace function guild_contribute_points(p_guild_id uuid, p_amount double precision)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; amt double precision;
begin
    if guild_my_role(p_guild_id, me) is null then raise exception 'not a member'; end if;
    amt := least(greatest(coalesce(p_amount,0), 0), 1e6);
    if amt <= 0 then return; end if;
    update guilds set contribution_points = contribution_points + amt where id = p_guild_id;
    update guild_members set contribution = contribution + amt
        where guild_id = p_guild_id and device_id = me;
end $$;

-- Stamps this member's last_donated_date with today's (server) date — separate
-- from guild_contribute_points because that RPC also fires for guild-task
-- rewards, which aren't donations. Drives the "N members donated today" count
-- the daily guild reward is gated on.
create or replace function guild_record_donation(p_guild_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
    if guild_my_role(p_guild_id, me) is null then raise exception 'not a member'; end if;
    update guild_members set last_donated_date = to_char(now(), 'YYYY-MM-DD')
        where guild_id = p_guild_id and device_id = me;
end $$;

revoke all on function
    guild_create(text,text,text,text,boolean,text,text), guild_join(uuid,text,text),
    guild_leave(uuid), guild_transfer_leadership(uuid,text), guild_kick(uuid,text),
    guild_set_role(uuid,text,text), guild_disband(uuid), guild_update_description(uuid,text),
    guild_contribute_xp(uuid,double precision), guild_contribute_points(uuid,double precision),
    guild_update_member_profile(uuid,text,text), guild_record_donation(uuid)
    from public;
grant execute on function
    guild_create(text,text,text,text,boolean,text,text), guild_join(uuid,text,text),
    guild_leave(uuid), guild_transfer_leadership(uuid,text), guild_kick(uuid,text),
    guild_set_role(uuid,text,text), guild_disband(uuid), guild_update_description(uuid,text),
    guild_contribute_xp(uuid,double precision), guild_contribute_points(uuid,double precision),
    guild_update_member_profile(uuid,text,text), guild_record_donation(uuid)
    to anon, authenticated;

notify pgrst, 'reload schema';
