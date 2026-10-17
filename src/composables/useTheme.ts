import { computed, ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'sakura-theme'

function readStored(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Shared across every caller. PrimeVue switches to dark tokens when <html> has .app-dark
const theme = ref<Theme>(readStored())

watch(
  theme,
  (value) => {
    document.documentElement.classList.toggle('app-dark', value === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Storage blocked (private window etc.); the choice just won't persist
    }
  },
  { immediate: true },
)

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  return { theme, isDark, toggleTheme }
}
