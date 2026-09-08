import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
// The engine allowlists Origins (thecanopyguard.com and www only), so a browser
// on localhost cannot call it directly — requests fail with "Failed to fetch".
// This dev-only proxy makes the call same-origin from the browser's point of
// view and forwards it server-side, where no Origin header applies. Set
// VITE_API_URL=http://localhost:<port> in .env.local (gitignored) to route through it.
// Build output is unaffected: `server` applies to `vite dev` only.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://canopyguard-engine-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        // The browser sends Origin: http://localhost:<port>, which the engine's
        // allowlist rejects with a 500 — the same 500 a bogus origin gets. Strip
        // it so this leaves as a server-to-server call, which is what it is.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
