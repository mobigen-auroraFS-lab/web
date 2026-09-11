<script setup>
import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/vue'

defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  perPage: { type: Number, default: 10 },
  perPageOptions: { type: Array, default: () => [10, 20, 50] }
})

defineEmits(['update:page', 'update:perPage'])
</script>

<template>
  <div class="flex items-center justify-between gap-4 font-sans">
    <div class="flex gap-2">
      <button
        class="flex items-center gap-1.5 h-control-md px-3.5 border border-border-default rounded-md bg-bg-surface text-text-primary text-sm font-medium cursor-pointer hover:bg-bg-surface-hover disabled:text-text-disabled disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:hover:bg-bg-disabled"
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        <ChevronLeft :size="14" :stroke-width="2" />
        Previous
      </button>
      <button
        class="flex items-center gap-1.5 h-control-md px-3.5 border border-border-default rounded-md bg-bg-surface text-text-primary text-sm font-medium cursor-pointer hover:bg-bg-surface-hover disabled:text-text-disabled disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:hover:bg-bg-disabled"
        :disabled="page >= pageCount"
        @click="$emit('update:page', page + 1)"
      >
        Next
        <ChevronRight :size="14" :stroke-width="2" />
      </button>
    </div>
    <div class="flex items-center gap-4">
      <div class="relative flex items-center">
        <select
          class="appearance-none h-control-md pl-3 pr-7 border border-border-default rounded-md text-sm text-text-primary bg-bg-surface outline-none"
          :value="perPage"
          @change="$emit('update:perPage', Number($event.target.value))"
        >
          <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }} per page</option>
        </select>
        <ChevronDown class="absolute right-2 text-icon-default pointer-events-none" :size="14" :stroke-width="2" />
      </div>
      <span class="text-sm text-text-secondary">Page {{ page }} of {{ pageCount }}</span>
    </div>
  </div>
</template>
