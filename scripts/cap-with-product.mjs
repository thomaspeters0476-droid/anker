/**
 * Capacitor-CLI mit NATIVE_PRODUCT (anker | schublade).
 * Usage: node scripts/cap-with-product.mjs schublade sync android
 */
import { spawnSync } from 'node:child_process'

const product = process.argv[2] === 'schublade' ? 'schublade' : 'anker'
const capArgs = process.argv.slice(3)
if (capArgs.length === 0) {
  console.error('Usage: node scripts/cap-with-product.mjs <anker|schublade> <cap-args…>')
  process.exit(1)
}

const env = { ...process.env, NATIVE_PRODUCT: product }
const r = spawnSync('npx', ['cap', ...capArgs], {
  env,
  stdio: 'inherit',
  shell: true,
})
process.exit(r.status ?? 1)
