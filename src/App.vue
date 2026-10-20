<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppToast from '@/components/layout/AppToast.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.fullscreen" />
  <DefaultLayout v-else>
    <RouterView />
  </DefaultLayout>
  <AppToast />
</template>
