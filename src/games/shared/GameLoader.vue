<script setup lang="ts">
import sakuraLogo from '@/assets/images/logo-wordmark.png'

withDefaults(defineProps<{ progress: number; logo?: string; logoAlt?: string }>(), {
  logo: sakuraLogo,
  logoAlt: 'Sakura',
})
</script>

<template>
  <div
    class="loader"
    role="progressbar"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <img :src="logo" :alt="logoAlt" class="logo" />
    <div class="track">
      <div class="bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
    </div>
  </div>
</template>

<style scoped>
.loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #000;
}

.logo {
  width: 240px;
}

.track {
  width: 240px;
  height: 4px;
  border-radius: 2px;
  background: #2a2a2a;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 2px;
  background: #f19021;
  box-shadow: 0 0 8px #f19021;
  transition: width 0.06s linear;
}
</style>
