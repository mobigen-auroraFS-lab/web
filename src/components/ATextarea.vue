<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
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
    <textarea
      class="min-h-[70px] px-2.5 py-2 rounded-md border font-sans text-base bg-bg-surface box-border outline-none border-border-default focus:border-focus-ring focus:ring-2! focus:ring-primary-100 disabled:bg-bg-disabled disabled:text-text-disabled disabled:cursor-not-allowed disabled:border-border-default"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>
