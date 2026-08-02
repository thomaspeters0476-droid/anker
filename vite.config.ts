import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // SVGs mit url(#id) nicht als data: inlinen — # zerlegt die Data-URL
  build: {
    assetsInlineLimit: 1024,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
      ],
      // Tagesanker-PWA. Schublade: public/manifest-schublade.webmanifest (eigene id/scope).
      manifest: {
        id: '/app',
        name: 'Tagesanker',
        short_name: 'Tagesanker',
        description: 'Eine Sache. Realistisch. Zurückfinden.',
        theme_color: '#2f6f5e',
        background_color: '#e8f0ec',
        display: 'standalone',
        lang: 'de',
        start_url: '/app',
        scope: '/app',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        // Kein Precache-only NavigationRoute — der hält sonst alte index.html
        // und leitet neue Marketing-Routen (z. B. /die-schublade) auf / um.
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['/sw-notify.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-network-first',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ],
})
