<script setup lang="ts">
import { computed } from 'vue'
import { STAGE } from '@/games/gates-of-olympus/winFx'
import { TUMBLE_FONT } from '@/games/gates-of-olympus/tumbleFont'

const props = defineProps<{ text: string; asset: string }>()

const em = (px: number) => `${px / TUMBLE_FONT.size}em`

const glyphs = computed(() =>
  [...props.text].flatMap((char, i) => {
    const glyph = TUMBLE_FONT.glyphs[char]
    if (!glyph) return []
    const [x, y, w, h, dx, dy, advance] = glyph
    return [
      {
        key: `${i}${char}`,
        box: { width: em(advance) },
        ink: {
          left: em(dx),
          top: em(dy),
          width: em(w),
          height: em(h),
          backgroundPosition: `${em(-x)} ${em(-y)}`,
        },
      },
    ]
  }),
)

const style = {
  fontSize: `${(100 * TUMBLE_FONT.size) / STAGE.w}cqw`,
  '--atlas': `url(${props.asset}/${TUMBLE_FONT.file})`,
  '--atlas-size': `${em(TUMBLE_FONT.atlas.w)} ${em(TUMBLE_FONT.atlas.h)}`,
}
</script>

<template>
  <span class="tumble-number" :style="style" role="img" :aria-label="text">
    <span v-for="glyph in glyphs" :key="glyph.key" class="glyph" :style="glyph.box">
      <span class="ink" :style="glyph.ink" />
    </span>
  </span>
</template>

<style scoped>
.tumble-number {
  display: inline-flex;
  height: 1em;
  line-height: 1;
}

.glyph {
  position: relative;
  flex: none;
  height: 1em;
}

.ink {
  position: absolute;
  background-image: var(--atlas);
  background-size: var(--atlas-size);
  background-repeat: no-repeat;
}
</style>
