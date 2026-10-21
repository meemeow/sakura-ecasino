<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  text: string
  actionLabel: string
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty">
    <div class="empty-art" aria-hidden="true">
      <img :src="icon" alt="" class="empty-icon" draggable="false" />
    </div>
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
    <button type="button" class="empty-btn" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 8px 0 24px;
  padding: 44px 24px 40px;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: var(--app-surface);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 5px 0 #05070f;
  font-family: 'Montserrat', sans-serif;
  text-align: center;
}

:root:not(.app-dark) .empty {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.9),
    0 5px 0 #d3d9e8;
}

.empty-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  margin-bottom: 18px;
}

.empty-art::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 194 0 / 0.22), transparent 68%);
  animation: empty-glow 3.2s ease-in-out infinite;
}

@keyframes empty-glow {
  50% {
    opacity: 1;
    transform: scale(1.18);
  }
  0%,
  100% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

:root:not(.app-dark) .empty-art::before {
  background: radial-gradient(circle, rgb(255 92 154 / 0.2), transparent 68%);
}

.empty-icon {
  position: relative;
  width: 72px;
  height: 72px;
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.35));
}

.empty h3 {
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.3rem;
}

.empty p {
  max-width: 380px;
  margin: 8px 0 22px;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.9rem;
  line-height: 1.5;
}

.empty-btn {
  height: 40px;
  margin-bottom: 5px;
  padding: 0 22px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  color: #1b2550;
  font-family: inherit;
  font-weight: 900;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
}

.empty-btn:hover {
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
}

.empty-btn:active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}

:root:not(.app-dark) .empty-btn {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 5px 0 #0b1029;
  color: #fff;
}

:root:not(.app-dark) .empty-btn:hover {
  background: linear-gradient(#3d4b9a, #222d60 55%, #161f47);
}

:root:not(.app-dark) .empty-btn:active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 2px 0 #0b1029;
}

@media (prefers-reduced-motion: reduce) {
  .empty-art::before {
    animation: none;
  }
}

@media (max-width: 640px) {
  .empty {
    padding: 26px 18px 24px;
    border-radius: 16px;
  }

  .empty-art {
    width: 80px;
    height: 80px;
    margin-bottom: 12px;
  }

  .empty-icon {
    width: 50px;
    height: 50px;
  }

  .empty h3 {
    font-size: 1.05rem;
  }

  .empty p {
    margin: 6px 0 16px;
    font-size: 0.8rem;
  }

  .empty-btn {
    height: 36px;
    padding: 0 18px;
    font-size: 0.72rem;
  }
}
</style>
