/**
 * Apply Tagesanker Auth email templates via Supabase Management API.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
 *   node scripts/apply-auth-email-templates.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_REF = 'ueioxiffwfsgbmiowtew'
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN (Account → Access Tokens).')
  process.exit(1)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const confirmation = readFileSync(
  resolve(root, 'supabase/email-templates/confirmation.html'),
  'utf8',
)
const magicLink = readFileSync(
  resolve(root, 'supabase/email-templates/magic_link.html'),
  'utf8',
)

const body = {
  mailer_subjects_confirmation:
    'Tagesanker: Sync freischalten — Code {{ .Token }}',
  mailer_templates_confirmation_content: confirmation,
  mailer_subjects_magic_link:
    'Tagesanker: Anmeldung Geräte-Sync — Code {{ .Token }}',
  mailer_templates_magic_link_content: magicLink,
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  },
)

if (!res.ok) {
  console.error(res.status, await res.text())
  process.exit(1)
}

console.log('Auth email templates updated (confirmation + magic link).')
