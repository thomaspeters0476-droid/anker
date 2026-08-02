/** Sanfte Browser-Benachrichtigungen (Check-in, Alltag) — lokal, kein Push-Server */

import { isLikelyIos, isStandaloneApp } from './pwa'

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

/** iOS: Mitteilungen erst sinnvoll nach Homescreen-Install */
export function notificationsReadyToEnable(): boolean {
  if (!notificationSupported()) return false
  if (isLikelyIos() && !isStandaloneApp()) return false
  return true
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!notificationSupported()) return 'unsupported'
  if (!notificationsReadyToEnable()) return Notification.permission
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

type NotifyOpts = {
  tag?: string
  /** Erneutes Anzeigen bei gleichem Tag (Away-Nudges) */
  renotify?: boolean
}

async function showViaServiceWorker(
  title: string,
  body: string,
  opts: NotifyOpts,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }
  try {
    const reg = await navigator.serviceWorker.ready
    if (!reg?.showNotification) return false
    await reg.showNotification(title, {
      body,
      tag: opts.tag ?? 'anker',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      silent: false,
      // renotify: Chromium/Android; DOM-Typen hinken oft hinterher
      ...(opts.renotify ? ({ renotify: true } as NotificationOptions) : {}),
    })
    return true
  } catch {
    return false
  }
}

export function notify(title: string, body: string, tag?: string): void {
  void notifyAsync(title, body, { tag })
}

export async function notifyAsync(
  title: string,
  body: string,
  opts: NotifyOpts = {},
): Promise<void> {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return

  const viaSw = await showViaServiceWorker(title, body, opts)
  if (viaSw) return

  try {
    const n = new Notification(title, {
      body,
      tag: opts.tag ?? 'anker',
      // renotify is Chromium; TS DOM may lag
      ...(opts.renotify ? ({ renotify: true } as NotificationOptions) : {}),
      silent: false,
      icon: '/icon-192.png',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // ignore (some browsers block without SW on insecure origins)
  }
}

/** Kurzer Test-Impuls nach Freigabe */
export function notifyTestPing(title: string, body: string): void {
  void notifyAsync(title, body, { tag: 'anker-test' })
}

/** Nur erinnern, wenn Tab im Hintergrund — sonst reicht die In-App-UI */
export function notifyIfHidden(title: string, body: string, tag?: string): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return
  }
  void notifyAsync(title, body, { tag, renotify: true })
}
