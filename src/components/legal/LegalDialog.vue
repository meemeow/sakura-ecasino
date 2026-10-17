<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { legalContent, type LegalDoc } from './legalContent'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ doc: LegalDoc }>()

const content = computed(() => legalContent[props.doc])
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    class="sakura-legal"
  >
    <header class="legal-header">
      <div>
        <h2>{{ content.title }}</h2>
        <p class="legal-updated">Last updated {{ content.updated }}</p>
      </div>
      <button type="button" class="legal-close" aria-label="Close" @click="visible = false">
        <i class="pi pi-times" />
      </button>
    </header>

    <div class="legal-body">
      <p class="legal-intro">{{ content.intro }}</p>
      <section v-for="section in content.sections" :key="section.heading">
        <h3>{{ section.heading }}</h3>
        <p v-for="(para, i) in section.body" :key="i">{{ para }}</p>
      </section>
    </div>

    <Button label="I Understand" class="legal-ok" @click="visible = false" />
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
.p-dialog.sakura-legal {
  display: flex;
  flex-direction: column;
  width: min(640px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 48px));
  padding: 20px 20px 24px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
}

/* The body scrolls; header and button stay put */
.sakura-legal .p-dialog-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.sakura-legal .legal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--app-border);
}

.sakura-legal .legal-header h2 {
  margin: 0;
  color: #ffc200;
  font-weight: 800;
  font-size: 1.15rem;
}

/* Light mode: sakura pink instead of gold, which washes out on white */
:root:not(.app-dark) .sakura-legal .legal-header h2 {
  color: #e0457f;
}

.sakura-legal .legal-updated {
  margin: 4px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.75rem;
}

.sakura-legal .legal-close {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2.5px solid var(--app-text);
  border-radius: 50%;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}

.sakura-legal .legal-close .pi {
  font-size: 0.7rem;
  font-weight: 900;
}

.sakura-legal .legal-body {
  flex: 1;
  min-height: 0;
  padding: 16px 8px 8px 0;
  overflow-y: auto;
  color: var(--app-text);
  font-size: 0.85rem;
  line-height: 1.6;
}

.sakura-legal .legal-intro {
  margin: 0 0 8px;
  color: var(--app-muted);
}

.sakura-legal h3 {
  margin: 18px 0 6px;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.95rem;
}

.sakura-legal section p {
  margin: 0 0 8px;
}

/* 3D button in the Log out dialog's colors, same as the account dialogs' Save button:
   lavender in dark mode, navy in light mode */
.sakura-legal .legal-ok {
  flex: 0 0 auto;
  width: 100%;
  margin-top: 16px;
  margin-bottom: 4px;
  padding: 11px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.8rem;
  text-transform: uppercase;
  transition:
    filter 0.2s,
    transform 0.1s;
}

.sakura-legal .legal-ok .p-button-label {
  font-weight: 900;
}

/* PrimeVue's own hover and pressed states paint the primary (amber) colors, so each theme's
   colors are restated for them */
.app-dark .sakura-legal .legal-ok,
.app-dark .sakura-legal .legal-ok:not(:disabled):hover,
.app-dark .sakura-legal .legal-ok:not(:disabled):active {
  border: none;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

:root:not(.app-dark) .sakura-legal .legal-ok,
:root:not(.app-dark) .sakura-legal .legal-ok:not(:disabled):hover,
:root:not(.app-dark) .sakura-legal .legal-ok:not(:disabled):active {
  border: none;
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 4px 0 #0b1029;
  color: #ffffff;
}

.sakura-legal .legal-ok:not(:disabled):hover {
  filter: brightness(1.06);
}

.sakura-legal .legal-ok:not(:disabled):active {
  transform: translateY(2px);
}
</style>
