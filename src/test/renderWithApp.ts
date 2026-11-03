import { render, type RenderOptions } from '@testing-library/vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'

const STUB_ROUTES: RouteRecordRaw[] = [
  { path: '/', name: 'all', component: { template: '<div />' } },
  { path: '/slots', name: 'slots', component: { template: '<div />' } },
  { path: '/wallet/deposit/:id', name: 'deposit-pay', component: { template: '<div />' } },
]

export async function renderWithApp<C extends Component>(
  component: C,
  options: RenderOptions<C> = {},
) {
  const router = createRouter({ history: createMemoryHistory(), routes: STUB_ROUTES })
  await router.push('/')
  await router.isReady()
  const view = render(component, {
    ...options,
    global: { plugins: [PrimeVue, ToastService, router], ...options.global },
  })
  return { ...view, router }
}
