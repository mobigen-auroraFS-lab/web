<template>
  <div class="inline-flex items-center gap-1 p-1 rounded-lg border border-border-default bg-bg-surface shadow-elevation-1 font-sans">
    <span
      v-for="item in items"
      :key="item.label"
      class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md"
      :class="
        item.disabled
          ? 'text-text-disabled cursor-not-allowed'
          : active === item.label
            ? 'bg-bg-surface-hover text-text-primary cursor-pointer'
            : 'text-text-secondary cursor-pointer'
      "
      @click="select(item)"
    >
      {{ item.label }}
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
    // [{ label, disabled }]
  },
  modelValue: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const active = ref(props.modelValue ?? props.items.find((i) => !i.disabled)?.label ?? null)

function select(item) {
  if (item.disabled) return
  active.value = item.label
  emit('update:modelValue', item.label)
}
</script>
