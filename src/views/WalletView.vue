<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Tooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'
import TransactionList from '@/components/wallet/TransactionList.vue'
import { MAX_BALANCE, useWalletStore } from '@/stores/wallet'
import gcashLogo from '@/assets/images/payments/gcash.png'
import mayaLogo from '@/assets/images/payments/maya.png'
import qrphLogo from '@/assets/images/payments/qrph.png'

// UI only for now: Confirm validates and shows "coming soon". Real deposits and
// withdrawals need a payment provider plus Cloud Functions (see CLAUDE.md).

type Mode = 'deposit' | 'withdraw'

interface Preset {
  amount: number
  /** Reload Bonus credited on top, in pesos */
  bonus?: number
  hot?: boolean
}

interface Method {
  id: string
  label: string
  logo: string
}

const MIN_DEPOSIT = 20
const WITHDRAW_DAILY_LIMIT = 50_000

const DEPOSIT_PRESETS: Preset[] = [
  { amount: 20 },
  { amount: 50, bonus: 2.5 },
  { amount: 100, bonus: 10 },
  { amount: 200, bonus: 30, hot: true },
  { amount: 500, bonus: 100, hot: true },
  { amount: 1_000, bonus: 250, hot: true },
  { amount: 5_000, bonus: 1_750 },
  { amount: 10_000, bonus: 4_000 },
  { amount: 50_000, bonus: 25_000 },
]
const WITHDRAW_PRESETS: Preset[] = [200, 500, 1_000, 5_000, 10_000, 50_000].map((amount) => ({
  amount,
}))

const DEPOSIT_METHODS: Method[] = [
  { id: 'gcash', label: 'GCash', logo: gcashLogo },
  { id: 'maya', label: 'Maya', logo: mayaLogo },
  { id: 'qrph', label: 'QR Ph', logo: qrphLogo },
]
const WITHDRAW_METHODS: Method[] = [
  { id: 'gcash', label: 'GCash', logo: gcashLogo },
  { id: 'maya', label: 'Maya', logo: mayaLogo },
]

const vTooltip = Tooltip
const wallet = useWalletStore()
const toast = useToast()

const route = useRoute()
const modeFromQuery = (): Mode => (route.query.mode === 'withdraw' ? 'withdraw' : 'deposit')

// The header's Deposit / Withdraw buttons link here with ?mode=
const mode = ref<Mode>(modeFromQuery())
watch(
  () => route.query.mode,
  () => (mode.value = modeFromQuery()),
)
const amount = ref<number | null>(null)
const bonusOn = ref(true)
const method = ref('gcash')
const error = ref('')

const presets = computed(() => (mode.value === 'deposit' ? DEPOSIT_PRESETS : WITHDRAW_PRESETS))
const methods = computed(() => (mode.value === 'deposit' ? DEPOSIT_METHODS : WITHDRAW_METHODS))

const peso = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const peso2 = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Each tab starts fresh
watch(mode, () => {
  amount.value = null
  method.value = 'gcash'
  error.value = ''
})
watch([amount, method], () => (error.value = ''))

function validate() {
  const value = amount.value ?? 0
  if (mode.value === 'deposit') {
    if (value < MIN_DEPOSIT) return `Minimum deposit is ₱${MIN_DEPOSIT}.`
    // The bonus is credited too, so it counts toward the cap
    const bonus = bonusOn.value ? (DEPOSIT_PRESETS.find((p) => p.amount === value)?.bonus ?? 0) : 0
    if (wallet.balance + value + bonus > MAX_BALANCE)
      return `Your balance can't go above ₱${peso2.format(MAX_BALANCE)}.`
    return ''
  }
  if (value <= 0) return 'Enter an amount to withdraw.'
  if (value > wallet.balance) return 'Amount is more than your available balance.'
  if (value > WITHDRAW_DAILY_LIMIT)
    return `You can withdraw up to ₱${peso.format(WITHDRAW_DAILY_LIMIT)} per day.`
  return ''
}

function confirm() {
  error.value = validate()
  if (error.value) return
  toast.add({
    severity: 'info',
    summary: mode.value === 'deposit' ? 'Deposits are coming soon' : 'Withdrawals are coming soon',
    life: 3000,
  })
}
</script>

<template>
  <section class="wallet">
    <h1 class="page-title">Wallet</h1>

    <div class="columns">
      <div class="card main">
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ active: mode === 'deposit' }"
            :aria-selected="mode === 'deposit'"
            @click="mode = 'deposit'"
          >
            <i class="pi pi-wallet" /> Deposit
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ active: mode === 'withdraw' }"
            :aria-selected="mode === 'withdraw'"
            @click="mode = 'withdraw'"
          >
            <i class="pi pi-building-columns" /> Withdraw
          </button>
        </div>

        <div v-if="mode === 'deposit'" class="bonus-bar">
          <i class="pi pi-star-fill bonus-star" />
          <span class="bonus-title">Reload Bonus</span>
          <i
            v-tooltip.top="
              'Get extra credits on top of your deposit. The bonus is shown on each amount.'
            "
            class="pi pi-info-circle bonus-info"
            tabindex="0"
          />
          <label class="bonus-toggle">
            {{ bonusOn ? 'On' : 'Off' }}
            <ToggleSwitch v-model="bonusOn" />
          </label>
        </div>

        <div v-else class="available">
          <span>Available for Withdrawal:</span>
          <strong>₱{{ peso2.format(wallet.balance) }}</strong>
        </div>

        <InputNumber
          v-model="amount"
          class="amount"
          :placeholder="mode === 'deposit' ? '0.00' : '0'"
          :min-fraction-digits="mode === 'deposit' ? 2 : 0"
          :max-fraction-digits="mode === 'deposit' ? 2 : 0"
          :min="0"
          :max="1_000_000"
          locale="en-PH"
          aria-label="Amount"
          fluid
        />
        <p class="hint">
          {{
            mode === 'deposit'
              ? `Minimum Deposit ₱${MIN_DEPOSIT}`
              : `Withdraw limit ₱${peso.format(WITHDRAW_DAILY_LIMIT)} per day`
          }}
        </p>

        <div class="presets">
          <button
            v-for="p in presets"
            :key="p.amount"
            type="button"
            class="preset"
            :class="{ selected: amount === p.amount }"
            @click="amount = p.amount"
          >
            <span v-if="p.hot && bonusOn" class="hot">HOT</span>
            <span>{{ peso.format(p.amount) }}</span>
            <span v-if="p.bonus && bonusOn && mode === 'deposit'" class="preset-bonus">
              +₱{{ peso.format(p.bonus) }}
            </span>
          </button>
        </div>

        <p class="section-label">
          {{ mode === 'deposit' ? 'Deposit to Wallet from' : 'Withdraw to account' }}
        </p>
        <div class="methods">
          <button
            v-for="m in methods"
            :key="m.id"
            type="button"
            class="method"
            :class="[m.id, { selected: method === m.id }]"
            :aria-pressed="method === m.id"
            @click="method = m.id"
          >
            <img :src="m.logo" :alt="m.label" />
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <button type="button" class="confirm" @click="confirm">
          {{ mode === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal' }}
        </button>
      </div>

      <div class="card history">
        <h2>Transactions</h2>
        <TransactionList :transactions="wallet.walletTxs" kind="wallet" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.wallet {
  font-family: 'Montserrat', sans-serif;
}

.page-title {
  margin: 4px 0 16px;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

@media (max-width: 900px) {
  .columns {
    grid-template-columns: 1fr;
  }
}

.card {
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: var(--app-radius);
  background: var(--app-navbar);
}

.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

/* Deposit / Withdraw switch, same glossy blue as the account panels */
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 10px;
  background: linear-gradient(180deg, #3a7bff, #1d4ed8);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.4);
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  border: none;
  border-radius: 8px;
  background: none;
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 1.05rem;
  cursor: pointer;
}

.tab.active {
  background: #1557d6;
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.3);
}

.tab:not(.active):hover {
  background: rgb(255 255 255 / 0.08);
}

/* Reload Bonus */
.bonus-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f59e5b, #e0679a 55%, #b44ce0);
  color: #fff;
}

.bonus-star {
  color: #ffd84d;
  font-size: 1.1rem;
}

.bonus-title {
  font-weight: 800;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.bonus-info {
  font-size: 0.85rem;
  cursor: help;
}

.bonus-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Available balance (withdraw) */
.available {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 8px;
  background: var(--app-surface);
}

.available span {
  color: var(--app-muted);
  font-size: 0.8rem;
}

.available strong {
  color: #3a7bff;
  font-weight: 800;
}

/* Big amount field */
.amount :deep(.p-inputnumber-input) {
  height: 60px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 10px;
  background: var(--app-surface);
  color: #3a7bff;
  font-family: inherit;
  font-weight: 900;
  font-size: 2rem;
  text-align: center;
  box-shadow: none;
}

.amount :deep(.p-inputnumber-input::placeholder) {
  color: #3a7bff;
  opacity: 1;
}

.amount :deep(.p-inputnumber-input:focus) {
  border-color: #3a7bff;
}

.hint {
  margin: -4px 0 0;
  color: var(--app-text);
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
}

/* Preset amounts */
.presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preset {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 6px 4px 0;
  overflow: hidden;
  border: 1px solid #2f6bff;
  border-radius: 4px;
  /* Halftone dots; ::after fades them out toward the middle */
  background:
    radial-gradient(rgb(58 123 255 / 0.35) 1px, transparent 1.2px) 0 0 / 5px 5px,
    var(--app-surface);
  color: #3a7bff;
  font: inherit;
  font-weight: 800;
  font-size: 1.35rem;
  cursor: pointer;
}

.preset::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, var(--app-surface) 35%, transparent 75%);
  pointer-events: none;
}

.preset > * {
  position: relative;
  z-index: 1;
}

.preset:hover {
  border-color: #6b9bff;
}

.preset.selected {
  border-color: #ffc200;
  box-shadow: inset 0 0 0 1px #ffc200;
}

.preset-bonus {
  margin-top: 2px;
  padding: 1px 8px;
  border-radius: 4px 4px 0 0;
  background: #1d6bff;
  color: #fff;
  font-weight: 800;
  font-size: 0.65rem;
}

/* Red corner ribbon */
.hot {
  position: absolute;
  top: 6px;
  left: -18px;
  width: 60px;
  padding: 1px 0;
  background: #dc2626;
  color: #fff;
  font-weight: 900;
  font-size: 0.5rem;
  text-align: center;
  transform: rotate(-45deg);
}

.section-label {
  margin: 6px 0 0;
  color: var(--app-text);
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
}

/* Payment channels */
.methods {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

/* White, so the logos' white backgrounds blend in */
.method {
  display: grid;
  place-items: center;
  width: 110px;
  height: 46px;
  padding: 0 12px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.method img {
  max-width: 100%;
  max-height: 22px;
}

/* The "y" descender makes the Maya wordmark sit high; drop it to the optical center */
.method.maya img {
  max-height: 19px;
  transform: translateY(2px);
}

.method.qrph img {
  max-height: 17px;
}

.method.selected {
  border-color: #ffc200;
  box-shadow: 0 0 0 2px rgb(255 194 0 / 0.35);
}

.error {
  margin: 0;
  color: #f87171;
  font-weight: 500;
  font-size: 0.85rem;
  text-align: center;
}

/* Gold 3D button, same as the dialogs */
.confirm {
  align-self: center;
  width: min(100%, 450px);
  margin: 6px 0 6px;
  padding: 13px;
  border: none;
  border-radius: 8px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  color: #703902;
  font: inherit;
  font-weight: 900;
  font-size: 0.85rem;
  text-transform: uppercase;
  cursor: pointer;
}

.confirm:hover {
  background: #ffd033;
}

.confirm:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #d9871f;
}

/* Transactions card */
.history {
  padding: 14px 10px 10px;
}

.history h2 {
  margin: 0 6px 8px;
  color: var(--app-text);
  font-weight: 800;
  font-size: 1rem;
}
</style>
