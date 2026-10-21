<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { ConfirmationResult } from 'firebase/auth'
import VerifyCodeStep from '@/components/auth/VerifyCodeStep.vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { promotions } from '@/data/promotions'
import { DEMO_ACCOUNTS, demoCodeFor, formatLocalPhone, type DemoAccount } from '@/data/demoAccounts'
import { authErrorMessage, PH_MOBILE_PATTERN, sendPhoneCode } from '@/services/auth'
import logoUrl from '@/assets/images/logo-sakura.png'
import branchUrl from '@/assets/images/sakura-branch.svg'
import gcashLogo from '@/assets/images/payments/gcash.png'
import mayaLogo from '@/assets/images/payments/maya.png'

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ signedIn: [] }>()

const digits = ref('')
const error = ref('')
const sending = ref(false)
const step = ref<'phone' | 'code'>('phone')
const confirmation = ref<ConfirmationResult | null>(null)
const phoneInput = ref<HTMLInputElement>()

const SLIDE_MS = 5000
const slide = ref(0)
const offer = computed(() => promotions[slide.value]!)
let slideTimer: number | undefined

function startSlides() {
  window.clearInterval(slideTimer)
  slideTimer = window.setInterval(() => {
    slide.value = (slide.value + 1) % promotions.length
  }, SLIDE_MS)
}

function goToSlide(i: number) {
  slide.value = i
  startSlides()
}

watch(
  visible,
  (open) => {
    if (open) startSlides()
    else window.clearInterval(slideTimer)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.clearInterval(slideTimer))

const paymentLogos = [
  { label: 'GCash', src: gcashLogo },
  { label: 'Maya', src: mayaLogo },
]

const petals = [
  { x: '46%', s: 0.8, d: '9s', delay: '0s' },
  { x: '58%', s: 1, d: '11s', delay: '-4s' },
  { x: '68%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '79%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '90%', s: 1.1, d: '10s', delay: '-7s' },
]

const phone = computed(() => `0${digits.value}`)
const isValid = computed(() => PH_MOBILE_PATTERN.test(phone.value))

const transitionName = computed(() => (step.value === 'code' ? 'auth-next' : 'auth-prev'))

watch(visible, (open) => {
  if (open) return
  error.value = ''
  step.value = 'phone'
})

function focusPhone() {
  nextTick(() => phoneInput.value?.focus())
}

function onPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement
  let next = input.value.replace(/\D/g, '')
  if (next.length > 10 && next.startsWith('63')) next = next.slice(2)
  if (next.startsWith('0')) next = next.slice(1)
  digits.value = next.slice(0, 10)
  input.value = digits.value
  error.value = ''
}

async function submit() {
  if (!isValid.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    confirmation.value = await sendPhoneCode(phone.value)
    step.value = 'code'
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    sending.value = false
  }
}

const demoCode = computed(() => demoCodeFor(phone.value))

function useDemoAccount(account: DemoAccount) {
  if (sending.value) return
  digits.value = account.phone.slice(1)
  submit()
}

function backToPhone() {
  step.value = 'phone'
  focusPhone()
}

function onVerified() {
  digits.value = ''
  emit('signedIn')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :show-header="false"
    :draggable="false"
    dismissable-mask
    class="sakura-auth"
    @show="focusPhone"
  >
    <header class="auth-hero">
      <Transition name="auth-crossfade">
        <img :key="offer.id" :src="offer.background" alt="" class="auth-hero-bg" />
      </Transition>
      <div class="auth-hero-shade" />

      <div class="auth-hero-blossoms" aria-hidden="true">
        <img :src="branchUrl" alt="" class="auth-branch" />
        <span
          v-for="(p, i) in petals"
          :key="i"
          class="auth-petal"
          :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
        />
      </div>

      <div class="auth-hero-covers" aria-hidden="true">
        <Transition name="auth-crossfade">
          <div :key="offer.id" class="auth-hero-art">
            <template v-if="offer.covers">
              <img
                v-for="(src, i) in offer.covers"
                :key="src"
                :src="src"
                alt=""
                class="auth-hero-cover"
                :class="offer.covers.length === 1 ? 'only' : i === 0 ? 'back' : 'front'"
              />
            </template>
            <SakuraIcon
              v-else-if="offer.coin"
              variant="gold"
              :symbol="offer.coin"
              class="auth-hero-coin"
            />
            <SakuraIcon v-else-if="offer.seal" variant="gold" mark="check" class="auth-hero-coin" />
            <img v-else-if="offer.icon" :src="offer.icon" alt="" class="auth-hero-coin" />
          </div>
        </Transition>
      </div>

      <div class="auth-hero-copy">
        <span
          role="img"
          aria-label="Sakura"
          class="auth-logo"
          :style="{ '--logo-url': `url(${logoUrl})` }"
        />
        <Transition name="auth-swap" mode="out-in">
          <div :key="offer.id" class="auth-hero-offer">
            <span class="auth-eyebrow">{{ offer.eyebrow }}</span>
            <p class="auth-offer">
              <small>{{ offer.headline }}</small>
              {{ offer.amount }}
            </p>
            <p class="auth-offer-sub">{{ offer.subline }}</p>
          </div>
        </Transition>
      </div>

      <div class="auth-dots" :style="{ '--slide-ms': `${SLIDE_MS}ms` }">
        <button
          v-for="(p, i) in promotions"
          :key="p.id"
          type="button"
          class="auth-dot"
          :class="{ active: i === slide }"
          :aria-label="`Show ${p.title}`"
          :aria-current="i === slide || undefined"
          @click="goToSlide(i)"
        />
      </div>
    </header>

    <button type="button" class="auth-close" aria-label="Close" @click="visible = false">
      <i class="pi pi-times" />
    </button>

    <div class="auth-body">
      <Transition :name="transitionName" mode="out-in">
        <form v-if="step === 'phone'" key="phone" class="auth-step" @submit.prevent="submit">
          <h2 class="auth-heading">Welcome to Sakura</h2>
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
            <p class="auth-payments-label">Demo accounts</p>
            <ul>
              <li v-for="account in DEMO_ACCOUNTS" :key="account.phone">
                <button
                  type="button"
                  class="auth-demo-account"
                  :aria-label="`Log in as ${formatLocalPhone(account.phone)}`"
                  :disabled="sending"
                  @click="useDemoAccount(account)"
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

        <VerifyCodeStep
          v-else
          key="code"
          v-model:confirmation="confirmation"
          :phone="phone"
          :display-phone="digits"
          :demo-code="demoCode"
          @verified="onVerified"
          @back="backToPhone"
        />
      </Transition>
    </div>
  </Dialog>
</template>

<style>
.p-dialog.sakura-auth {
  --auth-accent: #ffc200;
  --auth-field: var(--app-surface);
  --auth-line: #262c40;

  position: relative;
  width: min(560px, calc(100vw - 32px));
  border: 1px solid var(--app-border);
  border-radius: 28px;
  background: var(--app-navbar);
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
  box-shadow: 0 30px 90px rgb(0 0 0 / 0.6);
  overflow: hidden;
}

:root:not(.app-dark) .p-dialog.sakura-auth {
  --auth-accent: #e0457f;
  --auth-field: #f6f7fb;
  --auth-line: #dde1ec;
  box-shadow: 0 30px 90px rgb(20 30 70 / 0.28);
}

.sakura-auth .p-dialog-content {
  padding: 0;
  overflow-x: hidden;
}

.sakura-auth .auth-hero {
  position: relative;
  height: 260px;
  overflow: hidden;
  isolation: isolate;
  background: #05070f;
  color: #fff;
}

.sakura-auth .auth-hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: auth-hero-drift 18s ease-in-out infinite alternate;
}

@keyframes auth-hero-drift {
  from {
    transform: scale(1.02);
  }
  to {
    transform: scale(1.12) translateX(-2%);
  }
}

.sakura-auth .auth-hero-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgb(5 7 15 / 0.88), rgb(5 7 15 / 0.5) 50%, rgb(5 7 15 / 0.05)),
    linear-gradient(to top, rgb(5 7 15 / 0.6), transparent 40%);
}

.sakura-auth .auth-hero-blossoms {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.sakura-auth .auth-branch {
  position: absolute;
  top: 0;
  right: -64px;
  height: 66px;
  user-select: none;
}

.sakura-auth .auth-petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: auth-petal-fall var(--d) linear var(--delay) infinite;
}

@keyframes auth-petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  12% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-110px, 250px) rotate(320deg);
  }
}

.sakura-auth .auth-hero-covers {
  position: absolute;
  top: 50%;
  right: 36px;
  z-index: 1;
  width: 190px;
  height: 180px;
  transform: translateY(-46%);
}

.sakura-auth .auth-hero-cover {
  position: absolute;
  width: 128px;
  border: 3px solid #ffd54a;
  border-radius: 18px;
  box-shadow:
    0 0 0 1px rgb(120 60 0 / 0.5),
    0 6px 0 rgb(90 40 0 / 0.35),
    0 16px 34px rgb(0 0 0 / 0.5);
  animation: auth-cover-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.sakura-auth .auth-hero-cover.back {
  top: 0;
  right: 0;
  animation-delay: 0.1s;
}

.sakura-auth .auth-hero-cover.front {
  bottom: 0;
  left: 0;
  animation-delay: 0.22s;
}

.sakura-auth .auth-hero-art {
  position: absolute;
  inset: 0;
}

.sakura-auth .auth-hero-cover.only {
  top: 50%;
  left: 50%;
  translate: -50% -50%;
}

.sakura-auth .auth-hero-offer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.sakura-auth .auth-swap-enter-active,
.sakura-auth .auth-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.sakura-auth .auth-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.sakura-auth .auth-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.sakura-auth .auth-crossfade-enter-active,
.sakura-auth .auth-crossfade-leave-active {
  transition: opacity 0.6s ease;
}

.sakura-auth .auth-crossfade-enter-from,
.sakura-auth .auth-crossfade-leave-to {
  opacity: 0;
}

.sakura-auth .auth-dots {
  position: absolute;
  right: 36px;
  bottom: 16px;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 6px;
  width: 190px;
}

.sakura-auth .auth-dot {
  position: relative;
  width: 8px;
  height: 8px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.35);
  cursor: pointer;
  transition: width 0.3s ease;
}

.sakura-auth .auth-dot.active {
  width: 36px;
}

.sakura-auth .auth-dot.active::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #ffc200;
  transform-origin: left;
  animation: auth-dot-fill var(--slide-ms) linear both;
}

:root:not(.app-dark) .sakura-auth .auth-dot.active::after {
  background: #ff5c9a;
}

@keyframes auth-dot-fill {
  from {
    transform: scaleX(0);
  }
}

.sakura-auth .auth-hero-coin {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 136px;
  height: 136px;
  margin: -68px 0 0 -68px;
  filter: drop-shadow(0 0 22px rgb(255 194 0 / 0.55)) drop-shadow(0 8px 12px rgb(0 0 0 / 0.45));
  animation: auth-cover-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

@keyframes auth-cover-in {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.85);
  }
}

.sakura-auth .auth-hero-copy {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 36px 30px;
}

.sakura-auth .auth-logo {
  position: absolute;
  top: 26px;
  left: 36px;
  height: 20px;
  aspect-ratio: 1686 / 280;
  background: #fff;
  mask: var(--logo-url) left center / contain no-repeat;
}

.sakura-auth .auth-eyebrow {
  padding: 5px 11px;
  border-radius: 999px;
  background: rgb(255 194 0 / 0.18);
  color: #ffd84d;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sakura-auth .auth-offer {
  margin: 10px 0 0;
  color: #ffc200;
  font-weight: 900;
  font-size: 3rem;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow: 0 4px 20px rgb(0 0 0 / 0.45);
}

.sakura-auth .auth-offer small {
  display: block;
  margin-bottom: 4px;
  color: #fff;
  font-size: 0.95rem;
  letter-spacing: 0;
}

.sakura-auth .auth-offer-sub {
  margin: 8px 0 0;
  font-weight: 700;
  font-size: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .sakura-auth .auth-hero-bg,
  .sakura-auth .auth-hero-cover,
  .sakura-auth .auth-hero-coin {
    animation: none;
  }

  .sakura-auth .auth-swap-enter-active,
  .sakura-auth .auth-swap-leave-active,
  .sakura-auth .auth-crossfade-enter-active,
  .sakura-auth .auth-crossfade-leave-active {
    transition: none;
  }

  .sakura-auth .auth-petal {
    display: none;
  }
}

.sakura-auth .auth-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 50%;
  background: rgb(8 11 24 / 0.6);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.sakura-auth .auth-close:hover {
  background: rgb(8 11 24 / 0.85);
}

.sakura-auth .auth-close .pi {
  font-size: 0.85rem;
}

.sakura-auth .auth-body {
  padding: 30px 36px 30px;
}

.sakura-auth .auth-step {
  display: flex;
  flex-direction: column;
}

.sakura-auth .auth-heading {
  margin: 0;
  font-weight: 900;
  font-size: 1.85rem;
  letter-spacing: -0.015em;
}

.sakura-auth .auth-sub {
  margin: 8px 0 26px;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.98rem;
  line-height: 1.5;
}

.sakura-auth .auth-sub strong {
  color: var(--app-text);
  font-weight: 700;
  white-space: nowrap;
}

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
  height: 48px;
  border: 1.5px solid var(--auth-line);
  border-radius: 12px;
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
  padding: 0 14px 0 16px;
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
  height: 48px;
  margin-top: 16px;
  margin-bottom: 5px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
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
    0 2px 0 #8f9bd1;
}

:root:not(.app-dark) .sakura-auth .auth-submit,
:root:not(.app-dark) .sakura-auth .auth-submit:disabled {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 5px 0 #0b1029;
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
    0 2px 0 #0b1029;
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

.auth-next-enter-active,
.auth-next-leave-active,
.auth-prev-enter-active,
.auth-prev-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.auth-next-enter-from,
.auth-prev-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.auth-next-leave-to,
.auth-prev-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

@media (max-width: 560px) {
  .p-dialog.sakura-auth {
    align-self: flex-end;
    width: 100%;
    max-height: 94dvh;
    margin: 0;
    border-width: 1px 0 0;
    border-radius: 24px 24px 0 0;
  }

  .sakura-auth .auth-hero {
    height: 210px;
  }

  .sakura-auth .auth-hero-copy {
    padding: 0 22px 22px;
  }

  .sakura-auth .auth-logo {
    top: 22px;
    left: 22px;
    height: 17px;
  }

  .sakura-auth .auth-offer {
    font-size: 2.1rem;
  }

  .sakura-auth .auth-offer-sub {
    font-size: 0.88rem;
  }

  .sakura-auth .auth-hero-covers {
    right: 14px;
    width: 140px;
    height: 136px;
  }

  .sakura-auth .auth-hero-cover {
    width: 96px;
    border-radius: 14px;
  }

  .sakura-auth .auth-hero-coin {
    width: 96px;
    height: 96px;
    margin: -48px 0 0 -48px;
  }

  .sakura-auth .auth-dots {
    right: 14px;
    bottom: 12px;
    width: 140px;
  }

  .sakura-auth .auth-body {
    padding: 24px 22px calc(24px + env(safe-area-inset-bottom));
  }

  .sakura-auth .auth-heading {
    font-size: 1.55rem;
  }

  .sakura-auth .auth-sub {
    margin-bottom: 22px;
    font-size: 0.9rem;
  }
}
</style>
