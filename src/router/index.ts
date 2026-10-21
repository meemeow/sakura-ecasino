import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { getCurrentUser } from 'vuefire'
import { gameTabs } from '@/components/games/gameTabs'
import { fetchProfile, verificationStatus } from '@/services/profile'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    /** Also needs completed personal details + declarations (KYC) first */
    requiresProfile?: boolean
    /** Render without the app header/layout (games) */
    fullscreen?: boolean
    /** Tab title after "Sakura | "; a function can derive it from the route */
    title?: string | ((to: RouteLocationNormalized) => string)
    /** Overrides the default meta description */
    description?: string
  }
}

const GamesView = () => import('@/views/GamesView.vue')

// Category tabs without a hand-written route above (Table, Game Shows, Fishing)
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
const DEFAULT_TITLE = 'Online Casino, Slots & Live Games'
const DEFAULT_DESCRIPTION =
  'Play top online slots and casino games at Sakura. Explore new releases, top slots and your favorite games in one place.'

// 'gates-of-olympus-1000' -> 'Gates of Olympus 1000'
const SMALL_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'to'])
function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

// The lobby's tab routes, plus /login (the same lobby under the sign-in modal)
const lobbyPaths = new Set([...gameTabs.map((t) => t.to), '/login'])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // A new page starts at the top. Back/forward return to where you were; staying on the same
  // page (query changes like ?mode=deposit) or switching lobby tabs keeps the scroll, so the
  // tabs don't jump out of view.
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
    // Renders the lobby with the auth modal open on top
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
    // Paying a QR deposit: its QR, the exact amount, the countdown and the proof form
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
    const status = verificationStatus(await fetchProfile(user.uid))
    // Opens the Personal Details form on the account page, then comes back here once saved
    if (status === 'unverified') {
      return { name: 'account', query: { completeProfile: '1', redirect: to.fullPath } }
    }
    // Details saved but not approved yet: the account page explains the wait
    if (status === 'verifying') return { name: 'account', query: { verifying: '1' } }
  }
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
