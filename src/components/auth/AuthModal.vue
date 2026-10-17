<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { ConfirmationResult } from 'firebase/auth'
import VerifyCodeDialog from '@/components/auth/VerifyCodeDialog.vue'
import { authErrorMessage, PH_MOBILE_PATTERN, sendPhoneCode } from '@/services/auth'
import logoUrl from '@/assets/images/logo-sakura.png'

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ signedIn: [] }>()

const phone = ref('')
const error = ref('')
const sending = ref(false)
const verifyVisible = ref(false)
const confirmation = ref<ConfirmationResult | null>(null)

// Fanned out over the banner's sky; the center card is last so it sits on top
const featuredGames = [
  { id: 'gates-of-olympus-1000', name: 'Gates of Olympus 1000', position: 'left' },
  { id: 'sugar-rush-1000', name: 'Sugar Rush 1000', position: 'right' },
  { id: 'sweet-bonanza-1000', name: 'Sweet Bonanza 1000', position: 'center' },
]

const isValid = computed(() => PH_MOBILE_PATTERN.test(phone.value))

watch(visible, (open) => {
  if (open) return
  error.value = ''
  verifyVisible.value = false
})

// Digits only, capped at 11 (09XXXXXXXXX)
function onPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement
  phone.value = input.value.replace(/\D/g, '').slice(0, 11)
  input.value = phone.value
  error.value = ''
}

async function submit() {
  if (!isValid.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    confirmation.value = await sendPhoneCode(phone.value)
    verifyVisible.value = true
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    sending.value = false
  }
}

function onVerified() {
  verifyVisible.value = false
  phone.value = ''
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
  >
    <button class="sakura-close" aria-label="Close" @click="visible = false">
      <i class="pi pi-times" />
    </button>

    <div class="auth-layout">
      <aside class="auth-banner">
        <img src="/hero/sweet-bonanza-1000.webp" alt="" class="auth-banner-bg" />
        <div class="auth-banner-games">
          <img
            v-for="game in featuredGames"
            :key="game.id"
            :src="`/games/${game.id}.webp`"
            :alt="game.name"
            class="auth-banner-game"
            :class="game.position"
          />
        </div>
        <div class="auth-banner-copy">
          <img :src="logoUrl" alt="Sakura" class="auth-banner-logo" />
          <p>Spin, play and win on top slots.</p>
        </div>
      </aside>

      <form class="auth-form" @submit.prevent="submit">
        <h2 class="sakura-title">Register or Login</h2>

        <label class="auth-phone" :class="{ invalid: error }">
          <i class="pi pi-phone" />
          <input
            :value="phone"
            type="tel"
            inputmode="numeric"
            autocomplete="tel-national"
            placeholder="0917XXXXXXX"
            aria-label="Mobile number"
            @input="onPhoneInput"
          />
        </label>
        <p v-if="error" class="sakura-error">{{ error }}</p>

        <Button
          type="submit"
          label="Register / Login"
          class="auth-submit"
          :disabled="!isValid"
          :loading="sending"
        >
          <!-- Own spinner: a bold arc with round ends over a faint track (PrimeVue's is thin
               and jagged at this size) -->
          <template #loadingicon>
            <svg class="auth-spinner" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" class="auth-spinner-track" />
              <circle cx="12" cy="12" r="9" class="auth-spinner-arc" />
            </svg>
          </template>
        </Button>

        <!-- Required by Google when the reCAPTCHA badge is hidden (see main.css) -->
        <p class="auth-recaptcha">
          This site is protected by reCAPTCHA and the Google
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
    </div>
  </Dialog>

  <VerifyCodeDialog
    v-model:visible="verifyVisible"
    v-model:confirmation="confirmation"
    :phone="phone"
    @verified="onVerified"
  />
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope.
     The .sakura-* helpers are shared with VerifyCodeDialog. -->
<style>
.p-dialog.sakura-auth {
  position: relative;
  width: min(820px, calc(100vw - 32px));
  border: none;
  border-radius: 20px;
  background: var(--app-navbar);
  overflow: hidden;
}

.sakura-auth .p-dialog-content {
  padding: 0;
}

.sakura-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 2.5px solid var(--app-text);
  border-radius: 50%;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}

.sakura-close .pi {
  font-size: 0.75rem;
  font-weight: 900;
}

.sakura-title {
  margin: 0 0 24px;
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  text-transform: uppercase;
}

.sakura-error {
  margin: 8px 0 0;
  color: #f87171;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
}

.sakura-auth .auth-layout {
  display: flex;
  min-height: 660px;
}

.sakura-auth .auth-banner {
  position: relative;
  flex: 0 0 50%;
  overflow: hidden;
}

.sakura-auth .auth-banner-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Featured game cards piled collage-style over the banner's sky */
.sakura-auth .auth-banner-games {
  position: absolute;
  inset: 0;
}

/* Warm glow behind the pile */
.sakura-auth .auth-banner-games::before {
  content: '';
  position: absolute;
  top: 42%;
  left: 50%;
  width: 120%;
  aspect-ratio: 1;
  background: radial-gradient(
    circle,
    rgb(255 214 120 / 0.45),
    rgb(255 120 200 / 0.15) 40%,
    transparent 65%
  );
  transform: translate(-50%, -50%);
}

.sakura-auth .auth-banner-game {
  --r: 0deg;
  position: absolute;
  width: 48%;
  max-width: 210px;
  border: 3px solid #ffd54a;
  border-radius: 18px;
  box-shadow:
    0 0 0 1px rgb(120 60 0 / 0.5),
    0 8px 0 rgb(90 40 0 / 0.35),
    0 18px 34px rgb(30 10 60 / 0.55);
  transform: rotate(var(--r));
  transition: transform 0.2s ease;
  /* Dealt in one by one when the modal opens, then still. 'backwards' only
     holds the start frame during the delay, so hover can move the card after. */
  animation: auth-game-deal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.sakura-auth .auth-banner-game.left {
  --r: -8deg;
  top: 10%;
  left: 5%;
  animation-delay: 0.1s;
}

.sakura-auth .auth-banner-game.right {
  --r: 9deg;
  z-index: 1;
  top: 18%;
  left: 48%;
  animation-delay: 0.22s;
}

.sakura-auth .auth-banner-game.center {
  --r: -3deg;
  z-index: 2;
  top: 41%;
  left: 15%;
  animation-delay: 0.34s;
}

/* After the position rules so its z-index beats theirs (same specificity) */
.sakura-auth .auth-banner-game:hover {
  z-index: 3;
  transform: translateY(-6px) rotate(var(--r)) scale(1.04);
}

@keyframes auth-game-deal {
  from {
    opacity: 0;
    transform: translateY(-60px) rotate(calc(var(--r) * 3)) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-auth .auth-banner-game {
    animation: none;
    transition: none;
  }
}

.sakura-auth .auth-banner-copy {
  position: absolute;
  inset: auto 0 0;
  padding: 80px 24px 28px;
  background: linear-gradient(to top, rgb(4 6 16 / 0.9), transparent);
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  text-align: center;
}

.sakura-auth .auth-banner-logo {
  height: 28px;
}

.sakura-auth .auth-banner-copy p {
  margin: 10px 0 0;
}

.sakura-auth .auth-form {
  flex: 1;
  padding: 56px 32px 32px;
  text-align: center;
}

.sakura-auth .auth-phone {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 14px;
  border: 1.5px solid #2a3045;
  border-radius: 10px;
  background: var(--app-surface);
  cursor: text;
}

.sakura-auth .auth-phone:focus-within {
  border-color: #ffc200;
}

/* Light mode: sakura pink focus ring instead of gold */
:root:not(.app-dark) .sakura-auth .auth-phone:focus-within {
  border-color: #ff5c9a;
}

.sakura-auth .auth-phone.invalid {
  border-color: #f87171;
}

.sakura-auth .auth-phone .pi {
  color: var(--app-muted);
  font-size: 1.1rem;
}

.sakura-auth .auth-phone input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 1rem;
}

.sakura-auth .auth-phone input::placeholder {
  color: #5c6378;
}

/* Same 3D button as the header's login button: lavender in dark mode, navy in light */
.sakura-auth .auth-submit {
  width: 100%;
  margin-top: 16px;
  padding: 11px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  color: #1b2550;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.sakura-auth .auth-submit .p-button-label {
  font-weight: 900;
}

.sakura-auth .auth-submit:not(:disabled):hover,
.sakura-auth .auth-submit:not(:disabled):active,
.sakura-auth .auth-submit:disabled {
  border: none;
  color: #1b2550;
}

.sakura-auth .auth-submit:not(:disabled):hover,
.sakura-auth .auth-submit:not(:disabled):active {
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
}

.sakura-auth .auth-submit:disabled {
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
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

.sakura-auth .auth-submit:disabled {
  opacity: 0.5;
}

/* While sending the button is disabled too, but stays solid so the spinner reads crisply.
   The label stops stretching so the spinner sits right next to the text. */
.sakura-auth .auth-submit.p-button-loading {
  gap: 8px;
  opacity: 1;
}

.sakura-auth .auth-submit.p-button-loading .p-button-label {
  flex: 0 0 auto;
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

/* About a third of the ring, with rounded ends */
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

.sakura-auth .auth-recaptcha {
  margin: 24px 0 0;
  color: var(--app-muted);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.7rem;
  line-height: 1.5;
}

.sakura-auth .auth-recaptcha a {
  color: inherit;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .sakura-auth .auth-layout {
    flex-direction: column;
    min-height: 0;
  }

  .sakura-auth .auth-banner {
    flex-basis: 180px;
  }

  .sakura-auth .auth-banner-games {
    display: none;
  }

  .sakura-auth .auth-form {
    padding: 28px 20px 32px;
  }
}
</style>
