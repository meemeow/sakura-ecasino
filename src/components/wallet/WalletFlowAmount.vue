<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Button from 'primevue/button'
import InputNumber, { type InputNumberInputEvent } from 'primevue/inputnumber'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { useWalletStore } from '@/stores/wallet'
import {
  DEPOSIT_PRESETS,
  MAX_DEPOSIT,
  MIN_DEPOSIT,
  RELOAD_BONUS_PERCENT,
  RELOAD_BONUS_RATE,
  WITHDRAW_DAILY_LIMIT,
  WITHDRAW_PRESETS,
  reloadBonusFor,
} from '@/constants/wallet'
import { formatAmount, formatMoney } from '@/utils/format'

const amount = defineModel<number | null>('amount', { required: true })
const bonusOn = defineModel<boolean>('bonusOn', { required: true })
const props = defineProps<{
  isDeposit: boolean
  bonus: number
  bonusActive: boolean
  bonusUsedToday: boolean
  maxWithdraw: number
  error: string
}>()
const emit = defineEmits<{ next: [] }>()

const wallet = useWalletStore()

const bonusPercent = RELOAD_BONUS_PERCENT
const presets = computed(() => (props.isDeposit ? DEPOSIT_PRESETS : WITHDRAW_PRESETS))
const maxAmount = computed(() => (props.isDeposit ? MAX_DEPOSIT : WITHDRAW_DAILY_LIMIT))

function capWhileTyping(e: InputNumberInputEvent) {
  stopTween()
  picked.value = null
  if (typeof e.value !== 'number' || e.value <= maxAmount.value) return
  const input = e.originalEvent.target as HTMLInputElement
  input.value = `₱${formatAmount(maxAmount.value)}`
  input.setSelectionRange(input.value.length, input.value.length)
  amount.value = maxAmount.value
}

const coinsFor = (index: number) => index + 1
const PILE_ROWS = [
  [1],
  [2],
  [2, 1],
  [3, 1],
  [3, 2],
  [3, 2, 1],
  [4, 2, 1],
  [4, 3, 1],
  [4, 3, 2],
  [4, 3, 2, 1],
]
const COIN_TILT = [-12, 8, -4, 14, -9, 5, -15, 10, -6, 3]
const PILES = PILE_ROWS.map((rows) => {
  const coins: { x: number; y: number; r: number }[] = []
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      coins.push({ x: (i - (count - 1) / 2) * 16, y: row * 12, r: COIN_TILT[coins.length]! })
    }
  })
  return coins
})
const pileSize = (coins: number) => {
  const rows = PILE_ROWS[coins - 1]!
  return { '--rows': rows.length, '--cols': rows[0] }
}
const BONUS_PILES = PILE_ROWS.map((rows, i) => {
  const count = Math.ceil((i + 1) * RELOAD_BONUS_RATE)
  const side = ((rows[0]! - 1) / 2) * 16 + 13
  const top = (rows.length - 1) * 12
  return [
    { x: -side, y: 3, r: -20 },
    { x: side, y: 5, r: 18 },
    { x: 7, y: top + 11, r: 10 },
  ].slice(0, count)
})

const picked = ref<number | null>(null)
const dropKey = ref(0)
const isPicked = (value: number) =>
  picked.value === value || (picked.value === null && amount.value === value)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let tweenFrame = 0
function stopTween() {
  cancelAnimationFrame(tweenFrame)
}
onBeforeUnmount(stopTween)

function pick(value: number) {
  picked.value = value
  dropKey.value++
  stopTween()
  const from = amount.value ?? 0
  if (reducedMotion.matches || from === value) {
    amount.value = value
    return
  }
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / 450)
    const eased = 1 - (1 - t) ** 3
    amount.value = t < 1 ? Math.round(from + (value - from) * eased) : value
    if (t < 1) tweenFrame = requestAnimationFrame(frame)
  }
  tweenFrame = requestAnimationFrame(frame)
}
</script>

<template>
  <form class="flow-step" @submit.prevent="emit('next')">
    <div class="flow-amount">
      <InputNumber
        v-model="amount"
        input-id="flow-amount"
        prefix="₱"
        placeholder="₱0"
        :min-fraction-digits="0"
        :max-fraction-digits="isDeposit ? 2 : 0"
        :min="isDeposit ? MIN_DEPOSIT : 0"
        :max="maxAmount"
        locale="en-PH"
        aria-label="Amount"
        autofocus
        fluid
        @input="capWhileTyping"
      />
      <p class="flow-hint">
        <template v-if="isDeposit">
          ₱{{ MIN_DEPOSIT }} to ₱{{ formatAmount(MAX_DEPOSIT) }} per deposit
        </template>
        <template v-else>
          Available <strong>₱{{ formatMoney(wallet.balance) }}</strong> · up to ₱{{
            formatAmount(WITHDRAW_DAILY_LIMIT)
          }}
          per day
        </template>
      </p>
    </div>

    <div class="flow-chips">
      <button
        v-for="(p, i) in presets"
        :key="p.amount"
        type="button"
        class="flow-chip"
        :class="{ selected: isPicked(p.amount) }"
        :aria-pressed="isPicked(p.amount)"
        :disabled="!isDeposit && p.amount > wallet.balance"
        @click="pick(p.amount)"
      >
        <span v-if="p.hot" class="flow-hot">Hot</span>
        <span
          :key="isPicked(p.amount) ? dropKey : 0"
          class="flow-pile"
          :style="pileSize(coinsFor(i))"
          aria-hidden="true"
        >
          <template v-if="bonusActive">
            <SakuraIcon
              v-for="(c, n) in BONUS_PILES[coinsFor(i) - 1]"
              :key="`bonus-${n}`"
              class="flow-coin flow-bonus-coin"
              :style="{ '--i': n, '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg` }"
            />
          </template>
          <SakuraIcon
            v-for="(c, n) in PILES[coinsFor(i) - 1]"
            :key="n"
            variant="gold"
            class="flow-coin"
            :style="{ '--i': n, '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg` }"
          />
        </span>
        <span class="flow-chip-amount">₱{{ formatAmount(p.amount) }}</span>
        <span v-if="bonusActive" class="flow-chip-bonus">
          +₱{{ formatAmount(reloadBonusFor(p.amount)) }}
        </span>
      </button>
      <button
        v-if="!isDeposit"
        type="button"
        class="flow-chip"
        :class="{ selected: maxWithdraw > 0 && isPicked(maxWithdraw) }"
        :aria-pressed="maxWithdraw > 0 && isPicked(maxWithdraw)"
        :disabled="maxWithdraw <= 0"
        @click="pick(maxWithdraw)"
      >
        <span
          :key="isPicked(maxWithdraw) ? dropKey : 0"
          class="flow-pile"
          :style="pileSize(coinsFor(presets.length))"
          aria-hidden="true"
        >
          <SakuraIcon
            v-for="(c, n) in PILES[coinsFor(presets.length) - 1]"
            :key="n"
            variant="gold"
            class="flow-coin"
            :style="{ '--i': n, '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg` }"
          />
        </span>
        <span class="flow-chip-amount">Max</span>
      </button>
    </div>

    <div v-if="isDeposit" class="flow-bonus" :class="{ used: bonusUsedToday }">
      <span class="flow-tile"><i class="pi pi-gift" /></span>
      <div class="flow-bonus-text">
        <p class="flow-bonus-title">Reload Bonus</p>
        <p class="flow-bonus-note">
          <template v-if="bonusUsedToday">
            Used today. Your next {{ bonusPercent }}% comes back after midnight.
          </template>
          <template v-else-if="bonus > 0">
            <strong>+₱{{ formatMoney(bonus) }}</strong> extra on this deposit
          </template>
          <template v-else>{{ bonusPercent }}% extra on one deposit a day</template>
        </p>
      </div>
      <button
        type="button"
        role="switch"
        class="flow-switch"
        :class="{ on: bonusOn && !bonusUsedToday }"
        :aria-checked="bonusOn && !bonusUsedToday"
        :disabled="bonusUsedToday"
        aria-label="Reload Bonus"
        @click="bonusOn = !bonusOn"
      >
        <span class="flow-knob">
          <i class="pi" :class="bonusOn && !bonusUsedToday ? 'pi-check' : 'pi-times'" />
        </span>
      </button>
    </div>

    <p v-if="error" class="flow-error" role="alert">{{ error }}</p>
    <Button
      type="submit"
      label="Continue"
      icon="pi pi-arrow-right"
      icon-pos="right"
      class="flow-primary"
    />
  </form>
</template>

<style>
.sakura-wallet-flow .flow-amount {
  text-align: center;
}

.sakura-wallet-flow .flow-amount .p-inputnumber-input {
  height: 68px;
  padding: 0;
  border: none;
  border-bottom: 2px solid var(--app-border);
  border-radius: 0;
  background: none;
  color: var(--app-text);
  font-family: inherit;
  font-weight: 900;
  font-size: 2.6rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  box-shadow: none;
}

.sakura-wallet-flow .flow-amount .p-inputnumber-input::placeholder {
  color: var(--app-muted);
  opacity: 0.45;
}

.sakura-wallet-flow .flow-amount .p-inputnumber-input:focus {
  border-bottom-color: var(--dlg-accent);
}

.sakura-wallet-flow .flow-hint {
  margin: 10px 0 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.78rem;
}

.sakura-wallet-flow .flow-hint strong {
  color: var(--app-text);
  font-weight: 800;
}

.sakura-wallet-flow .flow-chips {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.sakura-wallet-flow .flow-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  padding: 10px 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-text);
  font: inherit;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.1s;
}

.sakura-wallet-flow .flow-chip:not(:disabled):active {
  transform: scale(0.95);
}

.sakura-wallet-flow .flow-pile {
  position: relative;
  width: 70px;
  height: 58px;
  margin-bottom: 4px;
}

.sakura-wallet-flow .flow-coin {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 20px;
  height: 20px;
  margin-left: -10px;
  filter: drop-shadow(0 1.5px 1px rgb(0 0 0 / 0.45));
  transform: translate(var(--x), calc(var(--y) * -1)) rotate(var(--r));
}

.sakura-wallet-flow .flow-bonus-coin {
  width: 16px;
  height: 16px;
  margin-left: -8px;
  animation: flow-bonus-pop 0.35s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  animation-delay: calc(var(--i) * 70ms);
}

@keyframes flow-bonus-pop {
  from {
    opacity: 0;
    transform: translate(var(--x), calc(var(--y) * -1)) rotate(var(--r)) scale(0);
  }
  to {
    transform: translate(var(--x), calc(var(--y) * -1)) rotate(var(--r)) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-wallet-flow .flow-bonus-coin {
    animation: none;
  }
}

.sakura-wallet-flow .flow-chip.selected .flow-coin {
  animation: flow-coin-drop 0.45s cubic-bezier(0.3, 1.5, 0.55, 1) both;
  animation-delay: calc(var(--i) * 45ms);
}

@keyframes flow-coin-drop {
  from {
    opacity: 0;
    transform: translate(var(--x), calc(var(--y) * -1 - 30px)) rotate(calc(var(--r) - 120deg));
  }
  40% {
    opacity: 1;
  }
  to {
    transform: translate(var(--x), calc(var(--y) * -1)) rotate(var(--r));
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-wallet-flow .flow-chip.selected .flow-coin {
    animation: none;
  }
}

.sakura-wallet-flow .flow-chip-amount {
  font-weight: 800;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sakura-wallet-flow .flow-chip-bonus {
  color: var(--dlg-accent);
  font-weight: 700;
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sakura-wallet-flow .flow-hot {
  position: absolute;
  top: 0;
  right: 0;
  padding: 1px 5px;
  border-radius: 0 6px 0 4px;
  background: #e0262f;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.52rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sakura-wallet-flow .flow-chip:not(:disabled):not(.selected):hover {
  background: linear-gradient(rgb(128 140 175 / 0.16), rgb(128 140 175 / 0.16)), var(--app-surface);
}

.sakura-wallet-flow .flow-chip.selected {
  border-color: var(--dlg-accent);
  background: var(--dlg-tint);
}

.sakura-wallet-flow .flow-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sakura-wallet-flow .flow-chip:focus-visible,
.sakura-wallet-flow .flow-switch:focus-visible {
  outline: 2px solid var(--dlg-accent);
  outline-offset: 2px;
}

.sakura-wallet-flow .flow-bonus {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

.sakura-wallet-flow .flow-bonus.used .flow-tile,
.sakura-wallet-flow .flow-bonus.used .flow-switch {
  opacity: 0.5;
}

.sakura-wallet-flow .flow-switch:disabled {
  cursor: not-allowed;
}

.sakura-wallet-flow .flow-bonus-text {
  flex: 1;
  min-width: 0;
}

.sakura-wallet-flow .flow-bonus-title {
  margin: 0;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.88rem;
}

.sakura-wallet-flow .flow-bonus-note {
  margin: 2px 0 0;
  color: var(--app-muted);
  font-size: 0.75rem;
}

.sakura-wallet-flow .flow-bonus-note strong {
  color: var(--dlg-accent);
  font-weight: 800;
}

.sakura-wallet-flow .flow-switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 28px;
  padding: 0;
  border: 1px solid #2f3868;
  border-radius: 999px;
  background: #1a2042;
  cursor: pointer;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.sakura-wallet-flow .flow-switch.on {
  border-color: var(--dlg-ring);
  background: var(--dlg-tint);
}

:root:not(.app-dark) .sakura-wallet-flow .flow-switch {
  border-color: #d5dbea;
  background: #eef1f8;
}

:root:not(.app-dark) .sakura-wallet-flow .flow-switch.on {
  border-color: #f3b3cb;
  background: #ffe3ee;
}

.sakura-wallet-flow .flow-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2c3563;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  color: #aab2c5;
  transition:
    transform 0.4s ease,
    background 0.3s,
    color 0.3s;
}

:root:not(.app-dark) .sakura-wallet-flow .flow-knob {
  background: #ffffff;
  color: var(--app-muted);
}

.sakura-wallet-flow .flow-switch.on .flow-knob {
  background: linear-gradient(#ffe27a, #ffb800);
  color: #703902;
  transform: translateX(24px) rotate(360deg);
}

:root:not(.app-dark) .sakura-wallet-flow .flow-switch.on .flow-knob {
  background: linear-gradient(#ff7aae, #e0457f);
  color: #ffffff;
}

.sakura-wallet-flow .flow-knob .pi {
  font-size: 0.65rem;
}

@media (prefers-reduced-motion: reduce) {
  .sakura-wallet-flow .flow-knob {
    transition: none;
  }
}

@media (max-width: 560px) {
  .sakura-wallet-flow .flow-chips {
    gap: 6px;
  }

  .sakura-wallet-flow .flow-pile {
    transform: scale(0.82);
    transform-origin: bottom center;
  }

  .sakura-wallet-flow .flow-chip-amount {
    font-size: 0.76rem;
  }

  .sakura-wallet-flow .flow-amount .p-inputnumber-input {
    font-size: 2.1rem;
  }
}

@media (max-width: 400px) {
  .sakura-wallet-flow .flow-chips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .sakura-wallet-flow .flow-chip {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    padding: 6px 12px 6px 8px;
    text-align: right;
  }

  .sakura-wallet-flow .flow-chip:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .sakura-wallet-flow .flow-pile {
    grid-row: 1 / span 2;
    align-self: center;
    width: calc((var(--cols) - 1) * 16px + 22px);
    height: calc((var(--rows) - 1) * 12px + 22px);
    margin: 0;
    transform: none;
    zoom: 0.55;
  }

  .sakura-wallet-flow .flow-chip-amount {
    grid-row: 1;
    grid-column: 2;
    align-self: end;
    font-size: 0.78rem;
  }

  .sakura-wallet-flow .flow-chip-amount:last-child {
    grid-row: 1 / span 2;
    align-self: center;
  }

  .sakura-wallet-flow .flow-chip-bonus {
    grid-row: 2;
    grid-column: 2;
    align-self: start;
  }

  .sakura-wallet-flow .flow-bonus-title {
    white-space: nowrap;
  }

  .sakura-wallet-flow .flow-bonus {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'tile title switch'
      'note note note';
    gap: 10px 12px;
  }

  .sakura-wallet-flow .flow-bonus-text {
    display: contents;
  }

  .sakura-wallet-flow .flow-bonus .flow-tile {
    grid-area: tile;
  }

  .sakura-wallet-flow .flow-bonus-title {
    grid-area: title;
    align-self: center;
  }

  .sakura-wallet-flow .flow-switch {
    grid-area: switch;
  }

  .sakura-wallet-flow .flow-bonus-note {
    grid-area: note;
    margin: 0;
  }
}

@media (max-width: 480px) {
  .sakura-wallet-flow .flow-amount .p-inputnumber-input {
    height: 50px;
    font-size: 1.8rem;
  }

  .sakura-wallet-flow .flow-hint {
    margin-top: 6px;
    font-size: 0.72rem;
  }

  .sakura-wallet-flow .flow-bonus {
    padding: 10px 12px;
  }

  .sakura-wallet-flow .flow-bonus-title {
    font-size: 0.82rem;
  }

  .sakura-wallet-flow .flow-bonus-note {
    font-size: 0.7rem;
  }
}
</style>
