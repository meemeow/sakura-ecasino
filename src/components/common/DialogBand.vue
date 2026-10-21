<script setup lang="ts">
import branchUrl from '@/assets/images/sakura-branch.svg'
import tallBranchUrl from '@/assets/images/sakura-branch-tall.svg'

defineProps<{
  title: string
  subtitle?: string
  smallTree?: boolean
}>()
defineEmits<{ close: [] }>()

const petals = [
  { x: '12%', s: 0.8, d: '9s', delay: '0s' },
  { x: '26%', s: 1, d: '11s', delay: '-4s' },
  { x: '40%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '53%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '64%', s: 1.1, d: '10s', delay: '-7s' },
  { x: '75%', s: 0.75, d: '9.5s', delay: '-3s' },
  { x: '86%', s: 1, d: '11.5s', delay: '-9s' },
  { x: '96%', s: 0.85, d: '8.5s', delay: '-5s' },
]
</script>

<template>
  <header class="dialog-band">
    <div class="band-blossoms" aria-hidden="true">
      <img :src="smallTree ? tallBranchUrl : branchUrl" alt="" class="band-branch" />
      <span
        v-for="(p, i) in petals"
        :key="i"
        class="band-petal"
        :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
      />
    </div>
    <span class="band-icon"><slot name="icon" /></span>
    <div class="band-text">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <button type="button" class="band-close" aria-label="Close" @click="$emit('close')">
      <i class="pi pi-times" />
    </button>
  </header>
</template>

<style>
.dialog-band {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  padding: 16px 28px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-navbar);
  color: var(--app-text);
  position: relative;
  isolation: isolate;
}

.dialog-band .band-blossoms {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.dialog-band .band-branch {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  user-select: none;
}

.dialog-band .band-petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: band-petal-fall var(--d) linear var(--delay) infinite;
}

:root.app-dark .dialog-band .band-branch {
  opacity: 0.6;
}

:root.app-dark .dialog-band .band-petal {
  filter: brightness(0.75);
}

@keyframes band-petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  12% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-90px, 96px) rotate(320deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog-band .band-petal {
    display: none;
  }
}

.dialog-band .band-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
  font-size: 1rem;
}

:root:not(.app-dark) .dialog-band .band-icon {
  background: #ffe9f1;
  color: #e0457f;
}

.dialog-band .band-text {
  flex: 1;
  min-width: 0;
}

.dialog-band .band-text h2 {
  margin: 0;
  color: var(--dlg-accent);
  font-weight: 800;
  font-size: 1.1rem;
}

.dialog-band .band-text p {
  margin: 3px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.8rem;
}

.dialog-band .band-close {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2.5px solid var(--app-text);
  border-radius: 50%;
  background: var(--app-navbar);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--app-navbar) 60%, transparent);
  color: var(--app-text);
  cursor: pointer;
}

.dialog-band .band-close .pi {
  font-size: 0.7rem;
  font-weight: 900;
}

@media (max-width: 560px) {
  .dialog-band {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
