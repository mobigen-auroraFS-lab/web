<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Check } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: {
    type: Array,
    required: true
    // string[] or [{ value, label }]
  },
  placeholder: { type: String, default: 'Select...' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(null)

function optValue(opt) {
  return typeof opt === 'string' ? opt : opt.value
}
function optLabel(opt) {
  return typeof opt === 'string' ? opt : opt.label
}

function select(opt) {
  emit('update:modelValue', optValue(opt))
  open.value = false
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative inline-flex font-sans">
    <button
      type="button"
      class="h-control-xl px-3 rounded-sm border border-border-default bg-bg-surface text-sm text-text-primary flex items-center gap-3 w-[200px] box-border outline-none focus-visible:border-focus-ring focus-visible:ring-2! focus-visible:ring-primary-100 disabled:bg-bg-disabled disabled:text-text-disabled disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="open = !open"
    >
      {{ options.find(o => optValue(o) === modelValue) ? optLabel(options.find(o => optValue(o) === modelValue)) : placeholder }}
    </button>
    <div v-if="open" class="absolute top-[calc(100%+4px)] left-0 rounded-sm border border-border-default bg-bg-surface shadow-elevation-2 p-1 w-40 z-10">
      <div
        v-for="opt in options"
        :key="optValue(opt)"
        class="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm text-text-primary cursor-pointer hover:bg-bg-surface-hover"
        @click="select(opt)"
      >
        <span class="w-3.5 inline-flex text-action-primary">
          <Check v-if="optValue(opt) === modelValue" :size="13" :stroke-width="2.5" />
        </span>
        {{ optLabel(opt) }}
      </div>
    </div>
  </div>
</template>
