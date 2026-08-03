#!/usr/bin/env node
/**
 * Schnelle Unit-Tests (ohne DB, ohne Netzwerk) — analog Schwundbuch.
 *
 *   npm test
 *   npm run test:unit
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'android',
])

function findTests(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      findTests(full, out)
      continue
    }
    if (name.endsWith('.test.ts')) {
      out.push(path.relative(ROOT, full).replace(/\\/g, '/'))
    }
  }
  return out
}

const allFiles = [
  ...findTests(path.join(ROOT, 'src')),
  ...findTests(path.join(ROOT, 'api')),
].sort()

if (allFiles.length === 0) {
  console.error('Keine *.test.ts Dateien gefunden.')
  process.exit(1)
}

console.log(`Unit-Tests (${allFiles.length} Dateien):`)
for (const file of allFiles) {
  console.log(`  • ${file}`)
}
console.log('')

const result = spawnSync('npx', ['tsx', '--test', ...allFiles], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
