<script setup lang="ts">
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'

const query = defineModel<string>({ required: true })
</script>

<template>
  <IconField class="search">
    <InputIcon class="pi pi-search" />
    <InputText v-model="query" type="search" placeholder="Search games or providers" fluid />
  </IconField>
</template>

<style scoped>
.search {
  width: 100%;
  margin-top: 16px;
}

.search :deep(.p-inputtext) {
  height: 48px;
  border-radius: var(--app-radius);
  background: var(--app-surface);
}
</style>
