<script setup>
import AppHeader from './AppHeader.vue'

defineProps({
  active: { type: String, default: 'file-search' }
})
</script>

<template>
  <div class="min-h-screen bg-bg-canvas font-sans text-text-primary">
    <AppHeader :active="active" />
    <main class="max-w-[1440px] mx-auto px-8 pt-12 pb-16 flex flex-col gap-8">
      <slot />
    </main>
  </div>
</template>
