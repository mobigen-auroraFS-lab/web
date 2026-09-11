<script setup>
import { Check } from '@lucide/vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label
    class="flex items-center gap-2 font-sans text-base"
    :class="disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer text-text-primary'"
  >
    <span
      class="w-icon-sm h-icon-sm rounded-sm inline-flex items-center justify-center border transition-[background,border-color] duration-[120ms] ease-standard shrink-0"
      :class="
        disabled
          ? 'bg-bg-disabled border-border-disabled text-text-disabled'
          : modelValue
            ? 'bg-action-primary border-action-primary text-text-inverse'
            : 'bg-bg-surface border-border-strong text-transparent'
      "
      @click="!disabled && $emit('update:modelValue', !modelValue)"
    >
      <Check v-if="modelValue" :size="11" :stroke-width="2.5" />
    </span>
    <slot />
  </label>
</template>
