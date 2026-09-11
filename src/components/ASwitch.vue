<script setup>
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
      class="relative inline-block w-9 h-5 rounded-full transition-[background] duration-[120ms] ease-standard shrink-0"
      :class="disabled ? 'bg-bg-disabled' : modelValue ? 'bg-action-primary' : 'bg-border-strong'"
      @click="!disabled && $emit('update:modelValue', !modelValue)"
    >
      <span
        class="absolute top-0.5 w-4 h-4 rounded-full bg-bg-surface shadow-elevation-1 transition-[left] duration-[120ms] ease-standard"
        :class="modelValue ? 'left-[18px]' : 'left-0.5'"
      />
    </span>
    <slot />
  </label>
</template>
