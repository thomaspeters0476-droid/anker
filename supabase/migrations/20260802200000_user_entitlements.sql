-- Abo-Status pro Account (Stripe)
create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  tier text check (
    tier is null
    or tier in ('tagesanker', 'schublade', 'bundle')
  ),
  status text not null default 'none' check (
    status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists user_entitlements_customer_idx
  on public.user_entitlements (stripe_customer_id);

alter table public.user_entitlements enable row level security;

create policy user_entitlements_select_own
  on public.user_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);
