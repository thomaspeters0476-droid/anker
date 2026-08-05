import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { isNativeApp, nativeProduct } from './platform'

/** Statusleiste, Splash, Tastatur — nur auf dem Gerät. */
export async function bootNativeShell(): Promise<void> {
  if (!isNativeApp()) return
  const statusBg = nativeProduct() === 'schublade' ? '#E4EEF5' : '#E8F0EC'
  try {
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: statusBg })
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
