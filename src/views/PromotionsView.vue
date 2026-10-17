<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PromoBanner from '@/components/promotions/PromoBanner.vue'
import { promotions, type Promotion } from '@/components/promotions/promotions'

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
          <Button label="More info" class="gold-btn" @click="openInfo(promo)" />
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
  gap: 28px 18px;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.banner-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: var(--app-radius);
  background: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.banner-btn:hover {
  transform: translateY(-3px);
}

.banner-btn:focus-visible {
  outline: 2px solid #ffc200;
  outline-offset: 3px;
}

.card-foot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
}

.card-foot h2 {
  margin: 0 0 4px;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.95rem;
}

.card-foot p {
  margin: 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1.45;
}

/* Gold 3D button, same as the header's */
.gold-btn {
  flex: 0 0 auto;
  margin-bottom: 5px;
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  color: #703902;
  font-family: inherit;
  font-size: 0.75rem;
}

.gold-btn :deep(.p-button-label) {
  font-weight: 900;
}

.gold-btn:not(:disabled):hover {
  border: none;
  background: #ffd033;
  color: #703902;
}

.gold-btn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #d9871f;
}
</style>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
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

/* Banner runs edge to edge at the top of the dialog */
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
  color: #ffc200;
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

/* Gold 3D button, same as the login modal */
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
</style>
