import fs from 'fs'
import { spawnSync } from 'child_process'

const envPath = '.env.vercel.tmp'
const raw = fs.readFileSync(envPath, 'utf8')
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  const key = line.slice(0, i)
  let val = line.slice(i + 1)
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1)
  }
  process.env[key] = val
}

const sk = process.env.STRIPE_SECRET_KEY || ''
console.log('stripe_loaded', Boolean(sk), 'prefix', sk.slice(0, 7))

const r = spawnSync(process.execPath, ['scripts/setup-stripe-chop-prices.mjs'], {
  env: process.env,
  encoding: 'utf8',
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
process.exit(r.status ?? 1)
