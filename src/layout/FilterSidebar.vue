<script setup>
import { Calendar as CalendarIcon, Lock } from '@lucide/vue'

import AFilterChip from '../components/AFilterChip.vue'
import AEmptyState from '../components/AEmptyState.vue'
import ACalendar from '../components/ACalendar.vue'
import APopover from '../components/APopover.vue'

defineProps({
  /* 선택된 값 목록 — "해제" 버튼 표시 여부·잠금 상태 판단에만 쓴다.
     칩 자체의 active/disabled는 각 *Chips 배열에 이미 반영되어 있다 */
  topics: { type: Array, required: true },
  subtopics: { type: Array, required: true },
  tags: { type: Array, required: true },
  fileTypes: { type: Array, required: true },
  dateFrom: { type: Date, default: null },
  dateTo: { type: Date, default: null },

  visibleTopicChips: { type: Array, required: true },
  subtopicChips: { type: Array, required: true },
  visibleTagChips: { type: Array, required: true },
  fileTypeChips: { type: Array, required: true },
  sizeRangeChips: { type: Array, required: true },
  datePresetChips: { type: Array, required: true },
  dateRangeLabel: { type: String, required: true },

  showMoreTopics: { type: Boolean, default: false },
  showMoreSubtopics: { type: Boolean, default: false },
  showMoreTags: { type: Boolean, default: false }
})

const emit = defineEmits([
  'clear-topics',
  'clear-subtopics',
  'clear-tags',
  'clear-file-types',
  'clear-date-range',
  'toggle-topic',
  'toggle-subtopic',
  'toggle-tag',
  'toggle-file-type',
  'select-size',
  'apply-date-preset',
  'open-facet',
  'update:dateFrom',
  'update:dateTo'
])

/* 위치 계산·바깥 클릭·Escape는 APopover가 자체적으로 처리한다 —
   범위 완성 시에만 여기서 닫아준다. 이 화면 전용 UI 상태라 상위로 올리지 않는다 */
import { ref } from 'vue'
const datePickerOpen = ref(false)
function onDateRangeEnd(date) {
  if (date) datePickerOpen.value = false
}
</script>

<template>
  <!-- xl 이상에서는 이 sidebar 자체가 앱쉘 구조의 일부다: 왼쪽에 고정된 채 자기 스크롤을 갖는다.
       reveal-in 애니메이션 같은 화면별 연출은 호출부(<slot> 없이 이 컴포넌트를 감싸는 wrapper)에서 처리한다 -->
  <aside
    aria-label="검색 필터"
    class="flex flex-col gap-5 self-start bg-bg-surface xl:w-[var(--sidebar-width)] xl:shrink-0 xl:h-full xl:overflow-y-auto xl:border-r xl:border-border-default xl:pl-6 xl:pr-5 xl:pt-8 xl:pb-16"
  >
    <h2 class="m-0 text-lg font-bold text-text-primary">필터</h2>
    <div class="border-b border-slate-100 -mt-2"></div>

    <div class="flex flex-col gap-3" role="group" aria-label="주제">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-text-primary">주제</span>
        <button
          v-if="topics.length"
          class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
          @click="emit('clear-topics')"
        >
          해제
        </button>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <AFilterChip
          v-for="chip in visibleTopicChips"
          :key="chip.label"
          :label="chip.label"
          :count="chip.count"
          :active="chip.active"
          :disabled="chip.disabled"
          @click="emit('toggle-topic', chip.label)"
        />
        <button
          v-if="showMoreTopics"
          class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
          @click="emit('open-facet', 'topic')"
        >
          전체 보기
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="하위주제">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold" :class="topics.length ? 'text-text-primary' : 'text-text-tertiary'">하위주제</span>
        <button
          v-if="subtopics.length"
          class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
          @click="emit('clear-subtopics')"
        >
          해제
        </button>
      </div>
      <AEmptyState v-if="topics.length === 0" size="sm" :icon="Lock" description="주제를 먼저 선택하면&#10;하위주제가 열립니다" />
      <div v-else class="flex gap-2 flex-wrap items-center">
        <AFilterChip
          v-for="chip in subtopicChips"
          :key="chip.label"
          :label="chip.label"
          :count="chip.count"
          :active="chip.active"
          :disabled="chip.disabled"
          @click="emit('toggle-subtopic', chip.label)"
        />
        <button
          v-if="showMoreSubtopics"
          class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
          @click="emit('open-facet', 'subtopic')"
        >
          전체 보기
        </button>
        <span v-if="subtopicChips.length === 0" class="text-xs text-text-tertiary">해당 주제의 하위주제가 없습니다.</span>
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="태그">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold" :class="subtopics.length ? 'text-text-primary' : 'text-text-tertiary'">태그</span>
        <button
          v-if="tags.length"
          class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
          @click="emit('clear-tags')"
        >
          해제
        </button>
      </div>
      <AEmptyState v-if="subtopics.length === 0" size="sm" :icon="Lock" description="하위주제를 먼저 선택하면&#10;관련 태그가 열립니다" />
      <div v-else class="flex gap-2 flex-wrap items-center">
        <AFilterChip
          v-for="chip in visibleTagChips"
          :key="chip.label"
          :label="chip.label"
          :active="chip.active"
          :disabled="chip.disabled"
          @click="emit('toggle-tag', chip.label)"
        />
        <button
          v-if="showMoreTags"
          class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
          @click="emit('open-facet', 'tag')"
        >
          전체 보기
        </button>
        <span v-if="visibleTagChips.length === 0" class="text-xs text-text-tertiary">해당 하위주제의 태그가 없습니다.</span>
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="파일 형식">
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold text-text-primary">파일 형식</span>
        <button
          v-if="fileTypes.length"
          class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
          @click="emit('clear-file-types')"
        >
          해제
        </button>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <AFilterChip
          v-for="chip in fileTypeChips"
          :key="chip.label"
          :label="chip.label"
          :active="chip.active"
          :disabled="chip.disabled"
          @click="emit('toggle-file-type', chip.label)"
        />
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
      <span class="text-sm font-bold text-text-primary">크기</span>
      <div class="flex gap-2 flex-wrap items-center" role="radiogroup" aria-label="크기">
        <AFilterChip
          v-for="chip in sizeRangeChips"
          :key="chip.label"
          radio
          :label="chip.label"
          :active="chip.active"
          :disabled="chip.disabled"
          @click="emit('select-size', chip.value)"
        />
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="기간">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-text-primary">기간</span>
        <button
          v-if="dateFrom || dateTo"
          class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
          @click="emit('clear-date-range')"
        >
          해제
        </button>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <AFilterChip
          v-for="preset in datePresetChips"
          :key="preset.days"
          :label="preset.label"
          :active="preset.active"
          :disabled="preset.disabled"
          @click="emit('apply-date-preset', preset.days)"
        />
      </div>
      <APopover v-model="datePickerOpen" :panel-width="280" :panel-max-height="320">
        <template #trigger="{ toggle }">
          <button
            class="flex items-center gap-2 w-[200px] max-w-full h-control-md px-2.5 bg-bg-surface border border-border-default rounded-md cursor-pointer box-border hover:border-border-strong"
            :class="dateFrom || dateTo ? 'text-text-primary' : 'text-text-tertiary'"
            :aria-expanded="datePickerOpen"
            @click="toggle"
          >
            <CalendarIcon class="text-icon-default shrink-0" :size="14" :stroke-width="1.5" />
            <span class="truncate text-sm">{{ dateRangeLabel }}</span>
          </button>
        </template>
        <template #content>
          <ACalendar
            range
            :start="dateFrom"
            :end="dateTo"
            @update:start="emit('update:dateFrom', $event)"
            @update:end="
              (d) => {
                emit('update:dateTo', d)
                onDateRangeEnd(d)
              }
            "
          />
        </template>
      </APopover>
    </div>
  </aside>
</template>
