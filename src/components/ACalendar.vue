<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: Date, default: null }
})

const emit = defineEmits(['update:modelValue'])

const today = new Date()
const viewDate = ref(props.modelValue ? new Date(props.modelValue) : new Date())

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const label = computed(() => `${monthNames[viewDate.value.getMonth()]} ${viewDate.value.getFullYear()}`)

const cells = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result = []
  for (let i = 0; i < firstDay; i++) result.push(null)
  for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, month, d))
  return result
})

function isToday(date) {
  return date && date.toDateString() === today.toDateString()
}
function isSelected(date) {
  return date && props.modelValue && date.toDateString() === props.modelValue.toDateString()
}
function selectDate(date) {
  if (!date) return
  emit('update:modelValue', date)
}
function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}
</script>

<template>
  <div class="bg-bg-surface border border-border-default rounded-lg pt-3 px-4 pb-6 w-[260px] flex flex-col items-center gap-4 shadow-elevation-2 font-sans box-border">
    <div class="flex items-center justify-between w-full">
      <button
        class="w-7 h-7 rounded-sm border border-border-default bg-bg-surface inline-flex items-center justify-center text-icon-default cursor-pointer"
        @click="prevMonth"
      >
        <ChevronLeft :size="16" :stroke-width="1.5" />
      </button>
      <span class="text-base font-semibold text-text-primary">{{ label }}</span>
      <button
        class="w-7 h-7 rounded-sm border border-border-default bg-bg-surface inline-flex items-center justify-center text-icon-default cursor-pointer"
        @click="nextMonth"
      >
        <ChevronRight :size="16" :stroke-width="1.5" />
      </button>
    </div>
    <div class="grid grid-cols-7 gap-1 w-full">
      <span v-for="wd in weekdays" :key="wd" class="text-xs text-text-tertiary text-center">{{ wd }}</span>
      <span
        v-for="(date, i) in cells"
        :key="i"
        class="text-xs text-center rounded-sm py-1.5"
        :class="[
          !date && 'cursor-default',
          date && !isSelected(date) && 'cursor-pointer hover:bg-bg-surface-hover',
          date && isSelected(date) && 'cursor-pointer bg-action-primary text-text-inverse',
          date && !isSelected(date) && 'text-text-primary',
          date && isToday(date) && !isSelected(date) && 'border border-border-strong'
        ]"
        @click="selectDate(date)"
      >
        {{ date ? date.getDate() : '' }}
      </span>
    </div>
  </div>
</template>
