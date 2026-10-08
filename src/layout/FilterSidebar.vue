<script setup>
import { ref } from 'vue'
import { Calendar as CalendarIcon, Lock, PanelLeftClose, PanelLeftOpen } from '@lucide/vue'

import AFilterChip from '../components/AFilterChip.vue'
import AEmptyState from '../components/AEmptyState.vue'
import ACalendar from '../components/ACalendar.vue'
import APopover from '../components/APopover.vue'
import ATooltip from '../components/ATooltip.vue'

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

/* xl 이상에서 아이콘만 남기고 접는다. 화면에 들어올 때마다 펼친 상태로 시작하도록 저장하지 않는다 */
const filterCollapsed = ref(false)
function toggleFilterPanel() {
  filterCollapsed.value = !filterCollapsed.value
}

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
  'apply-date-preset',
  'open-facet',
  'update:dateFrom',
  'update:dateTo'
])

/* 위치 계산·바깥 클릭·Escape는 APopover가 자체적으로 처리한다 —
   범위 완성 시에만 여기서 닫아준다. 이 화면 전용 UI 상태라 상위로 올리지 않는다 */
const datePickerOpen = ref(false)
function onDateRangeEnd(date) {
  if (date) datePickerOpen.value = false
}
</script>

<template>
  <!-- xl 이상에서는 이 sidebar 자체가 앱쉘 구조의 일부다: 왼쪽에 고정된 채 자기 스크롤을 갖는다.
       화면 가장자리에서 띄운 둥근 흰 카드로 둬 배경 위에 떠 있는 패널처럼 보이게 한다.
       오른쪽 여백은 늘 비워 두는 스크롤바 칸(10px)만큼 줄여(24 - 10 = 14px) 보이는 좌우 여백을 같게 맞추고,
       스크롤바 막대는 위아래를 모서리 둥근 폭만큼 비워 카드 밖으로 튀어나가 보이지 않게 한다.
       reveal-in 애니메이션 같은 화면별 연출은 호출부(<slot> 없이 이 컴포넌트를 감싸는 wrapper)에서 처리한다 -->
  <aside
    aria-label="검색 필터"
    class="relative self-start xl:shrink-0 xl:self-stretch xl:m-3 xl:rounded-3xl xl:border xl:overflow-y-auto xl:overflow-x-hidden scrollbar-subtle xl:[&::-webkit-scrollbar-track]:my-6 xl:pl-6 xl:pr-[14px] xl:pt-7 xl:pb-10 xl:transition-[width,background-color,border-color,box-shadow] xl:duration-[var(--duration-slow)] xl:ease-standard"
    :class="
      filterCollapsed
        ? 'bg-bg-surface xl:bg-transparent xl:border-transparent xl:w-14 xl:[scrollbar-gutter:auto]'
        : 'bg-bg-surface xl:border-slate-100 xl:shadow-elevation-1 xl:w-[var(--sidebar-width)]'
    "
  >
    <!-- 접힌 상태(xl 이상): 카드(배경·테두리·그림자)는 걷어내고 펼치기 아이콘만 남긴다 -->
    <div v-if="filterCollapsed" class="hidden xl:flex absolute inset-x-0 top-6 flex-col items-center gap-2">
      <ATooltip text="필터 펼치기" placement="bottom">
        <button
          type="button"
          aria-label="필터 펼치기"
          aria-expanded="false"
          class="flex w-8 h-8 items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer p-0 hover:bg-bg-surface-hover hover:text-text-primary"
          @click="toggleFilterPanel"
        >
          <PanelLeftOpen :size="18" :stroke-width="1.8" />
        </button>
      </ATooltip>
    </div>

    <!-- 펼친 내용은 폭을 고정해 둔다 — 카드 폭이 늘고 줄어드는 동안 칩이 줄바꿈되며 출렁이지 않고,
         overflow-x-hidden 에 잘린 채로 드러난다. 고정 폭 = 사이드바 폭 - 테두리 2 - 좌우 여백 24·14 - 스크롤바 칸 10 -->
    <div class="flex flex-col gap-5 xl:w-[calc(var(--sidebar-width)-50px)]" :class="filterCollapsed ? 'xl:hidden' : ''">
      <div class="flex items-center justify-between gap-2">
        <h2 class="m-0 text-lg font-bold text-text-primary">필터</h2>
        <ATooltip text="필터 접기" placement="bottom">
          <button
            type="button"
            aria-label="필터 접기"
            aria-expanded="true"
            class="hidden xl:flex w-8 h-8 items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer p-0 hover:bg-bg-surface-hover hover:text-text-primary"
            @click="toggleFilterPanel"
          >
            <PanelLeftClose :size="18" :stroke-width="1.8" />
          </button>
        </ATooltip>
      </div>
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
        <AEmptyState v-if="topics.length === 0" size="sm" :icon="Lock" description="주제를 선택하면 하위주제가 열립니다" />
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
        <AEmptyState v-if="subtopics.length === 0" size="sm" :icon="Lock" description="하위주제를 선택하면 태그가 열립니다" />
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
            :count="chip.count"
            :active="chip.active"
            :disabled="chip.disabled"
            @click="emit('toggle-file-type', chip.label)"
          />
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <span class="text-sm font-bold text-text-primary">크기</span>
        <!-- 크기로 거르기는 서버가 아직 지원하지 않아(size_bucket 501) 건수만 보여준다 -->
        <div class="flex gap-2 flex-wrap items-center" role="group" aria-label="크기별 건수">
          <AFilterChip v-for="chip in sizeRangeChips" :key="chip.value" :label="chip.label" :count="chip.count" disabled />
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
    </div>
  </aside>
</template>
