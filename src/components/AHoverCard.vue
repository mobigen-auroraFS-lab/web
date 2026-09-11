<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  meta: { type: String, default: '' }
})
</script>

<template>
  <div class="relative inline-flex group font-sans">
    <slot name="trigger" />
    <div
      class="absolute top-[calc(100%+8px)] left-0 opacity-0 invisible transition-opacity duration-[120ms] ease-standard group-hover:opacity-100 group-hover:visible bg-bg-surface border border-border-default rounded-lg p-5 flex gap-6 w-[300px] shadow-elevation-2 z-10"
    >
      <div class="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
      <div class="flex flex-col gap-2">
        <div class="text-sm font-semibold text-text-primary">{{ title }}</div>
        <div class="text-sm text-text-secondary">{{ description }}</div>
        <div v-if="meta" class="text-xs text-text-tertiary">{{ meta }}</div>
      </div>
    </div>
  </div>
</template>
