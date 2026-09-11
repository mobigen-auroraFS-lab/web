<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<template>
  <button
    class="h-control-xl px-4 rounded-md font-sans text-base font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
    :class="
      variant === 'primary'
        ? 'border-none bg-action-primary text-text-inverse hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-focus-ring disabled:bg-bg-disabled disabled:hover:bg-bg-disabled'
        : 'border border-action-secondary-border bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary-hover-bg focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-focus-ring disabled:border-border-disabled disabled:hover:bg-bg-disabled'
    "
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
