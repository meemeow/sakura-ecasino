<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import EmptyState from '@/components/layout/EmptyState.vue'
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
// The admin then approves it in the Firebase console (functions/src/deposits.ts).

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
const submitting = ref(false)
const cleanReference = computed(() => reference.value.replace(/\s/g, ''))
const amountMatches = computed(
  () =>
    sentAmount.value !== null && Math.abs(sentAmount.value - (deposit.value?.amount ?? -1)) < 0.005,
)
const referenceValid = computed(() => /^[A-Za-z0-9]{6,30}$/.test(cleanReference.value))
const canSubmit = computed(() => amountMatches.value && referenceValid.value && !submitting.value)

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

    <div v-else-if="deposit && state" class="card">
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
          <i class="pi pi-clock" /> {{ timeLeft.label }}
        </span>
      </div>

      <!-- The exact amount, the thing that has to be right -->
      <div class="amount-box">
        <p class="amount-label">Send exactly</p>
        <p class="amount">
          <span class="currency">₱</span>{{ amountText }}
          <button type="button" class="copy" aria-label="Copy amount" @click="copyAmount">
            <i class="pi pi-copy" />
          </button>
        </p>
        <p class="amount-note">
          A different amount won't be approved.
          <template v-if="deposit.bonus">
            <strong>+₱{{ peso2.format(deposit.bonus) }}</strong> Reload Bonus once approved.
          </template>
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
          <li>Enter the amount you sent and the reference number from your receipt below.</li>
        </ol>

        <form class="proof" @submit.prevent="submit">
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
              placeholder="From your GCash or Maya receipt"
              autocomplete="off"
              maxlength="40"
              :invalid="reference !== '' && !referenceValid"
              fluid
            />
            <span v-if="reference !== '' && !referenceValid" class="field-error">
              6 to 30 letters and numbers
            </span>
          </label>
          <button type="submit" class="submit" :disabled="!canSubmit">
            {{ submitting ? 'Sending…' : "I've paid" }}
          </button>
        </form>
      </template>

      <!-- Proof sent: waiting for the admin -->
      <dl v-else class="sent">
        <div>
          <dt>Amount sent</dt>
          <dd>₱{{ peso2.format(deposit.sentAmount ?? 0) }}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{{ deposit.reference }}</dd>
        </div>
        <p class="sent-note">
          We're checking your payment. Your balance updates here as soon as it's approved.
        </p>
      </dl>
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

:root:not(.app-dark) .pay {
  --accent: #e0457f;
  --accent-tint: #ffe9f1;
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

.timer .pi {
  font-size: 0.8rem;
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
  width: 30px;
  height: 30px;
  margin-left: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--accent-tint);
  color: var(--accent);
  cursor: pointer;
}

.copy .pi {
  font-size: 0.8rem;
}

.amount-note {
  margin: 0;
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
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.sent-note {
  margin: 6px 0 0;
  color: var(--app-muted);
  font-size: 0.8rem;
}
</style>
