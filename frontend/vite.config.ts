import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vuetify from 'vite-plugin-vuetify'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue(), vueJsx(), vuetify({ autoImport: true }), tailwindcss(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@/shared/constants': fileURLToPath(new URL('./src/shared/constants', import.meta.url)),
      '@/shared/utils': fileURLToPath(new URL('./src/shared/utils', import.meta.url)),
      '@/modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@/adapters': fileURLToPath(new URL('./src/adapters', import.meta.url)),
      '@/modules/tasks': fileURLToPath(new URL('./src/modules/tasks', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ??
          (mode === 'development' ? 'http://backend:8000' : 'http://localhost:8000'),
        changeOrigin: true,
      },
      '/sanctum': {
        target:
          process.env.VITE_API_PROXY_TARGET ??
          (mode === 'development' ? 'http://backend:8000' : 'http://localhost:8000'),
        changeOrigin: true,
      },
    },
  },
}))