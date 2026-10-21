<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { doc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import InputNumber, { type InputNumberInputEvent } from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import EmptyState from '@/components/common/EmptyState.vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { DEPOSIT_METHODS, DEPOSIT_WINDOW_MINUTES, depositExpiresAt } from '@/constants/wallet'
import { useNow } from '@/composables/useNow'
import { db } from '@/firebase'
import { depositState, submitDepositProof } from '@/services/wallet'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/types'
import walletIcon from '@/assets/icons/wallet.svg'
import { formatCountdown, formatMoney } from '@/utils/format'

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const now = useNow()

const DOC_ID = /^[A-Za-z0-9_-]{1,64}$/
const deposit = useDocument<Transaction>(() =>
  auth.user && DOC_ID.test(props.id)
    ? doc(db, 'users', auth.user.uid, 'transactions', props.id)
    : null,
)

const state = computed(() =>
  deposit.value && deposit.value.type === 'deposit' ? depositState(deposit.value, now.value) : null,
)
const method = computed(() => DEPOSIT_METHODS.find((m) => m.label === deposit.value?.method))

const amountText = computed(() => formatMoney(deposit.value?.amount ?? 0))

const timeLeft = computed(() => {
  const expiresAt = deposit.value ? depositExpiresAt(deposit.value) : null
  const ms = expiresAt === null ? DEPOSIT_WINDOW_MINUTES * 60_000 : expiresAt - now.value
  return { label: formatCountdown(ms), low: ms <= 120_000 }
})

const sentAmount = ref<number | null>(null)
function onAmountInput(e: InputNumberInputEvent) {
  sentAmount.value = typeof e.value === 'number' ? e.value : null
}
const reference = ref('')
watch(reference, (value) => {
  const upper = value.toUpperCase()
  if (upper !== value) reference.value = upper
})
const submitting = ref(false)
const cleanReference = computed(() => reference.value.replace(/\s/g, ''))
const amountMatches = computed(
  () =>
    sentAmount.value !== null && Math.abs(sentAmount.value - (deposit.value?.amount ?? -1)) < 0.005,
)
const referenceValid = computed(() => /^[A-Za-z0-9]{8,16}$/.test(cleanReference.value))
const canSubmit = computed(() => amountMatches.value && referenceValid.value && !submitting.value)

async function submit() {
  const uid = auth.user?.uid
  if (!canSubmit.value || !deposit.value || !uid || sentAmount.value === null) return
  submitting.value = true
  try {
    await submitDepositProof(uid, props.id, sentAmount.value, cleanReference.value)
  } catch {
    toast.add({
      severity: 'error',
      summary: "Couldn't confirm your deposit",
      detail: 'This deposit may have expired. Check it and try again.',
      life: 4000,
    })
  } finally {
    submitting.value = false
  }
}

const ending = computed(() => {
  const d = deposit.value
  switch (state.value) {
    case 'successful':
      return {
        title: 'Deposit received',
        text: `₱${amountText.value}${d?.bonus ? ` + ₱${formatMoney(d.bonus)} Reload Bonus` : ''} is in your wallet.`,
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
    <RouterLink :to="{ name: 'wallet' }" class="back">
      <i class="pi pi-arrow-left" /> Wallet
    </RouterLink>
    <h1 class="page-title">Deposit</h1>

    <EmptyState
      v-if="ending"
      :icon="walletIcon"
      :title="ending.title"
      :text="ending.text"
      :action-label="ending.action"
      @action="endingAction"
    />

    <EmptyState
      v-else-if="!DOC_ID.test(id) || deposit === null || (deposit && deposit.type !== 'deposit')"
      :icon="walletIcon"
      title="Deposit not found"
      text="It may have been closed. Your wallet shows all your deposits."
      action-label="Back to wallet"
      @action="router.replace({ name: 'wallet' })"
    />

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

        <div class="amount-box">
          <p class="amount-label">Deposit amount</p>
          <p class="amount"><span class="currency">₱</span>{{ amountText }}</p>
          <p v-if="deposit.bonus" class="amount-note">
            <strong>+₱{{ formatMoney(deposit.bonus) }}</strong> Reload Bonus once approved.
          </p>
        </div>

        <template v-if="state === 'pending'">
          <p class="qr-warning">
            <SakuraIcon variant="red" mark="alert" />
            <span
              ><strong>Don't scan this to get credits.</strong> This is a real
              {{ deposit.method }} QR, shown only to demo where the payment QR goes.</span
            >
          </p>
          <figure class="qr">
            <img v-if="method?.qr" :src="method.qr" :alt="`${deposit.method} QR code`" />
            <figcaption>Like my work? Donations are open.</figcaption>
          </figure>

          <ol class="steps">
            <li>No payment needed: Sakura is a play-money demo.</li>
            <li>
              Enter exactly <strong>₱{{ amountText }}</strong> and any 8 to 16 letters or numbers as
              the reference.
            </li>
            <li>Press <strong>I've paid</strong>. It's accepted automatically.</li>
          </ol>
        </template>

        <template v-else>
          <dl class="sent">
            <div>
              <dt>Amount sent</dt>
              <dd>₱{{ formatMoney(deposit.sentAmount ?? 0) }}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{{ deposit.reference }}</dd>
            </div>
          </dl>
          <div class="waiting" role="status">
            <SakuraIcon mark="info" />
            <div>
              <p class="waiting-title">Accepting your deposit</p>
              <p class="waiting-text">Your balance updates in a moment; you can leave this page.</p>
            </div>
          </div>
        </template>
      </div>

      <div v-if="state === 'pending'" class="side">
        <aside class="card donation">
          <SakuraIcon mark="info" class="donation-icon" />
          <p class="donation-note">
            <strong>Note:</strong> Sakura is a personal portfolio project, not a real casino. Press
            <strong>I've paid</strong> with the deposit amount and any 8 to 16 character reference
            and the deposit is accepted automatically. No real money needed.
          </p>
        </aside>

        <form class="card proof" @submit.prevent="submit">
          <div>
            <p class="eyebrow">Demo deposit</p>
            <p class="head-title">Confirm your deposit</p>
          </div>
          <label class="field">
            <span class="field-label">Amount</span>
            <InputNumber
              v-model="sentAmount"
              prefix="₱"
              placeholder="₱0.00"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              locale="en-PH"
              :invalid="sentAmount !== null && !amountMatches"
              fluid
              @input="onAmountInput"
            />
            <span v-if="sentAmount !== null && !amountMatches" class="field-error">
              Must be exactly ₱{{ amountText }}
            </span>
          </label>
          <label class="field">
            <span class="field-label">Reference number (8 to 16 letters or numbers)</span>
            <InputText
              v-model="reference"
              placeholder="e.g. A1B2C3D4E5F6G7H8"
              autocomplete="off"
              maxlength="16"
              :invalid="reference !== '' && !referenceValid"
              fluid
            />
            <span v-if="reference !== '' && !referenceValid" class="field-error">
              8 to 16 letters and numbers
            </span>
          </label>
          <button type="submit" class="submit" :disabled="!canSubmit">
            {{ submitting ? 'Sending…' : "I've paid" }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pay {
  --accent: #ffc200;
  --accent-tint: rgb(255 194 0 / 0.12);
  max-width: 560px;
  margin: 0 auto;
  font-family: 'Montserrat', sans-serif;
}

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

.qr-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
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

:root:not(.app-dark) .qr-warning {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.qr-warning svg {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
}

.qr-warning strong {
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

.side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.card.donation {
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
}

.donation-icon {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
}

.donation-note {
  margin: 0;
  color: var(--app-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.donation-note strong {
  color: var(--app-text);
  font-weight: 800;
}

.proof {
  gap: 14px;
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
