-- Enable Realtime so other devices learn about user_state updates quickly.
alter table public.user_state replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_state'
  ) then
    alter publication supabase_realtime add table public.user_state;
  end if;
end $$;
