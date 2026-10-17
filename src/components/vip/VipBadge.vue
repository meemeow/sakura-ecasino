<script setup lang="ts">
import { computed, useId } from 'vue'
import { MAX_VIP_LEVEL, chipFor, petalsFor, rankFor } from '@/vip/levels'

const props = withDefaults(
  defineProps<{
    level: number
    size?: number
    /** Hide the level ribbon, for small spots where the number would be unreadable */
    plain?: boolean
  }>(),
  { size: 56, plain: false },
)

// Gradient ids must be unique per instance, since many badges share a page
const uid = useId()
const id = (name: string) => `${uid}-${name}`
const url = (name: string) => `url(#${id(name)})`

const rank = computed(() => rankFor(props.level))
const chip = computed(() => chipFor(props.level))
const apex = computed(() => props.level >= MAX_VIP_LEVEL)
const petals = computed(() => (apex.value ? { full: 5, bud: false } : petalsFor(props.level)))

const notchAngles = computed(() =>
  Array.from({ length: chip.value.notches }, (_, i) => (360 / chip.value.notches) * i),
)

// Five petals around the center, clockwise from the top
const PETAL_ANGLES = [0, 72, 144, 216, 288]
</script>

<template>
  <!-- A casino chip with a sakura inlay, drawn on the same grid as the gold Sakura chip
       (assets/icons/promos/vip.svg) so the ranks visibly grow into it at VIP 50 -->
  <svg
    class="badge"
    :class="{ apex }"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    :aria-label="`VIP ${level}, ${apex ? 'Golden Sakura' : rank.name}`"
  >
    <defs>
      <linearGradient :id="id('face')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="chip.face[0]" />
        <stop offset=".4" :stop-color="chip.face[1]" />
        <stop offset="1" :stop-color="chip.face[2]" />
      </linearGradient>
      <linearGradient :id="id('inlay')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="chip.inlay[0]" />
        <stop offset="1" :stop-color="chip.inlay[1]" />
      </linearGradient>
      <linearGradient :id="id('petal')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="chip.petal[0]" />
        <stop offset="1" :stop-color="chip.petal[1]" />
      </linearGradient>
    </defs>

    <!-- Extrusion, face and edge notches -->
    <circle cx="32" cy="35" r="28" :fill="chip.edge" />
    <circle cx="32" cy="32" r="28" :fill="url('face')" :stroke="chip.edge" stroke-width="1.2" />
    <rect
      v-for="a in notchAngles"
      :key="a"
      x="28.5"
      y="4.6"
      width="7"
      height="8"
      rx="1.5"
      :fill="chip.notch"
      :transform="`rotate(${a} 32 32)`"
    />

    <!-- Sparkles on the face between the notches -->
    <g v-if="chip.ornate" fill="#fff" opacity=".85">
      <path d="M41 9.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
      <path d="M11.4 21.5l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" />
    </g>

    <!-- Inlay -->
    <circle cx="32" cy="32" r="17" :fill="url('inlay')" :stroke="chip.trim" stroke-width="2" />
    <circle
      v-if="chip.ornate"
      cx="32"
      cy="32"
      r="13.5"
      fill="none"
      :stroke="chip.trim"
      stroke-width=".8"
      stroke-dasharray="2 2"
      opacity=".7"
    />

    <!-- Sakura: faint outlines for petals still to come, a bud on odd levels, full petals -->
    <g v-for="(a, i) in PETAL_ANGLES" :key="a" :transform="`rotate(${a} 32 32)`">
      <ellipse v-if="i < petals.full" cx="32" cy="25.5" rx="3.6" ry="5.2" :fill="url('petal')" />
      <template v-else>
        <ellipse
          cx="32"
          cy="25.5"
          rx="3.6"
          ry="5.2"
          :fill="chip.petal[1]"
          fill-opacity=".1"
          :stroke="chip.petal[0]"
          stroke-opacity=".4"
          stroke-width=".6"
          stroke-dasharray="1.4 1"
        />
        <ellipse
          v-if="i === petals.full && petals.bud"
          cx="32"
          cy="27.3"
          rx="2.1"
          ry="3.2"
          :fill="url('petal')"
        />
      </template>
    </g>
    <circle cx="32" cy="32" r="2.2" :fill="chip.inlay[1]" />

    <!-- Shine -->
    <ellipse
      cx="22"
      cy="14"
      rx="11"
      ry="4.5"
      fill="#fff"
      opacity=".4"
      transform="rotate(-28 22 14)"
    />

    <!-- Level ribbon across the bottom -->
    <g v-if="!plain">
      <path
        d="M13 47.5h38l-3 6.25 3 6.25H13l3-6.25z"
        :fill="url('inlay')"
        :stroke="chip.trim"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <text
        x="32"
        y="54.2"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="chip.trim"
        class="num"
      >
        {{ level }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.badge {
  flex: 0 0 auto;
  overflow: visible;
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
}

/* VIP 50: the gold Sakura chip glows */
.badge.apex {
  animation: apex-glow 2.4s ease-in-out infinite;
}

@keyframes apex-glow {
  0%,
  100% {
    filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45)) drop-shadow(0 0 6px rgb(255 194 0 / 0.35));
  }
  50% {
    filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45)) drop-shadow(0 0 14px rgb(255 194 0 / 0.7));
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge.apex {
    animation: none;
    filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45)) drop-shadow(0 0 10px rgb(255 194 0 / 0.5));
  }
}

.num {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 10px;
}
</style>
