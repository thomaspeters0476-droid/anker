import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Tagesanker Android/iOS (Capacitor).
 * Wiederverwendbar: appId/appName/webDir anpassen; API-Origin in src/native/platform.ts.
 */
const config: CapacitorConfig = {
  appId: 'de.tagesanker.app',
  appName: 'Tagesanker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Stripe Checkout / Portal + Supabase aus der WebView heraus
    allowNavigation: [
      'tagesanker.de',
      '*.tagesanker.de',
      '*.stripe.com',
      '*.supabase.co',
    ],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#E8F0EC',
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#E8F0EC',
    },
    LocalNotifications: {
      iconColor: '#2F6F5E',
    },
  },
}

export default config
