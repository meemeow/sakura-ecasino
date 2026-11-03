import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

const DOM_TESTS = 'src/{components,views,router}/**/__tests__/*.spec.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: fileURLToPath(new URL('./', import.meta.url)),
      exclude: [...configDefaults.exclude, 'e2e/**'],
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/__tests__/*.spec.ts'],
            exclude: [...configDefaults.exclude, DOM_TESTS],
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: [DOM_TESTS],
            setupFiles: ['src/test/setupDom.ts'],
          },
        },
        ...(process.env.FIRESTORE_EMULATOR_HOST
          ? [
              {
                extends: true,
                test: {
                  name: 'rules',
                  environment: 'node',
                  include: ['tests/firestore/*.spec.ts'],
                  fileParallelism: false,
                  testTimeout: 20_000,
                },
              },
            ]
          : []),
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/__tests__/**', 'src/test/**', 'src/**/*.d.ts'],
        reporter: ['text-summary', 'html'],
        thresholds: {
          'src/utils/**': { lines: 95, functions: 80, branches: 95 },
          'src/constants/**': { lines: 90, functions: 80, branches: 70 },
          'src/router/**': { lines: 75, functions: 80, branches: 70 },
          'src/games/gates-of-olympus/engine/**': { lines: 65, functions: 60, branches: 70 },
        },
      },
    },
  }),
)
