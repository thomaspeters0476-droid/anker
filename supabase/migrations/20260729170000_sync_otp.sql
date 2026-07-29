-- Own OTP codes for Tagesanker sync (Resend), not Supabase Auth mailer
create table if not exists public.sync_otp (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sync_otp enable row level security;
