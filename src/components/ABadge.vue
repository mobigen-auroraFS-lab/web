<script setup>
defineProps({
  tone: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'success', 'danger'].includes(v)
  }
})
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-1 rounded-full font-sans text-xs"
    :class="{
      'bg-slate-800 text-text-inverse': tone === 'default',
      'bg-status-success-bg text-status-success-text': tone === 'success',
      'bg-status-danger-bg text-status-danger-text': tone === 'danger'
    }"
  >
    <slot />
  </span>
</template>
