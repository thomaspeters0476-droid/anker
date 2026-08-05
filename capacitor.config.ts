import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Tagesanker / Die Schublade — Produkt per NATIVE_PRODUCT steuern.
 * Default: Tagesanker → android/
 * Schublade: NATIVE_PRODUCT=schublade → android-schublade/
 */
const isSchublade = process.env.NATIVE_PRODUCT === 'schublade'

const splashBg = isSchublade ? '#E4EEF5' : '#E8F0EC'
const accent = isSchublade ? '#3D6680' : '#2F6F5E'

const config: CapacitorConfig = {
  appId: isSchublade ? 'de.tagesanker.schublade' : 'de.tagesanker.app',
  appName: isSchublade ? 'Die Schublade' : 'Tagesanker',
  webDir: 'dist',
  android: {
    path: isSchublade ? 'android-schublade' : 'android',
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'tagesanker.de',
      '*.tagesanker.de',
      '*.stripe.com',
      '*.supabase.co',
    ],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: splashBg,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: splashBg,
    },
    LocalNotifications: {
      iconColor: accent,
    },
  },
}

export default config
