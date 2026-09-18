<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps({
  /* 단일 선택 */
  modelValue: { type: Date, default: null },
  /* 범위 선택 — 켜면 start/end 를 함께 쓴다 */
  range: { type: Boolean, default: false },
  start: { type: Date, default: null },
  end: { type: Date, default: null }
})

const emit = defineEmits(['update:modelValue', 'update:start', 'update:end'])

const today = new Date()
const locale = (typeof document !== 'undefined' && document.documentElement.lang) || 'en'

const viewDate = ref(new Date(props.modelValue || props.start || today))
const hovered = ref(null)

const label = computed(() =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(viewDate.value)
)
const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  /* 2024-09-01 은 일요일 — 요일 이름만 뽑기 위한 기준일 */
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 8, 1 + i)))
})

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

/* 프리셋은 시:분이 붙은 Date 를 넣으므로, 비교는 날짜 단위로 맞춘다 */
function dayValue(d) {
  return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null
}

/* 시작만 고른 상태에선 마우스가 얹힌 날짜를 임시 종료로 삼아 범위를 미리 보여준다 */
const previewEnd = computed(() => {
  if (props.end) return props.end
  if (!props.start || !hovered.value) return null
  return dayValue(hovered.value) >= dayValue(props.start) ? hovered.value : null
})

function isToday(date) {
  return date && date.toDateString() === today.toDateString()
}
function isEdge(date) {
  if (!props.range) return date && props.modelValue && dayValue(date) === dayValue(props.modelValue)
  const v = dayValue(date)
  return v === dayValue(props.start) || v === dayValue(previewEnd.value)
}
function barClass(date) {
  if (!props.range || !date) return ''
  const s = dayValue(props.start)
  const e = dayValue(previewEnd.value)
  const v = dayValue(date)
  if (!s || !e || s === e) return ''
  if (v > s && v < e) return 'bg-bg-surface-selected'
  if (v === s) return 'bg-bg-surface-selected rounded-l-full'
  if (v === e) return 'bg-bg-surface-selected rounded-r-full'
  return ''
}

function selectDate(date) {
  if (!date) return
  if (!props.range) {
    emit('update:modelValue', date)
    return
  }
  /* 범위가 완성돼 있거나 아직 시작이 없으면 새 범위를 연다 */
  if (!props.start || props.end) {
    emit('update:start', date)
    emit('update:end', null)
  } else if (dayValue(date) < dayValue(props.start)) {
    emit('update:start', date)
  } else {
    emit('update:end', date)
  }
}

function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}
</script>

<template>
  <div class="bg-bg-surface border border-border-default rounded-lg pt-3 px-3 pb-4 w-[280px] flex flex-col items-center gap-3 shadow-elevation-2 font-sans box-border">
    <div class="flex items-center justify-between w-full">
      <button
        aria-label="이전 달"
        class="w-7 h-7 rounded-sm border border-border-default bg-bg-surface inline-flex items-center justify-center text-icon-default cursor-pointer hover:bg-bg-surface-hover"
        @click="prevMonth"
      >
        <ChevronLeft :size="16" :stroke-width="1.5" />
      </button>
      <span class="text-base font-semibold text-text-primary">{{ label }}</span>
      <button
        aria-label="다음 달"
        class="w-7 h-7 rounded-sm border border-border-default bg-bg-surface inline-flex items-center justify-center text-icon-default cursor-pointer hover:bg-bg-surface-hover"
        @click="nextMonth"
      >
        <ChevronRight :size="16" :stroke-width="1.5" />
      </button>
    </div>

    <div class="grid grid-cols-7 w-full" @mouseleave="hovered = null">
      <span v-for="wd in weekdays" :key="wd" class="text-xs text-text-tertiary text-center pb-1">{{ wd }}</span>
      <!-- 범위 띠가 칸 사이에서 끊기지 않도록 가로 간격을 두지 않는다 -->
      <div v-for="(date, i) in cells" :key="i" class="h-9 flex items-center justify-center" :class="barClass(date)">
        <button
          v-if="date"
          type="button"
          :aria-pressed="isEdge(date)"
          class="w-9 h-9 rounded-full text-xs border-none cursor-pointer flex items-center justify-center"
          :class="[
            isEdge(date) ? 'bg-action-primary text-text-inverse font-semibold' : 'bg-transparent text-text-primary hover:bg-bg-surface-hover',
            isToday(date) && !isEdge(date) ? 'border border-border-strong' : ''
          ]"
          @click="selectDate(date)"
          @mouseenter="hovered = date"
        >
          {{ date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>
