import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The web app is served from https://dually.app/app/ (landing page lives at /).
export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png', 'fonts/*.ttf'],
      manifest: {
        name: 'Dually',
        short_name: 'Dually',
        description: 'Dual-camera social app — capture both sides of every moment.',
        id: '/app/',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ttf,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Live-only SDKs (Agora, Firebase) are fetched on first use, then cached.
        globIgnores: ['**/assets/agora-*.js', '**/assets/firebase-*.js'],
        navigateFallback: '/app/index.html',
        navigateFallbackAllowlist: [/^\/app\//],
        // API + media always come from the network.
        runtimeCaching: [{
          urlPattern: /\/app\/assets\/(agora|firebase)-.*\.js$/,
          handler: 'CacheFirst',
          options: { cacheName: 'live-sdk', expiration: { maxEntries: 8 } },
        }],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/agora-rtc-sdk-ng')) return 'agora';
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
        },
      },
    },
  },
  server: { port: 5174 },
});
