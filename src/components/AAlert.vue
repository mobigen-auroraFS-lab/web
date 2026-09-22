<template>
  <div class="rounded-lg border px-6 py-4 flex gap-3 font-sans" :class="[borderClass, bgClass]">
    <component :is="icon" class="shrink-0" :class="accentTextClass" :size="16" :stroke-width="2" />
    <div>
      <div class="text-base font-semibold" :class="accentTextClass">{{ title }}</div>
      <div v-if="description" class="text-sm text-text-secondary">{{ description }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CircleAlert, CircleCheck, TriangleAlert, CircleX } from '@lucide/vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'danger'].includes(v)
  },
  title: { type: String, required: true },
  description: { type: String, default: '' }
})

const icon = computed(
  () =>
    ({
      info: CircleAlert,
      success: CircleCheck,
      warning: TriangleAlert,
      danger: CircleX
    })[props.variant]
)

const borderClass = computed(
  () =>
    ({
      info: 'border-border-default',
      success: 'border-green-100',
      warning: 'border-amber-100',
      danger: 'border-red-100'
    })[props.variant]
)

const bgClass = computed(
  () =>
    ({
      info: 'bg-bg-surface',
      success: 'bg-status-success-bg',
      warning: 'bg-status-warning-bg',
      danger: 'bg-status-danger-bg'
    })[props.variant]
)

const accentTextClass = computed(
  () =>
    ({
      info: 'text-text-primary',
      success: 'text-status-success-text',
      warning: 'text-status-warning-text',
      danger: 'text-status-danger-text'
    })[props.variant]
)
</script>
