/** Sanfte Erinnerungen — Browser/PWA oder Capacitor Local Notifications */

import { LocalNotifications } from '@capacitor/local-notifications'
import { isLikelyIos, isStandaloneApp } from './pwa'
import { isNativeApp } from './native/platform'

export function notificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return true
  return 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  if (isNativeApp()) return nativePermCache
  return Notification.permission
}

let nativePermCache: NotificationPermission = 'default'

/** Capacitor: Permission-Cache aktualisieren (UI-Toggle). */
export async function refreshNativePermCache(): Promise<NotificationPermission> {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'granted') nativePermCache = 'granted'
    else if (display === 'denied') nativePermCache = 'denied'
    else nativePermCache = 'default'
  } catch {
    nativePermCache = 'denied'
  }
  return nativePermCache
}

/** iOS-Web: Mitteilungen erst sinnvoll nach Homescreen-Install */
export function notificationsReadyToEnable(): boolean {
  if (!notificationSupported()) return false
  if (isNativeApp()) return true
  if (isLikelyIos() && !isStandaloneApp()) return false
  return true
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!notificationSupported()) return 'unsupported'
  if (!notificationsReadyToEnable()) {
    return isNativeApp() ? 'denied' : Notification.permission
  }

  if (isNativeApp()) {
    try {
      const { display } = await LocalNotifications.requestPermissions()
      if (display === 'granted') {
        nativePermCache = 'granted'
        return 'granted'
      }
      if (display === 'denied') {
        nativePermCache = 'denied'
        return 'denied'
      }
      nativePermCache = 'default'
      return 'default'
    } catch {
      nativePermCache = 'denied'
      return 'denied'
    }
  }

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

async function showViaNative(
  title: string,
  body: string,
  opts: NotifyOpts,
): Promise<boolean> {
  try {
    await refreshNativePermCache()
    if (nativePermCache !== 'granted') return false
    const id = Math.abs(
      Array.from(opts.tag ?? title).reduce(
        (a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0,
        0,
      ),
    ) % 2_000_000_000 || 1
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 250) },
          extra: { tag: opts.tag ?? 'anker' },
        },
      ],
    })
    return true
  } catch {
    return false
  }
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

  if (isNativeApp()) {
    await showViaNative(title, body, opts)
    return
  }

  if (Notification.permission !== 'granted') return

  const viaSw = await showViaServiceWorker(title, body, opts)
  if (viaSw) return

  try {
    const n = new Notification(title, {
      body,
      tag: opts.tag ?? 'anker',
      ...(opts.renotify ? ({ renotify: true } as NotificationOptions) : {}),
      silent: false,
      icon: '/icon-192.png',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // ignore
  }
}

/** Kurzer Test-Impuls nach Freigabe */
export function notifyTestPing(title: string, body: string): void {
  void notifyAsync(title, body, { tag: 'anker-test' })
}

/** Nur erinnern, wenn Tab/App im Hintergrund — sonst reicht die In-App-UI */
export function notifyIfHidden(title: string, body: string, tag?: string): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return
  }
  void notifyAsync(title, body, { tag, renotify: true })
}
