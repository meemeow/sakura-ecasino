import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/utils/redirect'

describe('safeRedirect', () => {
  it.each(['/', '/wallet', '/account?completeProfile=1', '/slots#top'])('keeps %s', (path) => {
    expect(safeRedirect(path)).toBe(path)
  })

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'wallet',
    '',
    '/login',
    '/login?redirect=/wallet',
  ])('rejects %s', (path) => {
    expect(safeRedirect(path)).toBe('/')
  })

  it('rejects missing and repeated query values', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect(['/wallet', '/account'])).toBe('/')
  })

  it('uses the given fallback', () => {
    expect(safeRedirect('//evil.example', '/account')).toBe('/account')
  })
})
