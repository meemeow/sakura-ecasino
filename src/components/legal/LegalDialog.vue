<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import DialogBand from '@/components/layout/DialogBand.vue'
import { legalContent, type LegalDoc } from './legalContent'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ doc: LegalDoc }>()

const content = computed(() => legalContent[props.doc])
const icon = computed(() => (props.doc === 'privacy' ? 'pi pi-lock' : 'pi pi-file'))
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
    <DialogBand
      small-tree
      :title="content.title"
      :subtitle="`Last updated ${content.updated}`"
      @close="visible = false"
    >
      <template #icon><i :class="icon" /></template>
    </DialogBand>

    <div class="legal-body">
      <p class="legal-intro">{{ content.intro }}</p>
      <section v-for="section in content.sections" :key="section.heading">
        <h3>{{ section.heading }}</h3>
        <p v-for="(para, i) in section.body" :key="i">{{ para }}</p>
      </section>
    </div>

    <footer class="legal-foot">
      <Button label="I Understand" class="legal-ok" @click="visible = false" />
    </footer>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
/* Laid out like the account dialogs: blossom band, body on the page background, footer strip */
.p-dialog.sakura-legal {
  display: flex;
  flex-direction: column;
  width: min(640px, calc(100vw - 32px));
  max-height: min(720px, calc(100dvh - 32px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
  /* Title color in the band: gold here, sakura pink on white */
  --dlg-accent: #ffc200;
}

:root:not(.app-dark) .p-dialog.sakura-legal {
  --dlg-accent: #e0457f;
}

/* The body scrolls; band and footer stay put */
.sakura-legal .p-dialog-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.sakura-legal .legal-body {
  flex: 1;
  min-height: 0;
  padding: 20px 28px;
  overflow-y: auto;
  background: var(--app-bg);
  color: var(--app-text);
  font-size: 0.85rem;
  line-height: 1.6;
}

.sakura-legal .legal-intro {
  margin: 0 0 8px;
  color: var(--app-muted);
}

.sakura-legal .legal-body h3 {
  margin: 18px 0 6px;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.95rem;
}

/* Light mode: the logo's navy, like the account dialogs' headings */
:root:not(.app-dark) .sakura-legal .legal-body h3 {
  color: #1c2651;
}

.sakura-legal section p {
  margin: 0 0 8px;
}

.sakura-legal .legal-foot {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 14px 28px 16px;
  border-top: 1px solid var(--app-border);
}

/* 3D button in the Log out dialog's colors, same as the account dialogs' Save button:
   lavender in dark mode, navy in light mode */
.sakura-legal .legal-ok {
  margin-bottom: 4px;
  padding: 11px 28px;
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

@media (max-width: 560px) {
  .sakura-legal .legal-body,
  .sakura-legal .legal-foot {
    padding-left: 18px;
    padding-right: 18px;
  }

  .sakura-legal .legal-ok {
    width: 100%;
  }
}
</style>
