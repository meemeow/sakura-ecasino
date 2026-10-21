import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules\/(@firebase|firebase|vuefire)\//, priority: 2 },
            { name: 'vue', test: /node_modules\/(@vue|vue|vue-router|pinia)\//, priority: 1 },
          ],
        },
      },
    },
  },
})
