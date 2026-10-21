<script setup lang="ts">
import Toast from 'primevue/toast'
import type { ToastMessageOptions } from 'primevue/toast'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

function severity(message: ToastMessageOptions) {
  return message.severity ?? 'info'
}

function keepTimer() {}
</script>

<template>
  <Toast class="sakura-toast" :on-mouse-enter="keepTimer" :on-mouse-leave="keepTimer">
    <template #container="{ message, closeCallback }">
      <div class="toast-shell">
        <div
          class="toast-card"
          :class="`is-${severity(message)}`"
          :style="message.life ? { '--life': `${message.life}ms` } : undefined"
        >
          <span class="toast-icon" aria-hidden="true">
            <SakuraIcon v-if="severity(message) === 'success'" mark="check" />
            <SakuraIcon
              v-else-if="severity(message) === 'warn'"
              :variant="isDark ? 'gold' : 'pink'"
              mark="alert"
            />
            <SakuraIcon v-else-if="severity(message) === 'error'" variant="red" mark="alert" />
            <SakuraIcon v-else mark="info" />
          </span>
          <div class="toast-text">
            <p class="toast-summary">{{ message.summary }}</p>
            <p v-if="message.detail" class="toast-detail">{{ message.detail }}</p>
          </div>
          <button type="button" class="toast-close" aria-label="Close" @click="closeCallback">
            <i class="pi pi-times" />
          </button>
          <span v-if="message.life" class="toast-timer" aria-hidden="true" />
        </div>
      </div>
    </template>
  </Toast>
</template>

<style>
.p-toast.sakura-toast {
  top: 82px !important;
  width: min(360px, calc(100vw - 32px));
}

.sakura-toast .p-toast-message {
  margin-bottom: 12px;
  border: none;
  background: none;
  box-shadow: none;
  backdrop-filter: none;
}

.sakura-toast .toast-shell {
  min-height: 0;
}

.sakura-toast .p-toast-message-enter-active {
  animation: toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.sakura-toast .p-toast-message-leave-active {
  animation: toast-out 0.45s ease-in-out forwards;
}

.sakura-toast .p-toast-message-leave-active .toast-shell {
  overflow: hidden;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(32px);
  }
}

@keyframes toast-out {
  0% {
    grid-template-rows: 1fr;
    margin-bottom: 12px;
    opacity: 1;
    transform: none;
  }
  45% {
    grid-template-rows: 1fr;
    margin-bottom: 12px;
    opacity: 0;
    transform: translateX(40px);
  }
  100% {
    grid-template-rows: 0fr;
    margin-bottom: 0;
    opacity: 0;
    transform: translateX(40px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-toast .p-toast-message-enter-active,
  .sakura-toast .p-toast-message-leave-active {
    animation-duration: 0.01s;
  }
}

.sakura-toast .toast-card {
  --toast-accent: #ffc200;

  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 5px;
  padding: 14px 12px 16px 14px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-navbar);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 5px 0 #02030a,
    0 16px 32px rgb(0 0 0 / 0.45);
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
}

:root:not(.app-dark) .sakura-toast .toast-card {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.9),
    0 5px 0 #d3d9e8,
    0 16px 32px rgb(20 30 70 / 0.14);
}

:root:not(.app-dark) .sakura-toast .toast-card.is-success {
  --toast-accent: #e0457f;
}

.sakura-toast .toast-card.is-info {
  --toast-accent: #a5b4fc;
}

:root:not(.app-dark) .sakura-toast .toast-card.is-info {
  --toast-accent: #4f5fb8;
}

.sakura-toast .toast-card.is-warn {
  --toast-accent: #ffb020;
}

:root:not(.app-dark) .sakura-toast .toast-card.is-warn {
  --toast-accent: #e0457f;
}

.sakura-toast .toast-card.is-error {
  --toast-accent: #f87171;
}

:root:not(.app-dark) .sakura-toast .toast-card.is-error {
  --toast-accent: #dc2626;
}

.sakura-toast .toast-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
}

.sakura-toast .toast-icon svg {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
}

.sakura-toast .toast-text {
  flex: 1;
  min-width: 0;
}

.sakura-toast .toast-summary {
  margin: 0;
  font-weight: 700;
  font-size: 0.88rem;
  line-height: 1.35;
}

.sakura-toast .toast-detail {
  margin: 3px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.78rem;
  line-height: 1.45;
}

.sakura-toast .toast-close {
  display: grid;
  flex: 0 0 auto;
  align-self: flex-start;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-panel);
  color: var(--app-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.sakura-toast .toast-close:hover {
  color: var(--app-text);
}

.sakura-toast .toast-close .pi {
  font-size: 0.65rem;
}

.sakura-toast .toast-timer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--toast-accent);
  transform-origin: left;
  animation: toast-timer var(--life) linear forwards;
}

.sakura-toast .p-toast-message:hover .toast-timer {
  animation-play-state: paused;
}

@keyframes toast-timer {
  to {
    transform: scaleX(0);
  }
}

@media (max-width: 480px) {
  .p-toast.sakura-toast {
    top: 74px !important;
    right: 16px !important;
  }
}
</style>
