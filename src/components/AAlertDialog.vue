<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 bg-bg-overlay-scrim flex items-center justify-center z-[1000]">
      <div
        class="bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-6 w-[380px] shadow-elevation-3 font-sans"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="flex flex-col gap-4">
          <div class="text-lg font-semibold text-text-primary">{{ title }}</div>
          <div class="text-sm text-text-tertiary">{{ description }}</div>
        </div>
        <div class="flex justify-end gap-2">
          <AButton variant="secondary" @click="cancel">{{ cancelText }}</AButton>
          <AButton variant="primary" @click="confirm">{{ confirmText }}</AButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import AButton from './AButton.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Are you absolutely sure?' },
  description: { type: String, default: 'This action cannot be undone.' },
  cancelText: { type: String, default: 'Cancel' },
  confirmText: { type: String, default: 'Continue' }
})

const emit = defineEmits(['update:modelValue', 'cancel', 'confirm'])

function cancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
function confirm() {
  emit('update:modelValue', false)
  emit('confirm')
}
</script>
