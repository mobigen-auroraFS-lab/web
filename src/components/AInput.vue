<script setup>
import { Search } from '@lucide/vue'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  search: { type: Boolean, default: false },
  type: { type: String, default: 'text' }
})

defineEmits(['update:modelValue'])
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
      <Search v-if="search" class="absolute left-2.5 text-icon-default pointer-events-none" :size="16" :stroke-width="2" />
      <input
        class="w-full h-control-xl rounded-md border text-base text-text-primary bg-bg-surface box-border outline-none disabled:bg-bg-disabled disabled:text-text-disabled disabled:cursor-not-allowed"
        :class="[
          search ? 'pl-[34px] pr-2.5' : 'px-2.5',
          error
            ? 'border-status-danger-text ring-2! ring-status-danger-bg'
            : 'border-border-default focus:border-focus-ring! focus:ring-2! focus:ring-primary-100'
        ]"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
    <span v-if="error" class="text-xs text-status-danger-text">{{ error }}</span>
  </div>
</template>
