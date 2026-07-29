# Supabase — Tagesanker Sync

Projekt-URL: `https://ueioxiffwfsgbmiowtew.supabase.co`

## Einmalig im Dashboard

1. **SQL:** `user_state` + RLS, `sync_otp`, und Storage-Bucket `sync-blobs` (Migrationen unter `migrations/`).
2. **Env:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel Production.
3. **Auth URL:** Site URL + Redirects auf `/app` (erledigt).
4. **E-Mail-Vorlagen** (wichtig für Erkennbarkeit):  
   [Authentication → Email → Templates](https://supabase.com/dashboard/project/ueioxiffwfsgbmiowtew/auth/templates)

### Sync-Verschlüsselung (App)

- Cloud-`payload` ist ein E2E-Envelope (AES-GCM); Geistesblitz-Medien liegen verschlüsselt in Storage `sync-blobs`.
- Ohne Sync in der App: keine Verschlüsselung, kein Anmeldebildschirm — local-first wie bisher.
- Nach OTP-Login: Sync-Passwort + Recovery-Code (clientseitig).

### Confirm signup

- **Subject:** `Tagesanker: Sync freischalten — Code {{ .Token }}`
- **Body:** Inhalt von [`email-templates/confirmation.html`](./email-templates/confirmation.html)

### Magic Link

- **Subject:** `Tagesanker: Anmeldung Geräte-Sync — Code {{ .Token }}`
- **Body:** Inhalt von [`email-templates/magic_link.html`](./email-templates/magic_link.html)

Optional später: Custom SMTP (Resend) mit Absender `Tagesanker <noreply@tagesanker.de>`, damit auch der Absender klar ist.

Env: siehe `.env.example`.
