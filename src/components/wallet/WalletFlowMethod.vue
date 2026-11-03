<script setup lang="ts">
import Button from 'primevue/button'
import type { Method } from '@/constants/wallet'
import { TURNOVER_BONUS_MULTIPLIER, TURNOVER_DEPOSIT_MULTIPLIER } from '@/constants/wallet'
import { formatMoney } from '@/utils/format'

const method = defineModel<string>('method', { required: true })
defineProps<{
  isDeposit: boolean
  methods: Method[]
  methodLabel: string
  amount: number
  bonus: number
  total: number
  addedTurnover: number
  confirmLabel: string
  confirming: boolean
  error: string
}>()
const emit = defineEmits<{ back: []; confirm: [] }>()
</script>

<template>
  <div class="flow-step">
    <button type="button" class="flow-back" @click="emit('back')">
      <i class="pi pi-arrow-left" /> Change amount
    </button>
    <div class="flow-methods" role="radiogroup" :aria-label="isDeposit ? 'Pay with' : 'Send to'">
      <button
        v-for="m in methods"
        :key="m.id"
        type="button"
        role="radio"
        class="flow-method"
        :class="[m.id, { selected: method === m.id }]"
        :aria-checked="method === m.id"
        @click="method = m.id"
      >
        <span class="flow-logo"><img :src="m.logo" alt="" /></span>
        <span class="flow-method-name">{{ m.label }}</span>
        <span class="flow-radio" />
      </button>
    </div>

    <dl class="flow-receipt">
      <div>
        <dt>{{ isDeposit ? 'Deposit' : 'Withdraw' }} via {{ methodLabel }}</dt>
        <dd>₱{{ formatMoney(amount) }}</dd>
      </div>
      <div v-if="isDeposit">
        <dt>Reload Bonus</dt>
        <dd :class="{ accent: bonus > 0 }">+₱{{ formatMoney(bonus) }}</dd>
      </div>
      <div class="total">
        <dt>{{ isDeposit ? 'Added to wallet' : 'Balance after' }}</dt>
        <dd>₱{{ formatMoney(total) }}</dd>
      </div>
      <div v-if="isDeposit" class="turnover">
        <dt>
          Bet before withdrawing
          <small>
            {{ TURNOVER_DEPOSIT_MULTIPLIER }}× deposit
            <template v-if="bonus > 0">+ {{ TURNOVER_BONUS_MULTIPLIER }}× bonus</template>
          </small>
        </dt>
        <dd>₱{{ formatMoney(addedTurnover) }}</dd>
      </div>
    </dl>

    <p v-if="error" class="flow-error" role="alert">{{ error }}</p>
    <Button
      :label="confirmLabel"
      class="flow-primary"
      :loading="confirming"
      @click="emit('confirm')"
    />
  </div>
</template>

<style>
.sakura-wallet-flow .flow-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sakura-wallet-flow .flow-method {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px 10px 10px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.sakura-wallet-flow .flow-method:focus-visible {
  outline: 2px solid var(--dlg-accent);
  outline-offset: 2px;
}

.sakura-wallet-flow .flow-method:hover {
  border-color: var(--dlg-ring);
}

.sakura-wallet-flow .flow-method.selected {
  border-color: var(--dlg-accent);
  box-shadow: inset 0 0 0 1px var(--dlg-accent);
}

.sakura-wallet-flow .flow-logo {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 92px;
  height: 40px;
  padding: 0 10px;
  border: 1px solid rgb(27 37 80 / 0.08);
  border-radius: 8px;
  background: #ffffff;
}

.sakura-wallet-flow .flow-logo img {
  max-width: 100%;
  max-height: 20px;
}

.sakura-wallet-flow .flow-method.maya img {
  max-height: 17px;
  transform: translateY(2px);
}

.sakura-wallet-flow .flow-method-name {
  flex: 1;
  font-weight: 800;
  font-size: 0.9rem;
}

.sakura-wallet-flow .flow-radio {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border: 2px solid var(--app-muted);
  border-radius: 50%;
  transition: border 0.15s;
}

.sakura-wallet-flow .flow-method.selected .flow-radio {
  border: 5px solid var(--dlg-accent);
}

.sakura-wallet-flow .flow-receipt {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 14px 16px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
}

.sakura-wallet-flow .flow-receipt div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.sakura-wallet-flow .flow-receipt dt {
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.82rem;
}

.sakura-wallet-flow .flow-receipt dd {
  margin: 0;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

.sakura-wallet-flow .flow-receipt dd.accent {
  color: var(--dlg-accent);
}

.sakura-wallet-flow .flow-receipt .total {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--app-border);
}

.sakura-wallet-flow .flow-receipt .total dt {
  color: var(--app-text);
  font-weight: 800;
}

.sakura-wallet-flow .flow-receipt .total dd {
  font-weight: 900;
  font-size: 1.05rem;
}

.sakura-wallet-flow .flow-receipt .turnover {
  align-items: flex-start;
}

.sakura-wallet-flow .flow-receipt .turnover dt small {
  display: block;
  margin-top: 2px;
  font-weight: 500;
  font-size: 0.72rem;
  opacity: 0.85;
}

.sakura-wallet-flow .flow-receipt .turnover dd {
  color: var(--dlg-accent);
}

.sakura-wallet-flow .flow-back {
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  margin: -4px 0 -4px -6px;
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--app-muted);
  font: inherit;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.15s;
}

.sakura-wallet-flow .flow-back:hover {
  color: var(--app-text);
}

.sakura-wallet-flow .flow-back:focus-visible {
  outline: 2px solid var(--dlg-accent);
}

.sakura-wallet-flow .flow-back .pi {
  font-size: 0.72rem;
}
</style>
