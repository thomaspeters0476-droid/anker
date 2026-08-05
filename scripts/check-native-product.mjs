/**
 * Prüft, dass der Native-Schublade-Build VITE_NATIVE_PRODUCT=schublade einbettet.
 * Usage: nach `npm run build:native:schublade` → node scripts/check-native-product.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dirs = [
  'dist/assets',
  'android-schublade/app/src/main/assets/public/assets',
]

let ok = false
for (const dir of dirs) {
  if (!existsSync(dir)) {
    console.log('skip missing', dir)
    continue
  }
  const file = readdirSync(dir).find((f) => f.startsWith('index-') && f.endsWith('.js'))
  if (!file) {
    console.log('no index-*.js in', dir)
    continue
  }
  const s = readFileSync(join(dir, file), 'utf8')
  // Vite ersetzt import.meta.env.VITE_NATIVE_PRODUCT → `schublade`
  const baked =
    s.includes('(e=`schublade`)==null?`anker`:e)') ||
    s.includes('=`schublade`)==null') ||
    /String\(\s*[`"']schublade[`"']\s*\)/.test(s)
  const home = s.includes('`/schublade`:`/app`') || s.includes('"/schublade":"/app"')
  console.log(dir, file)
  console.log('  product baked as schublade:', baked)
  console.log('  home ternary present:', home)
  if (baked && home) ok = true
}

if (!ok) {
  console.error('FAIL: Schublade native product not found in bundle')
  process.exit(1)
}
console.log('OK')
