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
      treeshake: {
        moduleSideEffects: [
          {
            test: /node_modules\/(@firebase|firebase)\/(database|storage|app-check)\//,
            sideEffects: false,
          },
        ],
      },
      output: {
        codeSplitting: {
          groups: [
            { name: 'vue', test: /node_modules\/(@vue|vue|vue-router|pinia)\//, priority: 2 },
            { name: 'firebase', test: /node_modules\/(@firebase|firebase|vuefire)\//, priority: 1 },
          ],
        },
      },
    },
  },
})
