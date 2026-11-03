<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import DialogBand from '@/components/common/DialogBand.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import WalletFlowAmount from '@/components/wallet/WalletFlowAmount.vue'
import WalletFlowMethod from '@/components/wallet/WalletFlowMethod.vue'
import WalletFlowTurnover from '@/components/wallet/WalletFlowTurnover.vue'
import { useWalletStore } from '@/stores/wallet'
import { createDeposit } from '@/services/wallet'
import { useAuthStore } from '@/stores/auth'
import {
  DEPOSIT_METHODS,
  MAX_BALANCE,
  MAX_DEPOSIT,
  MIN_DEPOSIT,
  WITHDRAW_DAILY_LIMIT,
  WITHDRAW_METHODS,
  reloadBonusFor,
  reloadBonusUsedToday,
  turnoverFor,
  type WalletMode,
} from '@/constants/wallet'
import { formatAmount, formatMoney } from '@/utils/format'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ mode: WalletMode }>()

const wallet = useWalletStore()
const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const step = ref<1 | 2>(1)
const amount = ref<number | null>(null)
const bonusOn = ref(true)
const method = ref('gcash')
const error = ref('')

const isDeposit = computed(() => props.mode === 'deposit')
const methods = computed(() => (isDeposit.value ? DEPOSIT_METHODS : WITHDRAW_METHODS))
const methodLabel = computed(() => methods.value.find((m) => m.id === method.value)?.label ?? '')

watch(visible, (open) => {
  if (!open) return
  step.value = 1
  amount.value = null
  method.value = 'gcash'
  error.value = ''
})
watch([amount, method], () => (error.value = ''))

const bonusUsedToday = computed(() =>
  reloadBonusUsedToday(wallet.profile?.lastReloadBonusAt?.toDate()),
)
const bonusActive = computed(() => isDeposit.value && bonusOn.value && !bonusUsedToday.value)
const bonus = computed(() => (bonusActive.value ? reloadBonusFor(amount.value ?? 0) : 0))
const maxWithdraw = computed(() => Math.floor(Math.min(wallet.balance, WITHDRAW_DAILY_LIMIT)))

const addedTurnover = computed(() => turnoverFor(amount.value ?? 0, bonus.value))
const turnoverLocked = computed(() => !isDeposit.value && !wallet.turnover.met)
const total = computed(() =>
  isDeposit.value
    ? (amount.value ?? 0) + bonus.value
    : Math.max(wallet.balance - (amount.value ?? 0), 0),
)

function playSlots() {
  visible.value = false
  router.push('/slots')
}

function validate() {
  const value = amount.value ?? 0
  if (isDeposit.value) {
    if (value < MIN_DEPOSIT) return `Minimum deposit is ₱${MIN_DEPOSIT}.`
    if (value > MAX_DEPOSIT) return `Maximum deposit is ₱${formatAmount(MAX_DEPOSIT)}.`
    if (wallet.balance + value + bonus.value > MAX_BALANCE)
      return `Your balance can't go above ₱${formatMoney(MAX_BALANCE)}.`
    return ''
  }
  if (!wallet.turnover.met)
    return `Bet ₱${formatMoney(wallet.turnover.remaining)} more before withdrawing.`
  if (value <= 0) return 'Enter an amount to withdraw.'
  if (value > wallet.balance) return 'Amount is more than your available balance.'
  if (value > WITHDRAW_DAILY_LIMIT)
    return `You can withdraw up to ₱${formatAmount(WITHDRAW_DAILY_LIMIT)} per day.`
  return ''
}

function next() {
  error.value = validate()
  if (!error.value) step.value = 2
}

const confirming = ref(false)

async function confirm() {
  error.value = validate()
  if (error.value) return
  if (!isDeposit.value) {
    visible.value = false
    toast.add({ severity: 'info', summary: 'Withdrawals are coming soon', life: 3000 })
    return
  }

  const uid = auth.user?.uid
  if (!uid) return
  confirming.value = true
  try {
    const id = await createDeposit(uid, amount.value ?? 0, methodLabel.value, bonus.value)
    visible.value = false
    router.push({ name: 'deposit-pay', params: { id } })
  } catch (e) {
    const code = (e as { code?: string }).code
    error.value =
      code === 'permission-denied'
        ? "Couldn't start this deposit. If you have one open, finish it first, or refresh and try again."
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

      <WalletFlowTurnover v-if="turnoverLocked" @play="playSlots" />

      <WalletFlowAmount
        v-else-if="step === 1"
        v-model:amount="amount"
        v-model:bonus-on="bonusOn"
        :is-deposit="isDeposit"
        :bonus="bonus"
        :bonus-active="bonusActive"
        :bonus-used-today="bonusUsedToday"
        :max-withdraw="maxWithdraw"
        :error="error"
        @next="next"
      />

      <WalletFlowMethod
        v-else
        v-model:method="method"
        :is-deposit="isDeposit"
        :methods="methods"
        :method-label="methodLabel"
        :amount="amount ?? 0"
        :bonus="bonus"
        :total="total"
        :added-turnover="addedTurnover"
        :confirm-label="`${title} ₱${formatAmount(amount ?? 0)}`"
        :confirming="confirming"
        :error="error"
        @back="step = 1"
        @confirm="confirm"
      />
    </div>
  </Dialog>
</template>

<style>
.p-dialog.sakura-wallet-flow {
  width: min(520px, calc(100vw - 32px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
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

.sakura-wallet-flow .flow-body {
  padding: 0 28px 24px;
  background: var(--app-bg);
}

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
  .sakura-wallet-flow .flow-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .sakura-wallet-flow .flow-progress {
    margin-left: -18px;
    margin-right: -18px;
  }
}

@media (max-width: 480px) {
  .sakura-wallet-flow .dialog-band {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .sakura-wallet-flow .dialog-band .band-icon {
    width: 34px;
    height: 34px;
  }

  .sakura-wallet-flow .dialog-band .band-text h2 {
    font-size: 1rem;
  }

  .sakura-wallet-flow .dialog-band .band-text p {
    font-size: 0.74rem;
  }

  .sakura-wallet-flow .flow-body {
    padding-bottom: 18px;
  }

  .sakura-wallet-flow .flow-progress {
    margin-bottom: 14px;
  }

  .sakura-wallet-flow .flow-step {
    gap: 12px;
  }

  .sakura-wallet-flow .flow-tile {
    width: 32px;
    height: 32px;
  }

  .sakura-wallet-flow .flow-primary {
    padding: 10px 16px;
    font-size: 0.76rem;
  }
}
</style>
