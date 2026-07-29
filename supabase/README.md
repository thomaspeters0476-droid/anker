# Supabase — Tagesanker Sync

Projekt-URL: `https://ueioxiffwfsgbmiowtew.supabase.co`

## Einmalig im Dashboard

1. **SQL:** SQL Editor → Inhalt von [`migrations/20260729140000_user_state.sql`](./migrations/20260729140000_user_state.sql) ausführen.
2. **API Keys:** Project Settings → API → `anon` `public` Key kopieren → als `VITE_SUPABASE_ANON_KEY` in Vercel (Production + Preview) und lokal `.env.local`.
3. **Auth URL:** Authentication → URL Configuration  
   - Site URL: `https://tagesanker.de/app`  
   - Redirect URLs: `https://tagesanker.de/app`, `http://localhost:5173/app`
4. **Auth Providers:** Email enabled, Magic Link / OTP (kein Passwort nötig).

Env zusätzlich: `VITE_SUPABASE_URL=https://ueioxiffwfsgbmiowtew.supabase.co`
