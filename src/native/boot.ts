import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { isNativeApp } from './platform'

/** Statusleiste, Splash, Tastatur — nur auf dem Gerät. */
export async function bootNativeShell(): Promise<void> {
  if (!isNativeApp()) return
  try {
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#E8F0EC' })
    }
  } catch {
    /* Plugin fehlt / Web */
  }
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
  } catch {
    /* optional */
  }
  try {
    await SplashScreen.hide()
  } catch {
    /* optional */
  }
}
