/** Sanfte Browser-Benachrichtigungen (Check-in, Alltag) */

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function notify(title: string, body: string, tag?: string): void {
  if (!notificationSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag: tag ?? 'anker',
      silent: false,
      icon: '/favicon.svg',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // ignore (some browsers block without service worker on insecure origins)
  }
}

/** Nur erinnern, wenn Tab im Hintergrund — sonst reicht die In-App-UI */
export function notifyIfHidden(title: string, body: string, tag?: string): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return
  }
  notify(title, body, tag)
}
