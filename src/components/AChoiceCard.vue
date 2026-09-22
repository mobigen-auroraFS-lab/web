<template>
  <div class="flex flex-col gap-3 font-sans">
    <div
      v-for="opt in options"
      :key="opt.value"
      class="rounded-lg border p-4 flex justify-between items-start gap-4 transition-[background,border-color] duration-[120ms] ease-standard"
      :class="
        opt.disabled
          ? 'cursor-not-allowed border-border-disabled bg-bg-disabled'
          : modelValue === opt.value
            ? 'cursor-pointer border-slate-400 bg-slate-50'
            : 'cursor-pointer border-slate-200 bg-bg-surface'
      "
      @click="!opt.disabled && $emit('update:modelValue', opt.value)"
    >
      <div>
        <div class="text-base font-semibold" :class="opt.disabled ? 'text-text-disabled' : 'text-text-primary'">
          {{ opt.title }}
        </div>
        <div class="text-sm mt-0.5" :class="opt.disabled ? 'text-text-disabled' : 'text-text-tertiary'">
          {{ opt.description }}
        </div>
      </div>
      <span
        class="w-icon-md h-icon-md rounded-full border shrink-0"
        :class="
          opt.disabled
            ? 'border-border-disabled bg-bg-disabled'
            : modelValue === opt.value
              ? 'border-action-primary bg-[radial-gradient(circle,var(--color-action-primary)_0_40%,var(--color-bg-surface)_42%)]'
              : 'border-border-strong bg-bg-surface'
        "
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: null },
  options: {
    type: Array,
    required: true
    // [{ value, title, description, disabled }]
  }
})

defineEmits(['update:modelValue'])
</script>
