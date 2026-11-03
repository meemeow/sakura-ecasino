<script setup lang="ts">
import { computed, ref } from 'vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import VipBadge from '@/components/vip/VipBadge.vue'
import { useBalance } from '@/composables/useBalance'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import cardArtUrl from '@/assets/images/wallet-card.webp'
import { formatMoney, formatMonthYear, localMobile, maskMobile } from '@/utils/format'

const auth = useAuthStore()
const wallet = useWalletStore()
const { shownBalance, refreshBalance } = useBalance()

const shortId = computed(() => (auth.user?.uid ?? '').slice(0, 8).toUpperCase())

const cardId = computed(() => `${shortId.value.slice(0, 4)} ${shortId.value.slice(4)}`)
const holder = computed(() => {
  const p = wallet.profile
  const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.displayName
  if (name) return name
  const local = localMobile(auth.user?.phoneNumber)
  return local ? maskMobile(local, '•••') : 'Sakura Player'
})
const memberSince = computed(() => {
  const created = auth.user?.metadata.creationTime
  return created ? formatMonthYear(new Date(created)) : '--/--'
})
const vip = computed(() => wallet.vip.current)

const petals = [
  { x: '38%', s: 0.8, d: '9s', delay: '0s' },
  { x: '52%', s: 1, d: '11s', delay: '-4s' },
  { x: '64%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '76%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '88%', s: 1.1, d: '10s', delay: '-7s' },
  { x: '97%', s: 0.75, d: '9.5s', delay: '-3s' },
]

const tilt = ref({ x: 0, y: 0, active: false })
function onCardMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.value = {
    x: (e.clientX - r.left) / r.width - 0.5,
    y: (e.clientY - r.top) / r.height - 0.5,
    active: true,
  }
}
function onCardLeave() {
  tilt.value = { x: 0, y: 0, active: false }
}
</script>

<template>
  <div
    class="credit-card"
    :class="{ tilting: tilt.active }"
    :style="{ '--tx': tilt.x, '--ty': tilt.y }"
    @pointermove="onCardMove"
    @pointerleave="onCardLeave"
  >
    <div class="cc-scene" aria-hidden="true">
      <img :src="cardArtUrl" alt="" class="cc-art" />
      <span
        v-for="(p, i) in petals"
        :key="i"
        class="cc-petal"
        :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
      />
    </div>
    <span class="cc-shine" aria-hidden="true" />

    <div class="cc-head">
      <span class="cc-brand"><SakuraIcon variant="gold" class="cc-logo" /> Sakura</span>
      <span
        class="cc-tier"
        :style="{
          background: `linear-gradient(${vip.rank.light}, ${vip.rank.dark})`,
          color: vip.rank.ink,
        }"
      >
        {{ vip.level ? `${vip.rank.name} · VIP ${vip.level}` : vip.rank.name }}
      </span>
    </div>

    <div class="cc-chip-row" aria-hidden="true">
      <span class="cc-chip" />
      <svg class="cc-contactless" viewBox="0 0 24 24">
        <path d="M7 9.5a4 4 0 0 1 0 5" />
        <path d="M10.5 7a7.5 7.5 0 0 1 0 10" />
        <path d="M14 4.5a11 11 0 0 1 0 15" />
      </svg>
    </div>

    <div class="cc-balance">
      <p class="cc-label">Balance</p>
      <p class="cc-amount">
        <span class="currency">₱</span>{{ formatMoney(shownBalance) }}
        <button
          type="button"
          class="refresh"
          :class="{ spinning: wallet.refreshing }"
          aria-label="Refresh balance"
          @click="refreshBalance"
        >
          <i class="pi pi-refresh" />
        </button>
      </p>
    </div>

    <div class="cc-foot">
      <div class="cc-field holder">
        <span class="cc-label">Card holder</span>
        <span class="cc-value">{{ holder }}</span>
      </div>
      <div class="cc-field">
        <span class="cc-label">Member since</span>
        <span class="cc-value">{{ memberSince }}</span>
      </div>
      <div class="cc-field">
        <span class="cc-label">Player ID</span>
        <span class="cc-value">{{ cardId }}</span>
      </div>
      <VipBadge :level="vip.level" :size="46" plain class="cc-network" />
    </div>
  </div>
</template>

<style scoped>
.credit-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 320px;
  padding: 22px 24px 20px;
  overflow: hidden;
  isolation: isolate;
  border-radius: 18px;
  background: linear-gradient(135deg, #12123a, #1c1748 55%, #0e0f2e);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.1),
    0 18px 36px rgb(0 0 0 / 0.45);
  color: #ffffff;
  transform: perspective(900px) rotateY(calc(var(--tx, 0) * 10deg))
    rotateX(calc(var(--ty, 0) * -10deg));
  transition: transform 0.5s ease;
}

.credit-card.tilting {
  transition: transform 0.08s linear;
}

:root:not(.app-dark) .credit-card {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.1),
    0 16px 30px rgb(27 37 80 / 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .credit-card {
    transform: none;
  }
}

.cc-scene {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.cc-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 100% 40%;
  user-select: none;
}

.cc-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(10 8 32 / 0.35), transparent 45%);
}

.cc-petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: cc-petal-fall var(--d) linear var(--delay) infinite;
}

@keyframes cc-petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    opacity: 0.85;
  }
  85% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translate(-180px, 340px) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cc-petal {
    display: none;
  }
}

.cc-shine {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    115deg,
    transparent 32%,
    rgb(255 150 200 / 0.12) 42%,
    rgb(160 200 255 / 0.12) 50%,
    rgb(255 236 160 / 0.1) 58%,
    transparent 68%
  );
  background-position: calc(50% - var(--tx, 0) * 120%) 0;
  background-size: 250% 100%;
  mix-blend-mode: screen;
  pointer-events: none;
}

.cc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cc-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cc-logo {
  width: 24px;
  height: 24px;
}

.cc-tier {
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.4);
  font-weight: 900;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.cc-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.cc-chip {
  position: relative;
  width: 46px;
  height: 34px;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(135deg, #fff1a8, #ffc83d 40%, #d9a12a 70%, #f5d77a);
  box-shadow: inset 0 0 0 1px rgb(112 57 2 / 0.35);
}

.cc-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      transparent 31%,
      rgb(112 57 2 / 0.35) 31% 34%,
      transparent 34% 66%,
      rgb(112 57 2 / 0.35) 66% 69%,
      transparent 69%
    ),
    linear-gradient(transparent 47%, rgb(112 57 2 / 0.35) 47% 53%, transparent 53%);
}

.cc-chip::after {
  content: '';
  position: absolute;
  inset: 9px 15px;
  border: 1px solid rgb(112 57 2 / 0.4);
  border-radius: 4px;
  background: linear-gradient(135deg, #ffe27a, #e0ae36);
}

.cc-contactless {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: rgb(255 255 255 / 0.75);
  stroke-width: 2;
  stroke-linecap: round;
}

.cc-balance {
  margin-top: auto;
}

.cc-label {
  display: block;
  margin: 0;
  color: #aab2c5;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cc-amount {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin: 2px 0 0;
  font-weight: 900;
  font-size: 2rem;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 4px rgb(0 0 0 / 0.35);
  overflow-wrap: anywhere;
}

.currency {
  margin-right: 4px;
  color: #ffc83d;
}

.refresh {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(255 194 0 / 0.14);
  color: #ffc83d;
  text-shadow: none;
  cursor: pointer;
  transition: background 0.15s;
}

.refresh:hover {
  background: rgb(255 194 0 / 0.24);
}

.refresh:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}

.refresh .pi {
  font-size: 0.75rem;
}

.refresh.spinning .pi {
  animation: refresh-spin 0.7s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.cc-foot {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-top: 20px;
}

.cc-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.cc-field.holder {
  flex: 0 1 auto;
}

.cc-value {
  overflow: hidden;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.cc-network {
  flex: 0 0 auto;
  margin: 0 -4px -4px auto;
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.4));
}

@container (max-width: 560px) {
  .credit-card {
    min-height: 220px;
    padding: 16px 18px 14px;
    border-radius: 14px;
  }

  .cc-chip-row {
    margin-top: 10px;
  }

  .cc-chip {
    width: 38px;
    height: 28px;
  }

  .cc-chip::after {
    inset: 7px 12px;
  }

  .cc-amount {
    font-size: 1.55rem;
  }

  .cc-foot {
    gap: 14px;
    margin-top: 14px;
  }
}

@container (max-width: 380px) {
  .credit-card {
    min-height: 250px;
    padding: 16px 18px 14px;
  }

  .cc-brand {
    font-size: 0.9rem;
    letter-spacing: 0.08em;
  }

  .cc-chip-row {
    margin: 12px 0 14px;
  }

  .cc-amount {
    font-size: 1.35rem;
  }

  .cc-foot {
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 16px;
  }

  .cc-network {
    zoom: 0.8;
  }

  .cc-field.holder {
    flex-basis: 100%;
  }

  .cc-foot .cc-label {
    white-space: nowrap;
  }
}
</style>
