<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PromoBanner from '@/components/promotions/PromoBanner.vue'
import { promotions, type Promotion } from '@/data/promotions'

const router = useRouter()

const selected = ref<Promotion>()
const dialogOpen = ref(false)

function openInfo(promo: Promotion) {
  selected.value = promo
  dialogOpen.value = true
}

function goTo(to: string) {
  dialogOpen.value = false
  router.push(to)
}
</script>

<template>
  <section class="promotions">
    <h1 class="page-title">Promotions</h1>

    <div class="grid">
      <article v-for="promo in promotions" :key="promo.id" class="card">
        <button
          type="button"
          class="banner-btn"
          :aria-label="`${promo.title}: more info`"
          @click="openInfo(promo)"
        >
          <PromoBanner :promo="promo" />
        </button>
        <div class="card-foot">
          <div>
            <h2>{{ promo.title }}</h2>
            <p>{{ promo.summary }}</p>
          </div>
          <Button label="More info" class="promo-btn" @click="openInfo(promo)" />
        </div>
      </article>
    </div>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      dismissable-mask
      :show-header="false"
      :draggable="false"
      class="sakura-promo"
    >
      <template v-if="selected">
        <div class="promo-banner">
          <PromoBanner :promo="selected" />
          <button type="button" class="promo-close" aria-label="Close" @click="dialogOpen = false">
            <i class="pi pi-times" />
          </button>
        </div>

        <div class="promo-body">
          <h2>{{ selected.title }}</h2>
          <p class="promo-summary">{{ selected.summary }}</p>

          <h3>How it works</h3>
          <ol class="promo-steps">
            <li v-for="step in selected.steps" :key="step">{{ step }}</li>
          </ol>

          <h3>Terms</h3>
          <ul class="promo-terms">
            <li v-for="term in selected.terms" :key="term">{{ term }}</li>
          </ul>
        </div>

        <Button :label="selected.cta.label" class="promo-cta" @click="goTo(selected.cta.to)" />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.promotions {
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

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
}

.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  transition: transform 0.2s ease;
}

:root:not(.app-dark) .card {
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.06);
}

.card:hover {
  transform: translateY(-3px);
}

.banner-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.banner-btn :deep(.banner) {
  border-radius: 0;
}

.banner-btn:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: -3px;
}

.card-foot {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px 16px;
}

.card-foot h2 {
  margin: 0 0 4px;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.95rem;
}

.card-foot p {
  margin: 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1.45;
}

.promo-btn {
  flex: 0 0 auto;
  margin-bottom: 5px;
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  color: #1b2550;
  font-family: inherit;
  font-size: 0.75rem;
}

.promo-btn :deep(.p-button-label) {
  font-weight: 900;
}

.promo-btn:not(:disabled):hover {
  border: none;
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
  color: #1b2550;
}

.promo-btn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}

:root:not(.app-dark) .promo-btn {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 5px 0 #0b1029;
  color: #ffffff;
}

:root:not(.app-dark) .promo-btn:not(:disabled):hover {
  background: linear-gradient(#3d4b9a, #222d60 55%, #161f47);
  color: #ffffff;
}

:root:not(.app-dark) .promo-btn:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 2px 0 #0b1029;
}
</style>

<style>
.p-dialog.sakura-promo {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
}

.sakura-promo .p-dialog-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 0 20px;
  overflow: hidden;
}

.sakura-promo .promo-banner {
  position: relative;
  flex: 0 0 auto;
}

.sakura-promo .promo-banner .banner {
  border-radius: 0;
}

.sakura-promo .promo-close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.55);
  color: #fff;
  cursor: pointer;
}

.sakura-promo .promo-close .pi {
  font-size: 0.75rem;
  font-weight: 900;
}

.sakura-promo .promo-body {
  flex: 1;
  min-height: 0;
  padding: 18px 20px 4px;
  overflow-y: auto;
  color: var(--app-text);
  font-size: 0.85rem;
  line-height: 1.55;
}

.sakura-promo .promo-body h2 {
  margin: 0 0 6px;
  color: var(--app-gold-text);
  font-weight: 800;
  font-size: 1.1rem;
}

.sakura-promo .promo-summary {
  margin: 0;
  color: var(--app-muted);
}

.sakura-promo .promo-body h3 {
  margin: 18px 0 6px;
  font-weight: 700;
  font-size: 0.9rem;
}

.sakura-promo .promo-steps,
.sakura-promo .promo-terms {
  margin: 0;
  padding-left: 20px;
}

.sakura-promo .promo-steps li,
.sakura-promo .promo-terms li {
  margin-bottom: 4px;
}

.sakura-promo .promo-terms {
  color: var(--app-muted);
  font-size: 0.8rem;
}

.sakura-promo .promo-cta {
  flex: 0 0 auto;
  margin: 16px 20px 5px;
  padding: 11px;
  border: none;
  border-radius: 8px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  color: #703902;
  font-family: inherit;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.sakura-promo .promo-cta .p-button-label {
  font-weight: 900;
}

.sakura-promo .promo-cta:not(:disabled):hover {
  border: none;
  background: #ffd033;
  color: #703902;
}

.sakura-promo .promo-cta:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #d9871f;
}

:root:not(.app-dark) .sakura-promo .promo-body h2 {
  color: #e0457f;
}

:root:not(.app-dark) .sakura-promo .promo-cta {
  background: linear-gradient(#ff7aae, #e0457f);
  box-shadow: 0 5px 0 #b8336a;
  color: #ffffff;
}

:root:not(.app-dark) .sakura-promo .promo-cta:not(:disabled):hover {
  background: linear-gradient(#ff8ab8, #e85590);
  color: #ffffff;
}

:root:not(.app-dark) .sakura-promo .promo-cta:not(:disabled):active {
  box-shadow: 0 2px 0 #b8336a;
}
</style>
