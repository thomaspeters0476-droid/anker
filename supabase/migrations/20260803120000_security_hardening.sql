-- Security hardening: free-quota tracking, durable rate limits, ledger revoke reason

-- Free KI quota (server-enforced)
create table if not exists public.chop_ai_free_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_type text not null check (period_type in ('day', 'month')),
  period_key text not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_type, period_key)
);

alter table public.chop_ai_free_usage enable row level security;
-- no client policies → service_role only

-- Durable API rate buckets (OTP / AI IP)
create table if not exists public.api_rate_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_buckets enable row level security;

-- Allow entitlement_revoke in ledger
alter table public.chop_ai_ledger
  drop constraint if exists chop_ai_ledger_reason_check;

alter table public.chop_ai_ledger
  add constraint chop_ai_ledger_reason_check
  check (reason in ('abo_grant', 'purchase', 'consume', 'entitlement_revoke'));

-- Webhook stuck reclaim: track received_at (already present in some deploys)
alter table public.stripe_webhook_events
  add column if not exists received_at timestamptz not null default now();
