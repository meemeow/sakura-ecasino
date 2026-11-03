import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'

const auth = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  onChange: (() => {}) as (user: { uid: string } | null) => void,
}))

vi.mock('@/firebase', () => ({ auth: {} }))
vi.mock('vuefire', () => ({ getCurrentUser: () => Promise.resolve(auth.user) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_: unknown, callback: typeof auth.onChange) => (auth.onChange = callback),
}))

const view = { default: { template: '<div />' } }
vi.mock('@/views/GamesView.vue', () => view)
vi.mock('@/views/WalletView.vue', () => view)
vi.mock('@/views/DepositPayView.vue', () => view)
vi.mock('@/views/AccountView.vue', () => view)
vi.mock('@/views/VipView.vue', () => view)
vi.mock('@/views/PromotionsView.vue', () => view)
vi.mock('@/views/PlayView.vue', () => view)

let router: Router

beforeEach(async () => {
  auth.user = null
  window.history.replaceState(null, '', '/')
  vi.resetModules()
  router = (await import('@/router')).default
  await router.push('/')
})

const at = () => router.currentRoute.value.fullPath

describe('guarded routes', () => {
  it.each(['/wallet', '/account', '/favorites', '/wallet/deposit/tx-1'])(
    'send guests from %s to the login modal',
    async (path) => {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe(path)
    },
  )

  it('let signed-in players through', async () => {
    auth.user = { uid: 'player-1' }
    await router.push('/wallet')
    expect(at()).toBe('/wallet')
  })

  it('leave public pages open to guests', async () => {
    for (const path of ['/vip', '/promotions', '/slots', '/play/gates-of-olympus-1000']) {
      await router.push(path)
      expect(at()).toBe(path)
    }
  })

  it('send players home when they sign out on a guarded page', async () => {
    auth.user = { uid: 'player-1' }
    await router.push('/account')
    auth.user = null
    auth.onChange(null)
    await vi.waitFor(() => expect(at()).toBe('/'))
  })

  it('keep players in place when they sign out on a public page', async () => {
    await router.push('/vip')
    auth.onChange(null)
    await Promise.resolve()
    expect(at()).toBe('/vip')
  })
})

describe('redirects', () => {
  it('sends old and unknown paths to real pages', async () => {
    await router.push('/scatter')
    expect(at()).toBe('/slots')
    await router.push('/no/such/page')
    expect(at()).toBe('/')
  })
})

describe('page titles', () => {
  it('names game pages after the game', async () => {
    await router.push('/play/gates-of-olympus-1000')
    expect(document.title).toBe('Sakura | Gates of Olympus 1000 | Play Online')
  })

  it('uses the route title and falls back to the default', async () => {
    await router.push('/vip')
    expect(document.title).toBe('Sakura | VIP Club')
    await router.push('/')
    expect(document.title).toBe('Sakura | Casino Demo (Play Money)')
  })

  it('updates the meta description', async () => {
    const meta = document.createElement('meta')
    meta.name = 'description'
    document.head.append(meta)
    await router.push('/promotions')
    expect(meta.content).toMatch(/^Welcome bonus/)
    await router.push('/')
    expect(meta.content).toMatch(/^Sakura is a portfolio demo/)
    meta.remove()
  })
})
