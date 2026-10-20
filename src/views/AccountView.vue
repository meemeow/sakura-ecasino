<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import EditNameDialog from '@/components/account/EditNameDialog.vue'
import PersonalDetailsDialog from '@/components/account/PersonalDetailsDialog.vue'
import PencilIcon from '@/components/account/PencilIcon.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import WalletHistory from '@/components/wallet/WalletHistory.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import coinsIcon from '@/assets/icons/coins.svg'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import VipBadge from '@/components/vip/VipBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { REQUIRED_DETAILS, verificationStatus, type VerificationStatus } from '@/services/profile'
import type { PersonalDetails } from '@/types'
import defaultAvatar from '@/assets/images/avatar-default.png'

const auth = useAuthStore()
const wallet = useWalletStore()

// The route is guarded, so a user is always present here
const uid = computed(() => auth.user!.uid)
const profile = computed(() => wallet.profile)
// TEMP preview, dev server only: force the badge state without touching any data. Set to null
// when done.
const PREVIEW_STATUS = null as VerificationStatus | null

// Unverified (details missing) -> Verifying (saved, awaiting admin review) -> Verified
const status = computed(() =>
  PREVIEW_STATUS && import.meta.env.DEV ? PREVIEW_STATUS : verificationStatus(profile.value),
)
const verified = computed(() => status.value === 'verified')

// '+639171234567' -> '09171234567'
const mobile = computed(() => {
  const phone = auth.user?.phoneNumber
  return phone ? `0${phone.slice(3)}` : '-'
})
// Shown in the hero as dialed internationally; `mobile` stays the local 09 form everywhere else
const mobileIntl = computed(() => auth.user?.phoneNumber ?? '-')

const displayName = computed(
  () => profile.value?.displayName || `${mobile.value.slice(0, 4)}***${mobile.value.slice(-4)}`,
)
const shortId = computed(() => uid.value.slice(0, 8).toUpperCase())

// Saved at least once: the first save records the declarations (consentedAt). Until then the
// section's Edit is off and Complete Profile is the way in.
const hasSavedDetails = computed(() => !!profile.value?.consentedAt)

const editNameOpen = ref(false)
const detailsOpen = ref(false)

// Personal details, read-only here (edited in PersonalDetailsDialog). Sensitive values start
// masked in case someone is looking over the player's shoulder or they're streaming.
const revealed = ref(false)

function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@')
  return `${user.slice(0, 2)}•••@${domain}`
}
// 'YYYY-MM-DD' -> 'MM/DD/YYYY', or '••/••/YYYY' while masked
function formatBirthdate(iso: string) {
  const [y, m, d] = iso.split('-')
  return revealed.value ? `${m}/${d}/${y}` : `••/••/${y}`
}
// Masked addresses keep only the last part, usually the city or province
function maskAddress(address: string) {
  const parts = address.split(',').map((p) => p.trim())
  return parts.length > 1 ? `•••, ${parts.at(-1)}` : '••••••'
}

interface DetailRow {
  label: string
  /** PrimeIcons class for the card's icon tile */
  icon: string
  value: string
  /** Identity field that can't be changed once saved (firestore.rules) */
  locked?: boolean
  /** Missing but required to get verified */
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

// Profile completion for the hero meter: every required detail plus the declarations,
// the same things isProfileComplete checks (verification itself is the admin review)
const completion = computed(() => {
  const p = profile.value
  const filled = REQUIRED_DETAILS.filter((f) => String(p?.[f] ?? '').trim() !== '').length
  const done = filled + (p?.consentedAt ? 1 : 0)
  const total = REQUIRED_DETAILS.length + 1
  return { done, total }
})

// Sent here by the router guard (e.g. from /wallet) because the profile isn't complete yet
const route = useRoute()
const router = useRouter()
const toast = useToast()
const completing = computed(() => route.query.completeProfile === '1')

// Watched rather than onMounted: the guard can send a player here while already on /account.
// Waits for the profile (undefined while loading, null if missing) so the form starts filled in.
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

// Closed (X / outside click) without saving: drop ?completeProfile so the URL is plain /account.
// Otherwise the guard's next redirect (e.g. clicking Wallet again) lands on the exact same URL,
// nothing changes, and the dialog never reopens.
let savedDetails = false
watch(detailsOpen, (open) => {
  if (open) {
    savedDetails = false
    return
  }
  if (completing.value && !savedDetails) router.replace({ name: 'account' })
})

// Sent here by the guard because the details are saved but not approved yet
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
    // Plain /account again, so the next redirect shows the message again
    router.replace({ name: 'account' })
  },
  { immediate: true },
)

function onDetailsSaved() {
  savedDetails = true
  if (!completing.value) return
  // Back to where the guard sent them from only if the account is already approved (an edit
  // after verification). A first save goes into review, and the wallet would just bounce back.
  const redirect = route.query.redirect
  // Only same-site paths, never '//host' or full URLs
  if (verified.value && typeof redirect === 'string' && /^\/(?!\/)/.test(redirect)) {
    router.replace(redirect)
  } else {
    router.replace({ name: 'account' })
  }
}
</script>

<template>
  <section class="account">
    <h1 class="page-title">Account</h1>

    <!-- Hero: who the player is and how far their profile is, styled like the VIP page's hero -->
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
            <span class="hero-name-text">{{ displayName }}</span>
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
        <!-- Status on the left, the fix on the right; the bar underneath -->
        <div class="status-row">
          <!-- Unverified: details missing, opens the form. Verifying: saved and waiting for an
               admin to approve (the wallet stays locked). Verified: approved. Nothing shows
               while the profile loads. -->
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
            <!-- The blossom is out; the dashed ring turns while the review runs -->
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

    <!-- Personal details, read-only; edited in the Personal Details dialog -->
    <template v-if="profile !== undefined">
      <div class="section-head">
        <h2 class="section-title">Personal Details</h2>
        <!-- Rolling switch like the header's theme switch: the eye knob rolls across to reveal -->
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
          <span class="reveal-knob">
            <i class="pi" :class="revealed ? 'pi-eye' : 'pi-eye-slash'" />
          </span>
        </button>
        <button
          type="button"
          class="edit-btn"
          :disabled="!hasSavedDetails"
          :title="hasSavedDetails ? undefined : 'Complete your profile first'"
          @click="detailsOpen = true"
        >
          <PencilIcon /> Edit Details
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

    <!-- Same list as the wallet page's History. Deposit goes through the wallet, which checks
         verification first. -->
    <WalletHistory
      title="Transaction History"
      note="Deposits, withdrawals and bonuses on your wallet."
      @deposit="router.push({ name: 'wallet', query: { mode: 'deposit' } })"
    />

    <div class="section-head">
      <h2 class="section-title">Bet History</h2>
    </div>
    <p class="section-note">Every bet you place, with what it paid out.</p>
    <!-- Empty: the lobby's empty state, like Transactions above -->
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
  /* Layout follows the content width, not the window, so the open sidebar counts */
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

/* Hero card: same glow and shape as the VIP page's status card */
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

/* Avatar with the player's VIP chip on its edge */
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

/* Round chip like the Personal Details dialog's icons: gold in dark mode, sakura pink on white */
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

/* Status left, Complete Profile right */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

/* .status is top-aligned for the stacked phone layout; in the row it centers like the button */
.status-row .status {
  align-self: center;
}

/* No bottom margin for the 3D edge here, or the row centers the margin too and the button
   sits higher than the status */
.status-row .gold-btn {
  margin-bottom: 0;
}

/* Verification status: a small seal and a word. Verified wears the VIP page's completed-level
   seal (gold sakura on navy in a gold ring); Unverified is the same seal not yet in bloom, a
   faded sakura in a dashed ring, and opens Personal Details. */
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
  /* Never squeezed by long text beside it, or the ring turns into an oval */
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}

/* Even size in the 26px seal: a 4px inset on every side, so no half-pixel shift */
.seal-icon {
  width: 18px;
  height: 18px;
}

.status.verified {
  color: var(--app-gold-text);
}

/* Light mode: sakura pink like the app's other accents on white; the seal stays gold */
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

/* The blossom drained of color, waiting to bloom */
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

/* Hover previews the bloom: the blossom gets its pink back */
.status.unverified:hover .seal-icon {
  filter: none;
  opacity: 1;
}

.status.unverified:hover .pi {
  transform: translateX(2px);
}

/* Verifying: the blossom is already in pink, and the dashed ring turns while the review runs.
   The ring is its own layer so only it spins, not the flower. */
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

/* Every state: heading with a note on a second line, the seal centered against both */
.status.verifying {
  align-items: center;
}

/* Each line is its own block, so the heading and note always stack */
.status-text {
  display: block;
  /* Unverified is a button, which would center its text */
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

/* Profile completion meter, same as the VIP progress bars */
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

/* Same 3D gold button as the VIP page; sakura pink on white */
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

/* Section heading, like the VIP page's "VIP Levels" */
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

/* Show details: a rolling switch like the header's theme switch (AppHeader.vue). Off: neutral
   track, crossed-out eye on the left. On: pink track, the knob rolls right and opens its eye. */
.reveal-switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 28px;
  padding: 0;
  border: 1px solid #2f3868;
  border-radius: 999px;
  background: #1a2042;
  cursor: pointer;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.reveal-switch.on {
  border-color: rgb(255 194 0 / 0.5);
  background: rgb(255 194 0 / 0.18);
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
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

.reveal-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2c3563;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  color: #aab2c5;
  transition:
    transform 0.4s ease,
    background 0.3s,
    color 0.3s;
}

:root:not(.app-dark) .reveal-knob {
  background: #ffffff;
  color: var(--app-muted);
}

/* One full turn on the way across, so the eye lands upright. Gold in dark mode, sakura pink on
   white, like the app's other accents. */
.reveal-switch.on .reveal-knob {
  background: linear-gradient(#ffe27a, #ffb800);
  color: #703902;
  transform: translateX(24px) rotate(360deg);
}

:root:not(.app-dark) .reveal-switch.on .reveal-knob {
  background: linear-gradient(#ff7aae, #e0457f);
  color: #ffffff;
}

.reveal-knob .pi {
  font-size: 0.72rem;
}

.reveal-switch:hover .reveal-knob {
  box-shadow: 0 0 0 3px rgb(255 194 0 / 0.3);
}

:root:not(.app-dark) .reveal-switch:hover .reveal-knob {
  box-shadow: 0 0 0 3px rgb(255 92 154 / 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .reveal-knob {
    transition: none;
  }
}

/* Edit: a small 3D button in the Save button's colors (LogoutDialog.vue): lavender in dark
   mode, navy in light mode */
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

/* Until the first save, Complete Profile is the way in */
.edit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.edit-btn .pencil-icon {
  font-size: 0.9rem;
}

/* Field cards, laid out like the VIP level cards */
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

/* Missing and needed to get verified: a dashed outline in the accent color */
.detail-card.missing {
  border: 1.5px dashed rgb(255 194 0 / 0.45);
}

:root:not(.app-dark) .detail-card.missing {
  border-color: rgb(224 69 127 / 0.45);
}

/* Icon tile in the accent color: gold in dark mode, sakura pink on white */
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

/* Transactions and Bet History lists */
.list-card {
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
  background: var(--app-navbar);
  overflow: hidden;
}

/* Narrower content (small windows, or the sidebar open) */
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
</style>
