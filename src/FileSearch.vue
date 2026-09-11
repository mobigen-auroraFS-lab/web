<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Calendar as CalendarIcon, X, Download,
  Image as ImageIcon, FileText, Video, Archive, LogOut
} from '@lucide/vue'

import AInput from './components/AInput.vue'
import AButton from './components/AButton.vue'
import ASelect from './components/ASelect.vue'
import ACheckbox from './components/ACheckbox.vue'
import ACalendar from './components/ACalendar.vue'
import APagination from './components/APagination.vue'
import ABadge from './components/ABadge.vue'
import AToast from './components/AToast.vue'

/* ---------------------------------------------------------------- options */

const TOPIC_OPTIONS = ['의료', '연구', '교육', '행정', '보험청구', '임상시험', '재활', '영상의학', '병리', '약제', '간호', '진단검사', '응급의료', '건강검진', '재택의료']
const SUBTOPIC_OPTIONS = ['영상검사', '기록', '판독', '기타', '초음파리포트', '내시경기록', '수술기록', '퇴원요약', '검진결과지', '처방기록', '간호기록', '병리결과']
const TAG_OPTIONS = ['#흉부', '#판독', '#정기검진', '#CT', '#MRI', '#초음파', '#내시경', '#혈액검사', '#소견서', '#영상판독', '#응급', '#외래', '#입원', '#퇴원요약']
const FILE_TYPE_OPTIONS = ['JPG', 'PNG', 'PDF', 'XLSX', 'DOCX', 'MP4', 'ZIP']
const SIZE_RANGE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'under1', label: '1MB 미만' },
  { value: '1to10', label: '1~10MB' },
  { value: 'over10', label: '10MB 이상' }
]
const SORT_OPTIONS = [
  { value: 'date_desc', label: '최신 수정일순' },
  { value: 'date_asc', label: '오래된 수정일순' },
  { value: 'name_asc', label: '파일명순' },
  { value: 'size_desc', label: '크기 큰순' }
]
const SUGGESTED_KEYWORDS = ['흉부', '판독', 'CT', '정기검진']
const FILTER_COLLAPSED_COUNT = 10
const TAGS_COLLAPSED_COUNT = 12

const CATEGORY_BY_EXT = { JPG: '이미지', PNG: '이미지', PDF: '문서', XLSX: '문서', DOCX: '문서', MP4: '영상', ZIP: '기타' }
const EXT_STYLE_MAP = {
  JPG: { bg: 'color-mix(in oklch, var(--color-viz-2) 16%, white)', text: 'var(--color-viz-2)' },
  PNG: { bg: 'color-mix(in oklch, var(--color-viz-2) 16%, white)', text: 'var(--color-viz-2)' },
  PDF: { bg: 'color-mix(in oklch, var(--color-viz-5) 16%, white)', text: 'var(--color-viz-5)' },
  XLSX: { bg: 'color-mix(in oklch, var(--color-viz-3) 16%, white)', text: 'var(--color-viz-3)' },
  DOCX: { bg: 'color-mix(in oklch, var(--color-viz-1) 16%, white)', text: 'var(--color-viz-1)' },
  MP4: { bg: 'color-mix(in oklch, var(--color-viz-4) 16%, white)', text: 'var(--color-viz-4)' },
  ZIP: { bg: 'var(--color-slate-100)', text: 'var(--color-text-tertiary)' }
}
const ICON_BY_EXT = { JPG: ImageIcon, PNG: ImageIcon, PDF: FileText, XLSX: FileText, DOCX: FileText, MP4: Video, ZIP: Archive }

/* ------------------------------------------------------------ demo data */

const PROFILES = [
  { base: '흉부사진', topic: '의료', subtopic: '영상검사', tag: '#흉부' },
  { base: '흉부CT_소견', topic: '의료', subtopic: '영상검사', tag: '#흉부' },
  { base: '판독소견서', topic: '의료', subtopic: '판독', tag: '#판독' },
  { base: '정기검진_결과지', topic: '건강검진', subtopic: '검진결과지', tag: '#정기검진' },
  { base: '판독의뢰서', topic: '의료', subtopic: '판독', tag: '#영상판독' },
  { base: '초음파리포트', topic: '의료', subtopic: '초음파리포트', tag: '#초음파' },
  { base: '내시경기록', topic: '의료', subtopic: '내시경기록', tag: '#내시경' },
  { base: '수술기록', topic: '의료', subtopic: '수술기록', tag: '#입원' },
  { base: '퇴원요약', topic: '의료', subtopic: '퇴원요약', tag: '#퇴원요약' },
  { base: '처방기록', topic: '의료', subtopic: '처방기록', tag: '#외래' },
  { base: '간호기록', topic: '의료', subtopic: '간호기록', tag: '#응급' },
  { base: '병리결과', topic: '의료', subtopic: '병리결과', tag: '#소견서' }
]

function generateFiles(count = 100) {
  const list = []
  for (let i = 1; i <= count; i++) {
    const ext = FILE_TYPE_OPTIONS[i % FILE_TYPE_OPTIONS.length]
    const profile = PROFILES[i % PROFILES.length]
    const secondaryTag = TAG_OPTIONS[(i * 3 + 1) % TAG_OPTIONS.length]
    const tags = [profile.tag, secondaryTag].filter((v, idx, arr) => arr.indexOf(v) === idx)
    const month = String(1 + (i % 12)).padStart(2, '0')
    const day = String(1 + (i % 28)).padStart(2, '0')
    const sizeMB = ext === 'ZIP' || ext === 'MP4' ? 10 + (i % 40) : +(0.5 + (i % 20) * 0.3).toFixed(1)
    list.push({
      id: i,
      name: `${profile.base}_${String(i).padStart(2, '0')}.${ext.toLowerCase()}`,
      ext,
      category: CATEGORY_BY_EXT[ext],
      topic: profile.topic,
      subtopic: profile.subtopic,
      tags,
      date: `2026-${month}-${day}`,
      sizeMB,
      sizeLabel: sizeMB < 1 ? `${Math.round(sizeMB * 1024)}KB` : `${sizeMB}MB`
    })
  }
  return list
}

const files = generateFiles()

/* -------------------------------------------------------------- state */

const searchValue = ref('흉부')
const topics = ref(['의료'])
const subtopics = ref(['영상검사'])
const tags = ref(['#흉부'])
const newTagValue = ref('')
const resultQuery = ref('')
const tagsExpanded = ref(false)
const topicExpanded = ref(false)
const subtopicExpanded = ref(false)
const topicSearch = ref('')
const subtopicSearch = ref('')
const dateFrom = ref(null)
const dateTo = ref(null)
const fromCalOpen = ref(false)
const toCalOpen = ref(false)
const fileTypes = ref([])
const sizeRange = ref('')
const selectedIds = ref([])
const page = ref(1)
const perPage = ref(20)
const sortValue = ref('date_desc')
const toastMessage = ref('')
const profileImageError = ref(false)
const headerVisible = ref(true)

const dateRangeRef = ref(null)
let lastScrollY = 0

function onWindowScroll() {
  const currentScrollY = Math.max(window.scrollY, 0)
  if (currentScrollY <= 8) {
    headerVisible.value = true
  } else if (currentScrollY > lastScrollY + 4) {
    headerVisible.value = false
  } else if (currentScrollY < lastScrollY - 4) {
    headerVisible.value = true
  }
  lastScrollY = currentScrollY
}

function toggleIn(list, val) {
  return list.includes(val) ? list.filter((v) => v !== val) : [...list, val]
}
function toISODate(d) {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function formatDateLabel(d) {
  return d ? d.toLocaleDateString('ko-KR') : '연도. 월. 일.'
}
function matchesSizeRange(mb, range) {
  if (range === 'under1') return mb < 1
  if (range === '1to10') return mb >= 1 && mb <= 10
  if (range === 'over10') return mb > 10
  return true
}

/* ------------------------------------------------------------ filtering */

const filteredRows = computed(() => {
  let rows = files
  if (topics.value.length) rows = rows.filter((f) => topics.value.includes(f.topic))
  if (subtopics.value.length) rows = rows.filter((f) => subtopics.value.includes(f.subtopic))
  if (tags.value.length) rows = rows.filter((f) => f.tags.some((t) => tags.value.includes(t)))
  if (fileTypes.value.length) rows = rows.filter((f) => fileTypes.value.includes(f.ext))
  if (sizeRange.value) rows = rows.filter((f) => matchesSizeRange(f.sizeMB, sizeRange.value))
  const from = toISODate(dateFrom.value)
  const to = toISODate(dateTo.value)
  if (from) rows = rows.filter((f) => f.date >= from)
  if (to) rows = rows.filter((f) => f.date <= to)

  const mainQuery = searchValue.value.trim().toLowerCase()
  if (mainQuery) {
    rows = rows.filter(
      (f) =>
        f.name.toLowerCase().includes(mainQuery) ||
        f.category.includes(mainQuery) ||
        f.topic.includes(mainQuery) ||
        f.subtopic.includes(mainQuery) ||
        f.tags.some((t) => t.toLowerCase().includes(mainQuery))
    )
  }
  const refineQuery = resultQuery.value.trim().toLowerCase()
  if (refineQuery) {
    rows = rows.filter(
      (f) =>
        f.name.toLowerCase().includes(refineQuery) ||
        f.category.includes(refineQuery) ||
        f.tags.some((t) => t.toLowerCase().includes(refineQuery))
    )
  }
  return rows
})

const sortedRows = computed(() => {
  const rows = filteredRows.value.slice()
  const v = sortValue.value
  rows.sort((a, b) => {
    if (v === 'date_asc') return a.date.localeCompare(b.date)
    if (v === 'name_asc') return a.name.localeCompare(b.name, 'ko')
    if (v === 'size_desc') return b.sizeMB - a.sizeMB
    return b.date.localeCompare(a.date)
  })
  return rows
})

const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / perPage.value)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return sortedRows.value.slice(start, start + perPage.value)
})
const pageIds = computed(() => pagedRows.value.map((r) => r.id))
const allPageSelected = computed(() => pageIds.value.length > 0 && pageIds.value.every((id) => selectedIds.value.includes(id)))

watch([topics, subtopics, tags, fileTypes, sizeRange, dateFrom, dateTo, searchValue, resultQuery, perPage], () => {
  page.value = 1
})
watch(page, (p) => {
  if (p > pageCount.value) page.value = pageCount.value
})

/* --------------------------------------------------------------- labels */

const resultKeywordPrefix = computed(() => {
  const s = searchValue.value.trim()
  if (s) return `"${s}" 키워드 검색결과 `
  if (topics.value.length || subtopics.value.length || tags.value.length) return '전체 검색결과 '
  return '전체 파일 '
})

/* -------------------------------------------------------- topic/subtopic */

const topicVisible = computed(() => TOPIC_OPTIONS.slice(0, FILTER_COLLAPSED_COUNT))
const subtopicVisible = computed(() => SUBTOPIC_OPTIONS.slice(0, FILTER_COLLAPSED_COUNT))
const topicFiltered = computed(() => TOPIC_OPTIONS.filter((v) => v.includes(topicSearch.value.trim())))
const subtopicFiltered = computed(() => SUBTOPIC_OPTIONS.filter((v) => v.includes(subtopicSearch.value.trim())))
const topicToggleLabel = computed(() =>
  topicExpanded.value ? '접기 −' : `더보기 (+${Math.max(TOPIC_OPTIONS.length - FILTER_COLLAPSED_COUNT, 0)})`
)
const subtopicToggleLabel = computed(() =>
  subtopicExpanded.value ? '접기 −' : `더보기 (+${Math.max(SUBTOPIC_OPTIONS.length - FILTER_COLLAPSED_COUNT, 0)})`
)

/* -------------------------------------------------------------- chips */

const allTagChips = computed(() => TAG_OPTIONS.map((v) => ({ label: v, active: tags.value.includes(v) })))
const visibleTagChips = computed(() => (tagsExpanded.value ? allTagChips.value : allTagChips.value.slice(0, TAGS_COLLAPSED_COUNT)))
const showTagToggle = computed(() => allTagChips.value.length > TAGS_COLLAPSED_COUNT)
const tagToggleLabel = computed(() => (tagsExpanded.value ? '접기' : `더보기 (+${allTagChips.value.length - TAGS_COLLAPSED_COUNT})`))

const fileTypeChips = computed(() => FILE_TYPE_OPTIONS.map((v) => ({ label: v, active: fileTypes.value.includes(v) })))
const sizeRangeChips = computed(() => SIZE_RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value, active: sizeRange.value === o.value })))

/* ------------------------------------------------------ applied conditions */

const appliedConditions = computed(() => [
  ...topics.value.map((t) => ({ label: `주제: ${t}`, remove: () => (topics.value = topics.value.filter((x) => x !== t)) })),
  ...subtopics.value.map((t) => ({ label: `하위주제: ${t}`, remove: () => (subtopics.value = subtopics.value.filter((x) => x !== t)) })),
  ...tags.value.map((t) => ({ label: `태그: ${t}`, remove: () => (tags.value = tags.value.filter((x) => x !== t)) })),
  ...fileTypes.value.map((t) => ({ label: `형식: ${t}`, remove: () => (fileTypes.value = fileTypes.value.filter((x) => x !== t)) })),
  ...(sizeRange.value
    ? [{ label: `크기: ${SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange.value).label}`, remove: () => (sizeRange.value = '') }]
    : [])
])

function clearAllConditions() {
  topics.value = []
  subtopics.value = []
  tags.value = []
  fileTypes.value = []
  sizeRange.value = ''
}

/* ------------------------------------------------------------- actions */

function addTag(raw) {
  const v = raw.trim()
  if (!v) return
  const norm = v.startsWith('#') ? v : `#${v}`
  if (!tags.value.includes(norm)) tags.value = [...tags.value, norm]
  newTagValue.value = ''
}

function toggleSelectAllPage() {
  selectedIds.value = allPageSelected.value
    ? selectedIds.value.filter((id) => !pageIds.value.includes(id))
    : [...new Set([...selectedIds.value, ...pageIds.value])]
}
function toggleRowSelect(id) {
  selectedIds.value = toggleIn(selectedIds.value, id)
}

let toastTimer = null
function bulkDownload() {
  const n = selectedIds.value.length
  toastMessage.value = `${n}개 파일 다운로드를 시작합니다.`
  selectedIds.value = []
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMessage.value = ''), 2500)
}

function toggleFromCal() {
  fromCalOpen.value = !fromCalOpen.value
  toCalOpen.value = false
}
function toggleToCal() {
  toCalOpen.value = !toCalOpen.value
  fromCalOpen.value = false
}
function pickFromDate(d) {
  dateFrom.value = d
  fromCalOpen.value = false
}
function pickToDate(d) {
  dateTo.value = d
  toCalOpen.value = false
}
function onClickOutsideDateRange(e) {
  if (dateRangeRef.value && !dateRangeRef.value.contains(e.target)) {
    fromCalOpen.value = false
    toCalOpen.value = false
  }
}
onMounted(() => {
  lastScrollY = window.scrollY
  document.addEventListener('mousedown', onClickOutsideDateRange)
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutsideDateRange)
  window.removeEventListener('scroll', onWindowScroll)
  clearTimeout(toastTimer)
})
</script>

<template>
  <div class="min-h-screen bg-bg-canvas font-sans text-text-primary">
    <header
      class="h-14 flex items-center justify-between px-8 bg-bg-surface border-b border-slate-100 sticky top-0 z-10 transition-transform duration-300 ease-out"
      :class="headerVisible ? 'translate-y-0' : '-translate-y-full'"
    >
      <div class="flex items-center gap-8 min-w-0">
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-7 h-7 rounded-sm bg-action-primary"></div>
          <span class="text-md font-semibold text-text-primary tracking-tight">auroraFS</span>
        </div>
        <nav class="flex items-center gap-1">
          <a href="#" class="flex items-center h-8 px-3 rounded-md text-base font-medium text-text-secondary no-underline hover:bg-bg-surface-hover">멀티모달 검색</a>
          <a href="#" class="flex items-center h-8 px-3 rounded-md text-base font-semibold text-text-primary no-underline bg-slate-100">파일 검색</a>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 bg-transparent border-none cursor-pointer py-1 px-2 rounded-md hover:bg-bg-surface-hover">
          <img
            v-if="!profileImageError"
            src="https://i.pravatar.cc/60?img=12"
            alt="홍길동 프로필 사진"
            class="w-[30px] h-[30px] rounded-full object-cover shrink-0"
            @error="profileImageError = true"
          />
          <span v-else class="w-[30px] h-[30px] rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center shrink-0">홍</span>
          <span class="flex flex-col items-start gap-px">
            <span class="text-sm text-text-primary font-semibold leading-tight">홍길동</span>
            <span class="text-xs text-text-tertiary leading-tight">hong@data-portal.kr</span>
          </span>
        </button>
        <button title="로그아웃" aria-label="로그아웃" class="w-8 h-8 flex items-center justify-center bg-transparent border border-border-default rounded-md text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong hover:text-text-primary">
          <LogOut :size="16" :stroke-width="1.5" />
        </button>
      </div>
    </header>

    <main class="max-w-[1440px] mx-auto px-8 pt-12 pb-16 flex flex-col gap-8">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <h1 class="m-0 text-3xl font-bold text-text-primary tracking-tight">파일 검색</h1>
          <p class="m-0 text-base text-text-secondary">주제, 태그, 기간 조건을 조합해 필요한 파일을 빠르게 찾아보세요.</p>
        </div>

        <div class="flex flex-col shadow-elevation-2 rounded-lg">
          <div class="rounded-t-lg p-6 flex flex-col gap-4 bg-primary-500">
            <div class="flex gap-3">
              <div class="flex-1">
                <AInput v-model="searchValue" search placeholder="파일명, 키워드로 검색" />
              </div>
              <AButton variant="primary" class="!bg-primary-700 hover:!bg-[var(--color-slate-900)] shrink-0" @click="page = 1">검색</AButton>
            </div>
            <div class="flex gap-2 items-center flex-wrap">
              <ABadge class="!bg-[var(--color-primary-900)] !text-text-inverse font-semibold">추천검색어</ABadge>
              <button
                v-for="kw in SUGGESTED_KEYWORDS"
                :key="kw"
                class="h-[26px] px-2.5 bg-transparent border-none text-xs text-[var(--color-primary-100)] cursor-pointer font-medium hover:text-text-inverse hover:underline"
                @click="searchValue = kw"
              >
                #{{ kw }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-5 p-6 pt-2 rounded-b-lg bg-bg-surface">
            <div class="flex flex-col">
              <!-- 주제 -->
              <div class="grid grid-cols-[88px_1fr_110px] gap-3 items-start py-4 border-b border-slate-100">
                <span class="text-sm font-bold text-text-primary pt-1.5">주제</span>
                <div class="grid grid-cols-5 gap-x-4 gap-y-2">
                  <ACheckbox
                    v-for="v in topicVisible"
                    :key="v"
                    :model-value="topics.includes(v)"
                    @update:model-value="topics = toggleIn(topics, v)"
                  >
                    <span class="text-sm">{{ v }}</span>
                  </ACheckbox>
                </div>
                <button class="bg-transparent border-none text-sm text-action-primary font-medium cursor-pointer whitespace-nowrap pt-1.5 hover:text-action-primary-hover" @click="topicExpanded = !topicExpanded">
                  {{ topicToggleLabel }}
                </button>
                <div
                  class="col-start-2 col-span-2 flex flex-col overflow-hidden transition-all duration-200 ease-standard"
                  :class="topicExpanded ? 'max-h-[280px] opacity-100' : 'max-h-0 opacity-0'"
                >
                  <div class="border-t border-slate-100 pt-3">
                    <div class="flex justify-end pb-3">
                      <div class="w-[200px]">
                        <AInput v-model="topicSearch" search placeholder="주제 검색" />
                      </div>
                    </div>
                    <div class="grid grid-cols-5 gap-x-4 gap-y-2 max-h-[200px] overflow-y-auto">
                      <ACheckbox
                        v-for="v in topicFiltered"
                        :key="v"
                        :model-value="topics.includes(v)"
                        @update:model-value="topics = toggleIn(topics, v)"
                      >
                        <span class="text-sm">{{ v }}</span>
                      </ACheckbox>
                      <div v-if="topicFiltered.length === 0" class="col-span-5 py-3 text-sm text-text-tertiary text-center">검색 결과 없음</div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 하위주제 -->
              <div class="grid grid-cols-[88px_1fr_110px] gap-3 items-start pt-4">
                <span class="text-sm font-bold text-text-primary pt-1.5">하위주제</span>
                <div class="grid grid-cols-5 gap-x-4 gap-y-2">
                  <ACheckbox
                    v-for="v in subtopicVisible"
                    :key="v"
                    :model-value="subtopics.includes(v)"
                    @update:model-value="subtopics = toggleIn(subtopics, v)"
                  >
                    <span class="text-sm">{{ v }}</span>
                  </ACheckbox>
                </div>
                <button class="bg-transparent border-none text-sm text-action-primary font-medium cursor-pointer whitespace-nowrap pt-1.5 hover:text-action-primary-hover" @click="subtopicExpanded = !subtopicExpanded">
                  {{ subtopicToggleLabel }}
                </button>
                <div
                  class="col-start-2 col-span-2 flex flex-col overflow-hidden transition-all duration-200 ease-standard"
                  :class="subtopicExpanded ? 'max-h-[280px] opacity-100' : 'max-h-0 opacity-0'"
                >
                  <div class="border-t border-slate-100 pt-3">
                    <div class="flex justify-end pb-3">
                      <div class="w-[200px]">
                        <AInput v-model="subtopicSearch" search placeholder="하위주제 검색" />
                      </div>
                    </div>
                    <div class="grid grid-cols-5 gap-x-4 gap-y-2 max-h-[200px] overflow-y-auto">
                      <ACheckbox
                        v-for="v in subtopicFiltered"
                        :key="v"
                        :model-value="subtopics.includes(v)"
                        @update:model-value="subtopics = toggleIn(subtopics, v)"
                      >
                        <span class="text-sm">{{ v }}</span>
                      </ACheckbox>
                      <div v-if="subtopicFiltered.length === 0" class="col-span-5 py-3 text-sm text-text-tertiary text-center">검색 결과 없음</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="appliedConditions.length > 0"
        class="flex items-center gap-2 flex-wrap bg-bg-surface-selected border border-primary-100 rounded-md py-2 px-3"
      >
        <span class="text-sm text-text-tertiary font-medium shrink-0">적용 조건</span>
        <button
          v-for="cond in appliedConditions"
          :key="cond.label"
          class="flex items-center gap-1 h-[26px] px-2 bg-bg-surface border border-[var(--color-primary-200)] rounded text-xs text-primary-700 font-medium cursor-pointer hover:bg-primary-50"
          @click="cond.remove"
        >
          {{ cond.label }} <span class="text-[11px] text-text-tertiary">✕</span>
        </button>
        <button class="ml-1 bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:underline hover:text-action-primary-hover" @click="clearAllConditions">모두 해제</button>
      </div>

      <div class="grid grid-cols-[240px_1fr] gap-10 items-start">
        <!-- 필터 사이드바 -->
        <aside class="sticky top-8 z-[5] flex flex-col gap-5 self-start bg-bg-canvas">
          <h2 class="m-0 text-lg font-bold text-text-primary">필터</h2>
          <div class="border-b border-slate-100 -mt-2"></div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-text-primary">태그</span>
              <button v-if="tags.length" class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="tags = []">모두 해제</button>
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <button
                v-for="chip in visibleTagChips"
                :key="chip.label"
                class="h-[30px] px-3 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap box-border border-none"
                :class="chip.active ? 'bg-action-primary text-text-inverse font-semibold' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'"
                @click="tags = toggleIn(tags, chip.label)"
              >
                {{ chip.label }}
              </button>
              <button v-if="showTagToggle" class="h-[30px] px-2 bg-transparent border-none text-sm text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover" @click="tagsExpanded = !tagsExpanded">
                {{ tagToggleLabel }}
              </button>
            </div>
            <AInput v-model="newTagValue" placeholder="태그 검색 후 Enter로 추가" @keydown.enter="addTag(newTagValue)" />
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-text-primary">파일 형식</span>
              <button v-if="fileTypes.length" class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="fileTypes = []">모두 해제</button>
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <button
                v-for="chip in fileTypeChips"
                :key="chip.label"
                class="h-[30px] px-3 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap box-border border-none"
                :class="chip.active ? 'bg-action-primary text-text-inverse font-semibold' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'"
                @click="fileTypes = toggleIn(fileTypes, chip.label)"
              >
                {{ chip.label }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <span class="text-sm font-bold text-text-primary">크기</span>
            <div class="flex gap-2 flex-wrap items-center">
              <button
                v-for="chip in sizeRangeChips"
                :key="chip.label"
                class="h-[30px] px-3 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap box-border border-none"
                :class="chip.active ? 'bg-action-primary text-text-inverse font-semibold' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'"
                @click="sizeRange = chip.value"
              >
                {{ chip.label }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" ref="dateRangeRef">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-text-primary">기간</span>
              <button v-if="dateFrom || dateTo" class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="dateFrom = null; dateTo = null">모두 해제</button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 min-w-0">
                <button
                  class="flex items-center gap-1.5 w-full h-control-md px-2.5 text-sm text-text-primary bg-bg-surface border border-border-default rounded-md cursor-pointer box-border"
                  @click="toggleFromCal"
                >
                  <CalendarIcon class="text-icon-default shrink-0" :size="14" :stroke-width="1.5" />
                  <span class="truncate">{{ formatDateLabel(dateFrom) }}</span>
                </button>
                <div v-if="fromCalOpen" class="absolute top-[calc(100%+4px)] left-0 z-20">
                  <ACalendar :model-value="dateFrom" @update:model-value="pickFromDate" />
                </div>
              </div>
              <span class="text-text-tertiary text-sm shrink-0">~</span>
              <div class="relative flex-1 min-w-0">
                <button
                  class="flex items-center gap-1.5 w-full h-control-md px-2.5 text-sm text-text-primary bg-bg-surface border border-border-default rounded-md cursor-pointer box-border"
                  @click="toggleToCal"
                >
                  <CalendarIcon class="text-icon-default shrink-0" :size="14" :stroke-width="1.5" />
                  <span class="truncate">{{ formatDateLabel(dateTo) }}</span>
                </button>
                <div v-if="toCalOpen" class="absolute top-[calc(100%+4px)] left-0 z-20">
                  <ACalendar :model-value="dateTo" @update:model-value="pickToDate" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- 결과 -->
        <div class="flex flex-col gap-3 min-w-0">
          <div class="flex items-center justify-between gap-3">
            <div class="text-lg text-text-primary">
              {{ resultKeywordPrefix }}<span class="font-bold">{{ filteredRows.length.toLocaleString() }}건</span>
              <span class="text-sm text-text-tertiary font-normal ml-2">(전체 {{ files.length.toLocaleString() }}건 중)</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="w-[180px]">
                <ASelect v-model="sortValue" :options="SORT_OPTIONS" />
              </div>
              <div class="relative w-[220px]">
                <AInput v-model="resultQuery" search placeholder="결과 내 재검색" />
                <button
                  v-if="resultQuery"
                  aria-label="지우기"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-[18px] h-[18px] border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover"
                  @click="resultQuery = ''"
                >
                  <X :size="12" :stroke-width="1.5" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="selectedIds.length > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div class="pointer-events-auto flex items-center gap-1 bg-[var(--color-slate-900)] rounded-lg py-1.5 pl-4.5 pr-1.5 shadow-elevation-3">
              <div class="flex items-center gap-2.5 pr-4">
                <span class="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary-500 text-text-inverse text-xs font-bold [font-feature-settings:'tnum']">{{ selectedIds.length }}</span>
                <span class="text-sm text-slate-100 font-medium whitespace-nowrap">건 선택됨</span>
              </div>
              <div class="w-px h-[22px] bg-slate-700 shrink-0"></div>
              <button class="flex items-center gap-1.5 h-[38px] px-4 bg-transparent border-none rounded-md text-sm text-slate-300 font-medium cursor-pointer whitespace-nowrap hover:bg-slate-700 hover:text-slate-100" @click="selectedIds = []">
                <X :size="14" :stroke-width="1.5" />
                선택 해제
              </button>
              <AButton variant="primary" class="!h-[38px] !rounded-md" @click="bulkDownload">
                <span class="flex items-center gap-2"><Download :size="15" :stroke-width="1.8" /> 다운로드</span>
              </AButton>
            </div>
          </div>

          <div class="border border-border-default rounded-lg overflow-auto bg-bg-surface">
            <div class="grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px] min-w-[820px] bg-bg-canvas border-b border-border-default">
              <div class="py-3 flex items-center justify-center">
                <ACheckbox :model-value="allPageSelected" @update:model-value="toggleSelectAllPage" />
              </div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary">파일명</div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary">분류</div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary">종류</div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary">키워드 · 태그</div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary">수정일</div>
              <div class="py-3 px-4 text-xs font-medium text-text-secondary text-right">크기</div>
            </div>
            <div
              v-for="(item, i) in pagedRows"
              :key="item.id"
              class="grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px] min-w-[820px] hover:bg-bg-surface-hover"
              :class="i === pagedRows.length - 1 ? '' : 'border-b border-slate-100'"
            >
              <div class="py-3 flex items-center justify-center">
                <ACheckbox :model-value="selectedIds.includes(item.id)" @update:model-value="toggleRowSelect(item.id)" />
              </div>
              <div class="py-3 px-4 flex items-center gap-2 min-w-0">
                <component :is="ICON_BY_EXT[item.ext]" class="text-icon-default shrink-0" :size="16" :stroke-width="1.5" />
                <span class="text-sm text-text-primary font-medium truncate">{{ item.name }}</span>
              </div>
              <div class="py-3 px-4 text-sm text-text-tertiary">{{ item.category }}</div>
              <div class="py-3 px-4">
                <span
                  class="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-bold rounded-sm tracking-wide"
                  :style="{ background: EXT_STYLE_MAP[item.ext].bg, color: EXT_STYLE_MAP[item.ext].text }"
                >{{ item.ext }}</span>
              </div>
              <div class="py-3 px-4 flex gap-1.5 flex-wrap items-center">
                <span v-for="t in item.tags" :key="t" class="text-2xs font-semibold text-text-secondary bg-slate-100 py-0.5 px-1.5 rounded-sm">{{ t }}</span>
              </div>
              <div class="py-3 px-4 text-sm text-text-tertiary whitespace-nowrap">{{ item.date }}</div>
              <div class="py-3 px-4 text-sm text-text-tertiary text-right [font-feature-settings:'tnum']">{{ item.sizeLabel }}</div>
            </div>
            <div v-if="pagedRows.length === 0" class="p-8 text-center text-text-tertiary text-sm border-t border-border-default">
              <template v-if="resultQuery">"{{ resultQuery }}"에 해당하는 결과가 결과 내에 없습니다.</template>
              <template v-else>조건에 해당하는 파일이 없습니다.</template>
            </div>
          </div>

          <APagination v-model:page="page" v-model:per-page="perPage" :page-count="pageCount" :per-page-options="[10, 20, 50, 100]" />
        </div>
      </div>
    </main>

    <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50">
      <AToast :title="toastMessage" />
    </div>
  </div>
</template>
