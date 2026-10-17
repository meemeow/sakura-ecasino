<script setup lang="ts">
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.fullscreen" />
  <DefaultLayout v-else>
    <RouterView />
  </DefaultLayout>
  <Toast />
</template>
