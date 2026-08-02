# Tagesanker — Stripe (Vorbereitung)

**Stand:** 02.08.2026  
**Öffentlich:** Checkout **aus** (`STRIPE_CHECKOUT_ENABLED` / `STRIPE_CHOP_PACKS_ENABLED` ≠ `true`). Preise-Seite zeigt **keine** Beträge.  
**Konzept:** [SPENDENTOPF.md](./SPENDENTOPF.md) · Abos + KI-Kontingent.  
**Module:** Tagesanker / Schublade / Bundle — siehe [SCHUBLADE.md](./SCHUBLADE.md) §12a.

---

## Was schon im Repo liegt

| Teil | Pfad |
|------|------|
| Checkout-Session (gated, Login nötig) | [`api/create-checkout-session.ts`](../api/create-checkout-session.ts) |
| Customer Portal | [`api/create-portal-session.ts`](../api/create-portal-session.ts) |
| Abo-Status lesen | [`api/entitlements.ts`](../api/entitlements.ts) |
| Webhook (Spendentopf, KI, Abo-Status) | [`api/stripe-webhook.ts`](../api/stripe-webhook.ts) |
| DB | `stripe_webhook_events`, `spend_pot_ledger`, `chop_ai_*`, `user_entitlements` |

---

## Stripe Dashboard (einmalig)

1. Separates Stripe-Konto / klar getrennte Products für Tagesanker (nicht mit Gastro mischen).
2. Products/Prices anlegen (EUR, brutto inkl. MwSt.):

| Produkt | Monat | Jahr | Env |
|---------|------:|-----:|-----|
| Tagesanker | 3,49 € | 34,90 € | `STRIPE_PRICE_MONTHLY` / `_YEARLY` |
| Schublade | 4,99 € | 49,90 € | `STRIPE_PRICE_SCHUBLADE_MONTHLY` / `_YEARLY` |
| Bundle | 7,49 € | 74,90 € | `STRIPE_PRICE_BUNDLE_MONTHLY` / `_YEARLY` |
| KI-Paket S | 0,99 € (35 Calls) | — | `STRIPE_PRICE_CHOP_S` |
| KI-Paket M | 2,49 € (120) | — | `STRIPE_PRICE_CHOP_M` |
| KI-Paket L | 4,99 € (333) | — | `STRIPE_PRICE_CHOP_L` |

Subscription-Metadata empfohlen: `tier=tagesanker|schublade|bundle`, `user_id=<supabase uuid>`, `chop_monthly_credits=0|100|150`.

3. Customer Portal im Dashboard aktivieren (Kündigen / Plan wechseln).
4. Webhook-Endpoint: `https://tagesanker.de/api/stripe-webhook`  
   Events: `invoice.paid`, `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`  
   Signing secret → `STRIPE_WEBHOOK_SECRET`  
   → Abo: Status in `user_entitlements` · KI-Monatsgutschrift · Pack: Wallet +Credits

Testmode zuerst (`sk_test_…` / `whsec_…`).

### Abo-Status & Paywall

- Tabelle `user_entitlements` (Tier, Status, Stripe-Kunden-/Abo-ID).
- Paywall in `/app` und `/schublade` greift **nur** wenn `STRIPE_CHECKOUT_ENABLED=true`.
- Ohne Flag: Testphase weiter gratis.
- Einstellungen → Sync → „Abo verwalten“ (Portal), sobald ein Stripe-Kunde existiert.

---

## Env-Vars (Vercel Production — vorerst ohne öffentlichen Checkout)

| Variable | Bedeutung |
|----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_…` / später `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_MONTHLY` / `_YEARLY` | Tagesanker |
| `STRIPE_PRICE_SCHUBLADE_*` | Schublade-Abo |
| `STRIPE_PRICE_BUNDLE_*` | Bundle-Abo |
| `STRIPE_PRICE_CHOP_S/M/L` | KI-Nachkauf (oder `price_data`-Fallback in API) |
| `STRIPE_CHECKOUT_ENABLED` | Abo-Checkout öffentlich |
| `STRIPE_CHOP_PACKS_ENABLED` | KI-Pack-Checkout öffentlich |
| `STRIPE_CHECKOUT_PREVIEW_TOKEN` | internes Smoke-Test-Token (beide Checkouts) |
| `SPEND_POT_REPORT_TOKEN` | Token für internen Bericht `GET /api/spend-pot-report` |
| `PUBLIC_SITE_URL` | `https://tagesanker.de` (Success/Cancel-URLs) |

Zusätzlich: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + Anon-Key (`VITE_SUPABASE_ANON_KEY` oder `SUPABASE_ANON_KEY`) für JWT-Verify / Wallet.  
Migration: `supabase/migrations/20260802190000_chop_ai_credits.sql`.

### KI-Kontingent (Kurz)

- Free/Trial: **10/Tag**, max. **50/Monat** (lokal).
- Schublade-Abo: **+100**/Monat · Bundle: **+150**/Monat (Webhook `invoice.paid`).
- Nachkauf: `POST /api/create-chop-checkout` + `GET/POST /api/chop-credits`.

---

## Intern testen (ohne öffentliche Preise)

```bash
curl -sS -X POST https://tagesanker.de/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "x-tagesanker-checkout-preview: <PREVIEW_TOKEN>" \
  -d "{\"product\":\"tagesanker\",\"interval\":\"month\",\"topupCents\":500}"
```

Ohne Preview-Header und mit `STRIPE_CHECKOUT_ENABLED≠true` → **503** `checkout_disabled`.  
Ohne Login → **401** `not_signed_in`.

Antwort enthält `url` → Stripe Checkout (Testmode).

---

## Spendentopf-Ledger

Bei `invoice.paid`:

- wiederkehrende Positionen → **5 %** (`source=pct_5`)
- Positionen mit Spendentopf / Metadata `tagesanker=spend_topup` → **100 %** (`source=topup`)

Internbericht: `GET /api/spend-pot-report` (Token `SPEND_POT_REPORT_TOKEN`) aggregiert `spend_pot_ledger`. Öffentlicher Schönbericht bleibt manuell ([SPENDENTOPF.md](./SPENDENTOPF.md) §5).

```bash
curl -sS "https://tagesanker.de/api/spend-pot-report?period=month&format=md" \
  -H "Authorization: Bearer <SPEND_POT_REPORT_TOKEN>"
```

---

## Noch nicht

- Preise-Seite mit Beträgen / Buy-Buttons öffentlich
- Verkaufsschalter: `STRIPE_CHECKOUT_ENABLED=true` (aktiviert auch die Paywall)

Wenn Preise live gehen: Flag auf `true`, Preise-Seite + AGB anbinden.
