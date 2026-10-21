import { defineStore } from 'pinia'
import { computed } from 'vue'
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCollection, useCurrentUser } from 'vuefire'
import { db } from '@/firebase'

export const useFavoritesStore = defineStore('favorites', () => {
  const user = useCurrentUser()

  const favoritesRef = computed(() =>
    user.value ? collection(db, 'users', user.value.uid, 'favorites') : null,
  )
  const favorites = useCollection(favoritesRef)
  const ids = computed(() => new Set(user.value ? favorites.value.map((f) => f.id) : []))

  function isFavorite(gameId: string) {
    return ids.value.has(gameId)
  }

  async function toggle(gameId: string) {
    if (!user.value) return
    const ref = doc(db, 'users', user.value.uid, 'favorites', gameId)
    if (isFavorite(gameId)) await deleteDoc(ref)
    else await setDoc(ref, { addedAt: serverTimestamp() })
  }

  return { ids, isFavorite, toggle }
})
