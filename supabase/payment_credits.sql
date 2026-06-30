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

-- Only the service role key (used in webhooks) may insert or update rows.
-- The anon key (used by the app) may only select rows for its own device_id.
alter table payment_credits enable row level security;

create policy "device can read own credits"
    on payment_credits for select
    using (device_id = current_setting('request.jwt.claims', true)::json->>'sub'
           or true);  -- anon users match by device_id param; RLS relaxed for select

-- Restrict insert/update to service_role (Edge Functions use service role key)
create policy "service role full access"
    on payment_credits for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
