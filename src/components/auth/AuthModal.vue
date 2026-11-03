<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import type { ConfirmationResult } from 'firebase/auth'
import AuthHero from '@/components/auth/AuthHero.vue'
import AuthPhoneStep from '@/components/auth/AuthPhoneStep.vue'
import VerifyCodeStep from '@/components/auth/VerifyCodeStep.vue'
import { useKeyboardInset } from '@/composables/useKeyboardInset'
import { usePromoSlides } from '@/composables/usePromoSlides'
import { useSheetSwipe } from '@/composables/useSheetSwipe'
import { demoCodeFor, type DemoAccount } from '@/data/demoAccounts'
import { authErrorMessage, PH_MOBILE_PATTERN, sendPhoneCode } from '@/services/auth'

const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ signedIn: [] }>()

const digits = ref('')
const error = ref('')
const sending = ref(false)
const step = ref<'phone' | 'code'>('phone')
const confirmation = ref<ConfirmationResult | null>(null)
const phoneStep = ref<InstanceType<typeof AuthPhoneStep>>()

const slides = usePromoSlides()
const swipe = useSheetSwipe(slides, () => (visible.value = false))

const KEYBOARD_SETTLE_MS = 260
const { inset: keyboardInset, visibleHeight, keyboardOpen } = useKeyboardInset()
const dialogStyle = computed(() => ({
  ...swipe.sheetStyle.value,
  '--keyboard-inset': `${keyboardInset.value}px`,
  '--visible-height': `${visibleHeight.value}px`,
}))
let revealTimer: number | undefined

function revealFocused() {
  window.clearTimeout(revealTimer)
  revealTimer = window.setTimeout(() => {
    if (!keyboardOpen.value) return
    const field = document.activeElement
    const content = field?.closest('.p-dialog-content')
    if (!(field instanceof HTMLInputElement) || !content) return
    const area = content.getBoundingClientRect()
    const box = field.getBoundingClientRect()
    if (box.top >= area.top && box.bottom <= area.bottom) return
    content.scrollTo({
      top: content.scrollTop + box.top - area.top - (area.height - box.height) / 2,
      behavior: 'smooth',
    })
  }, KEYBOARD_SETTLE_MS)
}

watch(keyboardOpen, (open) => {
  if (open) revealFocused()
})

watch(
  visible,
  (open) => {
    if (open) slides.startSlides()
    else slides.stopSlides()
  },
  { immediate: true },
)
onBeforeUnmount(() => window.clearTimeout(revealTimer))

const phone = computed(() => `0${digits.value}`)
const isValid = computed(() => PH_MOBILE_PATTERN.test(phone.value))

const transitionName = computed(() => (step.value === 'code' ? 'auth-next' : 'auth-prev'))

watch(visible, (open) => {
  if (open) return
  error.value = ''
  step.value = 'phone'
})

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
  phoneStep.value?.focus()
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
    :class="{ 'keyboard-open': keyboardOpen }"
    :style="dialogStyle"
    @focusin="revealFocused"
    @after-hide="swipe.resetSheet"
  >
    <AuthHero :slides="slides" :swipe="swipe" />

    <button type="button" class="auth-close" aria-label="Close" @click="visible = false">
      <i class="pi pi-times" />
    </button>

    <div class="auth-body">
      <Transition :name="transitionName" mode="out-in">
        <AuthPhoneStep
          v-if="step === 'phone'"
          key="phone"
          ref="phoneStep"
          v-model:digits="digits"
          v-model:error="error"
          :sending="sending"
          @submit="submit"
          @demo="useDemoAccount"
        />

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
  overscroll-behavior: contain;
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
  outline: none;
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

  .p-dialog.sakura-auth.keyboard-open {
    max-height: calc(var(--visible-height) - 8px);
    margin-bottom: var(--keyboard-inset);
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
