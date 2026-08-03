import assert from 'node:assert/strict'
import test from 'node:test'
import { SCHUBLADE, SITE } from './site.ts'

test('Tagesanker Site-Basics', () => {
  assert.equal(SITE.name, 'Tagesanker')
  assert.ok(SITE.url.includes('tagesanker'))
})

test('Schublade — Landing und App-Pfade getrennt', () => {
  assert.equal(SCHUBLADE.name, 'Die Schublade')
  assert.equal(SCHUBLADE.path, '/die-schublade')
  assert.equal(SCHUBLADE.appPath, '/schublade')
  assert.notEqual(SCHUBLADE.path, SCHUBLADE.appPath)
})
