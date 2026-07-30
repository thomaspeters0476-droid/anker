-- Stripe webhook idempotency + spend pot internal ledger (Tagesanker)
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.spend_pot_ledger (
  id bigserial primary key,
  source text not null check (source in ('pct_5', 'topup', 'social_out', 'research_out', 'adjust')),
  stripe_object_id text unique,
  amount_cents integer not null,
  currency text not null default 'eur',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists spend_pot_ledger_created_at_idx
  on public.spend_pot_ledger (created_at desc);

alter table public.stripe_webhook_events enable row level security;
alter table public.spend_pot_ledger enable row level security;
-- Service role only (no public policies)
