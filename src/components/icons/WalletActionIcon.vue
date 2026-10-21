<script setup lang="ts">
import { computed, useId } from 'vue'

// Wallet with a badge: a plus for deposit ("add money"), an up arrow for withdraw ("money
// out"). Drawn in currentColor; the badge's symbol is cut out with a mask, so it shows whatever
// is behind the icon (gold button, pink button, tile). Sized by font-size, like PrimeIcons.
const props = withDefaults(defineProps<{ kind?: 'deposit' | 'withdraw' }>(), {
  kind: 'deposit',
})

// Mask ids must be unique per instance, since the header and wallet page show it at once
const maskId = `wallet-badge-${useId()}`
const symbol = computed(() =>
  props.kind === 'deposit' ? 'M18 15.8v4.4M15.8 18h4.4' : 'M18 20.3v-4.6M15.9 17.7l2.1-2.1 2.1 2.1',
)
</script>

<template>
  <!-- Default size as attributes, not CSS, so any page's class (e.g. the header's 21px) wins -->
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
