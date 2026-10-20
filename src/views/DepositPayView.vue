<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import EmptyState from '@/components/layout/EmptyState.vue'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import {
  DEPOSIT_METHODS,
  DEPOSIT_WINDOW_MINUTES,
  depositExpiresAt,
} from '@/components/wallet/walletOptions'
import { useNow } from '@/composables/useNow'
import { db } from '@/firebase'
import { depositState, submitDepositProof } from '@/services/wallet'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/types'
import walletIcon from '@/assets/icons/wallet.svg'

// Paying a QR deposit opened from the Deposit dialog: the exact amount, the QR for the chosen
// method, a countdown to its expiry, and the player's proof (amount sent + reference number).
// The admin then approves it in the Firebase console by setting approvedAt (services/wallet.ts).

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const now = useNow()

// The route is guarded, so a user is always present here
const uid = computed(() => auth.user!.uid)
const deposit = useDocument<Transaction>(() =>
  doc(db, 'users', uid.value, 'transactions', props.id),
)

const state = computed(() =>
  deposit.value && deposit.value.type === 'deposit' ? depositState(deposit.value, now.value) : null,
)
const method = computed(() => DEPOSIT_METHODS.find((m) => m.label === deposit.value?.method))

const peso2 = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const amountText = computed(() => peso2.format(deposit.value?.amount ?? 0))

// mm:ss until it expires
const timeLeft = computed(() => {
  const expiresAt = deposit.value ? depositExpiresAt(deposit.value) : null
  // Full window until the server stamps createdAt, a moment after opening
  const ms =
    expiresAt === null ? DEPOSIT_WINDOW_MINUTES * 60_000 : Math.max(0, expiresAt - now.value)
  const s = Math.ceil(ms / 1000)
  return { label: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, low: s <= 120 }
})

async function copyAmount() {
  try {
    await navigator.clipboard.writeText(String(deposit.value?.amount ?? ''))
    toast.add({ severity: 'success', summary: 'Amount copied', life: 1500 })
  } catch {
    toast.add({ severity: 'warn', summary: "Couldn't copy, type it in instead", life: 2500 })
  }
}

// Proof of payment. The amount must match to the centavo, or the form won't send it (the rules
// check this too).
const sentAmount = ref<number | null>(null)
const reference = ref('')
// The player ticks that the reference matches their receipt before sending
const confirmed = ref(false)
const submitting = ref(false)
const cleanReference = computed(() => reference.value.replace(/\s/g, ''))
const amountMatches = computed(
  () =>
    sentAmount.value !== null && Math.abs(sentAmount.value - (deposit.value?.amount ?? -1)) < 0.005,
)
const referenceValid = computed(() => /^[A-Za-z0-9]{6,30}$/.test(cleanReference.value))
const canSubmit = computed(
  () => amountMatches.value && referenceValid.value && confirmed.value && !submitting.value,
)

async function submit() {
  if (!canSubmit.value || !deposit.value) return
  submitting.value = true
  try {
    await submitDepositProof(uid.value, props.id, deposit.value.amount, cleanReference.value)
  } catch {
    toast.add({
      severity: 'error',
      summary: "Couldn't send your reference",
      detail: 'This deposit may have expired. Check it and try again.',
      life: 4000,
    })
  } finally {
    submitting.value = false
  }
}

// The finished states, in the lobby's empty-state style
const ending = computed(() => {
  const d = deposit.value
  switch (state.value) {
    case 'successful':
      return {
        title: 'Deposit received',
        text: `₱${amountText.value}${d?.bonus ? ` + ₱${peso2.format(d.bonus)} Reload Bonus` : ''} is in your wallet.`,
        action: 'Back to wallet',
      }
    case 'failed':
      return {
        title: 'Deposit not approved',
        text: "We couldn't match this payment. If you did send it, contact support with your reference number.",
        action: 'Back to wallet',
      }
    case 'expired':
      return {
        title: 'This deposit expired',
        text: d?.reference
          ? "Time ran out before it was approved. If you already paid, it'll still be credited once we've checked it."
          : "Time ran out before it was paid. Start a new deposit when you're ready.",
        action: 'Start a new deposit',
      }
    default:
      return null
  }
})

function endingAction() {
  if (state.value === 'expired') router.replace({ name: 'wallet', query: { mode: 'deposit' } })
  else router.replace({ name: 'wallet' })
}
</script>

<template>
  <section class="pay">
    <!-- Leaving keeps the deposit open; the wallet's pending bar links back here -->
    <RouterLink :to="{ name: 'wallet' }" class="back">
      <i class="pi pi-arrow-left" /> Wallet
    </RouterLink>
    <h1 class="page-title">Deposit</h1>

    <!-- Finished: received, rejected or expired -->
    <EmptyState
      v-if="ending"
      :icon="walletIcon"
      :title="ending.title"
      :text="ending.text"
      :action-label="ending.action"
      @action="endingAction"
    />

    <!-- Not this player's deposit, or gone -->
    <EmptyState
      v-else-if="deposit === null || (deposit && deposit.type !== 'deposit')"
      :icon="walletIcon"
      title="Deposit not found"
      text="It may have been closed. Your wallet shows all your deposits."
      action-label="Back to wallet"
      @action="router.replace({ name: 'wallet' })"
    />

    <!-- Paying: the QR on the left, the proof form beside it (stacked on phones) -->
    <div v-else-if="deposit && state" class="layout" :class="{ split: state === 'pending' }">
      <div class="card">
        <div class="card-head">
          <span class="method-logo"
            ><img v-if="method" :src="method.logo" :alt="method.label"
          /></span>
          <div class="head-text">
            <p class="eyebrow">Pay with {{ deposit.method }}</p>
            <p class="head-title">
              {{ state === 'submitted' ? 'Checking your payment' : 'Scan to pay' }}
            </p>
          </div>
          <span class="timer" :class="{ low: timeLeft.low }" role="timer" aria-label="Time left">
            <SakuraIcon mark="clock" ticking /> {{ timeLeft.label }}
          </span>
        </div>

        <!-- The exact amount, the thing that has to be right -->
        <div class="amount-box">
          <p class="amount-label">Send exactly</p>
          <p class="amount">
            <span class="currency">₱</span>{{ amountText }}
            <button
              v-if="state === 'pending'"
              type="button"
              class="copy"
              aria-label="Copy amount"
              @click="copyAmount"
            >
              <i class="pi pi-copy" />
            </button>
          </p>
          <!-- Only while paying; once the proof is in, it has done its job -->
          <p v-if="state === 'pending'" class="exact-warning">
            <SakuraIcon variant="red" mark="alert" />
            <span>Other amounts <strong>won't be approved</strong>.</span>
          </p>
          <p v-if="deposit.bonus" class="amount-note">
            <strong>+₱{{ peso2.format(deposit.bonus) }}</strong> Reload Bonus once approved.
          </p>
        </div>

        <template v-if="state === 'pending'">
          <!-- White card so the QR scans cleanly in either theme -->
          <figure class="qr">
            <img v-if="method?.qr" :src="method.qr" :alt="`${deposit.method} QR code`" />
            <figcaption>Transfer fees may apply</figcaption>
          </figure>

          <ol class="steps">
            <li>Open {{ deposit.method }}, or any bank app that scans QR Ph, and scan the code.</li>
            <li>
              Send exactly <strong>₱{{ amountText }}</strong
              >.
            </li>
            <li>Enter the amount you sent and the reference number from your receipt.</li>
          </ol>
        </template>

        <!-- Proof sent: waiting for the admin -->
        <template v-else>
          <dl class="sent">
            <div>
              <dt>Amount sent</dt>
              <dd>₱{{ peso2.format(deposit.sentAmount ?? 0) }}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{{ deposit.reference }}</dd>
            </div>
          </dl>
          <div class="waiting" role="status">
            <SakuraIcon mark="info" />
            <div>
              <p class="waiting-title">Waiting for approval</p>
              <p class="waiting-text">
                We're checking your payment. Your balance updates here as soon as it's approved; you
                can leave this page.
              </p>
            </div>
          </div>
        </template>
      </div>

      <form v-if="state === 'pending'" class="card proof" @submit.prevent="submit">
        <div>
          <p class="eyebrow">After paying</p>
          <p class="head-title">Confirm your payment</p>
        </div>
        <label class="field">
          <span class="field-label">Amount you sent</span>
          <InputNumber
            v-model="sentAmount"
            prefix="₱"
            placeholder="₱0.00"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            locale="en-PH"
            :invalid="sentAmount !== null && !amountMatches"
            fluid
          />
          <span v-if="sentAmount !== null && !amountMatches" class="field-error">
            Must be exactly ₱{{ amountText }}
          </span>
        </label>
        <label class="field">
          <span class="field-label">Reference number</span>
          <InputText
            v-model="reference"
            :placeholder="`From your ${deposit.method} receipt`"
            autocomplete="off"
            maxlength="40"
            :invalid="reference !== '' && !referenceValid"
            fluid
          />
          <span v-if="reference !== '' && !referenceValid" class="field-error">
            6 to 30 letters and numbers
          </span>
        </label>
        <label class="confirm">
          <Checkbox v-model="confirmed" binary />
          <span>
            I've checked that the reference number matches my {{ deposit.method }} receipt. A wrong
            one can't be matched to my payment.
          </span>
        </label>
        <button type="submit" class="submit" :disabled="!canSubmit">
          {{ submitting ? 'Sending…' : "I've paid" }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.pay {
  /* Gold in dark mode, sakura pink on white, like the Account page */
  --accent: #ffc200;
  --accent-tint: rgb(255 194 0 / 0.12);
  max-width: 560px;
  margin: 0 auto;
  font-family: 'Montserrat', sans-serif;
}

/* Wider while paying, so the proof form can sit beside the QR */
.pay:has(.layout.split) {
  max-width: 980px;
}

.layout.split {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: start;
  gap: 20px;
}

@media (max-width: 820px) {
  .layout.split {
    grid-template-columns: minmax(0, 1fr);
  }
}

:root:not(.app-dark) .pay {
  --accent: #e0457f;
  --accent-tint: #ffe9f1;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px -6px;
  padding: 6px;
  border-radius: 6px;
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.8rem;
  text-decoration: none;
  transition: color 0.15s;
}

.back:hover {
  color: var(--app-text);
}

.back:focus-visible {
  outline: 2px solid var(--accent);
}

.back .pi {
  font-size: 0.72rem;
}

.page-title {
  margin: 4px 0 16px;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

:root:not(.app-dark) .card {
  box-shadow: 0 4px 14px rgb(27 37 80 / 0.06);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-logo {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 84px;
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  background: #ffffff;
}

.method-logo img {
  max-width: 100%;
  max-height: 18px;
}

.head-text {
  flex: 1;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.75rem;
}

.head-title {
  margin: 2px 0 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.05rem;
}

.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent-tint);
  color: var(--accent);
  font-weight: 800;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.timer.low {
  background: rgb(239 68 68 / 0.14);
  color: #f87171;
}

:root:not(.app-dark) .timer.low {
  color: #dc2626;
}

.timer svg {
  width: 20px;
  height: 20px;
}

.amount-box {
  padding: 16px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  text-align: center;
}

.amount-label {
  margin: 0;
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.amount {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
}

.currency {
  margin-right: 2px;
  color: var(--accent);
}

.copy {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-left: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--accent-tint);
  color: var(--accent);
  cursor: pointer;
}

.copy .pi {
  font-size: 1.05rem;
}

/* The exact-amount rule: red, so it reads as a warning rather than a footnote */
.exact-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border: 1px solid rgb(248 113 113 / 0.45);
  border-radius: 10px;
  background: rgb(239 68 68 / 0.12);
  color: #fca5a5;
  font-weight: 600;
  font-size: 0.82rem;
  line-height: 1.45;
  text-align: left;
}

:root:not(.app-dark) .exact-warning {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.exact-warning svg {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
}

.exact-warning strong {
  font-weight: 900;
}

.amount-note {
  margin: 8px 0 0;
  color: var(--app-muted);
  font-size: 0.78rem;
}

.amount-note strong {
  color: var(--accent);
}

.qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  padding: 14px 14px 10px;
  border-radius: 14px;
  background: #ffffff;
}

.qr img {
  display: block;
  width: min(260px, 70vw);
  height: auto;
}

.qr figcaption {
  color: #5d6478;
  font-weight: 600;
  font-size: 0.78rem;
}

.steps {
  margin: 0;
  padding-left: 20px;
  color: var(--app-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

.steps strong {
  color: var(--app-text);
}

.proof {
  gap: 14px;
}

.confirm {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--app-muted);
  font-size: 0.8rem;
  line-height: 1.45;
  cursor: pointer;
}

.confirm .p-checkbox {
  flex: 0 0 auto;
  margin-top: 1px;
}

/* Ticked: the accent fill with a bold tick, like the Personal Details declarations
   (navy on gold, white on pink) */
.confirm {
  --tick: #1b2550;
}

:root:not(.app-dark) .confirm {
  --tick: #ffffff;
}

.confirm :deep(.p-checkbox-checked .p-checkbox-box),
.confirm :deep(.p-checkbox-checked:has(.p-checkbox-input:hover) .p-checkbox-box) {
  border-color: var(--accent);
  background: var(--accent);
}

/* Hover included: PrimeVue switches the tick to its own hover color */
.confirm :deep(.p-checkbox-checked .p-checkbox-icon),
.confirm :deep(.p-checkbox-checked:has(.p-checkbox-input:hover) .p-checkbox-icon) {
  color: var(--tick);
}

.confirm :deep(.p-checkbox-checked .p-checkbox-icon path) {
  stroke: currentColor;
  stroke-width: 1.6px;
  stroke-linejoin: round;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.78rem;
}

.field :deep(.p-inputtext) {
  height: 46px;
  border-radius: 10px;
  background: var(--app-bg);
  font-family: inherit;
  font-weight: 600;
}

.field-error {
  color: #f87171;
  font-weight: 600;
  font-size: 0.75rem;
}

:root:not(.app-dark) .field-error {
  color: #dc2626;
}

/* Gold 3D button, sakura pink on white, like the Account page */
.submit {
  margin: 4px 0 5px;
  padding: 14px;
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

:root:not(.app-dark) .submit {
  background: linear-gradient(#ff7aae, #e0457f);
  box-shadow: 0 5px 0 #b8235e;
  color: #ffffff;
}

.submit:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #d9871f;
}

.submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sent {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.sent div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.sent dt {
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.85rem;
}

.sent dd {
  margin: 0;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

/* Proof sent: the info blossom in an outlined box, like the amount box above */
.waiting {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.waiting svg {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
}

.waiting-title {
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 0.9rem;
}

.waiting-text {
  margin: 2px 0 0;
  color: var(--app-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}
</style>
