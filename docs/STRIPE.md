# Tagesanker — Stripe (Vorbereitung)

**Stand:** 30.07.2026  
**Öffentlich:** Checkout **aus** (`STRIPE_CHECKOUT_ENABLED` ≠ `true`). Preise-Seite zeigt **keine** Beträge.  
**Konzept:** [SPENDENTOPF.md](./SPENDENTOPF.md) · Preise-Ziel intern 3,99 / 39 + 7 Tage Trial.

---

## Was schon im Repo liegt

| Teil | Pfad |
|------|------|
| Checkout-Session (gated) | [`api/create-checkout-session.ts`](../api/create-checkout-session.ts) |
| Webhook (Signatur + Spendentopf-Ledger) | [`api/stripe-webhook.ts`](../api/stripe-webhook.ts) |
| Stripe-Helfer | in den API-Dateien (kein Import außerhalb `api/`) |
| DB | Migration `20260730200000_stripe_spend_pot.sql` → `stripe_webhook_events`, `spend_pot_ledger` |

---

## Stripe Dashboard (einmalig)

1. Separates Stripe-Konto / klar getrennte Products für Tagesanker (nicht mit Gastro mischen).
2. Product **Tagesanker** anlegen.
3. Prices (EUR, brutto inkl. MwSt. wie später ausgewiesen):
   - Monatlich **3,99 €** → Price-ID → Env `STRIPE_PRICE_MONTHLY`
   - Jährlich **39,00 €** → Price-ID → Env `STRIPE_PRICE_YEARLY`
4. Customer Portal optional später.
5. Webhook-Endpoint: `https://tagesanker.de/api/stripe-webhook`  
   Events mindestens: `invoice.paid`, `checkout.session.completed`  
   Signing secret → `STRIPE_WEBHOOK_SECRET`

Testmode zuerst (`sk_test_…` / `whsec_…`).

---

## Env-Vars (Vercel Production — vorerst ohne öffentlichen Checkout)

| Variable | Bedeutung |
|----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_…` / später `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_MONTHLY` | Price-ID Monat |
| `STRIPE_PRICE_YEARLY` | Price-ID Jahr |
| `STRIPE_CHECKOUT_ENABLED` | **`false`** lassen, bis Preise öffentlich sollen |
| `STRIPE_CHECKOUT_PREVIEW_TOKEN` | optional, internes Smoke-Test-Token |
| `SPEND_POT_REPORT_TOKEN` | Token für internen Bericht `GET /api/spend-pot-report` |
| `PUBLIC_SITE_URL` | `https://tagesanker.de` (Success/Cancel-URLs) |

Zusätzlich wie bisher: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` für Ledger/Webhook-Idempotenz.

---

## Intern testen (ohne öffentliche Preise)

```bash
curl -sS -X POST https://tagesanker.de/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "x-tagesanker-checkout-preview: <PREVIEW_TOKEN>" \
  -d "{\"interval\":\"month\",\"topupCents\":500,\"customerEmail\":\"du@example.com\"}"
```

Ohne Preview-Header und mit `STRIPE_CHECKOUT_ENABLED≠true` → **503** `checkout_disabled`.

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

- Preise-Seite mit Beträgen / Buy-Buttons
- Paywall in `/app`
- Entitlements (wer hat aktives Abo) in der App
- Customer Portal / Kündigung UI

Wenn Preise live gehen: `STRIPE_CHECKOUT_ENABLED=true`, Preise-Seite + AGB anbinden, Live-Keys.
