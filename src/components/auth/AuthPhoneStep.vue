<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import Button from 'primevue/button'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { DEMO_ACCOUNTS, formatLocalPhone, type DemoAccount } from '@/data/demoAccounts'
import { PH_MOBILE_PATTERN } from '@/services/auth'
import gcashLogo from '@/assets/images/payments/gcash.webp'
import mayaLogo from '@/assets/images/payments/maya.webp'

const digits = defineModel<string>('digits', { required: true })
const error = defineModel<string>('error', { required: true })
defineProps<{ sending: boolean }>()
const emit = defineEmits<{ submit: []; demo: [account: DemoAccount] }>()

const phoneInput = ref<HTMLInputElement>()
const isValid = computed(() => PH_MOBILE_PATTERN.test(`0${digits.value}`))

const paymentLogos = [
  { label: 'GCash', src: gcashLogo },
  { label: 'Maya', src: mayaLogo },
]

function onPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement
  let next = input.value.replace(/\D/g, '')
  if (next.length > 10 && next.startsWith('63')) next = next.slice(2)
  if (next.startsWith('0')) next = next.slice(1)
  digits.value = next.slice(0, 10)
  input.value = digits.value
  error.value = ''
}

defineExpose({ focus: () => nextTick(() => phoneInput.value?.focus()) })
</script>

<template>
  <form class="auth-step" @submit.prevent="emit('submit')">
    <h2 class="auth-heading" tabindex="-1" autofocus>Welcome to Sakura</h2>
    <p class="auth-sub">Enter your mobile number to log in or create your account.</p>

    <label for="auth-phone" class="auth-label">Mobile number</label>
    <div class="auth-phone" :class="{ invalid: error }">
      <span class="auth-cc">+63</span>
      <input
        id="auth-phone"
        ref="phoneInput"
        :value="digits"
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        placeholder="9171234567"
        :readonly="sending"
        @input="onPhoneInput"
      />
      <SakuraIcon v-if="isValid" mark="check" class="auth-phone-ok" />
    </div>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

    <Button
      type="submit"
      label="Continue"
      icon-pos="right"
      class="auth-submit"
      :disabled="!isValid || sending"
      :loading="sending"
    >
      <template #icon="{ class: iconClass }">
        <svg :class="[iconClass, 'auth-submit-arrow']" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </template>
      <template #loadingicon>
        <svg class="auth-spinner" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" class="auth-spinner-track" />
          <circle cx="12" cy="12" r="9" class="auth-spinner-arc" />
        </svg>
      </template>
    </Button>

    <div class="auth-demo">
      <p class="auth-payments-label">Tap on a demo account</p>
      <ul>
        <li v-for="account in DEMO_ACCOUNTS" :key="account.phone">
          <button
            type="button"
            class="auth-demo-account"
            :aria-label="`Log in as ${formatLocalPhone(account.phone)}`"
            :disabled="sending"
            @click="emit('demo', account)"
          >
            <span class="auth-demo-phone">{{ formatLocalPhone(account.phone) }}</span>
            <span class="auth-demo-code">Code {{ account.code }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div class="auth-payments">
      <p class="auth-payments-label">Deposit &amp; withdraw with</p>
      <ul>
        <li v-for="logo in paymentLogos" :key="logo.label" :class="logo.label.toLowerCase()">
          <img :src="logo.src" :alt="logo.label" />
        </li>
      </ul>
    </div>

    <p class="auth-recaptcha">
      Protected by reCAPTCHA. Google's
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener"
        >Privacy Policy</a
      >
      and
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener"
        >Terms of Service</a
      >
      apply.
    </p>
  </form>
</template>

<style>
.sakura-auth .auth-label {
  margin-bottom: 10px;
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sakura-auth .auth-phone {
  display: flex;
  align-items: center;
  height: 42px;
  border: 1.5px solid var(--auth-line);
  border-radius: 10px;
  background: var(--auth-field);
  overflow: hidden;
  position: relative;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.sakura-auth .auth-phone:focus-within {
  border-color: var(--auth-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--auth-accent) 18%, transparent);
}

.sakura-auth .auth-phone.invalid {
  border-color: #f87171;
  box-shadow: none;
}

.sakura-auth .auth-cc {
  align-self: stretch;
  display: grid;
  place-items: center;
  padding: 0 12px 0 14px;
  border-right: 1.5px solid var(--auth-line);
  font-weight: 700;
  font-size: 1rem;
}

.sakura-auth .auth-phone input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 44px 0 14px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--app-text);
  font-family: inherit;
  font-weight: 700;
  font-size: 1rem;
}

.sakura-auth .auth-phone input::placeholder {
  color: var(--app-muted);
  font-weight: 500;
  opacity: 0.6;
}

.sakura-auth .auth-phone-ok {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 22px;
  height: 22px;
  margin-top: -11px;
  pointer-events: none;
  animation: auth-bloom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes auth-bloom {
  from {
    transform: scale(0.3) rotate(-72deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-auth .auth-phone-ok {
    animation: none;
  }
}

.sakura-auth .auth-error {
  margin: 10px 0 0;
  color: #f87171;
  font-weight: 500;
  font-size: 0.9rem;
}

:root:not(.app-dark) .sakura-auth .auth-error {
  color: #dc2626;
}

.sakura-auth .auth-submit {
  justify-content: center;
  gap: 8px;
  height: 42px;
  margin-top: 14px;
  margin-bottom: 5px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sakura-auth .auth-submit .p-button-label {
  flex: 0 0 auto;
  font-weight: 900;
}

.sakura-auth .auth-submit-arrow {
  width: 15px;
  height: 15px;
  margin-top: 1px;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sakura-auth .auth-submit:not(:disabled) .auth-submit-arrow {
  animation: auth-arrow-push 2.4s ease-in-out infinite;
}

@keyframes auth-arrow-push {
  0%,
  45%,
  100% {
    transform: translateX(0);
  }
  18% {
    transform: translateX(3px);
  }
  32% {
    transform: translateX(-0.8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-auth .auth-submit .auth-submit-arrow {
    animation: none;
  }
}

.sakura-auth .auth-submit:not(:disabled):hover,
.sakura-auth .auth-submit:not(:disabled):active {
  border: none;
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
  color: #1b2550;
}

.sakura-auth .auth-submit:disabled {
  border: none;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  color: #1b2550;
  opacity: 0.5;
}

.sakura-auth .auth-submit:not(:disabled):active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 1px 0 #8f9bd1;
}

:root:not(.app-dark) .sakura-auth .auth-submit,
:root:not(.app-dark) .sakura-auth .auth-submit:disabled {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 4px 0 #0b1029;
  color: #fff;
}

:root:not(.app-dark) .sakura-auth .auth-submit:not(:disabled):hover,
:root:not(.app-dark) .sakura-auth .auth-submit:not(:disabled):active {
  background: linear-gradient(#3d4b9a, #222d60 55%, #161f47);
  color: #fff;
}

:root:not(.app-dark) .sakura-auth .auth-submit:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 1px 0 #0b1029;
}

.sakura-auth .auth-submit.p-button-loading {
  cursor: default;
}

.sakura-auth .auth-spinner {
  width: 18px;
  height: 18px;
  fill: none;
  stroke-width: 3.2;
  animation: auth-spin 0.8s linear infinite;
}

.sakura-auth .auth-spinner-track {
  stroke: currentColor;
  opacity: 0.22;
}

.sakura-auth .auth-spinner-arc {
  stroke: currentColor;
  stroke-linecap: round;
  stroke-dasharray: 18 100;
}

@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}

.sakura-auth .auth-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 26px;
}

.sakura-auth .auth-demo ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sakura-auth .auth-demo-account {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--auth-line);
  border-radius: 10px;
  background: var(--auth-field);
  color: var(--app-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.sakura-auth .auth-demo-account:not(:disabled):hover {
  border-color: var(--auth-accent);
}

.sakura-auth .auth-demo-account:focus-visible {
  outline: none;
  border-color: var(--auth-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--auth-accent) 18%, transparent);
}

.sakura-auth .auth-demo-account:disabled {
  cursor: default;
  opacity: 0.5;
}

.sakura-auth .auth-demo-phone {
  font-weight: 700;
  font-size: 0.86rem;
  white-space: nowrap;
}

.sakura-auth .auth-demo-code {
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.74rem;
  font-variant-numeric: tabular-nums;
}

.sakura-auth .auth-payments {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 26px;
}

.sakura-auth .auth-payments-label {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0;
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.sakura-auth .auth-payments-label::before,
.sakura-auth .auth-payments-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--app-border);
}

.sakura-auth .auth-payments ul {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 3px 4px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 3px 10px rgb(0 0 0 / 0.3);
  list-style: none;
}

:root:not(.app-dark) .sakura-auth .auth-payments ul {
  border: 1px solid var(--app-border);
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.08);
}

.sakura-auth .auth-payments li {
  display: grid;
  place-items: center;
  height: 34px;
  padding: 0 18px;
}

.sakura-auth .auth-payments li + li {
  border-left: 1px solid #e3e6ee;
}

.sakura-auth .auth-payments img {
  height: 16px;
}

.sakura-auth .auth-payments li.maya img {
  height: 14px;
  transform: translateY(1.5px);
}

.sakura-auth .auth-recaptcha {
  margin: 18px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.72rem;
  line-height: 1.5;
}

.sakura-auth .auth-recaptcha a {
  color: inherit;
  text-decoration: underline;
}
</style>
