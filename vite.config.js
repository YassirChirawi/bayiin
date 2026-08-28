import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// import prerender from 'vite-plugin-prerender'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 // 4 MB
      },
      manifest: {
        name: 'BayIIn',
        short_name: 'BayIIn',
        description: 'بايعين - Plateforme de gestion retail n°1 au Maroc',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    /*
    prerender({
      routes: ['/', '/login', '/register', '/pricing'],
      staticDir: path.join(__dirname, 'dist'),
    })
    */
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none"
    },
    proxy: {
      '/api': {
        target: 'https://us-central1-commerce-saas-62f32.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      // Fichiers sans logique a verifier : point d'entree, config, styles,
      // catalogues de donnees, et les tests eux-memes.
      exclude: [
        '**/*.{test,spec}.{js,jsx}',
        'src/main.jsx',
        'src/setupTests.js',
        'src/locales/**',
        'src/data/**',
        '**/node_modules/**',
      ],
      // SEUILS PLANCHER, pas des cibles. Ils constatent l'etat mesure
      // (50,3 % de statements) avec une petite marge, et servent de cliquet :
      // la couverture ne peut plus BAISSER sans faire echouer la CI.
      //
      // A remonter au fur et a mesure. Ne jamais les abaisser pour faire passer
      // un build : ce serait exactement le defaut qu'on a corrige sur le lint,
      // ou une regle non bloquante avait laisse passer trois bugs reels.
      //
      // Attention a l'interpretation : ce pourcentage ne compte QUE Vitest. Les
      // 34 tests E2E, les 35 tests de regles et les 28 tests d'integration ne
      // sont pas instrumentes ici. `pages/` apparait a 0 % alors que le parcours
      // complet est verifie a chaque execution.
      thresholds: {
        statements: 48,
        branches: 43,
        functions: 42,
        lines: 48,
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['@headlessui/react', 'lucide-react', 'framer-motion', 'react-hot-toast'],
          'vendor-utils': ['date-fns', 'papaparse', 'jspdf']
        }
      }
    }
  }
})

