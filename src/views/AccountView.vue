<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import AccountDetailCards from '@/components/account/AccountDetailCards.vue'
import AccountHero from '@/components/account/AccountHero.vue'
import EditNameDialog from '@/components/account/EditNameDialog.vue'
import PersonalDetailsDialog from '@/components/account/PersonalDetailsDialog.vue'
import PencilIcon from '@/components/icons/PencilIcon.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import WalletHistory from '@/components/wallet/WalletHistory.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import coinsIcon from '@/assets/icons/coins.svg'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { verificationStatus } from '@/services/profile'
import { localMobile } from '@/utils/format'
import { safeRedirect } from '@/utils/redirect'

const auth = useAuthStore()
const wallet = useWalletStore()

const uid = computed(() => auth.user?.uid ?? '')
const profile = computed(() => wallet.profile)
const status = computed(() => verificationStatus(profile.value))
const verified = computed(() => status.value === 'verified')

const mobile = computed(() => localMobile(auth.user?.phoneNumber) || '-')

const hasSavedDetails = computed(() => !!profile.value?.consentedAt)

const editNameOpen = ref(false)
const detailsOpen = ref(false)

const revealed = ref(false)
const { isDark } = useTheme()

const route = useRoute()
const router = useRouter()
const toast = useToast()
const completing = computed(() => route.query.completeProfile === '1')

watch(
  () => completing.value && profile.value !== undefined,
  (ready) => {
    if (!ready) return
    detailsOpen.value = true
    toast.add({
      severity: 'warn',
      summary: 'Complete your profile',
      detail: 'Fill in your personal details to deposit or withdraw.',
      life: 4000,
    })
  },
  { immediate: true },
)

let savedDetails = false
watch(detailsOpen, (open) => {
  if (open) {
    savedDetails = false
    return
  }
  if (completing.value && !savedDetails) router.replace({ name: 'account' })
})

watch(
  () => route.query.verifying === '1',
  (waiting) => {
    if (!waiting) return
    toast.add({
      severity: 'info',
      summary: 'Verifying your account',
      detail:
        "We're reviewing your details. Deposits and withdrawals unlock once your account is verified.",
      life: 5000,
    })
    router.replace({ name: 'account' })
  },
  { immediate: true },
)

function onDetailsSaved() {
  savedDetails = true
  if (!completing.value) return
  const redirect = safeRedirect(route.query.redirect, '')
  router.replace(verified.value && redirect ? redirect : { name: 'account' })
}
</script>

<template>
  <section class="account">
    <h1 class="page-title">Account</h1>

    <AccountHero @edit-name="editNameOpen = true" @complete-profile="detailsOpen = true" />

    <template v-if="profile !== undefined">
      <div class="section-head">
        <h2 class="section-title">Personal Details</h2>
        <button
          type="button"
          role="switch"
          class="reveal-switch"
          :class="{ on: revealed }"
          :aria-checked="revealed"
          aria-label="Show details"
          :title="revealed ? 'Hide details' : 'Show details'"
          @click="revealed = !revealed"
        >
          <span class="reveal-text show" aria-hidden="true">Show</span>
          <span class="reveal-text hide" aria-hidden="true">Hide</span>
          <SakuraIcon
            :variant="isDark ? 'gold' : 'pink'"
            :mark="revealed ? 'eye' : 'eye-closed'"
            class="reveal-knob"
          />
        </button>
        <button
          type="button"
          class="edit-btn"
          :disabled="!hasSavedDetails"
          :title="hasSavedDetails ? undefined : 'Complete your profile first'"
          @click="detailsOpen = true"
        >
          <PencilIcon /> Edit<span class="edit-more"> Details</span>
        </button>
      </div>
      <p class="section-note">
        Email, birthdate and addresses stay hidden until you flip the eye switch. Locked details
        can't be changed once saved.
      </p>

      <AccountDetailCards :revealed="revealed" />
    </template>

    <WalletHistory
      title="Transaction History"
      note="Deposits, withdrawals and bonuses on your wallet."
      @deposit="router.push({ name: 'wallet', query: { mode: 'deposit' } })"
    />

    <div class="section-head">
      <h2 class="section-title">Bet History</h2>
    </div>
    <p class="section-note">Every bet you place, with what it paid out.</p>
    <EmptyState
      v-if="!wallet.bets.length"
      :icon="coinsIcon"
      title="No bets yet"
      text="Every spin you play will show up here with what it paid out."
      action-label="Play slots"
      @action="router.push('/slots')"
    />
    <div v-else class="list-card">
      <TransactionList :transactions="wallet.bets" kind="bets" />
    </div>

    <EditNameDialog
      v-model:visible="editNameOpen"
      :uid="uid"
      :current-name="profile?.displayName ?? ''"
    />
    <PersonalDetailsDialog
      v-model:visible="detailsOpen"
      :uid="uid"
      :profile="profile"
      :mobile="mobile"
      @saved="onDetailsSaved"
    />
  </section>
</template>

<style scoped>
.account {
  container-type: inline-size;
  font-family: 'Montserrat', sans-serif;
}

.page-title {
  margin: 4px 0 16px;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 28px 0 4px;
}

.section-title {
  flex: 1;
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1rem;
  text-transform: uppercase;
}

.section-note {
  margin: 0 0 14px;
  color: var(--app-muted);
  font-size: 0.8rem;
}

.reveal-switch {
  position: relative;
  flex-shrink: 0;
  width: 82px;
  height: 34px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #3a4478;
  border-radius: 999px;
  background: #1a2042;
  cursor: pointer;
  font-family: inherit;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.reveal-switch.on {
  border-color: rgb(255 194 0 / 0.5);
  background: rgb(255 194 0 / 0.16);
}

:root:not(.app-dark) .reveal-switch {
  border-color: #d5dbea;
  background: #eef1f8;
}

:root:not(.app-dark) .reveal-switch.on {
  border-color: #f3b3cb;
  background: #ffe3ee;
}

.reveal-switch:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}

.reveal-text {
  position: absolute;
  top: 50%;
  text-align: center;
  font-weight: 800;
  font-size: 0.6rem;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  transition:
    opacity 0.3s ease,
    transform 0.4s ease;
}

.reveal-text.show {
  right: 6px;
  left: 34px;
  color: var(--app-muted);
  transform: translateY(-50%) scale(1);
}

.reveal-text.hide {
  right: 34px;
  left: 6px;
  color: #ffc200;
  opacity: 0;
  transform: translate(-8px, -50%) scale(0.3);
}

:root:not(.app-dark) .reveal-text.hide {
  color: #e0457f;
}

.reveal-switch.on .reveal-text.show {
  opacity: 0;
  transform: translate(8px, -50%) scale(0.3);
}

.reveal-switch.on .reveal-text.hide {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.reveal-knob {
  position: absolute;
  top: 2px;
  left: 5px;
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));
  transition:
    translate 0.4s ease,
    rotate 0.4s ease,
    scale 0.2s ease;
}

.reveal-switch.on .reveal-knob {
  translate: 42px 0;
  rotate: 360deg;
}

.reveal-switch:hover .reveal-knob {
  scale: 1.06;
}

@media (prefers-reduced-motion: reduce) {
  .reveal-knob,
  .reveal-text {
    transition: none;
  }
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 3px 0 #8f9bd1;
  color: #1b2550;
  font: inherit;
  font-weight: 900;
  font-size: 0.72rem;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    filter 0.2s,
    transform 0.1s;
}

:root:not(.app-dark) .edit-btn {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 3px 0 #0b1029;
  color: #ffffff;
}

.edit-btn:not(:disabled):hover {
  filter: brightness(1.06);
}

.edit-btn:not(:disabled):active {
  transform: translateY(2px);
}

.edit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.edit-btn .pencil-icon {
  font-size: 0.9rem;
}

.list-card {
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
  background: var(--app-navbar);
  overflow: hidden;
}

@container (min-width: 641px) {
  .reveal-switch {
    margin-right: 6px;
  }
}

@container (max-width: 360px) {
  .section-title {
    flex: 0 1 auto;
    font-size: 0.92rem;
    white-space: nowrap;
  }

  .edit-btn {
    gap: 4px;
    height: 24px;
    margin: 0 0 2px;
    padding: 0 8px;
    font-size: 0.64rem;
    border-radius: 6px;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.6),
      0 2px 0 #8f9bd1;
  }

  :root:not(.app-dark) .edit-btn {
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.18),
      0 2px 0 #0b1029;
  }

  .edit-btn .pencil-icon {
    font-size: 0.72rem;
  }

  .reveal-switch {
    margin-right: auto;
    width: 58px;
    height: 24px;
  }

  .reveal-knob {
    left: 3px;
    width: 18px;
    height: 18px;
  }

  .reveal-switch.on .reveal-knob {
    translate: 32px 0;
  }

  .reveal-text {
    font-size: 0.5rem;
  }

  .reveal-text.show {
    right: 4px;
    left: 22px;
  }

  .reveal-text.hide {
    right: 22px;
    left: 4px;
  }
}

@container (max-width: 417px) {
  .edit-more {
    display: none;
  }
}
</style>
