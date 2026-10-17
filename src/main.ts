import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueFire, VueFireAuth } from 'vuefire'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'

import 'primeicons/primeicons.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/900.css'
import '@/assets/styles/main.css'

import App from './App.vue'
import router from './router'
import { firebaseApp } from '@/firebase'
import { SakuraPreset } from '@/theme/preset'
import { useTheme } from '@/composables/useTheme'

// Applies the saved light/dark choice (dark by default) to <html> before mounting
useTheme()

const app = createApp(App)

app.use(createPinia())
app.use(VueFire, { firebaseApp, modules: [VueFireAuth()] })
app.use(PrimeVue, { theme: { preset: SakuraPreset, options: { darkModeSelector: '.app-dark' } } })
app.use(ToastService)
app.use(router)

app.mount('#app')
