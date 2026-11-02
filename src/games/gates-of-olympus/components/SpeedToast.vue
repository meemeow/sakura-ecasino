<script setup lang="ts">
import '@fontsource/montserrat/800.css'
import { SPEED_NAMES } from '@/games/gates-of-olympus/engine/timing'

defineProps<{ show: boolean; speed: number }>()
</script>

<template>
  <Transition name="toast">
    <div v-if="show" class="speed-toast" role="status">
      <svg viewBox="0 0 76 40" aria-hidden="true">
        <path
          v-for="i in 3"
          :key="i"
          :class="{ lit: i <= speed + 1 }"
          :transform="`translate(${(i - 1) * 23} 0)`"
          d="M12 0H28L30.5 18 17 40H0L14 18Z"
        />
      </svg>
      <p>
        <span>{{ SPEED_NAMES[speed] }}</span> SPINS ENABLED
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.speed-toast {
  position: absolute;
  left: 36.5%;
  top: 37.5%;
  width: 27%;
  height: 21%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.3cqw;
  border-radius: 0.75cqw;
  background: rgb(18 6 16 / 0.82);
  z-index: 5;
}

.speed-toast svg {
  width: 4.3cqw;
}

.speed-toast path {
  fill: #9b999b;
}

.speed-toast path.lit {
  fill: #fff;
}

.speed-toast p {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1.62cqw;
  color: #fff;
  letter-spacing: 0.01em;
}

.speed-toast p span {
  color: #f5ae31;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
