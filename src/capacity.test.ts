import assert from 'node:assert/strict'
import test from 'node:test'
import type { Task } from './types.ts'
import {
  DEFAULT_CAPACITY,
  MAX_DAY_POINTS,
  canAddSize,
  capacityPoints,
  remainingCapacity,
  usedCapacity,
  usedPoints,
} from './capacity.ts'

function task(
  partial: Pick<Task, 'id' | 'kind' | 'size'> & Partial<Task>,
): Task {
  return {
    title: 'x',
    status: 'planned',
    minutes: 15,
    ...partial,
  }
}

test('DEFAULT_CAPACITY Punkte unter Deckel', () => {
  const pts = capacityPoints(DEFAULT_CAPACITY)
  assert.ok(pts > 0)
  assert.ok(pts <= MAX_DAY_POINTS)
  assert.equal(pts, 1 * 3 + 3 * 2 + 4 * 1) // 13
})

test('usedCapacity zählt nur Arbeit', () => {
  const tasks = [
    task({ id: '1', kind: 'work', size: 'small' }),
    task({ id: '2', kind: 'work', size: 'medium' }),
    task({ id: '3', kind: 'life', size: 'large' }),
  ]
  assert.deepEqual(usedCapacity(tasks), { large: 0, medium: 1, small: 1 })
  assert.equal(usedPoints(tasks), 3)
})

test('canAddSize / remainingCapacity', () => {
  const cap = { large: 1, medium: 1, small: 1 }
  const tasks = [task({ id: '1', kind: 'work', size: 'small' })]
  assert.deepEqual(remainingCapacity(cap, tasks), {
    large: 1,
    medium: 1,
    small: 0,
  })
  assert.equal(canAddSize(cap, tasks, 'small'), false)
  assert.equal(canAddSize(cap, tasks, 'medium'), true)
})
