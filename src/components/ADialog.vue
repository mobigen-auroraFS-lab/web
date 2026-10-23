<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 bg-bg-overlay-scrim flex items-center justify-center z-[1000]" @click.self="close">
      <div
        class="bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-6 shadow-elevation-3 font-sans"
        :style="{ width }"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="title" class="text-lg font-semibold text-text-primary">{{ title }}</div>
        <!-- 설명의 \n 은 줄바꿈으로 그린다(HTML 이 아니라 글자라서 <br> 는 쓸 수 없다) -->
        <div v-if="description" class="text-sm text-text-tertiary -mt-[18px] whitespace-pre-line">{{ description }}</div>
        <div class="flex flex-col gap-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex justify-end gap-2">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  width: { type: String, default: '300px' }
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>
