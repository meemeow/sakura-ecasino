<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InputOtp from 'primevue/inputotp'
import type { ConfirmationResult } from 'firebase/auth'
import { authErrorMessage, sendPhoneCode } from '@/services/auth'
import { formatCountdown } from '@/utils/format'

const RESEND_SECONDS = 30
const CODE_LENGTH = 6

const confirmation = defineModel<ConfirmationResult | null>('confirmation', { required: true })
const props = defineProps<{ phone: string; displayPhone: string; demoCode?: string }>()
const emit = defineEmits<{ verified: []; back: [] }>()

const code = ref('')
const error = ref('')
const verifying = ref(false)
const resending = ref(false)
const secondsLeft = ref(0)
const otpWrap = ref<HTMLElement>()
let timer: ReturnType<typeof setInterval> | undefined

const countdown = computed(() => formatCountdown(secondsLeft.value * 1000))

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

onMounted(() => {
  startCountdown()
  focusFirstBox()
  if (props.demoCode) code.value = props.demoCode
})

watch(code, async (value) => {
  if (value) error.value = ''
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
  <div class="auth-step">
    <header class="code-header">
      <h2 class="auth-heading">Check your messages</h2>
      <p class="code-sub">Enter the 6-digit code we sent to</p>
      <p class="code-number">
        +63 {{ displayPhone }}
        <button type="button" class="code-change" @click="emit('back')">Change</button>
      </p>
      <p v-if="demoCode" class="code-demo">
        Demo account: no SMS is sent. Your code is <strong>{{ demoCode }}</strong
        >.
      </p>
    </header>

    <div ref="otpWrap" class="code-otp" :class="{ invalid: error, busy: verifying }">
      <InputOtp v-model="code" :length="CODE_LENGTH" integer-only :disabled="verifying">
        <template #default="{ attrs, events, index }">
          <input
            type="text"
            inputmode="numeric"
            maxlength="1"
            :autocomplete="index === 1 ? 'one-time-code' : 'off'"
            :aria-label="`Digit ${index}`"
            :disabled="verifying"
            class="code-box"
            :class="{ filled: code[index - 1] }"
            v-bind="attrs"
            v-on="events"
          />
        </template>
      </InputOtp>
    </div>

    <p class="code-status" :class="{ error }" :role="error ? 'alert' : undefined">
      <template v-if="error">
        <i class="pi pi-exclamation-circle" />
        {{ error }}
      </template>
      <template v-else-if="verifying">
        <i class="pi pi-spin pi-spinner" />
        Checking code…
      </template>
    </p>

    <div class="code-resend">
      <span>Didn't get a code?</span>
      <button
        type="button"
        class="code-resend-btn"
        :disabled="secondsLeft > 0 || resending"
        @click="resend"
      >
        <i class="pi pi-refresh" :class="{ 'pi-spin': resending }" />
        <template v-if="secondsLeft > 0">
          Resend in <span class="code-countdown">{{ countdown }}</span>
        </template>
        <template v-else>{{ resending ? 'Sending…' : 'Resend code' }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.code-header {
  margin: 4px 0 32px;
  text-align: center;
}

.code-header .auth-heading {
  font-size: 1.6rem;
}

.code-sub {
  margin: 12px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.92rem;
  line-height: 1.5;
}

.code-number {
  margin: 3px 0 0;
  color: var(--app-text);
  font-weight: 700;
  font-size: 1rem;
}

.code-demo {
  margin: 10px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.82rem;
}

.code-demo strong {
  color: var(--auth-accent);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.code-change {
  margin-left: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--auth-accent);
  font: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.code-change:hover {
  text-decoration: underline;
}

.code-otp :deep(.p-inputotp) {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.code-box {
  flex: 1 1 0;
  min-width: 0;
  max-width: 64px;
  height: 60px;
  padding: 0;
  border: 1.5px solid var(--auth-line);
  border-radius: 14px;
  outline: none;
  background: var(--auth-field);
  caret-color: var(--auth-accent);
  color: var(--app-text);
  font-family: inherit;
  font-weight: 900;
  font-size: 1.5rem;
  text-align: center;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.code-box.filled {
  border-color: color-mix(in srgb, var(--auth-accent) 45%, var(--auth-line));
}

.code-box:focus {
  border-color: var(--auth-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--auth-accent) 18%, transparent);
}

.code-box:disabled {
  opacity: 0.55;
}

.code-otp.invalid .code-box {
  border-color: #f87171;
  animation: code-shake 0.35s ease;
}

@keyframes code-shake {
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.code-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 20px;
  margin: 12px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.85rem;
}

.code-status.error {
  color: #f87171;
}

:root:not(.app-dark) .code-status.error {
  color: #dc2626;
}

.code-resend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 20px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.85rem;
}

.code-resend-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--auth-line);
  border-radius: 999px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.code-resend-btn:not(:disabled):hover {
  border-color: var(--auth-accent);
  color: var(--auth-accent);
}

.code-resend-btn:disabled {
  color: var(--app-muted);
  cursor: default;
}

.code-resend-btn .pi {
  font-size: 0.8rem;
}

.code-countdown {
  color: var(--app-text);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .code-header {
    margin-bottom: 22px;
  }

  .code-header .auth-heading {
    font-size: 1.35rem;
  }

  .code-otp :deep(.p-inputotp) {
    gap: 6px;
  }

  .code-box {
    height: 44px;
    border-radius: 10px;
    font-size: 1.2rem;
  }

  .code-status {
    margin-top: 8px;
  }

  .code-resend {
    margin-top: 10px;
    padding-top: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .code-otp.invalid .code-box {
    animation: none;
  }
}
</style>
