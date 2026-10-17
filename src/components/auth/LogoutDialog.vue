<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { auth as firebaseAuth } from '@/firebase'
import { useTheme } from '@/composables/useTheme'
import logoUrl from '@/assets/images/logo-sakura.png'

const { isDark } = useTheme()

const visible = defineModel<boolean>('visible', { required: true })

const router = useRouter()
const toast = useToast()
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await signOut(firebaseAuth)
    visible.value = false
    router.push('/')
  } catch {
    toast.add({ severity: 'error', summary: 'Could not log out. Please try again.', life: 3000 })
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    class="sakura-logout"
  >
    <!-- Same scenery as the login modal's banner, fading into the dialog -->
    <div class="logout-banner">
      <img src="/hero/sweet-bonanza-1000.webp" alt="" class="logout-banner-bg" />
      <img v-if="isDark" :src="logoUrl" alt="Sakura" class="logout-banner-logo" />
      <!-- Light mode: same logo used as a stencil, filled navy (like the header) -->
      <!-- Wrapper carries the shadow: a filter on the masked element itself would be masked away -->
      <span v-else role="img" aria-label="Sakura" class="logout-banner-logo logout-banner-logo-dark">
        <span class="logo-stencil" :style="{ '--logo-url': `url(${logoUrl})` }" />
      </span>
    </div>

    <div class="logout-body">
      <!-- Same door + arrow as the sidebar's Logout button; the arrow keeps pushing out the door -->
      <span class="logout-icon" aria-hidden="true">
        <!-- viewBox shifted 1 unit: the drawing spans ~1.7–20.3, so this centers it -->
        <svg viewBox="-1 0 24 24">
          <path d="M11.5 4H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H11.5" />
          <path class="logout-arrow" d="M15 8l4 4-4 4M19 12H9.5" />
        </svg>
      </span>
      <h2>Log out?</h2>
      <p>You'll need to sign in again to play. Your balance stays safe in your account.</p>
    </div>

    <div class="logout-actions">
      <Button
        label="Cancel"
        class="logout-cancel"
        :disabled="loggingOut"
        autofocus
        @click="visible = false"
      />
      <Button label="Log out" class="logout-confirm" :loading="loggingOut" @click="logout" />
    </div>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
.p-dialog.sakura-logout {
  width: min(400px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
}

.sakura-logout .p-dialog-content {
  padding: 0 24px 24px;
  overflow: visible;
}

.sakura-logout .logout-banner {
  position: relative;
  display: grid;
  place-items: center;
  height: 130px;
  margin: 0 -24px;
}

.sakura-logout .logout-banner-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Fade the scenery into the dialog's navy */
.sakura-logout .logout-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 35%, var(--app-navbar));
}

.sakura-logout .logout-banner-logo {
  position: relative;
  z-index: 1;
  width: 62%;
  margin-top: -18px;
  filter: drop-shadow(0 3px 6px rgb(40 0 60 / 0.6));
}

/* logo-sakura.png is 1686 x 280. A crisp white edge plus a soft navy shadow sets it
   cleanly on the scenery (a wide white glow looked like haze). */
.sakura-logout .logout-banner-logo-dark {
  display: block;
  aspect-ratio: 1686 / 280;
  filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)
    drop-shadow(0 3px 4px rgb(27 37 80 / 0.35));
}

.sakura-logout .logo-stencil {
  display: block;
  width: 100%;
  height: 100%;
  background: #1b2550;
  mask: var(--logo-url) center / contain no-repeat;
}

/* Light mode: start the fade to white lower, so the scenery behind the logo keeps its color */
:root:not(.app-dark) .sakura-logout .logout-banner::after {
  background: linear-gradient(transparent 60%, var(--app-navbar));
}

.sakura-logout .logout-body {
  position: relative;
  z-index: 1;
  text-align: center;
}

/* Badge sits on the seam between the banner and the body */
.sakura-logout .logout-icon {
  display: inline-grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin: -34px 0 12px;
  border: 3px solid var(--app-navbar);
  border-radius: 50%;
  background: linear-gradient(#fff1a8, #ffc200 55%, #d9871f);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.4);
  color: #703902;
}

/* Light mode: the navbar-colored rim turns into a stark white ring, so use a thin amber
   edge instead (same 60px size, the border space becomes part of the badge) */
:root:not(.app-dark) .sakura-logout .logout-icon {
  border-color: transparent;
  background:
    linear-gradient(#fff1a8, #ffc200 55%, #d9871f) border-box;
  box-shadow:
    0 0 0 2px #d9871f,
    0 6px 14px rgb(27 37 80 / 0.25);
}

.sakura-logout .logout-icon svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Only the arrow moves: out to the right, springs back with a small rebound, rests, repeats */
.sakura-logout .logout-arrow {
  animation: logout-arrow-push 2.4s ease-in-out infinite;
}

@keyframes logout-arrow-push {
  0%,
  45%,
  100% {
    transform: translateX(0);
  }
  18% {
    transform: translateX(2.5px);
  }
  32% {
    transform: translateX(-0.6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-logout .logout-arrow {
    animation: none;
  }
}

.sakura-logout h2 {
  margin: 0 0 8px;
  color: var(--app-text);
  font-weight: 800;
  font-size: 1.2rem;
}

.sakura-logout p {
  margin: 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.85rem;
  line-height: 1.5;
}

.sakura-logout .logout-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}

.sakura-logout .logout-actions .p-button {
  padding: 11px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.sakura-logout .logout-actions .p-button-label {
  font-weight: 900;
}

/* Both buttons share the sidebar Logout's 3D style: glossy gradient, top highlight and a
   darker bottom edge. Log out wears the logo's color; Cancel is the same button in a
   quieter neutral tone. */
.sakura-logout .logout-actions .p-button {
  margin-bottom: 4px;
  border: none;
  transition:
    filter 0.2s,
    transform 0.1s;
}

.sakura-logout .logout-actions .p-button:not(:disabled):hover {
  border: none;
  filter: brightness(1.06);
}

/* PrimeVue's own pressed state paints the primary (amber) background and border;
   each button's colors are restated for :active below */
.sakura-logout .logout-actions .p-button:not(:disabled):active {
  border: none;
  transform: translateY(2px);
}

/* Dark mode */
.app-dark .sakura-logout .logout-confirm,
.app-dark .sakura-logout .logout-confirm:not(:disabled):hover,
.app-dark .sakura-logout .logout-confirm:not(:disabled):active {
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

.app-dark .sakura-logout .logout-cancel,
.app-dark .sakura-logout .logout-cancel:not(:disabled):hover,
.app-dark .sakura-logout .logout-cancel:not(:disabled):active {
  background: linear-gradient(#323c6e, #232a55 55%, #1a2046);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.12),
    0 4px 0 #0f1430;
  color: #dbe3fc;
}

/* Light mode */
:root:not(.app-dark) .sakura-logout .logout-confirm,
:root:not(.app-dark) .sakura-logout .logout-confirm:not(:disabled):hover,
:root:not(.app-dark) .sakura-logout .logout-confirm:not(:disabled):active {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 4px 0 #0b1029;
  color: #ffffff;
}

:root:not(.app-dark) .sakura-logout .logout-cancel {
  /* Lavender, mirroring dark mode (there Log out is lavender and Cancel is the dark one) */
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

/* Brightening would wash the pale top into the white dialog, so hover deepens instead */
:root:not(.app-dark) .sakura-logout .logout-cancel:not(:disabled):hover,
:root:not(.app-dark) .sakura-logout .logout-cancel:not(:disabled):active {
  filter: none;
  background: linear-gradient(#e6ecff, #ccd6fb 55%, #aab9f0);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

/* Pressed: the bottom edge shrinks as the face moves down */
.app-dark .sakura-logout .logout-confirm:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}

.app-dark .sakura-logout .logout-cancel:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.12),
    0 2px 0 #0f1430;
}

:root:not(.app-dark) .sakura-logout .logout-confirm:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 2px 0 #0b1029;
}

:root:not(.app-dark) .sakura-logout .logout-cancel:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}
</style>
