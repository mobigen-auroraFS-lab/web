<template>
  <div class="rounded-sm border border-border-default overflow-hidden font-sans">
    <div
      class="grid gap-6 px-4 py-3 h-row-comfortable box-border items-center bg-table-header-bg border-b border-table-header-border"
      :style="{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }"
    >
      <span v-for="col in columns" :key="col.key" class="text-xs text-table-header-text">
        {{ col.label }}
      </span>
    </div>
    <div
      v-for="row in rows"
      :key="row.id"
      class="grid gap-6 px-4 py-3 h-row-comfortable box-border items-center cursor-pointer border-b border-border-default last:border-b-0"
      :class="modelValue === row.id ? 'bg-bg-surface-selected' : 'hover:bg-bg-surface-hover'"
      :style="{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }"
      @click="$emit('update:modelValue', row.id)"
    >
      <span v-for="col in columns" :key="col.key" class="text-sm text-text-primary">
        {{ row[col.key] }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  columns: {
    type: Array,
    required: true
    // [{ key, label }]
  },
  rows: {
    type: Array,
    required: true
    // [{ id, ...cells }]
  },
  modelValue: { type: [String, Number], default: null }
})

defineEmits(['update:modelValue'])
</script>
