<template>
  <div class="flex flex-col gap-3 font-sans text-base">
    <label
      v-for="opt in options"
      :key="opt.value"
      class="flex items-center gap-2"
      :class="opt.disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer text-text-primary'"
      @click="!opt.disabled && $emit('update:modelValue', opt.value)"
    >
      <span
        class="w-icon-sm h-icon-sm rounded-full border shrink-0 transition-[background,border-color] duration-[120ms] ease-standard"
        :class="
          opt.disabled
            ? 'border-border-disabled bg-bg-disabled'
            : modelValue === opt.value
              ? 'border-action-primary bg-[radial-gradient(circle,var(--color-action-primary)_0_40%,var(--color-bg-surface)_42%)]'
              : 'border-border-strong bg-bg-surface'
        "
      />
      {{ opt.label }}
    </label>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: null },
  options: {
    type: Array,
    required: true
    // [{ value, label, disabled }]
  }
})

defineEmits(['update:modelValue'])
</script>
