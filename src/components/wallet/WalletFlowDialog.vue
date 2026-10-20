<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber, { type InputNumberInputEvent } from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'
import DialogBand from '@/components/layout/DialogBand.vue'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import WalletActionIcon from '@/components/wallet/WalletActionIcon.vue'
import { MAX_BALANCE, useWalletStore } from '@/stores/wallet'
import { createDeposit } from '@/services/wallet'
import {
  DEPOSIT_METHODS,
  DEPOSIT_PRESETS,
  MAX_DEPOSIT,
  MIN_DEPOSIT,
  WITHDRAW_DAILY_LIMIT,
  WITHDRAW_METHODS,
  WITHDRAW_PRESETS,
  RELOAD_BONUS_RATE,
  TURNOVER_BONUS_MULTIPLIER,
  TURNOVER_DEPOSIT_MULTIPLIER,
  reloadBonusFor,
  reloadBonusUsedToday,
  turnoverFor,
  type WalletMode,
} from '@/components/wallet/walletOptions'

// Deposit or withdraw in two steps: the amount, then the channel with a receipt to confirm.
// A deposit's Confirm opens a pending QR deposit on the server and goes to its Pay page
// (DepositPayView). Withdrawals still show "coming soon".

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ mode: WalletMode }>()

const wallet = useWalletStore()
const toast = useToast()
const router = useRouter()

const step = ref<1 | 2>(1)
const amount = ref<number | null>(null)
const bonusOn = ref(true)
const method = ref('gcash')
const error = ref('')

const isDeposit = computed(() => props.mode === 'deposit')
const presets = computed(() => (isDeposit.value ? DEPOSIT_PRESETS : WITHDRAW_PRESETS))
const methods = computed(() => (isDeposit.value ? DEPOSIT_METHODS : WITHDRAW_METHODS))
const methodLabel = computed(() => methods.value.find((m) => m.id === method.value)?.label ?? '')

const peso = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const peso2 = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Every opening starts fresh
watch(visible, (open) => {
  if (!open) return
  step.value = 1
  stopTween()
  picked.value = null
  amount.value = null
  method.value = 'gcash'
  error.value = ''
})
watch([amount, method], () => (error.value = ''))

// Reload Bonus: 30% of any deposit, once per Philippine day. Used today means none until
// midnight (the server checks this too; it never trusts the client's amount).
const bonusPercent = Math.round(RELOAD_BONUS_RATE * 100)
const bonusUsedToday = computed(() =>
  reloadBonusUsedToday(wallet.profile?.lastReloadBonusAt?.toDate()),
)
const bonusActive = computed(() => isDeposit.value && bonusOn.value && !bonusUsedToday.value)
const bonus = computed(() => (bonusActive.value ? reloadBonusFor(amount.value ?? 0) : 0))
// Most a player can take out right now
const maxWithdraw = computed(() => Math.floor(Math.min(wallet.balance, WITHDRAW_DAILY_LIMIT)))

// Turnover this deposit adds (1x the deposit, 10x its bonus), shown on the receipt
const addedTurnover = computed(() => turnoverFor(amount.value ?? 0, bonus.value))
// Withdrawing waits until the turnover is bet; the dialog shows how far along the player is
const turnoverLocked = computed(() => !isDeposit.value && !wallet.turnover.met)

function playSlots() {
  visible.value = false
  router.push('/slots')
}

function validate() {
  const value = amount.value ?? 0
  if (isDeposit.value) {
    if (value < MIN_DEPOSIT) return `Minimum deposit is ₱${MIN_DEPOSIT}.`
    if (value > MAX_DEPOSIT) return `Maximum deposit is ₱${peso.format(MAX_DEPOSIT)}.`
    // The bonus is credited too, so it counts toward the cap
    if (wallet.balance + value + bonus.value > MAX_BALANCE)
      return `Your balance can't go above ₱${peso2.format(MAX_BALANCE)}.`
    return ''
  }
  if (!wallet.turnover.met)
    return `Bet ₱${peso2.format(wallet.turnover.remaining)} more before withdrawing.`
  if (value <= 0) return 'Enter an amount to withdraw.'
  if (value > wallet.balance) return 'Amount is more than your available balance.'
  if (value > WITHDRAW_DAILY_LIMIT)
    return `You can withdraw up to ₱${peso.format(WITHDRAW_DAILY_LIMIT)} per day.`
  return ''
}

// Highest amount the field takes: ₱50,000 per deposit, the daily limit per withdrawal
const maxAmount = computed(() => (isDeposit.value ? MAX_DEPOSIT : WITHDRAW_DAILY_LIMIT))

// InputNumber only applies :max when the field loses focus, so typing could run past it.
// Snap to the max as soon as a keystroke goes over. (The minimum still waits for blur:
// snapping to ₱20 mid-typing would turn the "5" of "500" into 20.)
function capWhileTyping(e: InputNumberInputEvent) {
  // Typing takes over from a picked tile
  stopTween()
  picked.value = null
  if (typeof e.value !== 'number' || e.value <= maxAmount.value) return
  const input = e.originalEvent.target as HTMLInputElement
  input.value = `₱${peso.format(maxAmount.value)}`
  input.setSelectionRange(input.value.length, input.value.length)
  amount.value = maxAmount.value
}

// Quick amounts as piles of gold sakura coins (the header's balance coin): the pile grows with
// the amount, 1 coin for the smallest and one more per step up, so each tile shows its size at
// a glance.
const coinsFor = (index: number) => index + 1
// How many coins sit in each row of a pile, bottom up, for 1 to 10 coins: a little pyramid
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
// A different tilt per coin, so a pile looks tossed together rather than lined up
const COIN_TILT = [-12, 8, -4, 14, -9, 5, -15, 10, -6, 3]
// Each coin's place in its pile: x from the center and y up from the floor, in px
const PILES = PILE_ROWS.map((rows) => {
  const coins: { x: number; y: number; r: number }[] = []
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      coins.push({ x: (i - (count - 1) / 2) * 16, y: row * 12, r: COIN_TILT[coins.length]! })
    }
  })
  return coins
})
// The Reload Bonus shown as extra pink sakura coins tucked behind each gold pile: about 30% as
// many as the pile (1 to 3), at its sides and peeking over the top
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

// The tile picked last. Kept apart from `amount` because the amount counts up to the new value
// over a moment, and a tile mustn't flicker on as the count passes through its value.
const picked = ref<number | null>(null)
// Bumped on every pick so the picked stack re-mounts and its coins drop in again
const dropKey = ref(0)
const isPicked = (value: number) =>
  picked.value === value || (picked.value === null && amount.value === value)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let tweenFrame = 0
function stopTween() {
  cancelAnimationFrame(tweenFrame)
}

// Pick a tile: its coins drop in, and the big amount counts to the new value (ease-out)
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

function next() {
  error.value = validate()
  if (!error.value) step.value = 2
}

const confirming = ref(false)

async function confirm() {
  // The balance may have changed since step 1
  error.value = validate()
  if (error.value) return
  if (!isDeposit.value) {
    visible.value = false
    toast.add({ severity: 'info', summary: 'Withdrawals are coming soon', life: 3000 })
    return
  }

  // Opens a pending QR deposit on the server (bonus worked out there), then the Pay page
  confirming.value = true
  try {
    const id = await createDeposit(amount.value ?? 0, methodLabel.value, bonusActive.value)
    visible.value = false
    router.push({ name: 'deposit-pay', params: { id } })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'functions/already-exists' && wallet.profile?.pendingDepositId) {
      // Another deposit is still open: finish that one first
      visible.value = false
      router.push({ name: 'deposit-pay', params: { id: wallet.profile.pendingDepositId } })
      return
    }
    error.value =
      code === 'functions/invalid-argument' || code === 'functions/failed-precondition'
        ? (e as Error).message
        : "Couldn't start the deposit. Check your connection and try again."
  } finally {
    confirming.value = false
  }
}

const title = computed(() => (isDeposit.value ? 'Deposit' : 'Withdraw'))
const subtitle = computed(() => {
  if (turnoverLocked.value) return 'Turnover not met yet'
  const what = step.value === 1 ? 'Amount' : isDeposit.value ? 'Pay with' : 'Send to'
  return `Step ${step.value} of 2 · ${what}`
})
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    class="sakura-wallet-flow"
  >
    <DialogBand small-tree :title="title" :subtitle="subtitle" @close="visible = false">
      <template #icon>
        <WalletActionIcon :kind="mode" />
      </template>
    </DialogBand>

    <div class="flow-body">
      <div class="flow-progress" aria-hidden="true">
        <span class="done" />
        <span :class="{ done: step === 2 }" />
      </div>

      <!-- Withdraw with turnover still to bet: how far along, instead of the amount form -->
      <div v-if="turnoverLocked" class="flow-step">
        <div class="flow-turnover">
          <span class="flow-tile"><i class="pi pi-lock" /></span>
          <p class="flow-turnover-title">
            Bet <strong>₱{{ peso2.format(wallet.turnover.remaining) }}</strong> more to withdraw
          </p>
          <p class="flow-turnover-note">
            Withdrawals unlock once you've bet {{ TURNOVER_DEPOSIT_MULTIPLIER }}× your deposits and
            {{ TURNOVER_BONUS_MULTIPLIER }}× your bonuses.
          </p>
          <div class="flow-turnover-bar" aria-hidden="true">
            <span :style="{ width: `${wallet.turnover.progress * 100}%` }" />
          </div>
          <p class="flow-turnover-count">
            ₱{{ peso2.format(wallet.turnover.required - wallet.turnover.remaining) }}
            <small>of ₱{{ peso2.format(wallet.turnover.required) }} bet</small>
          </p>
        </div>
        <Button label="Play slots" class="flow-primary" @click="playSlots" />
      </div>

      <!-- Step 1: how much -->
      <form v-else-if="step === 1" class="flow-step" @submit.prevent="next">
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
              ₱{{ MIN_DEPOSIT }} to ₱{{ peso.format(MAX_DEPOSIT) }} per deposit
            </template>
            <template v-else>
              Available <strong>₱{{ peso2.format(wallet.balance) }}</strong> · up to ₱{{
                peso.format(WITHDRAW_DAILY_LIMIT)
              }}
              per day
            </template>
          </p>
        </div>

        <!-- Quick amounts as piles of gold sakura coins that grow with the amount; picking one
             tosses its coins in and counts the big amount up to it -->
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
            <span :key="isPicked(p.amount) ? dropKey : 0" class="flow-pile" aria-hidden="true">
              <!-- Reload Bonus on: pink sakura coins behind the gold, the extra it adds -->
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
            <span class="flow-chip-amount">₱{{ peso.format(p.amount) }}</span>
            <span v-if="bonusActive" class="flow-chip-bonus">
              +₱{{ peso.format(reloadBonusFor(p.amount)) }}
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
            <!-- Max: the biggest pile -->
            <span :key="isPicked(maxWithdraw) ? dropKey : 0" class="flow-pile" aria-hidden="true">
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
                <strong>+₱{{ peso2.format(bonus) }}</strong> extra on this deposit
              </template>
              <template v-else>{{ bonusPercent }}% extra on one deposit a day</template>
            </p>
          </div>
          <!-- Rolling switch, same as the Account page's show-details switch -->
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

      <!-- Step 2: where from / to, and the receipt -->
      <div v-else class="flow-step">
        <!-- Back sits up here, far from the confirm button at the bottom -->
        <button type="button" class="flow-back" @click="step = 1">
          <i class="pi pi-arrow-left" /> Change amount
        </button>
        <div
          class="flow-methods"
          role="radiogroup"
          :aria-label="isDeposit ? 'Pay with' : 'Send to'"
        >
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
            <!-- White chip, so the logos' white backgrounds blend in -->
            <span class="flow-logo"><img :src="m.logo" alt="" /></span>
            <span class="flow-method-name">{{ m.label }}</span>
            <span class="flow-radio" />
          </button>
        </div>

        <dl class="flow-receipt">
          <div>
            <dt>{{ isDeposit ? 'Deposit' : 'Withdraw' }} via {{ methodLabel }}</dt>
            <dd>₱{{ peso2.format(amount ?? 0) }}</dd>
          </div>
          <div v-if="isDeposit">
            <dt>Reload Bonus</dt>
            <dd :class="{ accent: bonus > 0 }">+₱{{ peso2.format(bonus) }}</dd>
          </div>
          <div class="total">
            <dt>{{ isDeposit ? 'Added to wallet' : 'Balance after' }}</dt>
            <dd>
              ₱{{
                peso2.format(
                  isDeposit ? (amount ?? 0) + bonus : Math.max(wallet.balance - (amount ?? 0), 0),
                )
              }}
            </dd>
          </div>
          <!-- What the player must bet before withdrawing, so it's no surprise later -->
          <div v-if="isDeposit" class="turnover">
            <dt>
              Bet before withdrawing
              <small>
                {{ TURNOVER_DEPOSIT_MULTIPLIER }}× deposit
                <template v-if="bonus > 0">+ {{ TURNOVER_BONUS_MULTIPLIER }}× bonus</template>
              </small>
            </dt>
            <dd>₱{{ peso2.format(addedTurnover) }}</dd>
          </div>
        </dl>

        <p v-if="error" class="flow-error" role="alert">{{ error }}</p>
        <Button
          :label="`${title} ₱${peso.format(amount ?? 0)}`"
          class="flow-primary"
          :loading="confirming"
          @click="confirm"
        />
      </div>
    </div>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
.p-dialog.sakura-wallet-flow {
  width: min(520px, calc(100vw - 32px));
  /* The header band (DialogBand) runs edge to edge; the body pads itself */
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
  /* Gold here, sakura pink on white, like the account dialogs */
  --dlg-accent: #ffc200;
  --dlg-tint: rgb(255 194 0 / 0.12);
  --dlg-ring: rgb(255 194 0 / 0.55);
}

:root:not(.app-dark) .p-dialog.sakura-wallet-flow {
  --dlg-accent: #e0457f;
  --dlg-tint: #ffe9f1;
  --dlg-ring: rgb(224 69 127 / 0.5);
}

.sakura-wallet-flow .p-dialog-content {
  padding: 0;
  overflow: visible;
}

/* The page background under the navbar-colored band, like Personal Details */
.sakura-wallet-flow .flow-body {
  padding: 0 28px 24px;
  background: var(--app-bg);
}

/* Two segments under the band: step 1 and step 2 */
.sakura-wallet-flow .flow-progress {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 0 -28px 20px;
}

.sakura-wallet-flow .flow-progress span {
  height: 3px;
  background: var(--app-border);
  transition: background 0.3s;
}

.sakura-wallet-flow .flow-progress span.done {
  background: var(--dlg-accent);
}

.sakura-wallet-flow .flow-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Step 1: the amount, big and centered, underlined instead of boxed */
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

/* Quick amounts: tiles in the lobby tabs' flat style (GameTabs.vue), each holding a pile of
   gold sakura coins that grows with the amount. Four across, two even rows: 8 deposit amounts,
   or 7 withdraw amounts + Max. */
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

/* Sakura coin pile: coins placed from the floor up (see PILES). Fixed height, so every tile
   lines its amount up on the same row whatever the pile size. */
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

/* Reload Bonus coins: smaller pink blossoms behind the gold pile. They pop in whenever the
   bonus turns on (switch flipped, dialog opened) and leave when it's off or used today. */
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

/* Picked: the coins are tossed in one after another, spinning down and landing with a bounce */
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

/* Hot: a small flat label in the corner */
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

/* Picked: a gold outline and warm tint, so the gold sakura coins still stand out (sakura pink
   on white) */
.sakura-wallet-flow .flow-chip.selected {
  border-color: var(--dlg-accent);
  background: var(--dlg-tint);
}

.sakura-wallet-flow .flow-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sakura-wallet-flow .flow-chip:focus-visible,
.sakura-wallet-flow .flow-method:focus-visible,
.sakura-wallet-flow .flow-switch:focus-visible {
  outline: 2px solid var(--dlg-accent);
  outline-offset: 2px;
}

/* Reload Bonus: one option row, like the Account page's detail cards */
.sakura-wallet-flow .flow-bonus {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

.sakura-wallet-flow .flow-tile {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--dlg-tint);
  color: var(--dlg-accent);
}

/* Used today: faded, with the switch off until midnight */
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

/* Step 2: channels as a list */
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

/* The "y" descender makes the Maya wordmark sit high; drop it to the optical center */
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

/* Receipt */
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

/* Turnover line under the total, quieter: what to bet before withdrawing and why */
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

/* Withdraw locked by turnover: lock tile, how much is left, progress bar */
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

/* Same bar as the Account page's profile meter: gold in dark mode, sakura pink on white */
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

.sakura-wallet-flow .flow-error {
  margin: 0;
  color: #f87171;
  font-weight: 600;
  font-size: 0.82rem;
  text-align: center;
}

:root:not(.app-dark) .sakura-wallet-flow .flow-error {
  color: #dc2626;
}

/* Back: a quiet text button at the top of step 2, well away from the confirm button at the
   bottom, so the two can't be mixed up or mis-tapped */
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

/* Continue / Confirm: the app's 3D style, gold (sakura pink on white), full width */
.sakura-wallet-flow .flow-primary {
  width: 100%;
  margin-bottom: 4px;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.82rem;
  text-transform: uppercase;
  transition:
    filter 0.2s,
    transform 0.1s;
}

.sakura-wallet-flow .flow-primary .p-button-label {
  font-weight: 900;
}

/* PrimeVue's own hover and pressed states paint the primary colors, so they're restated */
.sakura-wallet-flow .flow-primary,
.sakura-wallet-flow .flow-primary:not(:disabled):hover,
.sakura-wallet-flow .flow-primary:not(:disabled):active {
  border: none;
  background: #ffc200;
  box-shadow: 0 4px 0 #d9871f;
  color: #703902;
}

:root:not(.app-dark) .sakura-wallet-flow .flow-primary,
:root:not(.app-dark) .sakura-wallet-flow .flow-primary:not(:disabled):hover,
:root:not(.app-dark) .sakura-wallet-flow .flow-primary:not(:disabled):active {
  background: linear-gradient(#ff7aae, #e0457f);
  box-shadow: 0 4px 0 #b8235e;
  color: #ffffff;
}

.sakura-wallet-flow .flow-primary:not(:disabled):hover {
  filter: brightness(1.06);
}

.sakura-wallet-flow .flow-primary:not(:disabled):active {
  transform: translateY(2px);
}

@media (max-width: 560px) {
  /* Phones keep four across (two even rows), with smaller piles and text so ₱50,000 fits */
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

  .sakura-wallet-flow .flow-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .sakura-wallet-flow .flow-progress {
    margin-left: -18px;
    margin-right: -18px;
  }

  .sakura-wallet-flow .flow-amount .p-inputnumber-input {
    font-size: 2.1rem;
  }
}
</style>
