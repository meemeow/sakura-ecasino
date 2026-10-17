<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputOtp from 'primevue/inputotp'
import type { ConfirmationResult } from 'firebase/auth'
import { authErrorMessage, sendPhoneCode } from '@/services/auth'

const RESEND_SECONDS = 30
const CODE_LENGTH = 6

const visible = defineModel<boolean>('visible', { required: true })
const confirmation = defineModel<ConfirmationResult | null>('confirmation', { required: true })
const props = defineProps<{ phone: string }>()
const emit = defineEmits<{ verified: [] }>()

const code = ref('')
const error = ref('')
const verifying = ref(false)
const resending = ref(false)
const secondsLeft = ref(0)
const otpWrap = ref<HTMLElement>()
let timer: ReturnType<typeof setInterval> | undefined

function startCountdown() {
  clearInterval(timer)
  secondsLeft.value = RESEND_SECONDS
  timer = setInterval(() => {
    if (--secondsLeft.value <= 0) clearInterval(timer)
  }, 1000)
}

function focusFirstBox() {
  nextTick(() => otpWrap.value?.querySelector('input')?.focus())
}

watch(visible, (open) => {
  if (!open) return clearInterval(timer)
  code.value = ''
  error.value = ''
  startCountdown()
  focusFirstBox()
})

// Submit as soon as the last digit is typed (or a code is pasted)
watch(code, async (value) => {
  error.value = ''
  if (value.length !== CODE_LENGTH || !confirmation.value || verifying.value) return
  verifying.value = true
  try {
    await confirmation.value.confirm(value)
    emit('verified')
  } catch (e) {
    error.value = authErrorMessage(e)
    code.value = ''
    focusFirstBox()
  } finally {
    verifying.value = false
  }
})

async function resend() {
  resending.value = true
  error.value = ''
  try {
    confirmation.value = await sendPhoneCode(props.phone)
    code.value = ''
    startCountdown()
    focusFirstBox()
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    resending.value = false
  }
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :show-header="false"
    :draggable="false"
    class="sakura-verify"
  >
    <button class="sakura-close" aria-label="Close" @click="visible = false">
      <i class="pi pi-times" />
    </button>

    <h2 class="sakura-title">Verification Code</h2>
    <p class="verify-text">
      Enter the verification code we just sent to your number
      <strong>{{ phone }}</strong>
    </p>

    <div ref="otpWrap" class="verify-otp">
      <InputOtp v-model="code" :length="CODE_LENGTH" integer-only :disabled="verifying" />
    </div>

    <p v-if="error" class="sakura-error">{{ error }}</p>
    <p v-else-if="verifying" class="verify-resend">Verifying…</p>

    <p class="verify-resend">
      Didn't receive code?
      <span v-if="secondsLeft > 0" class="verify-link">{{ secondsLeft }}s</span>
      <button v-else class="verify-link" :disabled="resending" @click="resend">
        {{ resending ? 'Sending…' : 'Resend' }}
      </button>
    </p>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope.
     Shared .sakura-* classes are defined in AuthModal.vue. -->
<style>
.p-dialog.sakura-verify {
  position: relative;
  width: min(620px, calc(100vw - 32px));
  padding: 40px 24px 32px;
  border: none;
  border-radius: 20px;
  background: var(--app-navbar);
  color: var(--app-text);
  text-align: center;
}

.sakura-verify .p-dialog-content {
  padding: 0;
  overflow: visible;
}

.sakura-verify .verify-text {
  margin: 0 0 24px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.5;
}

.sakura-verify .verify-text strong {
  display: block;
  font-weight: 700;
}

.sakura-verify .verify-otp {
  display: flex;
  justify-content: center;
}

.sakura-verify .p-inputotp {
  gap: 12px;
}

.sakura-verify .p-inputotp-input {
  width: 48px;
  height: 56px;
  border: 2px solid #2a3045;
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  text-align: center;
  box-shadow: none;
}

.sakura-verify .p-inputotp-input:enabled:focus {
  border-color: #ffc200;
  outline: none;
}

.sakura-verify .verify-resend {
  margin: 28px 0 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--app-muted);
}

.sakura-verify .verify-link {
  padding: 0;
  border: none;
  background: none;
  color: #ffc200;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

/* Light mode: sakura pink instead of gold for the focused box and the resend link */
:root:not(.app-dark) .sakura-verify .p-inputotp-input:enabled:focus {
  border-color: #ff5c9a;
}

:root:not(.app-dark) .sakura-verify .verify-link {
  color: #d6336c;
}

.sakura-verify span.verify-link {
  cursor: default;
}

@media (max-width: 480px) {
  .sakura-verify .p-inputotp {
    gap: 8px;
  }

  .sakura-verify .p-inputotp-input {
    width: 40px;
    height: 48px;
  }
}
</style>
