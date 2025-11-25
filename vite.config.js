import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/jwt': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/students': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/schedules': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/scores': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/student-subject': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/student-subject': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
