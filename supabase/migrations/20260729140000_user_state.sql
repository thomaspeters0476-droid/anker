-- Tagesanker sync: one JSON snapshot per authenticated user
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "user_state_select_own"
  on public.user_state
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_state_insert_own"
  on public.user_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_state_update_own"
  on public.user_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_state_delete_own"
  on public.user_state
  for delete
  to authenticated
  using (auth.uid() = user_id);
