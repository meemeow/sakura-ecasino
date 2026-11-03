<script setup lang="ts">
import Button from 'primevue/button'
import { useWalletStore } from '@/stores/wallet'
import { TURNOVER_BONUS_MULTIPLIER, TURNOVER_DEPOSIT_MULTIPLIER } from '@/constants/wallet'
import { formatMoney } from '@/utils/format'

const emit = defineEmits<{ play: [] }>()

const wallet = useWalletStore()
</script>

<template>
  <div class="flow-step">
    <div class="flow-turnover">
      <span class="flow-tile"><i class="pi pi-lock" /></span>
      <p class="flow-turnover-title">
        Bet <strong>₱{{ formatMoney(wallet.turnover.remaining) }}</strong> more to withdraw
      </p>
      <p class="flow-turnover-note">
        Withdrawals unlock once you've bet {{ TURNOVER_DEPOSIT_MULTIPLIER }}× your deposits and
        {{ TURNOVER_BONUS_MULTIPLIER }}× your bonuses.
      </p>
      <div class="flow-turnover-bar" aria-hidden="true">
        <span :style="{ width: `${wallet.turnover.progress * 100}%` }" />
      </div>
      <p class="flow-turnover-count">
        ₱{{ formatMoney(wallet.turnover.required - wallet.turnover.remaining) }}
        <small>of ₱{{ formatMoney(wallet.turnover.required) }} bet</small>
      </p>
    </div>
    <Button label="Play slots" class="flow-primary" @click="emit('play')" />
  </div>
</template>

<style>
.sakura-wallet-flow .flow-turnover {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 16px 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  text-align: center;
}

.sakura-wallet-flow .flow-turnover .flow-tile {
  margin-bottom: 4px;
}

.sakura-wallet-flow .flow-turnover-title {
  margin: 0;
  color: var(--app-text);
  font-weight: 800;
  font-size: 1rem;
}

.sakura-wallet-flow .flow-turnover-title strong {
  color: var(--dlg-accent);
  font-weight: 900;
}

.sakura-wallet-flow .flow-turnover-note {
  max-width: 340px;
  margin: 0 0 8px;
  color: var(--app-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.sakura-wallet-flow .flow-turnover-bar {
  width: 100%;
  height: 10px;
  overflow: hidden;
  border-radius: 5px;
  background: rgb(255 255 255 / 0.08);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.4);
}

:root:not(.app-dark) .sakura-wallet-flow .flow-turnover-bar {
  background: rgb(27 37 80 / 0.08);
  box-shadow: inset 0 1px 2px rgb(27 37 80 / 0.12);
}

.sakura-wallet-flow .flow-turnover-bar span {
  display: block;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #ffe27a, #ffb800);
  transition: width 0.4s ease;
}

:root:not(.app-dark) .sakura-wallet-flow .flow-turnover-bar span {
  background: linear-gradient(90deg, #ff9cc2, #e0457f);
}

.sakura-wallet-flow .flow-turnover-count {
  margin: 4px 0 0;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.sakura-wallet-flow .flow-turnover-count small {
  color: var(--app-muted);
  font-weight: 600;
}

@media (max-width: 480px) {
  .sakura-wallet-flow .flow-turnover {
    gap: 4px;
    padding: 14px 12px 12px;
  }

  .sakura-wallet-flow .flow-turnover-title {
    font-size: 0.9rem;
  }

  .sakura-wallet-flow .flow-turnover-note {
    margin-bottom: 6px;
    font-size: 0.72rem;
  }

  .sakura-wallet-flow .flow-turnover-bar {
    height: 8px;
  }

  .sakura-wallet-flow .flow-turnover-count {
    font-size: 0.78rem;
  }
}
</style>
