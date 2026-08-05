import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // SVGs mit url(#id) nicht als data: inlinen — # zerlegt die Data-URL
  build: {
    // Android WebView (API 30 Emulator) kennt kein ||= / ??= (ES2021+)
    target: 'es2019',
    assetsInlineLimit: 1024,
    // Kein manualChunks: shared __vitePreload würde sonst in große Vendor-Chunks
    // rutschen und per modulepreload jede Route blockieren (PDF/Supabase).
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
        // PDF-Export selten — nicht offline vorladen (~600KB+)
        globIgnores: [
          '**/jspdf*.js',
          '**/html2canvas*.js',
          '**/purify*.js',
          '**/index.es*.js',
          '**/typeof-*.js',
        ],
        // Offline nur für die Apps — Marketing bleibt Network-first ohne Shell-Fallback
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/app/, /^\/schublade/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['/sw-notify.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' &&
              (url.pathname.startsWith('/app') ||
                url.pathname.startsWith('/schublade')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell-network-first',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
