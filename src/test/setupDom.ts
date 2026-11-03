import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'

export const reducedMotion = { matches: true }

vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion.matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
)

afterEach(() => cleanup())
