<script setup>
import { ChevronDown } from '@lucide/vue'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  options: {
    type: Array,
    default: () => []
    // string[] or [{ value, label }]
  },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['update:modelValue'])

function optValue(opt) {
  return typeof opt === 'string' ? opt : opt.value
}
function optLabel(opt) {
  return typeof opt === 'string' ? opt : opt.label
}
</script>

<template>
  <div class="flex flex-col gap-1.5 font-sans">
    <label
      v-if="label"
      class="text-base font-medium"
      :class="disabled ? 'text-text-disabled' : 'text-text-primary'"
    >
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <select
        class="appearance-none w-full h-control-xl pl-2.5 pr-[34px] rounded-md border text-base text-text-primary bg-bg-surface outline-none disabled:bg-bg-disabled disabled:text-text-disabled disabled:cursor-not-allowed"
        :class="
          error
            ? 'border-status-danger-text ring-2! ring-status-danger-bg'
            : 'border-border-default focus:border-focus-ring focus:ring-2! focus:ring-primary-100'
        "
        :value="modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="optValue(opt)" :value="optValue(opt)">
          {{ optLabel(opt) }}
        </option>
      </select>
      <ChevronDown class="absolute right-2.5 text-icon-default pointer-events-none" :size="16" :stroke-width="2" />
    </div>
    <span v-if="error" class="text-xs text-status-danger-text">{{ error }}</span>
  </div>
</template>
