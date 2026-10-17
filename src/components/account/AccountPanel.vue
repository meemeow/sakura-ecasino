<script setup lang="ts">
import { ref } from 'vue'

// Glossy blue header with a body card below; collapsible unless `static`.
const props = defineProps<{ title: string; static?: boolean }>()
const open = ref(true)

function toggle() {
  if (!props.static) open.value = !open.value
}
</script>

<template>
  <section class="panel">
    <header class="panel-header" :class="{ clickable: !static }" @click="toggle">
      <h2>{{ title }}</h2>
      <slot name="action" />
      <i
        v-if="!static"
        class="pi pi-chevron-up chevron"
        :class="{ closed: !open }"
        aria-hidden="true"
      />
    </header>
    <div v-show="open" class="panel-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 20px;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 10px;
  background: linear-gradient(180deg, #3a7bff, #1d4ed8);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.4),
    0 4px 0 #173a9e;
  margin-bottom: 4px;
  color: #fff;
}

.panel-header.clickable {
  cursor: pointer;
  user-select: none;
}

.panel-header h2 {
  flex: 1;
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
}

.chevron {
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.chevron.closed {
  transform: rotate(180deg);
}

.panel-body {
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
  background: var(--app-navbar);
  overflow: hidden;
}
</style>
