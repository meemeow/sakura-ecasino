import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { getCurrentUser } from 'vuefire'
import { auth } from '@/firebase'
import { gameTabs } from '@/constants/gameTabs'
import { fetchProfile, verificationStatus } from '@/services/profile'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresProfile?: boolean
    fullscreen?: boolean
    title?: string | ((to: RouteLocationNormalized) => string)
    description?: string
  }
}

const GamesView = () => import('@/views/GamesView.vue')

const categoryRoutes = gameTabs
  .filter((t) => !['all', 'slots', 'favorites'].includes(t.value))
  .map((t) => ({
    path: t.to,
    name: t.value,
    component: GamesView,
    props: { tab: t.value },
    meta: { title: 'title' in t ? t.title : t.label },
  }))

const SITE_NAME = 'Sakura'
const DEFAULT_TITLE = 'Casino Demo (Play Money)'
const DEFAULT_DESCRIPTION =
  'Sakura is a portfolio demo of an online casino app: slots, wallet, VIP levels and light and dark modes. Play money only, no real-money gambling.'

const SMALL_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'to'])
function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

const lobbyPaths = new Set([...gameTabs.map((t) => t.to), '/login'])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    if (lobbyPaths.has(to.path) && lobbyPaths.has(from.path)) return false
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'all', component: GamesView, props: { tab: 'all' } },
    {
      path: '/slots',
      name: 'slots',
      component: GamesView,
      props: { tab: 'slots' },
      meta: {
        title: 'Online Slots',
        description:
          'Play online slots with free spins, multipliers and big-win features at Sakura.',
      },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: GamesView,
      props: { tab: 'favorites' },
      meta: { requiresAuth: true, title: 'My Favorites' },
    },
    ...categoryRoutes,
    {
      path: '/login',
      name: 'login',
      component: GamesView,
      props: { tab: 'all', showAuth: true },
      meta: { title: 'Login or Register' },
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/WalletView.vue'),
      meta: { requiresAuth: true, title: 'Wallet' },
    },
    {
      path: '/wallet/deposit/:id',
      name: 'deposit-pay',
      component: () => import('@/views/DepositPayView.vue'),
      props: true,
      meta: { requiresAuth: true, title: 'Pay Deposit' },
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
      meta: { requiresAuth: true, title: 'My Account' },
    },
    {
      path: '/vip',
      name: 'vip',
      component: () => import('@/views/VipView.vue'),
      meta: {
        title: 'VIP Club',
        description: 'Climb 50 VIP levels at Sakura by depositing and playing your favorite games.',
      },
    },
    {
      path: '/promotions',
      name: 'promotions',
      component: () => import('@/views/PromotionsView.vue'),
      meta: {
        title: 'Promotions',
        description: 'Welcome bonus, VIP rewards, leaderboards and monthly cash draws at Sakura.',
      },
    },
    {
      path: '/play/:gameId',
      name: 'play',
      component: () => import('@/views/PlayView.vue'),
      props: true,
      meta: {
        fullscreen: true,
        title: (to) => `${titleFromSlug(String(to.params.gameId))} | Play Online`,
      },
    },
    { path: '/scatter', redirect: '/slots' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return
  const user = await getCurrentUser()
  if (!user) return { name: 'login', query: { redirect: to.fullPath } }

  if (to.meta.requiresProfile) {
    const profile = await fetchProfile(user.uid).catch(() => null)
    const status = verificationStatus(profile)
    if (status === 'unverified') {
      return { name: 'account', query: { completeProfile: '1', redirect: to.fullPath } }
    }
    if (status === 'verifying') return { name: 'account', query: { verifying: '1' } }
  }
})

onAuthStateChanged(auth, (user) => {
  if (!user && router.currentRoute.value.meta.requiresAuth) router.replace({ name: 'all' })
})

const CHUNK_ERROR = /dynamically imported module|module script failed|Unable to preload CSS/i
const RELOAD_KEY = 'sakura-chunk-reload'
router.onError((error: unknown, to) => {
  if (!(error instanceof Error) || !CHUNK_ERROR.test(error.message)) return
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY))
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  window.location.assign(router.resolve(to).href)
})

router.afterEach((to) => {
  const { title, description } = to.meta
  const page = typeof title === 'function' ? title(to) : (title ?? DEFAULT_TITLE)
  document.title = `${SITE_NAME} | ${page}`
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', description ?? DEFAULT_DESCRIPTION)
})

export default router
