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

-- Row Level Security. The code is the only "auth", so it must behave like a
-- password: you can only read a save by knowing its exact code, never by
-- listing the table. The old `select using(true)` policy let anyone
-- `select *` the whole table and exfiltrate EVERY player's full save (coins,
-- friends, all state). Reads now go exclusively through redeem_save_code(),
-- which looks up a single row by exact code; there is no direct SELECT grant.
-- Codes are also immutable once created (update policy removed) so nobody can
-- overwrite/poison another player's save.
alter table public.save_codes enable row level security;

drop policy if exists "save_codes read"   on public.save_codes;
drop policy if exists "save_codes insert" on public.save_codes;
drop policy if exists "save_codes update" on public.save_codes;
-- INSERT stays open (no accounts); the code is a random 8-char value and the
-- PK makes creation write-once, so a collision just fails and the client retries.
create policy "save_codes insert" on public.save_codes for insert with check (true);

-- Exact-code lookup. SECURITY DEFINER so it can read the row despite there being
-- no SELECT policy; returns the save only for an exact, unexpired code — the
-- table itself stays unlistable.
create or replace function redeem_save_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select data from public.save_codes
     where code = p_code and expires_at > now()
     limit 1;
$$;

revoke all on function redeem_save_code(text) from public;
grant execute on function redeem_save_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
