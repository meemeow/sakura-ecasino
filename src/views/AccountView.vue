<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import EditNameDialog from '@/components/account/EditNameDialog.vue'
import PersonalDetailsDialog from '@/components/account/PersonalDetailsDialog.vue'
import PencilIcon from '@/components/icons/PencilIcon.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import WalletHistory from '@/components/wallet/WalletHistory.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import coinsIcon from '@/assets/icons/coins.svg'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { useTheme } from '@/composables/useTheme'
import VipBadge from '@/components/vip/VipBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { REQUIRED_DETAILS, verificationStatus } from '@/services/profile'
import type { PersonalDetails } from '@/types'
import defaultAvatar from '@/assets/images/avatar-default.png'
import { localMobile } from '@/utils/format'
import { safeRedirect } from '@/utils/redirect'

const auth = useAuthStore()
const wallet = useWalletStore()

const uid = computed(() => auth.user?.uid ?? '')
const profile = computed(() => wallet.profile)
const status = computed(() => verificationStatus(profile.value))
const verified = computed(() => status.value === 'verified')

const mobile = computed(() => localMobile(auth.user?.phoneNumber) || '-')
const mobileIntl = computed(() => auth.user?.phoneNumber ?? '-')
const shortId = computed(() => uid.value.slice(0, 8).toUpperCase())

const hasSavedDetails = computed(() => !!profile.value?.consentedAt)

const editNameOpen = ref(false)
const detailsOpen = ref(false)

const revealed = ref(false)
const { isDark } = useTheme()

function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@')
  return `${user.slice(0, 2)}•••@${domain}`
}
function formatBirthdate(iso: string) {
  const [y, m, d] = iso.split('-')
  return revealed.value ? `${m}/${d}/${y}` : `••/••/${y}`
}
function maskAddress(address: string) {
  const parts = address.split(',').map((p) => p.trim())
  return parts.length > 1 ? `•••, ${parts.at(-1)}` : '••••••'
}

interface DetailRow {
  label: string
  icon: string
  value: string
  locked?: boolean
  missing?: boolean
}

const detailRows = computed<DetailRow[]>(() => {
  const p: Partial<PersonalDetails> = profile.value ?? {}
  const show = (value: string | undefined, mask: (v: string) => string) =>
    value ? (revealed.value ? value : mask(value)) : ''
  const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  const current = p.sameAsPermanent ? 'Same as permanent address' : p.currentAddress
  return [
    {
      label: 'Full Name',
      icon: 'pi-user',
      value: name,
      locked: !!p.firstName,
      missing: !p.firstName || !p.lastName,
    },
    {
      label: 'Birthdate',
      icon: 'pi-calendar',
      value: p.birthdate ? formatBirthdate(p.birthdate) : '',
      locked: !!p.birthdate,
      missing: !p.birthdate,
    },
    {
      label: 'Nationality',
      icon: 'pi-flag',
      value: p.nationality ?? '',
      locked: !!p.nationality,
      missing: !p.nationality,
    },
    { label: 'Place of Birth', icon: 'pi-map-marker', value: p.placeOfBirth ?? '' },
    { label: 'Email', icon: 'pi-envelope', value: show(p.email, maskEmail), missing: !p.email },
    {
      label: 'Occupation',
      icon: 'pi-briefcase',
      value: p.occupation ?? '',
      missing: !p.occupation,
    },
    {
      label: 'Source of Income',
      icon: 'pi-wallet',
      value: p.sourceOfIncome ?? '',
      missing: !p.sourceOfIncome,
    },
    {
      label: 'Permanent Address',
      icon: 'pi-home',
      value: show(p.permanentAddress, maskAddress),
      missing: !p.permanentAddress,
    },
    {
      label: 'Current Address',
      icon: 'pi-map',
      value: p.sameAsPermanent ? (current ?? '') : show(current, maskAddress),
      missing: !current,
    },
  ]
})

const completion = computed(() => {
  const p = profile.value
  const filled = REQUIRED_DETAILS.filter((f) => String(p?.[f] ?? '').trim() !== '').length
  const done = filled + (p?.consentedAt ? 1 : 0)
  const total = REQUIRED_DETAILS.length + 1
  return { done, total }
})

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

    <div class="hero">
      <div class="hero-head">
        <span class="avatar-wrap">
          <img
            :src="auth.user?.photoURL || defaultAvatar"
            alt=""
            class="hero-avatar"
            :class="{ 'verified-ring': verified }"
          />
          <VipBadge :level="wallet.vip.current.level" :size="30" plain class="avatar-chip" />
        </span>
        <div class="hero-id">
          <p class="eyebrow">User ID: {{ shortId }}</p>
          <p class="hero-name">
            <span class="hero-name-text">{{ wallet.displayName }}</span>
            <button
              type="button"
              class="icon-btn"
              aria-label="Edit name"
              @click="editNameOpen = true"
            >
              <PencilIcon />
            </button>
          </p>
          <p class="hero-mobile">
            Mobile <strong>{{ mobileIntl }}</strong>
          </p>
        </div>
      </div>

      <div v-if="profile !== undefined" class="hero-body">
        <div class="status-row">
          <span v-if="status === 'verified'" class="status verified">
            <span class="seal"><SakuraIcon variant="gold" class="seal-icon" /></span>
            <span class="status-text">
              <span class="status-title">Verified Account</span>
              <span class="status-note">
                You're all set. Deposit, withdraw and play any game with your wallet.
              </span>
            </span>
          </span>
          <span v-else-if="status === 'verifying'" class="status verifying" role="status">
            <span class="seal"><SakuraIcon class="seal-icon" /></span>
            <span class="status-text">
              <span class="status-title">Verifying Account...</span>
              <span class="status-note">
                We're reviewing your details. Deposits and withdrawals unlock once your account is
                verified.
              </span>
            </span>
          </span>
          <button
            v-else
            type="button"
            class="status unverified"
            title="Complete your personal details to get verified"
            @click="detailsOpen = true"
          >
            <span class="seal"><SakuraIcon class="seal-icon" /></span>
            <span class="status-text">
              <span class="status-title"> Unverified Account <i class="pi pi-angle-right" /> </span>
              <span class="status-note">
                Complete your personal details to unlock deposits and withdrawals.
              </span>
            </span>
          </button>

          <Button
            v-if="status === 'unverified'"
            label="Complete Profile"
            class="gold-btn"
            @click="detailsOpen = true"
          />
        </div>

        <div class="meter">
          <div class="meter-row">
            <span>Profile completion</span>
            <span>
              {{ completion.done }} <small>/ {{ completion.total }}</small>
            </span>
          </div>
          <div class="bar">
            <span :style="{ width: `${(completion.done / completion.total) * 100}%` }" />
          </div>
        </div>
      </div>
    </div>

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

      <ul class="detail-cards">
        <li
          v-for="row in detailRows"
          :key="row.label"
          class="detail-card"
          :class="{ missing: !row.value && row.missing, empty: !row.value }"
        >
          <span class="detail-icon"><i class="pi" :class="row.icon" /></span>
          <div class="detail-text">
            <p class="detail-label">
              {{ row.label }}
              <i
                v-if="row.locked"
                class="pi pi-lock"
                title="Can't be changed once saved"
                aria-label="Locked"
              />
            </p>
            <p v-if="row.value" class="detail-value">{{ row.value }}</p>
            <p v-else-if="row.missing" class="detail-value required">Required</p>
            <p v-else class="detail-value unset">Not set</p>
          </div>
        </li>
      </ul>
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

.hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background:
    radial-gradient(120% 140% at 0% 0%, rgb(255 92 154 / 0.16), transparent 55%), var(--app-surface);
}

:root:not(.app-dark) .hero {
  background:
    radial-gradient(120% 140% at 0% 0%, #ffe9f1, #fff4f8 30%, transparent 60%), var(--app-surface);
  box-shadow: 0 4px 14px rgb(27 37 80 / 0.06);
}

.hero-head {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.hero-avatar {
  display: block;
  width: 84px;
  height: 84px;
  padding: 3px;
  border: 2.5px solid rgb(128 140 175 / 0.45);
  border-radius: 50%;
  background: var(--app-surface);
  object-fit: cover;
}

.hero-avatar.verified-ring {
  border-color: #ffc83d;
}

:root:not(.app-dark) .hero-avatar.verified-ring {
  border-color: #e0457f;
}

.avatar-chip {
  position: absolute;
  right: -4px;
  bottom: -2px;
}

.hero-id {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.75rem;
}

.hero-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 4px;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1.15;
}

.hero-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
  cursor: pointer;
  transition: background-color 0.15s;
}

.icon-btn:hover {
  background: rgb(255 194 0 / 0.22);
}

:root:not(.app-dark) .icon-btn {
  background: #ffe9f1;
  color: #e0457f;
}

:root:not(.app-dark) .icon-btn:hover {
  background: #ffd3e3;
}

.icon-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.icon-btn .pencil-icon {
  font-size: 0.9rem;
}

.hero-mobile {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.8rem;
}

.hero-mobile strong {
  margin-left: 4px;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.9rem;
}

.hero-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

.status-row .status {
  align-self: center;
}

.status-row .gold-btn {
  margin-bottom: 0;
}

.status {
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 800;
  font-size: 0.9rem;
  white-space: nowrap;
}

.seal {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}

.seal-icon {
  width: 18px;
  height: 18px;
}

.status.verified {
  color: var(--app-gold-text);
}

:root:not(.app-dark) .status.verified {
  color: #e0457f;
}

.status.verified .seal {
  background: radial-gradient(circle at 50% 35%, #26305a, #0c1122);
  box-shadow:
    inset 0 0 0 1.5px #ffc83d,
    0 1px 3px rgb(0 0 0 / 0.35);
}

.status.unverified {
  color: var(--app-muted);
  cursor: pointer;
}

.status.unverified .seal {
  border: 1.5px dashed currentColor;
}

.status.unverified .seal-icon {
  filter: grayscale(1);
  opacity: 0.55;
  transition:
    filter 0.2s,
    opacity 0.2s;
}

.status.unverified .pi {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.status.unverified:hover {
  color: var(--app-text);
}

.status.unverified:hover .seal-icon {
  filter: none;
  opacity: 1;
}

.status.unverified:hover .pi {
  transform: translateX(2px);
}

.status.verifying {
  color: var(--app-text);
}

.status.verifying .seal {
  position: relative;
}

.status.verifying .seal::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1.5px dashed var(--app-gold-text);
  border-radius: 50%;
  animation: seal-spin 6s linear infinite;
}

:root:not(.app-dark) .status.verifying .seal::before {
  border-color: #e0457f;
}

@keyframes seal-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status.verifying .seal::before {
    animation: none;
  }
}

.status.verifying {
  align-items: center;
}

.status-text {
  display: block;
  text-align: left;
}

.status-title {
  display: block;
}

.status-note {
  display: block;
  margin-top: 2px;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.78rem;
  white-space: normal;
}

.meter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meter-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.8rem;
}

.meter-row small {
  color: var(--app-muted);
  font-weight: 600;
}

.bar {
  height: 10px;
  overflow: hidden;
  border-radius: 5px;
  background: rgb(255 255 255 / 0.08);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.4);
}

:root:not(.app-dark) .bar {
  background: rgb(27 37 80 / 0.08);
  box-shadow: inset 0 1px 2px rgb(27 37 80 / 0.12);
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #ffe27a, #ffb800);
  transition: width 0.4s ease;
}

:root:not(.app-dark) .bar span {
  background: linear-gradient(90deg, #ff9cc2, #e0457f);
}

.gold-btn {
  flex: 0 0 auto;
  margin-bottom: 5px;
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  color: #703902;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.gold-btn :deep(.p-button-label) {
  font-weight: 900;
}

.gold-btn:not(:disabled):hover {
  border: none;
  background: #ffd033;
  color: #703902;
}

:root:not(.app-dark) .gold-btn,
:root:not(.app-dark) .gold-btn:not(:disabled):hover {
  background: linear-gradient(#ff7aae, #e0457f);
  box-shadow: 0 5px 0 #b8235e;
  color: #ffffff;
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

.detail-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

:root:not(.app-dark) .detail-card {
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.05);
}

.detail-card.missing {
  border: 1.5px dashed rgb(255 194 0 / 0.45);
}

:root:not(.app-dark) .detail-card.missing {
  border-color: rgb(224 69 127 / 0.45);
}

.detail-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
}

:root:not(.app-dark) .detail-icon {
  background: #ffe9f1;
  color: #e0457f;
}

.detail-card.empty .detail-icon {
  background: rgb(128 140 175 / 0.12);
  color: var(--app-muted);
}

.detail-icon .pi {
  font-size: 1rem;
}

.detail-text {
  min-width: 0;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 2px;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.72rem;
}

.detail-label .pi {
  font-size: 0.62rem;
  opacity: 0.8;
}

.detail-value {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.88rem;
}

.detail-value.unset {
  color: var(--app-muted);
  font-weight: 500;
}

.detail-value.required {
  color: var(--app-gold-text);
}

:root:not(.app-dark) .detail-value.required {
  color: #e0457f;
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

@container (max-width: 820px) {
  .detail-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 640px) {
  .status-row {
    flex-direction: column;
    align-items: stretch;
  }

  .status-row .status {
    align-self: flex-start;
  }

  .status-row .gold-btn {
    width: 100%;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 18px;
  }

  .hero-avatar {
    width: 68px;
    height: 68px;
  }

  .hero-name {
    font-size: 1.4rem;
  }
}

@container (max-width: 480px) {
  .detail-cards {
    grid-template-columns: 1fr;
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
