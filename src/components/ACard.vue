<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' }
})
</script>

<template>
  <div class="bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-6 w-[300px] font-sans">
    <div v-if="title || description || $slots.header" class="flex flex-col gap-1.5">
      <slot name="header">
        <div v-if="title" class="text-2xl font-semibold text-text-primary">{{ title }}</div>
        <div v-if="description" class="text-sm text-text-tertiary">{{ description }}</div>
      </slot>
    </div>
    <div class="flex flex-col gap-4">
      <slot />
    </div>
    <div v-if="$slots.footer" class="flex justify-between">
      <slot name="footer" />
    </div>
  </div>
</template>
