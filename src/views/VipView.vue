<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import VipBadge from '@/components/vip/VipBadge.vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useDragScroll } from '@/composables/useDragScroll'
import { LEVELS_PER_RANK, MAX_VIP_LEVEL, chipFor, vipLevels, vipRanks } from '@/constants/vip'

const auth = useAuthStore()
const wallet = useWalletStore()

const peso = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 })

const status = computed(() => wallet.vip)
const level = computed(() => (auth.isLoggedIn ? status.value.current.level : 0))
const totals = computed(() => ({
  deposit: wallet.profile?.totalDeposit ?? 0,
  bet: wallet.profile?.totalBet ?? 0,
}))

const rankOf = (lvl: number) => Math.max(0, Math.ceil(lvl / LEVELS_PER_RANK) - 1)
const activeRank = ref(rankOf(Math.min(level.value + 1, MAX_VIP_LEVEL)))
watch(level, (lvl) => (activeRank.value = rankOf(Math.min(lvl + 1, MAX_VIP_LEVEL))))

const shownLevels = computed(() =>
  vipLevels.slice(
    activeRank.value * LEVELS_PER_RANK + 1,
    (activeRank.value + 1) * LEVELS_PER_RANK + 1,
  ),
)

const shownRank = computed(() => vipRanks[activeRank.value]!)
const rankRange = (i: number) => `${i * LEVELS_PER_RANK + 1}–${(i + 1) * LEVELS_PER_RANK}`
const heroRankName = computed(() =>
  level.value >= MAX_VIP_LEVEL ? 'Golden Sakura' : status.value.current.rank.name,
)

const heroChip = computed(() => chipFor(level.value))

const ranksEl = ref<HTMLElement>()
useDragScroll(() => ranksEl.value)

const pct = (p: number) => `${(p * 100).toFixed(2)}%`
</script>

<template>
  <section class="vip">
    <h1 class="page-title">VIP Club</h1>

    <div class="hero">
      <div class="hero-head">
        <VipBadge :level="level" :size="84" />
        <div>
          <p class="eyebrow">{{ auth.isLoggedIn ? 'Your level' : 'Every player starts at' }}</p>
          <p class="hero-level">VIP {{ level }}</p>
          <p
            class="hero-rank"
            :style="{ '--rank-light': status.current.rank.light, '--rank-deep': heroChip.face[2] }"
          >
            {{ heroRankName }}
          </p>
        </div>
      </div>

      <div v-if="!auth.isLoggedIn" class="hero-body">
        <p class="lead">
          Level up all the way to VIP {{ MAX_VIP_LEVEL }} by depositing and playing. Log in to track
          your progress.
        </p>
        <Button
          :as="RouterLink"
          :to="{ name: 'login', query: { redirect: '/vip' } }"
          label="Login or Register"
          class="gold-btn"
        />
      </div>

      <div v-else-if="status.next" class="hero-body">
        <p class="lead">
          Reach <strong>both</strong> targets to unlock <strong>VIP {{ status.next.level }}</strong>
        </p>
        <div class="meter">
          <div class="meter-row">
            <span>Total deposit</span>
            <span
              >₱{{ peso.format(totals.deposit) }}
              <small>/ ₱{{ peso.format(status.next.minDeposit) }}</small></span
            >
          </div>
          <div class="bar">
            <span
              :class="{ done: status.depositProgress >= 1 }"
              :style="{ width: pct(status.depositProgress) }"
            />
          </div>
        </div>
        <div class="meter">
          <div class="meter-row">
            <span>Total bet</span>
            <span
              >₱{{ peso.format(totals.bet) }}
              <small>/ ₱{{ peso.format(status.next.minBet) }}</small></span
            >
          </div>
          <div class="bar">
            <span
              :class="{ done: status.betProgress >= 1 }"
              :style="{ width: pct(status.betProgress) }"
            />
          </div>
        </div>
      </div>

      <div v-else class="hero-body">
        <p class="lead">You've reached the highest VIP level. Thanks for playing with us!</p>
      </div>
    </div>

    <h2 class="section-title">VIP Levels</h2>
    <p class="section-note">
      Your level goes up once your lifetime total deposit and total bet both reach its minimums.
    </p>

    <div ref="ranksEl" class="ranks" role="tablist">
      <button
        v-for="(rank, i) in vipRanks"
        :key="rank.name"
        type="button"
        role="tab"
        class="rank-tab"
        :class="{ active: activeRank === i }"
        :aria-selected="activeRank === i"
        :style="{ '--rank': rank.light }"
        @click="activeRank = i"
      >
        <VipBadge :level="(i + 1) * LEVELS_PER_RANK" :size="30" plain />
        <span class="rank-tab-text">
          {{ rank.name }}
          <small>VIP {{ rankRange(i) }}</small>
        </span>
      </button>
    </div>

    <div
      class="rank-banner"
      :style="{ '--rank': shownRank.light, '--rank-dark': shownRank.chip.face[2] }"
    >
      <VipBadge
        :level="(activeRank + 1) * LEVELS_PER_RANK"
        :size="40"
        plain
        class="rank-banner-badge"
      />
      <p class="rank-banner-name">{{ shownRank.name }}</p>
      <p class="rank-banner-line">
        Deposit ₱{{ compact.format(shownLevels[0]!.minDeposit) }} – ₱{{
          compact.format(shownLevels.at(-1)!.minDeposit)
        }}
        · Bet ₱{{ compact.format(shownLevels[0]!.minBet) }} – ₱{{
          compact.format(shownLevels.at(-1)!.minBet)
        }}
      </p>
      <span class="rank-banner-range">VIP {{ rankRange(activeRank) }}</span>
    </div>

    <ul class="levels" :style="{ '--rank-dark': shownRank.chip.face[2] }">
      <li
        v-for="l in shownLevels"
        :key="l.level"
        class="level"
        :class="{
          reached: auth.isLoggedIn && l.level < level,
          current: auth.isLoggedIn && l.level === level,
          apex: l.level === MAX_VIP_LEVEL,
        }"
      >
        <span
          v-if="auth.isLoggedIn && l.level < level"
          class="cleared"
          title="Completed"
          aria-label="Completed"
        >
          <SakuraIcon variant="gold" class="cleared-icon" />
        </span>
        <span v-else-if="auth.isLoggedIn && l.level === level" class="you">You</span>
        <span class="level-art">
          <VipBadge :level="l.level" :size="68" />
        </span>
        <p class="level-name">VIP {{ l.level }}</p>
        <p v-if="l.level === MAX_VIP_LEVEL" class="level-title">Golden Sakura</p>
        <dl class="reqs">
          <div>
            <dt>Deposit</dt>
            <dd>₱{{ compact.format(l.minDeposit) }}</dd>
          </div>
          <div>
            <dt>Bet</dt>
            <dd>₱{{ compact.format(l.minBet) }}</dd>
          </div>
        </dl>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.vip {
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
  grid-template-columns: auto 1fr;
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
}

.eyebrow {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.75rem;
}

.hero-level {
  margin: 2px 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.8rem;
}

.hero-rank {
  margin: 0;
  color: var(--rank-light);
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
:root:not(.app-dark) .hero-rank {
  color: var(--rank-deep);
}

.hero-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.hero-body a {
  align-self: flex-start;
  text-decoration: none;
}

.lead {
  margin: 0;
  color: var(--app-text);
  font-size: 0.9rem;
}

.lead strong {
  color: #ffc200;
}

:root:not(.app-dark) .lead strong {
  color: #e0457f;
}

.meter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meter-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
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

.bar span {
  display: block;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #ffe27a, #ffb800);
  transition: width 0.4s ease;
}

.bar span.done {
  background: linear-gradient(90deg, #4ade80, #16a34a);
}

.gold-btn {
  padding: 8px 18px;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  margin-bottom: 5px;
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

.section-title {
  margin: 28px 0 4px;
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

.ranks {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  overflow-x: auto;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}

.ranks.dragging,
.ranks.dragging .rank-tab {
  cursor: grabbing;
  scroll-behavior: auto;
}

.rank-tab {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  font: inherit;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
}

.rank-tab-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.rank-tab small {
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.62rem;
}

.rank-tab:not(.active) .badge {
  opacity: 0.55;
  filter: saturate(0.5);
}

.rank-tab:hover {
  border-color: var(--app-border);
}

.rank-tab.active {
  border-color: var(--rank);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rank) 25%, transparent);
  color: var(--rank);
}

:root:not(.app-dark) .rank-tab.active {
  color: var(--app-text);
}

.rank-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 14px;
  margin-bottom: 12px;
  padding: 12px 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
}

.rank-banner-badge {
  grid-row: 1 / span 2;
}

.rank-banner-name {
  grid-column: 2;
  align-self: end;
  margin: 0;
  color: var(--rank);
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

:root:not(.app-dark) .rank-banner {
  box-shadow: 0 4px 14px rgb(27 37 80 / 0.06);
}

:root:not(.app-dark) .rank-banner-name {
  color: var(--rank-dark);
}

.rank-banner-line {
  grid-row: 2;
  grid-column: 2;
  align-self: start;
  margin: 0;
  color: var(--app-muted);
  font-size: 0.75rem;
}

.rank-banner-range {
  grid-row: 1 / span 2;
  grid-column: 3;
  color: var(--app-muted);
  font-weight: 800;
  font-size: 0.72rem;
}

.levels {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.level {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px 12px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background:
    radial-gradient(
      90% 60% at 50% 0%,
      color-mix(in srgb, var(--rank-dark) 28%, transparent),
      transparent 70%
    ),
    var(--app-surface);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.level:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--rank-dark) 60%, transparent);
}

.level-art {
  display: grid;
  place-items: center;
  padding: 4px 0 2px;
  transition: transform 0.25s ease;
}

.level:hover .level-art {
  transform: scale(1.06) rotate(-6deg);
}

.level.reached .level-art,
.level.reached .level-name {
  opacity: 0.6;
}

.level.current {
  border-color: #ffc200;
  box-shadow:
    0 0 0 1px #ffc200,
    0 0 18px rgb(255 194 0 / 0.25);
}

:root:not(.app-dark) .level.current:not(.apex) {
  border-color: #ff5c9a;
  box-shadow:
    0 0 0 1px #ff5c9a,
    0 0 18px rgb(255 92 154 / 0.25);
}

.level.apex {
  border-color: #ffc83d;
  background:
    radial-gradient(90% 70% at 50% 0%, rgb(255 200 61 / 0.3), transparent 70%), var(--app-surface);
  box-shadow: 0 0 22px rgb(255 194 0 / 0.2);
}

.level-title {
  margin: -4px 0 0;
  color: var(--app-gold-text, #ffc200);
  font-weight: 800;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.you {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #ffc200;
  color: #703902;
  font-weight: 900;
  font-size: 0.56rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:root:not(.app-dark) .you {
  background: linear-gradient(#ff7aae, #e0457f);
  color: #fff;
}

.cleared {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #26305a, #0c1122);
  box-shadow:
    inset 0 0 0 1.5px #ffc83d,
    0 1px 3px rgb(0 0 0 / 0.4),
    0 0 10px rgb(255 194 0 / 0.3);
  animation: cleared-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.cleared-icon {
  width: 14px;
  height: 14px;
}

@keyframes cleared-pop {
  from {
    transform: scale(0) rotate(-90deg);
  }
  to {
    transform: scale(1) rotate(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cleared {
    animation: none;
  }
}

.level-name {
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 0.9rem;
}

.reqs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--app-border);
}

.reqs div {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
}

.reqs dt {
  color: var(--app-muted);
}

.reqs dd {
  margin: 0;
  color: var(--app-text);
  font-weight: 700;
}

@container (max-width: 700px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 18px;
  }
}

@container (max-width: 720px) {
  .levels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .level {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      'art name'
      'art title'
      'art reqs';
    align-content: center;
    gap: 0 16px;
    padding: 12px 16px;
    background:
      radial-gradient(
        60% 120% at 0% 50%,
        color-mix(in srgb, var(--rank-dark) 28%, transparent),
        transparent 70%
      ),
      var(--app-surface);
  }

  .level.apex {
    background:
      radial-gradient(60% 120% at 0% 50%, rgb(255 200 61 / 0.3), transparent 70%),
      var(--app-surface);
  }

  .level-art {
    grid-area: art;
  }

  .level-name {
    grid-area: name;
  }

  .level-title {
    grid-area: title;
    margin: 0;
  }

  .reqs {
    grid-area: reqs;
    margin-top: 6px;
  }

  .level:has(.cleared, .you) .level-name {
    padding-right: 40px;
  }
}

@container (max-width: 460px) {
  .level {
    display: flex;
    gap: 6px;
    padding: 14px 10px 12px;
    background:
      radial-gradient(
        90% 60% at 50% 0%,
        color-mix(in srgb, var(--rank-dark) 28%, transparent),
        transparent 70%
      ),
      var(--app-surface);
  }

  .level.apex {
    background:
      radial-gradient(90% 70% at 50% 0%, rgb(255 200 61 / 0.3), transparent 70%), var(--app-surface);
  }

  .level:has(.cleared, .you) .level-name {
    padding-right: 0;
  }

  .reqs {
    margin-top: 0;
  }
}
</style>
