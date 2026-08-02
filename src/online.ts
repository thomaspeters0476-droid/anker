import { useEffect, useState } from 'react'

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Reagiert auf online/offline — für Hinweise in der UI */
export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnline)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setOnline(isOnline())
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
