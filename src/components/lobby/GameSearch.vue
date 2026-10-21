<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const query = defineModel<string>({ required: true })
const input = ref<HTMLInputElement>()

function clear() {
  query.value = ''
  input.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  e.preventDefault()
  input.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <label class="search">
    <i class="pi pi-search search-icon" />
    <input
      ref="input"
      v-model="query"
      type="search"
      placeholder="Search games or providers"
      aria-label="Search games or providers"
      @keydown.esc="clear"
    />
    <button
      v-if="query"
      type="button"
      class="search-clear"
      aria-label="Clear search"
      @click="clear"
    >
      <i class="pi pi-times" />
    </button>
    <kbd v-else class="search-key" aria-hidden="true">/</kbd>
  </label>
</template>

<style scoped>
.search {
  --search-accent: #ffc200;
  --search-line: #262c40;

  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 50px;
  margin-top: 16px;
  padding: 0 10px 0 18px;
  border: 1.5px solid var(--search-line);
  border-radius: 14px;
  background: var(--app-surface);
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

:root:not(.app-dark) .search {
  --search-accent: #e0457f;
  --search-line: #dde1ec;
}

.search:hover {
  border-color: color-mix(in srgb, var(--search-accent) 35%, var(--search-line));
}

.search:focus-within {
  border-color: var(--search-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--search-accent) 16%, transparent);
}

.search-icon {
  color: var(--app-muted);
  font-size: 1rem;
  transition: color 0.15s ease;
}

.search:focus-within .search-icon {
  color: var(--search-accent);
}

input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
}

input::placeholder {
  color: var(--app-muted);
  opacity: 0.8;
}

input::-webkit-search-cancel-button {
  display: none;
}

.search-clear,
.search-key {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

.search-clear {
  padding: 0;
  border: none;
  background: var(--app-panel);
  color: var(--app-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.search-clear:hover {
  color: var(--app-text);
}

.search-clear .pi {
  font-size: 0.75rem;
}

.search-key {
  border: 1px solid var(--search-line);
  background: var(--app-panel);
  color: var(--app-muted);
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
}

.search:focus-within .search-key {
  visibility: hidden;
}

@media (hover: none) {
  .search-key {
    display: none;
  }
}
</style>
