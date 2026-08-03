-- Residual hardening: atomic free-quota + rate buckets; lock down rls_auto_enable

create or replace function public.try_consume_free_chop(
  p_user_id uuid,
  p_day_key text,
  p_month_key text,
  p_daily_max int,
  p_monthly_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day int;
  v_month int;
begin
  insert into public.chop_ai_free_usage (user_id, period_type, period_key, count)
  values (p_user_id, 'day', p_day_key, 0)
  on conflict (user_id, period_type, period_key) do nothing;

  insert into public.chop_ai_free_usage (user_id, period_type, period_key, count)
  values (p_user_id, 'month', p_month_key, 0)
  on conflict (user_id, period_type, period_key) do nothing;

  select count into v_day
  from public.chop_ai_free_usage
  where user_id = p_user_id and period_type = 'day' and period_key = p_day_key
  for update;

  select count into v_month
  from public.chop_ai_free_usage
  where user_id = p_user_id and period_type = 'month' and period_key = p_month_key
  for update;

  if coalesce(v_day, 0) >= p_daily_max or coalesce(v_month, 0) >= p_monthly_max then
    return false;
  end if;

  update public.chop_ai_free_usage
  set count = count + 1, updated_at = now()
  where user_id = p_user_id and period_type = 'day' and period_key = p_day_key;

  update public.chop_ai_free_usage
  set count = count + 1, updated_at = now()
  where user_id = p_user_id and period_type = 'month' and period_key = p_month_key;

  return true;
end;
$$;

revoke all on function public.try_consume_free_chop(uuid, text, text, int, int) from public;
revoke all on function public.try_consume_free_chop(uuid, text, text, int, int) from anon, authenticated;
grant execute on function public.try_consume_free_chop(uuid, text, text, int, int) to service_role;

create or replace function public.consume_api_rate_bucket(
  p_key text,
  p_window_ms bigint,
  p_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_count int;
  v_now timestamptz := now();
begin
  insert into public.api_rate_buckets (bucket_key, window_start, count)
  values (p_key, v_now, 0)
  on conflict (bucket_key) do nothing;

  select window_start, count into v_start, v_count
  from public.api_rate_buckets
  where bucket_key = p_key
  for update;

  if v_start is null then
    return false;
  end if;

  if (extract(epoch from (v_now - v_start)) * 1000) >= p_window_ms then
    v_start := v_now;
    v_count := 0;
  end if;

  if coalesce(v_count, 0) >= p_max then
    update public.api_rate_buckets
    set window_start = v_start, count = v_count, updated_at = v_now
    where bucket_key = p_key;
    return false;
  end if;

  update public.api_rate_buckets
  set window_start = v_start, count = v_count + 1, updated_at = v_now
  where bucket_key = p_key;

  return true;
end;
$$;

revoke all on function public.consume_api_rate_bucket(text, bigint, int) from public;
revoke all on function public.consume_api_rate_bucket(text, bigint, int) from anon, authenticated;
grant execute on function public.consume_api_rate_bucket(text, bigint, int) to service_role;

-- Event-Trigger-Funktion: nicht via PostgREST / RPC aufrufbar
revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon, authenticated;
