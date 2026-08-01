/** Debounced local persist — weniger Main-Thread-Jank bei schnellen Edits */

import { saveDay, saveDrawer } from './storage'
import type { DayState } from './types'
import type { DrawerState } from './drawer/types'

let pendingDay: DayState | null = null
let pendingDrawer: DrawerState | null = null
let dayTimer: ReturnType<typeof setTimeout> | null = null
let drawerTimer: ReturnType<typeof setTimeout> | null = null

const DAY_MS = 280
const DRAWER_MS = 220

export function scheduleSaveDay(state: DayState): void {
  pendingDay = state
  if (dayTimer) clearTimeout(dayTimer)
  dayTimer = setTimeout(() => {
    dayTimer = null
    if (pendingDay) {
      saveDay(pendingDay)
      pendingDay = null
    }
  }, DAY_MS)
}

export function scheduleSaveDrawer(state: DrawerState): void {
  pendingDrawer = state
  if (drawerTimer) clearTimeout(drawerTimer)
  drawerTimer = setTimeout(() => {
    drawerTimer = null
    if (pendingDrawer) {
      saveDrawer(pendingDrawer)
      pendingDrawer = null
    }
  }, DRAWER_MS)
}

export function flushScheduledSaves(): void {
  if (dayTimer) {
    clearTimeout(dayTimer)
    dayTimer = null
  }
  if (drawerTimer) {
    clearTimeout(drawerTimer)
    drawerTimer = null
  }
  if (pendingDay) {
    saveDay(pendingDay)
    pendingDay = null
  }
  if (pendingDrawer) {
    saveDrawer(pendingDrawer)
    pendingDrawer = null
  }
}

/** visibility / unload — einmal pro App anbinden */
export function bindPersistFlush(): () => void {
  const onVis = () => {
    if (document.visibilityState === 'hidden') flushScheduledSaves()
  }
  const onHide = () => flushScheduledSaves()
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', onHide)
  return () => {
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', onHide)
  }
}
