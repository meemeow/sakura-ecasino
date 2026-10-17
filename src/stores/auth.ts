import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCurrentUser } from 'vuefire'

export const useAuthStore = defineStore('auth', () => {
  const user = useCurrentUser()
  const isLoggedIn = computed(() => !!user.value)

  return { user, isLoggedIn }
})
