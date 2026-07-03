-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)

create table if not exists payment_credits (
    id uuid default gen_random_uuid() primary key,
    device_id text not null,
    stripe_payment_intent_id text unique not null,
    type text not null,          -- 'COIN' | 'DIAMOND'
    amount bigint not null,
    currency text not null,
    stripe_amount integer not null,  -- amount charged in smallest currency unit
    claimed boolean default false,
    created_at timestamptz default now()
);

create index if not exists idx_payment_credits_device_id   on payment_credits(device_id);
create index if not exists idx_payment_credits_unclaimed   on payment_credits(device_id, claimed) where claimed = false;
create index if not exists idx_payment_credits_intent_id   on payment_credits(stripe_payment_intent_id);

alter table payment_credits enable row level security;

-- Restrict ALL direct table access (select/insert/update/delete) to service_role.
-- The anon client never touches this table directly anymore — the old "or true"
-- select policy let anyone read every device's purchase history (device ids,
-- amounts, Stripe PaymentIntent ids). Clients claim credits only through the
-- claim_payment_credits() RPC below.
drop policy if exists "device can read own credits" on payment_credits;
drop policy if exists "service role full access" on payment_credits;
create policy "service role full access"
    on payment_credits for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Atomic, idempotent claim. Flips every unclaimed row for the device to
-- claimed=true in a single row-locked UPDATE (so two concurrent calls — mount +
-- window focus, or two tabs — can't both claim the same row and double-credit)
-- and returns exactly the rows this call claimed. SECURITY DEFINER so it runs
-- with the owner's rights and bypasses the locked-down table RLS; the client
-- passes only its own device id.
create or replace function claim_payment_credits(p_device_id text)
returns table (type text, amount bigint)
language sql
security definer
set search_path = public
as $$
    update payment_credits
       set claimed = true
     where device_id = p_device_id
       and claimed = false
    returning type, amount;
$$;

revoke all on function claim_payment_credits(text) from public;
grant execute on function claim_payment_credits(text) to anon, authenticated;
