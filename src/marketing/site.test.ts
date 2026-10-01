import assert from 'node:assert/strict'
import test from 'node:test'
import { SCHUBLADE, SITE, canonicalUrl, isAppShellPath } from './site.ts'

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

test('Canonical je Pfad, App-UI nicht als Marketing-URL', () => {
  assert.equal(canonicalUrl('/'), 'https://tagesanker.de/')
  assert.equal(canonicalUrl('/blog/'), 'https://tagesanker.de/blog')
  assert.equal(
    canonicalUrl('/blog/gedanken-parken'),
    'https://tagesanker.de/blog/gedanken-parken',
  )
  assert.equal(isAppShellPath('/app'), true)
  assert.equal(isAppShellPath('/schublade/x'), true)
  assert.equal(isAppShellPath('/die-schublade'), false)
  assert.equal(isAppShellPath('/blog'), false)
})
