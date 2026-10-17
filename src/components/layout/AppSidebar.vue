<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import LogoutDialog from '@/components/auth/LogoutDialog.vue'
import LegalDialog from '@/components/legal/LegalDialog.vue'
import type { LegalDoc } from '@/components/legal/legalContent'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { gameTabs } from '@/components/games/gameTabs'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import VipBadge from '@/components/vip/VipBadge.vue'
import vipIcon from '@/assets/icons/promos/vip.svg'
import defaultAvatar from '@/assets/images/avatar-default.png'

interface NavItem {
  label: string
  /** PrimeIcons class, or an image URL when img is set */
  icon: string
  img?: boolean
  /** Omitted for features that don't exist yet; clicking shows "Coming soon" */
  to?: string
  /** Opens a legal dialog instead of navigating */
  legal?: LegalDoc
}

const auth = useAuthStore()
const wallet = useWalletStore()
const toast = useToast()

// Saved player tag, else the masked phone: '+639171234567' -> '0917***4567'
const displayName = computed(() => {
  if (wallet.profile?.displayName) return wallet.profile.displayName
  const phone = auth.user?.phoneNumber
  if (!phone) return auth.user?.displayName || 'Player'
  const local = `0${phone.slice(3)}`
  return `${local.slice(0, 4)}***${local.slice(-4)}`
})

const vip = computed(() => wallet.vip)

const peso = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Refetches the balance from the server; the icon spins until it's back
async function refreshBalance() {
  if (!(await wallet.refreshBalance())) {
    toast.add({
      severity: 'error',
      summary: "Couldn't refresh balance",
      detail: 'Check your connection and try again.',
      life: 3000,
    })
  }
}

// Same tabs as the lobby's tab bar; "All" reads as "Lobby" here
const categories: NavItem[] = gameTabs.map((t) => ({
  label: t.value === 'all' ? 'Lobby' : t.label,
  icon: t.icon,
  img: true,
  to: t.to,
}))

const pages: NavItem[] = [
  // Engagement first, then the player's own things, then help and fine print
  { label: 'Promotions', icon: 'pi pi-gift', to: '/promotions' },
  { label: 'Wallet', icon: 'pi pi-wallet', to: '/wallet' },
  { label: 'Account', icon: 'pi pi-user', to: '/account' },
  { label: 'Support', icon: 'pi pi-question-circle' },
  { label: 'Terms & Conditions', icon: 'pi pi-file', legal: 'terms' },
  { label: 'Privacy Policy', icon: 'pi pi-shield', legal: 'privacy' },
]

const year = new Date().getFullYear()
const confirmLogout = ref(false)

const legalOpen = ref(false)
const legalDoc = ref<LegalDoc>('terms')

function openLegal(doc: LegalDoc) {
  legalDoc.value = doc
  legalOpen.value = true
}

function comingSoon(label: string) {
  toast.add({ severity: 'info', summary: label, detail: 'Coming soon', life: 2500 })
}
</script>

<template>
  <nav class="sidebar">
    <!-- Member card: profile, balance and VIP club in one panel. Signed out, the same card
         shows empty placeholders and every part links to login. -->
    <section class="member" :class="{ guest: !auth.isLoggedIn }">
      <SakuraIcon variant="pink" class="member-petal" aria-hidden="true" />

      <RouterLink :to="auth.isLoggedIn ? '/account' : '/login'" class="member-head">
        <!-- The avatar's ring fills up as the VIP progress meter -->
        <span class="ring" :style="{ '--progress': auth.isLoggedIn ? vip.progress : 0 }">
          <img :src="auth.user?.photoURL || defaultAvatar" alt="" class="ring-img" />
          <VipBadge
            :level="auth.isLoggedIn ? vip.current.level : 0"
            :size="22"
            plain
            class="ring-badge"
          />
        </span>
        <span class="member-info">
          <span class="member-name">{{ auth.isLoggedIn ? displayName : 'Guest' }}</span>
          <span class="member-sub">
            <span
              class="tier"
              :style="{
                '--tier-light': vip.current.rank.light,
                '--tier-dark': vip.current.rank.dark,
                '--tier-ink': vip.current.rank.ink,
              }"
            >
              VIP {{ auth.isLoggedIn ? vip.current.level : '—' }}
            </span>
            <span v-if="!auth.isLoggedIn" class="member-pct">—</span>
            <span v-else-if="vip.next" class="member-pct"
              >{{ (vip.progress * 100).toFixed(2) }}%</span
            >
            <span v-else class="member-max">MAX</span>
          </span>
        </span>
        <i class="pi pi-angle-right member-arrow" aria-hidden="true" />
      </RouterLink>

      <div class="member-wallet">
        <RouterLink :to="auth.isLoggedIn ? '/wallet' : '/login'" class="wallet-main">
          <span class="wallet-label">Balance</span>
          <span class="wallet-amount">
            <SakuraIcon variant="gold" symbol="₱" class="wallet-coin" />
            <span class="wallet-value">{{
              auth.isLoggedIn ? peso.format(wallet.displayBalance) : '—'
            }}</span>
          </span>
        </RouterLink>
        <button
          v-if="auth.isLoggedIn"
          type="button"
          class="refresh"
          :class="{ spinning: wallet.refreshing }"
          aria-label="Refresh balance"
          @click="refreshBalance"
        >
          <i class="pi pi-sync" aria-hidden="true" />
        </button>
      </div>

      <RouterLink :to="auth.isLoggedIn ? '/vip' : '/login'" class="member-vip">
        <img :src="vipIcon" alt="" class="vip-chip" />
        <span class="vip-text">
          <span class="vip-title">VIP Club</span>
          <span class="vip-sub">{{
            !auth.isLoggedIn
              ? 'Sign in to join'
              : vip.next
                ? `Next: VIP ${vip.next.level}`
                : 'Top level reached'
          }}</span>
        </span>
        <i class="pi pi-angle-right" aria-hidden="true" />
      </RouterLink>
    </section>

    <!-- Game categories -->
    <h3 class="section-title">Games</h3>
    <div class="list">
      <template v-for="item in categories" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to" class="item" exact-active-class="active">
          <img v-if="item.img" :src="item.icon" alt="" class="item-img" />
          <i v-else :class="item.icon" /> {{ item.label }}
        </RouterLink>
        <button v-else type="button" class="item" @click="comingSoon(item.label)">
          <img v-if="item.img" :src="item.icon" alt="" class="item-img" />
          <i v-else :class="item.icon" /> {{ item.label }}
        </button>
      </template>
    </div>

    <!-- Pages -->
    <h3 class="section-title">Menu</h3>
    <div class="list">
      <template v-for="item in pages" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to" class="item" exact-active-class="active">
          <i :class="item.icon" /> {{ item.label }}
        </RouterLink>
        <button
          v-else
          type="button"
          class="item"
          @click="item.legal ? openLegal(item.legal) : comingSoon(item.label)"
        >
          <i :class="item.icon" /> {{ item.label }}
        </button>
      </template>
    </div>

    <button v-if="auth.isLoggedIn" type="button" class="logout" @click="confirmLogout = true">
      <!-- Door frame with an arrow stepping out -->
      <svg class="logout-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.5 4H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H11.5" />
        <path d="M15 8l4 4-4 4M19 12H9.5" />
      </svg>
      <span class="logout-label">Log out</span>
    </button>

    <footer class="fineprint">
      <p class="rg">
        <!-- Age-restriction sign: red-bordered 21+ plate (PAGCOR minimum age) -->
        <svg class="age" viewBox="0 0 32 20" role="img" aria-label="21+">
          <rect x="1.1" y="1.1" width="29.8" height="17.8" rx="4" class="age-ring" />
          <!-- Baseline at 10 + half of Montserrat's cap height (~0.7em of 10px) -->
          <text x="16" y="13.5" class="age-text">21+</text>
        </svg>
        Play responsibly.
      </p>
      <p>Gambling can be addictive.</p>
      <p class="copyright">© {{ year }} Sakura. All rights reserved.</p>
    </footer>

    <LogoutDialog v-model:visible="confirmLogout" />
    <LegalDialog v-model:visible="legalOpen" :doc="legalDoc" />
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  font-family: 'Montserrat', sans-serif;
}

/* Member card: one panel for profile, balance and the VIP club. A faint sakura glows in
   the corner, and the avatar's ring doubles as the VIP progress meter. */
.member {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgb(255 92 154 / 0.16), transparent 55%), var(--app-panel);
}

/* Light mode: white card lifted by a soft shadow, with a blush wash from the blossom corner
   (grey panels read as "disabled" on the white sidebar) */
:root:not(.app-dark) .member {
  border-color: rgb(27 37 80 / 0.07);
  background: radial-gradient(130% 90% at 100% 0%, #ffe9f1, #fff4f8 35%, transparent 65%), #fff;
  box-shadow: 0 4px 14px rgb(27 37 80 / 0.08);
}

:root:not(.app-dark) .ring-img {
  border-color: #fff;
}

:root:not(.app-dark) .member-wallet {
  border-top-color: rgb(214 51 108 / 0.2);
}

.member-petal {
  position: absolute;
  top: -22px;
  right: -22px;
  width: 92px;
  height: 92px;
  opacity: 0.14;
  transform: rotate(18deg);
  pointer-events: none;
}

.member-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 12px;
  color: var(--app-text);
  text-decoration: none;
}

.member-head:hover .member-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* Gold arc = progress to the next VIP level, over a faint track */
.ring {
  position: relative;
  flex: 0 0 auto;
  width: 50px;
  height: 50px;
  padding: 3px;
  border-radius: 50%;
  background: conic-gradient(#ffc200 calc(var(--progress) * 1turn), rgb(128 140 175 / 0.3) 0);
}

.ring-img {
  display: block;
  width: 100%;
  height: 100%;
  border: 2px solid var(--app-panel);
  border-radius: 50%;
  background: #2a1a08;
  object-fit: cover;
}

.ring-badge {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.5));
}

.member-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.member-name {
  overflow: hidden;
  font-weight: 800;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-sub {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Tier pill in the VIP rank's colors (set inline from src/vip/levels.ts) */
.tier {
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(var(--tier-light), var(--tier-dark));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.5),
    0 1px 0 rgb(0 0 0 / 0.25);
  color: var(--tier-ink);
  font-weight: 900;
  font-size: 0.56rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.member-pct {
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.62rem;
}

/* Signed out: same card, emptied. A single em dash in muted grey for each value, and the coin and
   VIP chip drained of color until there's a player behind them. */
.guest .wallet-value {
  color: var(--app-muted);
}

.guest .wallet-coin,
.guest .ring-badge {
  filter: grayscale(1) opacity(0.6);
}

/* Top level: a small gold tag in place of the percentage */
.member-max {
  color: var(--app-gold-text);
  font-weight: 900;
  font-size: 0.6rem;
  letter-spacing: 0.12em;
}

.member-arrow {
  color: var(--app-muted);
  font-size: 0.75rem;
  opacity: 0.7;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

/* Balance row, split from the profile by a ticket-style dashed line */
.member-wallet {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 12px;
  padding: 10px 0 12px;
  border-top: 1px dashed rgb(128 140 175 / 0.35);
}

.wallet-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  text-decoration: none;
}

.wallet-label {
  color: var(--app-muted);
  font-weight: 800;
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wallet-amount {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.wallet-coin {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.3));
}

.wallet-value {
  overflow: hidden;
  color: var(--app-gold-text);
  font-weight: 800;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.refresh:hover {
  background: rgb(128 140 175 / 0.12);
  color: var(--app-gold-text);
}

.refresh .pi {
  font-size: 0.85rem;
  -webkit-text-stroke: 0.6px currentColor;
}

.refresh.spinning .pi {
  animation: refresh-spin 0.7s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

/* VIP club footer: the warm red strip closes the card instead of a separate button */
.member-vip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  /* Faint tilted sakura chips over the red gradient */
  --pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='112' height='44'%3E%3Cdefs%3E%3Cg id='c'%3E%3Ccircle r='12.5' fill='none' stroke='%23fff' stroke-width='1.2'/%3E%3Ccircle r='10.5' fill='none' stroke='%23fff' stroke-width='3.6' stroke-dasharray='4.12 4.12'/%3E%3Ccircle r='7.6' fill='none' stroke='%23fff' stroke-width='1.2'/%3E%3Cellipse cy='-2.9' rx='1.9' ry='2.9' fill='%23fff' transform='rotate(0)'/%3E%3Cellipse cy='-2.9' rx='1.9' ry='2.9' fill='%23fff' transform='rotate(72)'/%3E%3Cellipse cy='-2.9' rx='1.9' ry='2.9' fill='%23fff' transform='rotate(144)'/%3E%3Cellipse cy='-2.9' rx='1.9' ry='2.9' fill='%23fff' transform='rotate(216)'/%3E%3Cellipse cy='-2.9' rx='1.9' ry='2.9' fill='%23fff' transform='rotate(288)'/%3E%3C/g%3E%3C/defs%3E%3Cg opacity='.1'%3E%3Cuse href='%23c' xlink:href='%23c' transform='translate(18 10) rotate(-16) scale(1.15)'/%3E%3Cuse href='%23c' transform='translate(62 34) rotate(18) scale(.8)' xlink:href='%23c'/%3E%3Cuse href='%23c' xlink:href='%23c' transform='translate(96 12) rotate(-6) scale(.6)'/%3E%3C/g%3E%3C/svg%3E");
  background:
    var(--pattern) 0 0 / 112px 44px,
    linear-gradient(100deg, #f2652e, #c4221a 55%, #8e1210);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3);
  color: #fff;
  text-decoration: none;
}

.vip-chip {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.4));
  transition: transform 0.3s ease;
}

.member-vip:hover .vip-chip {
  transform: rotate(-20deg) scale(1.08);
}

.vip-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.vip-title {
  font-weight: 900;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.35);
}

.vip-sub {
  font-weight: 600;
  font-size: 0.62rem;
  opacity: 0.85;
}

.member-vip .pi {
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.member-vip:hover .pi {
  transform: translateX(2px);
}

/* Link lists */
/* Section header: small label with a line running out to the right */
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 -4px;
  padding: 0 4px;
  color: var(--app-muted);
  font-weight: 800;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Same blue-grey as the label, faded, so it shows on both the navy and white sidebar */
.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgb(128 140 175 / 0.35);
}

/* Link lists: no box, items sit straight on the sidebar */
.list {
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--app-text);
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.item-img {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.4));
}

.item .pi {
  width: 18px;
  font-size: 1rem;
  color: var(--app-muted);
  text-align: center;
}

/* Grey-blue tint shows on both the dark and light panels */
.item:hover {
  background: rgb(128 140 175 / 0.12);
}

/* --app-gold-text darkens in light mode so the label stays readable */
.item.active {
  background: var(--app-gold-tint);
  color: var(--app-gold-text);
}

.item.active .pi {
  color: var(--app-gold-text);
}

/* TRY: light mode uses sakura pink for the selected item */
:root:not(.app-dark) .item.active {
  background: #ffe3ee;
}

:root:not(.app-dark) .item.active,
:root:not(.app-dark) .item.active .pi {
  color: #c2185b;
}

/* Logout: a neutral outlined button in the sidebar's blue-grey. Secondary, so no fill;
   it stays neutral on hover too. */
.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 4px;
  padding: 9px;
  border: 1px solid rgb(128 140 175 / 0.35);
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s,
    transform 0.1s;
}

.logout-icon {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.logout-icon path {
  transition: transform 0.2s ease;
}

/* The door icon has empty space on its left, so pull it in to center the icon + label pair */
.logout-icon {
  margin-left: -2px;
}

/* Hover stays in the blue-grey family: a soft fill like the menu items, firmer border */
.logout:hover {
  border-color: rgb(128 140 175 / 0.6);
  background: rgb(128 140 175 / 0.14);
}

/* The arrow nudges out the door on hover */
.logout:hover .logout-icon path:last-child {
  transform: translateX(2px);
}

.logout:active {
  transform: translateY(1px);
}

.logout:focus-visible {
  outline: 2px solid rgb(128 140 175 / 0.6);
  outline-offset: 2px;
}

/* Responsible-gaming note + copyright */
/* Set apart from the button above by a hairline divider */
.fineprint {
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
  color: var(--app-text);
  font-weight: 500;
  font-size: 0.78rem;
  line-height: 1.5;
  text-align: center;
}

.fineprint p {
  margin: 0;
}

.fineprint .rg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 800;
}

.fineprint .copyright {
  margin-top: 12px;
  color: var(--app-muted);
  font-size: 0.72rem;
}

.age {
  flex: 0 0 auto;
  width: 32px;
  height: 20px;
}

.age-ring {
  fill: rgb(229 72 77 / 0.12);
  /* Vivid red border so the sign pops on the dark navy */
  stroke: #ff2d2d;
  stroke-width: 2.4;
}

.age-text {
  fill: currentColor;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 10px;
  letter-spacing: -0.2px;
  text-anchor: middle;
}
</style>
