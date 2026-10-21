import type { LocationQueryValue } from 'vue-router'

export function safeRedirect(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
  fallback = '/',
) {
  if (typeof value !== 'string' || !/^\/(?![/\\])/.test(value)) return fallback
  return value.startsWith('/login') ? fallback : value
}
