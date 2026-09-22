<template>
  <div
    class="bg-bg-surface border border-border-default rounded-lg p-5 flex items-center justify-between gap-8 w-[340px] shadow-elevation-2 font-sans"
  >
    <div class="flex flex-col gap-2">
      <div class="text-sm font-medium text-text-primary">{{ title }}</div>
      <div v-if="description" class="text-xs text-text-tertiary">{{ description }}</div>
    </div>
    <button
      v-if="actionLabel"
      class="h-control-sm px-3 rounded-md border-none bg-action-primary text-text-inverse text-xs cursor-pointer shrink-0"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' }
})

defineEmits(['action'])
</script>
