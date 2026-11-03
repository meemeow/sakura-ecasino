<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import PencilIcon from '@/components/icons/PencilIcon.vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import VipBadge from '@/components/vip/VipBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { REQUIRED_DETAILS } from '@/constants/personalDetails'
import { verificationStatus } from '@/services/profile'
import defaultAvatar from '@/assets/images/avatar-default.png'

const emit = defineEmits<{ editName: []; completeProfile: [] }>()

const auth = useAuthStore()
const wallet = useWalletStore()

const profile = computed(() => wallet.profile)
const status = computed(() => verificationStatus(profile.value))
const verified = computed(() => status.value === 'verified')
const mobileIntl = computed(() => auth.user?.phoneNumber ?? '-')
const shortId = computed(() => (auth.user?.uid ?? '').slice(0, 8).toUpperCase())

const completion = computed(() => {
  const p = profile.value
  const filled = REQUIRED_DETAILS.filter((f) => String(p?.[f] ?? '').trim() !== '').length
  const done = filled + (p?.consentedAt ? 1 : 0)
  const total = REQUIRED_DETAILS.length + 1
  return { done, total }
})
</script>

<template>
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
          <button type="button" class="icon-btn" aria-label="Edit name" @click="emit('editName')">
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
          @click="emit('completeProfile')"
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
          @click="emit('completeProfile')"
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
</template>

<style scoped>
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
</style>
