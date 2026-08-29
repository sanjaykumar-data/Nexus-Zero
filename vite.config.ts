import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Makes the WEBSITE ITSELF work fully offline (not just the AI
    // pipeline). A service worker precaches the app shell (HTML/JS/CSS)
    // so the page loads and runs with no network at all after the first
    // visit — closed browser, airplane mode, no dev server running, etc.
    // The AI models are already cached separately by transformers.js /
    // web-llm via IndexedDB and the browser HTTP cache; this covers the
    // rest of the site around them.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nexus Zero — On-Device Document Intelligence',
        short_name: 'Nexus Zero',
        description: 'Air-gapped, on-device document intelligence. Works fully offline after first load.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache the app shell itself.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Large model/wasm files are already cached by the AI libraries'
        // own IndexedDB logic — we don't need Workbox to also intercept
        // those, so exclude the biggest worker/model bundles from the
        // precache manifest to keep install-time caching fast.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            // Any same-origin static asset not already precached
            // (fallback safety net).
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'CacheFirst',
            options: { cacheName: 'nexus-zero-app-shell' },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm', '@xenova/transformers'],
  },
  worker: {
    format: 'es',
  },
});
