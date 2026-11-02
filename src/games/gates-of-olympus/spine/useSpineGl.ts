import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  createSpineRenderer,
  type SpineRenderer,
  type SpineTexture,
} from '@/games/gates-of-olympus/spine/spineGl'

export type SpineGl<K extends string> = {
  renderer: SpineRenderer
  textures: Record<K, SpineTexture>
}

export function useSpineGl<K extends string>(canvas: Ref<HTMLCanvasElement | null>, name: string) {
  let images: Record<K, HTMLImageElement> | null = null
  let gl: SpineGl<K> | null = null

  function setup() {
    const el = canvas.value
    if (!el || !images) return
    try {
      const renderer = createSpineRenderer(el)
      const textures = {} as Record<K, SpineTexture>
      for (const key in images) textures[key] = renderer.upload(images[key])
      gl = { renderer, textures }
    } catch (e) {
      console.warn(`Couldn't start the ${name} renderer`, e)
      gl = null
    }
  }

  function onContextLost(e: Event) {
    e.preventDefault()
    gl = null
  }

  onMounted(() => {
    canvas.value?.addEventListener('webglcontextlost', onContextLost)
    canvas.value?.addEventListener('webglcontextrestored', setup)
  })

  onBeforeUnmount(() => {
    canvas.value?.removeEventListener('webglcontextlost', onContextLost)
    canvas.value?.removeEventListener('webglcontextrestored', setup)
    gl?.renderer.dispose()
  })

  return {
    start(loaded: Record<K, HTMLImageElement>) {
      images = loaded
      setup()
    },
    current: () => gl,
  }
}
