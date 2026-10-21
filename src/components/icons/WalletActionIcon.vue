<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{ kind?: 'deposit' | 'withdraw' }>(), {
  kind: 'deposit',
})

const maskId = `wallet-badge-${useId()}`
const symbol = computed(() =>
  props.kind === 'deposit' ? 'M18 15.8v4.4M15.8 18h4.4' : 'M18 20.3v-4.6M15.9 17.7l2.1-2.1 2.1 2.1',
)
</script>

<template>
  <svg class="wallet-icon" width="1.25em" height="1.25em" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <mask :id="maskId">
        <rect width="24" height="24" fill="#fff" />
        <path
          :d="symbol"
          fill="none"
          stroke="#000"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </mask>
    </defs>
    <path
      d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17v3"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h7M3 7.5A2.5 2.5 0 0 0 5.5 10H19a1.5 1.5 0 0 1 1.5 1.5v1"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="18" cy="18" r="4.6" fill="currentColor" :mask="`url(#${maskId})`" />
  </svg>
</template>

<style scoped>
.wallet-icon {
  flex: 0 0 auto;
}
</style>
