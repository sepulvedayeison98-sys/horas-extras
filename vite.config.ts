import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Actions el sitio se sirve en /<repositorio>/. Derivamos el base
// automáticamente de GITHUB_REPOSITORY para que funcione con CUALQUIER nombre
// de repo sin tocar el código. En local (npm run dev/build) el base es '/'.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo ? `/${repo}/` : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Horas Extras — Dashboard Personal',
        short_name: 'Horas Extras',
        description: 'Control personal de horas laborales, extras y pagos quincenales',
        lang: 'es-CO',
        display: 'standalone',
        orientation: 'portrait',
        // Rutas relativas al manifest → funcionan igual en '/' o en '/repo/'
        id: '.',
        start_url: '.',
        scope: base,
        background_color: '#0f1222',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
