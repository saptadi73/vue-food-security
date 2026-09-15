import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.VITE_API_ORIGIN || 'http://localhost:8000'
  const useProxy = env.VITE_USE_PROXY === 'true'

  return {
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Dev-only proxy agar origin browser tetap http://localhost:5173.
      proxy: useProxy ? { '/api': { target: backendOrigin, changeOrigin: true } } : undefined,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('apexcharts')) return 'charts'
            if (id.includes('qr-scanner') || id.includes('node_modules/qrcode')) return 'qr'
            return undefined
          },
        },
      },
    },
  }
})
