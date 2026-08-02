-- KI-Kontingent: Wallet + Ledger (Nachkauf / Abo-Grant / Verbrauch)
create table if not exists public.chop_ai_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  -- null | tagesanker | schublade | bundle — steuert Free-Quota vs. nur Wallet
  tier text check (
    tier is null
    or tier in ('tagesanker', 'schublade', 'bundle')
  ),
  updated_at timestamptz not null default now()
);

create table if not exists public.chop_ai_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('abo_grant', 'purchase', 'consume')),
  stripe_session_id text unique,
  stripe_invoice_id text unique,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists chop_ai_ledger_user_id_idx
  on public.chop_ai_ledger (user_id, created_at desc);

alter table public.chop_ai_wallets enable row level security;
alter table public.chop_ai_ledger enable row level security;
-- Service role only (no public policies)
