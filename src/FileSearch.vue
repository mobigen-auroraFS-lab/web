<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  Calendar as CalendarIcon, X, Download, SearchX, ArrowUp, ListFilter, Info, Lock,
  Image as ImageIcon, FileText, Video, Archive, LogOut
} from '@lucide/vue'

import AInput from './components/AInput.vue'
import AButton from './components/AButton.vue'
import ACheckbox from './components/ACheckbox.vue'
import ACalendar from './components/ACalendar.vue'
import AToast from './components/AToast.vue'
import ACommand from './components/ACommand.vue'
import ADialog from './components/ADialog.vue'
import AFileDetailModal from './components/AFileDetailModal.vue'
import AFilterChip from './components/AFilterChip.vue'
import AEmptyState from './components/AEmptyState.vue'
import ASelectionBar from './components/ASelectionBar.vue'
import ASegmentedControl from './components/ASegmentedControl.vue'
import APopover from './components/APopover.vue'
import logoUrl from './asets/logo.png'

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
/* 정렬 가능한 컬럼 — 처음 누를 때 쓰는 기본 방향을 함께 둔다 */
const SORTABLE = { name: 'asc', date: 'desc', size: 'desc' }
const DATE_PRESETS = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 }
]
const DENSITY_OPTIONS = [
  { value: 'compact', label: '좁게' },
  { value: 'comfortable', label: '보통' },
  { value: 'spacious', label: '넓게' }
]
const DENSITY_STORAGE_KEY = 'aurora.fileSearch.density'

/* 화면 밀도는 이 브라우저에만 남기는 개인 취향 — 매번 다시 고르게 하면 의미가 없다.
   사생활 모드나 저장소 차단 환경에선 읽기/쓰기가 던지므로 조용히 기본값으로 돈다 */
function readStoredDensity() {
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY)
    return DENSITY_OPTIONS.some((o) => o.value === v) ? v : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

const SUGGESTED_KEYWORDS = ['흉부', '판독', 'CT', '정기검진']
/* 사이드바엔 '결과가 있는 순'으로 상위 몇 개만 — 나머지는 '전체 보기' 모달에서 고른다 */
const FACET_VISIBLE_COUNT = 8

/* 주제 -> 하위주제 -> 태그로 이어지는 계층 구조 */
const TOPIC_SUBTOPIC_MAP = {
  '의료': ['영상검사', '판독', '초음파리포트', '내시경기록', '수술기록', '퇴원요약', '처방기록', '간호기록', '병리결과', '기록', '기타'],
  '건강검진': ['검진결과지', '기록'],
  '연구': ['기록', '기타'],
  '교육': ['기록', '기타'],
  '행정': ['기록', '기타'],
  '보험청구': ['기록', '기타'],
  '임상시험': ['기록', '기타'],
  '재활': ['기록', '기타'],
  '영상의학': ['영상검사', '판독'],
  '병리': ['병리결과'],
  '약제': ['처방기록'],
  '간호': ['간호기록'],
  '진단검사': ['검진결과지', '기록'],
  '응급의료': ['간호기록', '수술기록'],
  '재택의료': ['기록']
}
const SUBTOPIC_TAG_MAP = {
  '영상검사': ['#흉부', '#CT', '#MRI', '#초음파', '#영상판독'],
  '판독': ['#판독', '#영상판독', '#소견서'],
  '초음파리포트': ['#초음파', '#흉부'],
  '내시경기록': ['#내시경'],
  '수술기록': ['#입원', '#응급'],
  '퇴원요약': ['#퇴원요약'],
  '검진결과지': ['#정기검진'],
  '처방기록': ['#외래'],
  '간호기록': ['#응급', '#외래'],
  '병리결과': ['#소견서', '#혈액검사'],
  '기록': ['#외래', '#입원'],
  '기타': ['#혈액검사']
}

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

/* ------------------------------------------------ 파일 상세 정보 샘플 데이터 */

/* AFileDetailModal 이 기대하는 FileDetail 모양으로 목록 행을 부풀린다.
   실제 API 가 붙으면 이 함수를 fetch 결과로 바꿔치기하면 된다 — 컴포넌트는
   이 값의 출처를 모른다 */
function buildBasicInfo(item) {
  const common = [
    { key: 'format', label: 'format', value: item.ext },
    { key: 'file_size', label: 'file_size', value: item.sizeLabel }
  ]
  if (item.ext === 'MP4') {
    return [
      ...common,
      { key: 'duration', label: 'duration', value: `${(120 + (item.id % 300)).toLocaleString()}초` },
      { key: 'channels', label: 'channels', value: 2 },
      { key: 'sample_rate', label: 'sample_rate', value: '48000' },
      { key: 'resolution', label: 'resolution', value: '1920x1080' }
    ]
  }
  if (item.ext === 'JPG' || item.ext === 'PNG') {
    return [
      ...common,
      { key: 'dimensions', label: '해상도', value: `${1200 + (item.id % 5) * 80}x${800 + (item.id % 4) * 60}` },
      { key: 'color_mode', label: 'color_mode', value: 'RGB' }
    ]
  }
  if (item.ext === 'PDF' || item.ext === 'DOCX') {
    return [...common, { key: 'page_count', label: '페이지 수', value: `${4 + (item.id % 20)}쪽` }]
  }
  if (item.ext === 'XLSX') {
    return [...common, { key: 'sheet_count', label: '시트 수', value: `${1 + (item.id % 4)}개` }]
  }
  if (item.ext === 'ZIP') {
    return [...common, { key: 'item_count', label: '포함 파일 수', value: `${3 + (item.id % 12)}개` }]
  }
  return common
}

function buildExtractedInfo(item) {
  return {
    summary: `${item.topic} · ${item.subtopic} 분류로 등록된 자료입니다. ${item.tags.join(', ')} 관련 내용을 포함하고 있으며, ${item.date} 기준으로 갱신되었습니다.`
  }
}

function buildFullText(item) {
  return `${item.name} 원문 추출 텍스트입니다. ${item.topic} · ${item.subtopic} 분류로 등록된 자료이며, ${item.tags.join(', ')} 키워드와 연관되어 있습니다. ${item.date} 기준으로 수집·색인되었고, 도입부에서는 배경과 목적을 설명하고 본론에서는 세부 절차와 기준을 단계별로 기술하며 결론부에서는 후속 조치와 참고 사항을 안내합니다. 이 텍스트는 검색 색인과 요약 생성에 사용된 원문 스니펫의 예시입니다.`
}

function buildTopics(item) {
  const relatedCount = files.filter((f) => f.subtopic === item.subtopic).length
  return [{ id: item.subtopic, label: `${item.topic} · ${item.subtopic}`, relatedCount, clickable: true }]
}

function buildMultimodalMeta(item) {
  return item.tags.map((t) => ({ id: t, label: t, count: files.filter((f) => f.tags.includes(t)).length }))
}

function buildRelations(item) {
  const toRelation = (f, relationType, description) => ({
    id: String(f.id),
    typeBadge: f.category,
    /* 테이블의 '종류' 배지와 같은 확장자별 색을 그대로 물려준다 — 파일 유형이라는
       같은 정보를 모달에서만 다른 색으로 보여줄 이유가 없다 */
    typeBadgeStyle: EXT_STYLE_MAP[f.ext],
    icon: ICON_BY_EXT[f.ext],
    name: f.name,
    relationType,
    category: `${f.topic} · ${f.subtopic}`,
    description,
    confidence: 60 + ((f.id * 7) % 35)
  })
  const related = files
    .filter((f) => f.id !== item.id && f.subtopic === item.subtopic)
    .map((f) => toRelation(f, '유사 자료', `같은 ${item.subtopic} 분류에 속한 자료로, 관련 태그(${f.tags.join(', ')})를 공유합니다.`))
  const sameTopic = files
    .filter((f) => f.id !== item.id && f.topic === item.topic && f.subtopic !== item.subtopic)
    .map((f) => toRelation(f, '동일 주제', `${item.topic} 주제 안에서 서로 다른 하위 분류로 등록되어 있습니다.`))
  return { related, sameTopic }
}

/** @returns {import('./components/AFileDetailModal.vue').FileDetail|null} */
function buildFileDetail(item) {
  if (!item) return null
  return {
    id: String(item.id),
    name: item.name,
    typeBadge: item.category,
    typeBadgeStyle: EXT_STYLE_MAP[item.ext],
    fileFormat: item.ext.toLowerCase(),
    sizeLabel: item.sizeLabel,
    uploadedAt: item.date,
    source: '자동 수집',
    breadcrumb: [
      { label: item.topic, level: 'topic' },
      { label: item.subtopic, level: 'subtopic' }
    ],
    extractedInfo: buildExtractedInfo(item),
    fullText: buildFullText(item),
    fullTextStatus: 'ready',
    basicInfo: buildBasicInfo(item),
    topics: buildTopics(item),
    multimodalMeta: buildMultimodalMeta(item),
    relations: buildRelations(item)
  }
}

/* -------------------------------------------------------------- state */

/* searchValue: 실제 필터링/URL/적용조건에 쓰이는 "커밋된" 검색어.
   searchDraft: 입력창에 타이핑 중인 값 — Enter를 누르기 전까진 결과에 반영되지 않는다.
   대용량 데이터를 가정하면 키 입력마다 서버 왕복·전체 스캔이 일어나선 안 되므로,
   커밋 시점을 명시적으로 분리한다 */
const searchValue = ref('흉부')
const searchDraft = ref(searchValue.value)
const searchFocused = ref(false)
const resultSearchValue = ref('')
const resultSearchDraft = ref('')
const topics = ref(['의료'])
const subtopics = ref(['영상검사'])
const tags = ref(['#흉부'])
const facetModal = ref(null)
const facetQuery = ref('')
const facetDraft = ref([])
const dateFrom = ref(null)
const dateTo = ref(null)
const datePickerOpen = ref(false)
const fileTypes = ref([])
const sizeRange = ref('')
const selectedIds = ref([])
const visibleCount = ref(20)
const sortKey = ref('date')
const sortDir = ref('desc')
const toastMessage = ref('')
const profileImageError = ref(false)
const headerVisible = ref(true)
const fileDetailOpen = ref(false)
const fileDetailTarget = ref(null)
const paletteOpen = ref(false)
const density = ref(readStoredDensity())

let lastScrollY = 0

/* ------------------------------------------------------------- reveal-in */

const revealed = ref({ hero: false, filter: false, results: false })
const LOAD_BATCH_SIZE = 20
const loadMoreRef = ref(null)
let loadObserver = null

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

/* 공백으로 구분된 각 키워드는 AND로 묶인다 — 검색창 하나로
   "결과 내 재검색"이 하던 좁히기를 대신한다 */
const searchTerms = computed(() => searchValue.value.trim().split(/\s+/).filter(Boolean))
const resultSearchTerms = computed(() => resultSearchValue.value.trim().split(/\s+/).filter(Boolean))

/* 입력값이 아직 결과에 반영되지 않은 상태 — 작아진 검색창에서 이걸 알려주지 않으면
   사용자는 자기가 친 글자가 왜 안 먹는지 알 수 없다 */
const searchDirty = computed(() => searchDraft.value.trim() !== searchValue.value)

/* 드롭다운 안으로 포커스가 옮겨간 경우는 닫지 않는다 */
function onSearchFocusOut(e) {
  if (e.currentTarget.contains(e.relatedTarget)) return
  searchFocused.value = false
}

/* Enter로만 커밋한다 — 타이핑 중엔 filteredRows/패싯/URL 어느 것도 움직이지 않는다 */
function commitSearch() {
  searchValue.value = searchDraft.value.trim()
}
/* 칩 제거·추천검색어 클릭은 타이핑이 아니라 한 번의 명확한 클릭이므로 즉시 반영하고,
   입력창 내용도 함께 맞춰 커밋된 값과 어긋나지 않게 한다 */
function setSearch(v) {
  searchDraft.value = v
  searchValue.value = v
}
function removeSearchTerm(term) {
  setSearch(searchTerms.value.filter((t) => t !== term).join(' '))
}
function commitResultSearch() {
  resultSearchValue.value = resultSearchDraft.value.trim()
}
function setResultSearch(v) {
  resultSearchDraft.value = v
  resultSearchValue.value = v
}

/* 차원별 술어를 분리해 두면, 특정 차원만 빼고 적용한 집합을 만들 수 있다.
   패싯 카운트는 "그 차원을 제외한 나머지 조건"에서 세야 옳다 */
const PREDICATES = {
  topic: (f) => !topics.value.length || topics.value.includes(f.topic),
  subtopic: (f) => !subtopics.value.length || subtopics.value.includes(f.subtopic),
  tag: (f) => !tags.value.length || f.tags.some((t) => tags.value.includes(t)),
  fileType: (f) => !fileTypes.value.length || fileTypes.value.includes(f.ext),
  size: (f) => matchesSizeRange(f.sizeMB, sizeRange.value),
  date: (f) => {
    const from = toISODate(dateFrom.value)
    const to = toISODate(dateTo.value)
    return (!from || f.date >= from) && (!to || f.date <= to)
  },
  search: (f) => {
    const terms = searchTerms.value.map((t) => t.toLowerCase())
    if (!terms.length) return true
    const haystack = `${f.name} ${f.category} ${f.topic} ${f.subtopic} ${f.tags.join(' ')}`.toLowerCase()
    return terms.every((t) => haystack.includes(t))
  },
  resultSearch: (f) => {
    const terms = resultSearchTerms.value.map((t) => t.toLowerCase())
    if (!terms.length) return true
    const haystack = `${f.name} ${f.category} ${f.ext} ${f.tags.join(' ')}`.toLowerCase()
    return terms.every((t) => haystack.includes(t))
  }
}
const DIMENSIONS = Object.keys(PREDICATES)

function rowsExcept(dimension) {
  return files.filter((f) => DIMENSIONS.every((d) => d === dimension || PREDICATES[d](f)))
}

const filteredRows = computed(() => rowsExcept(null))

function countBy(rows, pick) {
  const m = Object.create(null)
  rows.forEach((f) => {
    const keys = pick(f)
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k) => {
      m[k] = (m[k] || 0) + 1
    })
  })
  return m
}

const topicCounts = computed(() => countBy(rowsExcept('topic'), (f) => f.topic))
const subtopicCounts = computed(() => countBy(rowsExcept('subtopic'), (f) => f.subtopic))
const tagCounts = computed(() => countBy(rowsExcept('tag'), (f) => f.tags))
const fileTypeCounts = computed(() => countBy(rowsExcept('fileType'), (f) => f.ext))
const datePresetCounts = computed(() => {
  const rows = rowsExcept('date')
  const todayISO = toISODate(new Date())
  const m = Object.create(null)
  DATE_PRESETS.forEach((preset) => {
    const from = new Date()
    from.setDate(from.getDate() - (preset.days - 1))
    const fromISO = toISODate(from)
    m[preset.days] = rows.filter((f) => f.date >= fromISO && f.date <= todayISO).length
  })
  return m
})

const sizeCounts = computed(() => {
  const rows = rowsExcept('size')
  const m = Object.create(null)
  SIZE_RANGE_OPTIONS.forEach((o) => {
    m[o.value] = rows.filter((f) => matchesSizeRange(f.sizeMB, o.value)).length
  })
  return m
})

const sortedRows = computed(() => {
  const rows = filteredRows.value.slice()
  const dir = sortDir.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    if (sortKey.value === 'name') return a.name.localeCompare(b.name, 'ko') * dir
    if (sortKey.value === 'size') return (a.sizeMB - b.sizeMB) * dir
    return a.date.localeCompare(b.date) * dir
  })
  return rows
})

const visibleRows = computed(() => sortedRows.value.slice(0, visibleCount.value))
const visibleIds = computed(() => visibleRows.value.map((r) => r.id))
const allVisibleSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedIds.value.includes(id)))
const allResultsSelected = computed(() => sortedRows.value.length > 0 && selectedIds.value.length === sortedRows.value.length)
/* 현재 표시 목록을 다 골랐는데 결과가 더 남아 있으면 전체 선택을 제안한다 */
const canSelectAllResults = computed(() => allVisibleSelected.value && sortedRows.value.length > visibleRows.value.length)

watch([topics, subtopics, tags, fileTypes, sizeRange, dateFrom, dateTo, searchValue, resultSearchValue, sortKey, sortDir], () => {
  visibleCount.value = LOAD_BATCH_SIZE
})

/* 조건이 바뀌어 결과에서 빠진 파일은 선택 상태로 남기지 않는다 —
   툴바가 화면에 없는 파일을 "N건 선택됨"으로 세는 것을 막기 위함 */
watch(filteredRows, (rows) => {
  if (selectedIds.value.length === 0) return
  const visible = new Set(rows.map((r) => r.id))
  selectedIds.value = selectedIds.value.filter((id) => visible.has(id))
})

watch(topics, () => {
  const allowed = new Set(availableSubtopics.value)
  subtopics.value = subtopics.value.filter((s) => allowed.has(s))
})
watch(subtopics, () => {
  const allowed = new Set(availableTags.value)
  tags.value = tags.value.filter((t) => allowed.has(t))
})

/* --------------------------------------------------------------- labels */

const resultKeywordPrefix = computed(() => {
  if (searchTerms.value.length) return `"${searchTerms.value.join(' ')}" 검색결과 `
  if (appliedConditions.value.length) return '검색결과 '
  return '전체 파일 '
})

/* -------------------------------------------------------- topic/subtopic/tag hierarchy */

/* 칩은 label/active에 더해 count를 싣는다. count 0이면서 선택돼 있지도 않은
   항목은 고르면 결과가 비므로 막는다 — 막다른 길을 누르기 전에 보이게 */
function toChip(label, active, count) {
  return { label, active, count, disabled: count === 0 && !active }
}

/* 선택한 항목은 카운트와 무관하게 늘 보이고, 나머지는 결과 많은 순으로 채운다 */
function topFacetChips(all, selectedList, counts) {
  const chips = all.map((v) => toChip(v, selectedList.includes(v), counts[v] || 0))
  const picked = chips.filter((c) => c.active)
  const rest = chips.filter((c) => !c.active).sort((a, b) => b.count - a.count)
  return [...picked, ...rest].slice(0, Math.max(FACET_VISIBLE_COUNT, picked.length))
}

const visibleTopicChips = computed(() => topFacetChips(TOPIC_OPTIONS, topics.value, topicCounts.value))

const availableSubtopics = computed(() => {
  const set = new Set()
  topics.value.forEach((t) => (TOPIC_SUBTOPIC_MAP[t] || []).forEach((s) => set.add(s)))
  return SUBTOPIC_OPTIONS.filter((s) => set.has(s))
})
const subtopicChips = computed(() => topFacetChips(availableSubtopics.value, subtopics.value, subtopicCounts.value))

const availableTags = computed(() => {
  const set = new Set()
  subtopics.value.forEach((s) => (SUBTOPIC_TAG_MAP[s] || []).forEach((t) => set.add(t)))
  return TAG_OPTIONS.filter((t) => set.has(t))
})

/* -------------------------------------------------------------- chips */

const visibleTagChips = computed(() => topFacetChips(availableTags.value, tags.value, tagCounts.value))

const fileTypeChips = computed(() => FILE_TYPE_OPTIONS.map((v) => toChip(v, fileTypes.value.includes(v), fileTypeCounts.value[v] || 0)))
const sizeRangeChips = computed(() =>
  SIZE_RANGE_OPTIONS.map((o) => ({ ...toChip(o.label, sizeRange.value === o.value, sizeCounts.value[o.value] || 0), value: o.value }))
)

const dateRangeLabel = computed(() => {
  if (!dateFrom.value && !dateTo.value) return '전체 기간'
  if (dateFrom.value && dateTo.value) return `${formatDateLabel(dateFrom.value)} ~ ${formatDateLabel(dateTo.value)}`
  if (dateFrom.value) return `${formatDateLabel(dateFrom.value)} 이후`
  return `${formatDateLabel(dateTo.value)} 이전`
})

/* ------------------------------------------------------ applied conditions */

const appliedConditions = computed(() => [
  ...searchTerms.value.map((t) => ({ label: `검색어: ${t}`, remove: () => removeSearchTerm(t) })),
  ...(resultSearchTerms.value.length
    ? [{ label: `목록 좁히기: ${resultSearchValue.value}`, remove: () => setResultSearch('') }]
    : []),
  ...topics.value.map((t) => ({ label: `주제: ${t}`, remove: () => (topics.value = topics.value.filter((x) => x !== t)) })),
  ...subtopics.value.map((t) => ({ label: `하위주제: ${t}`, remove: () => (subtopics.value = subtopics.value.filter((x) => x !== t)) })),
  ...tags.value.map((t) => ({ label: `태그: ${t}`, remove: () => (tags.value = tags.value.filter((x) => x !== t)) })),
  ...fileTypes.value.map((t) => ({ label: `형식: ${t}`, remove: () => (fileTypes.value = fileTypes.value.filter((x) => x !== t)) })),
  ...(sizeRange.value
    ? [{ label: `크기: ${SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange.value).label}`, remove: () => (sizeRange.value = '') }]
    : []),
  ...(dateFrom.value || dateTo.value
    ? [{
        label: `기간: ${dateRangeLabel.value}`,
        remove: () => { dateFrom.value = null; dateTo.value = null }
      }]
    : [])
])

function clearAllConditions() {
  searchDraft.value = ''
  searchValue.value = ''
  resultSearchDraft.value = ''
  resultSearchValue.value = ''
  topics.value = []
  subtopics.value = []
  tags.value = []
  fileTypes.value = []
  sizeRange.value = ''
  dateFrom.value = null
  dateTo.value = null
}

/* ------------------------------------------------------------- actions */

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = SORTABLE[key]
}
function ariaSortFor(key) {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

function applyDatePreset(days) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  dateFrom.value = from
  dateTo.value = to
}

/* 위치 계산·바깥 클릭·Escape 는 APopover 가 자체적으로 처리한다 —
   범위 완성 시에만 여기서 닫아준다 */
function onDateRangeEnd(date) {
  if (date) datePickerOpen.value = false
}

function isDatePresetActive(days) {
  if (!dateFrom.value || !dateTo.value) return false
  const expectedFrom = new Date()
  expectedFrom.setDate(expectedFrom.getDate() - (days - 1))
  return toISODate(dateFrom.value) === toISODate(expectedFrom) && toISODate(dateTo.value) === toISODate(new Date())
}

function selectAllResults() {
  selectedIds.value = sortedRows.value.map((r) => r.id)
}

function toggleSelectAllVisible() {
  selectedIds.value = allVisibleSelected.value
    ? selectedIds.value.filter((id) => !visibleIds.value.includes(id))
    : [...new Set([...selectedIds.value, ...visibleIds.value])]
}

function loadMoreRows() {
  if (visibleCount.value >= sortedRows.value.length) return
  visibleCount.value = Math.min(visibleCount.value + LOAD_BATCH_SIZE, sortedRows.value.length)
}

function observeLoadMore() {
  if (!loadObserver || !loadMoreRef.value) return
  loadObserver.observe(loadMoreRef.value)
}

function toggleRowSelect(id) {
  selectedIds.value = toggleIn(selectedIds.value, id)
}

let toastTimer = null
function showToast(message) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMessage.value = ''), 2500)
}
function bulkDownload() {
  showToast(`${selectedIds.value.length}개 파일 다운로드를 시작합니다.`)
  selectedIds.value = []
}
function downloadOne(item) {
  showToast(`${item.name} 다운로드를 시작합니다.`)
}

/* --------------------------------------------------------- 파일 상세 모달 */

/* AFileDetailModal 이 포커스 저장/복귀를 스스로 처리하므로 여는 쪽은 대상만 쥐면 된다 */
function openFileDetail(item) {
  fileDetailTarget.value = item
  fileDetailOpen.value = true
}
function closeFileDetail() {
  fileDetailOpen.value = false
}
/* 체크박스나 액션 버튼을 누른 것은 행 열기로 치지 않는다 */
function onRowClick(item, e) {
  if (e.target.closest('button, input, label')) return
  openFileDetail(item)
}

const fileDetail = computed(() => buildFileDetail(fileDetailTarget.value))
const fileDetailIcon = computed(() => (fileDetailTarget.value ? ICON_BY_EXT[fileDetailTarget.value.ext] : null))

function onDownloadOriginal(detail) {
  showToast(`${detail.name} 다운로드를 시작합니다.`)
}
function onDownloadZip(detail) {
  showToast(`${detail.name}의 관계 파일을 ZIP으로 묶어 다운로드합니다.`)
}
async function onCopyLinkDetail(detail) {
  try {
    await navigator.clipboard.writeText(window.location.href)
    showToast(`${detail.name} 링크를 복사했습니다.`)
  } catch {
    showToast('링크 복사에 실패했습니다.')
  }
}
/* 주제 크럼은 대분류만, 하위주제 크럼은 대분류+하위주제를 함께 건다 —
   하위주제 필터는 대분류가 선택돼 있어야 열리는 잠금 구조를 그대로 따른다 */
function onBreadcrumbClickDetail(crumb) {
  const item = fileDetailTarget.value
  if (!item) return
  if (!topics.value.includes(item.topic)) topics.value = [...topics.value, item.topic]
  if (crumb.level === 'subtopic' && !subtopics.value.includes(item.subtopic)) {
    subtopics.value = [...subtopics.value, item.subtopic]
  }
  closeFileDetail()
}
function onTopicClickDetail() {
  const item = fileDetailTarget.value
  if (!item) return
  if (!topics.value.includes(item.topic)) topics.value = [...topics.value, item.topic]
  if (!subtopics.value.includes(item.subtopic)) subtopics.value = [...subtopics.value, item.subtopic]
  closeFileDetail()
}
function onMetaClickDetail(meta) {
  if (!tags.value.includes(meta.label)) tags.value = [...tags.value, meta.label]
  closeFileDetail()
}
function onRelationClickDetail(relation) {
  const item = files.find((f) => String(f.id) === relation.id)
  if (item) openFileDetail(item)
}

/* ------------------------------------------------------ 패싯 전체 보기 모달 */

const FACET_CONFIG = {
  topic: { title: '주제', all: () => TOPIC_OPTIONS, selected: topics, counts: () => topicCounts.value },
  subtopic: { title: '하위주제', all: () => availableSubtopics.value, selected: subtopics, counts: () => subtopicCounts.value },
  tag: { title: '태그', all: () => availableTags.value, selected: tags, counts: () => tagCounts.value }
}

function openFacetModal(key) {
  facetQuery.value = ''
  facetDraft.value = [...FACET_CONFIG[key].selected.value]
  facetModal.value = key
}
function closeFacetModal() {
  facetModal.value = null
}
function confirmFacetModal() {
  FACET_CONFIG[facetModal.value].selected.value = facetDraft.value
  closeFacetModal()
}

const facetModalTitle = computed(() => (facetModal.value ? FACET_CONFIG[facetModal.value].title : ''))
const facetModalTotal = computed(() => (facetModal.value ? FACET_CONFIG[facetModal.value].all().length : 0))

/* 모달은 가나다순 — 체크하는 동안 카운트가 변해도 목록이 눈앞에서 재정렬되면 안 된다 */
const facetModalRows = computed(() => {
  if (!facetModal.value) return []
  const cfg = FACET_CONFIG[facetModal.value]
  const counts = cfg.counts()
  const picked = facetDraft.value
  const q = facetQuery.value.trim().toLowerCase()
  return cfg
    .all()
    .filter((v) => !q || v.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .map((v) => ({ label: v, active: picked.includes(v), count: counts[v] || 0 }))
})

function toggleFacetValue(label) {
  facetDraft.value = toggleIn(facetDraft.value, label)
}

/* --------------------------------------------------------- command palette */

const paletteRef = ref(null)

const paletteItems = computed(() => [
  ...DENSITY_OPTIONS.map((o) => ({ label: `밀도: ${o.label}`, hint: '보기', kind: 'density', value: o.value })),
  ...(appliedConditions.value.length ? [{ label: '조건 모두 해제', hint: '동작', kind: 'clear' }] : []),
  ...TOPIC_OPTIONS.map((v) => ({ label: v, hint: '주제', kind: 'topic', value: v })),
  ...availableSubtopics.value.map((v) => ({ label: v, hint: '하위주제', kind: 'subtopic', value: v })),
  ...availableTags.value.map((v) => ({ label: v, hint: '태그', kind: 'tag', value: v })),
  ...FILE_TYPE_OPTIONS.map((v) => ({ label: v, hint: '형식', kind: 'fileType', value: v })),
  ...sortedRows.value.slice(0, 50).map((f) => ({ label: f.name, hint: '파일', kind: 'file', value: f.id }))
])

function openPalette() {
  paletteOpen.value = true
  nextTick(() => {
    paletteRef.value?.reset()
    paletteRef.value?.focus()
  })
}
function closePalette() {
  paletteOpen.value = false
}
function runPaletteItem(item) {
  if (item.kind === 'density') density.value = item.value
  else if (item.kind === 'clear') clearAllConditions()
  else if (item.kind === 'topic') topics.value = toggleIn(topics.value, item.value)
  else if (item.kind === 'subtopic') subtopics.value = toggleIn(subtopics.value, item.value)
  else if (item.kind === 'tag') tags.value = toggleIn(tags.value, item.value)
  else if (item.kind === 'fileType') fileTypes.value = toggleIn(fileTypes.value, item.value)
  else if (item.kind === 'file') {
    const f = files.find((x) => x.id === item.value)
    if (f) openFileDetail(f)
  }
  closePalette()
}

function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteOpen.value ? closePalette() : openPalette()
    return
  }
  if (e.key !== 'Escape') return
  if (paletteOpen.value) closePalette()
  else if (facetModal.value) closeFacetModal()
  else if (fileDetailOpen.value) closeFileDetail()
}

function clearDateRange() {
  dateFrom.value = null
  dateTo.value = null
}

/* --------------------------------------------------------- URL 상태 동기화 */

/* 조건을 해시 쿼리에 실어 새로고침/공유에도 같은 화면이 열리게 한다.
   선택(selectedIds)은 일시적인 작업 상태라 URL에 넣지 않는다 */
const HASH_ROUTE = '#file-search'
let urlWriteTimer = null
let applyingFromUrl = false

function parseHashParams() {
  if (!location.hash.startsWith(HASH_ROUTE)) return null
  return new URLSearchParams(location.hash.slice(HASH_ROUTE.length).replace(/^\?/, ''))
}
function splitParam(v) {
  return v ? v.split(',').filter(Boolean) : []
}
function parseISODate(v) {
  if (!v) return null
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function buildHash() {
  const p = new URLSearchParams()
  const q = searchValue.value.trim()
  if (q) p.set('q', q)
  if (resultSearchValue.value.trim()) p.set('within', resultSearchValue.value.trim())
  if (topics.value.length) p.set('topic', topics.value.join(','))
  if (subtopics.value.length) p.set('sub', subtopics.value.join(','))
  if (tags.value.length) p.set('tag', tags.value.join(','))
  if (fileTypes.value.length) p.set('type', fileTypes.value.join(','))
  if (sizeRange.value) p.set('size', sizeRange.value)
  if (dateFrom.value) p.set('from', toISODate(dateFrom.value))
  if (dateTo.value) p.set('to', toISODate(dateTo.value))
  if (sortKey.value !== 'date' || sortDir.value !== 'desc') p.set('sort', `${sortKey.value}:${sortDir.value}`)
  const qs = p.toString()
  return qs ? `${HASH_ROUTE}?${qs}` : HASH_ROUTE
}

function writeUrl() {
  const next = buildHash()
  /* pushState 를 쓰면 글자 하나마다 히스토리가 쌓인다 — 뒤로가기는
     "이 페이지를 떠난다"로 두고 URL 은 항상 현재 상태를 가리키게 한다 */
  if (location.hash !== next) history.replaceState(null, '', next)
}
function scheduleUrlWrite() {
  clearTimeout(urlWriteTimer)
  urlWriteTimer = setTimeout(writeUrl, 200)
}

function applyUrlState() {
  const p = parseHashParams()
  if (!p) return
  applyingFromUrl = true
  searchValue.value = p.get('q') || ''
  searchDraft.value = searchValue.value
  resultSearchValue.value = p.get('within') || ''
  resultSearchDraft.value = resultSearchValue.value
  topics.value = splitParam(p.get('topic'))
  subtopics.value = splitParam(p.get('sub'))
  tags.value = splitParam(p.get('tag'))
  fileTypes.value = splitParam(p.get('type'))
  sizeRange.value = p.get('size') || ''
  dateFrom.value = parseISODate(p.get('from'))
  dateTo.value = parseISODate(p.get('to'))
  const [k, d] = (p.get('sort') || '').split(':')
  sortKey.value = SORTABLE[k] ? k : 'date'
  sortDir.value = d === 'asc' || d === 'desc' ? d : 'desc'
  applyingFromUrl = false
}

watch(
  [searchValue, resultSearchValue, topics, subtopics, tags, fileTypes, sizeRange, dateFrom, dateTo, sortKey, sortDir],
  () => {
    if (applyingFromUrl) return
    scheduleUrlWrite()
  },
  { deep: true }
)

onMounted(() => {
  lastScrollY = window.scrollY
  applyUrlState()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('hashchange', applyUrlState)
  window.addEventListener('keydown', onGlobalKeydown)
  if ('IntersectionObserver' in window) {
    loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRows()
      },
      { rootMargin: '240px 0px' }
    )
    observeLoadMore()
  }

  requestAnimationFrame(() => {
    revealed.value = { hero: true, filter: true, results: true }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
  window.removeEventListener('hashchange', applyUrlState)
  window.removeEventListener('keydown', onGlobalKeydown)
  loadObserver?.disconnect()
  loadObserver = null
  clearTimeout(urlWriteTimer)
  clearTimeout(toastTimer)
})

/* data-table.css 의 --table-cell-padding-* 은 :root 에서 한 번 계산돼 상속되므로,
   밀도를 하위 요소에 걸면 패딩이 따라오지 않는다. 문서 루트에 건다 */
watch(density, (v) => {
  document.documentElement.dataset.density = v
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, v)
  } catch {
    /* 저장할 수 없으면 이번 세션에만 적용된다 */
  }
}, { immediate: true })

/* 결과에서 사라진 파일의 상세 모달은 닫는다 */
watch(filteredRows, (rows) => {
  if (fileDetailTarget.value && !rows.some((r) => r.id === fileDetailTarget.value.id)) closeFileDetail()
})
</script>

<template>
  <div class="min-h-screen bg-bg-canvas font-sans text-text-primary">
    <header
      class="h-14 flex items-center justify-between px-8 bg-bg-surface border-b border-slate-100 sticky top-0 z-10 transition-transform duration-300 ease-out"
      :class="headerVisible ? 'translate-y-0' : '-translate-y-full'"
    >
      <div class="flex items-center gap-8 min-w-0">
        <a href="#file-search" class="flex items-center shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          <img :src="logoUrl" alt="AuroraFS · 파일 검색 홈으로 이동" class="h-5 w-auto object-contain" />
        </a>
        <nav class="flex items-center gap-1">
          <a href="#" class="flex items-center h-8 px-3 rounded-md text-base font-medium text-text-secondary no-underline hover:bg-bg-surface-hover">멀티모달 검색</a>
          <a href="#" class="flex items-center h-8 px-3 rounded-md text-base font-semibold text-text-primary no-underline bg-slate-100">파일 검색</a>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 bg-transparent border-none cursor-pointer py-1 px-2 rounded-md hover:bg-bg-surface-hover">
          <img
            v-if="!profileImageError"
            src="https://api.dicebear.com/9.x/notionists/svg?seed=hong-gildong&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear"
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

    <!-- xl 이상: 필터는 왼쪽에 고정된 채 자기 스크롤을 갖고, 본문만 남은 폭을 채우며 늘어난다
         (레퍼런스의 앱쉘 구조). 그 아래 화면은 지금까지 검증된 단일 스크롤 레이아웃을 그대로 둔다 —
         좁은 화면에서 독립 스크롤 두 개를 쓰면 오히려 더 불편하다 -->
    <main class="max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-16 flex flex-col gap-8 xl:max-w-none xl:mx-0 xl:px-0 xl:py-0 xl:h-[calc(100vh-56px)] xl:overflow-hidden">
      <div class="grid grid-cols-1 xl:flex gap-6 xl:gap-0 items-start xl:items-stretch xl:h-full">
        <!-- 필터 사이드바 -->
        <aside
          aria-label="검색 필터"
          class="flex flex-col gap-5 self-start bg-bg-surface transition-[opacity,transform] duration-[var(--duration-slow)] ease-standard xl:w-[var(--sidebar-width)] xl:shrink-0 xl:h-full xl:overflow-y-auto xl:border-r xl:border-border-default xl:pl-6 xl:pr-5 xl:pt-8 xl:pb-16"
          :class="revealed.filter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'"
          style="transition-delay: 60ms"
        >
          <h2 class="m-0 text-lg font-bold text-text-primary">필터</h2>
          <div class="border-b border-slate-100 -mt-2"></div>

          <div class="flex flex-col gap-3" role="group" aria-label="주제">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-text-primary">주제</span>
              <button v-if="topics.length" class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="topics = []">해제</button>
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <AFilterChip
                v-for="chip in visibleTopicChips"
                :key="chip.label"
                :label="chip.label"
                :count="chip.count"
                :active="chip.active"
                :disabled="chip.disabled"
                @click="topics = toggleIn(topics, chip.label)"
              />
              <button
                v-if="TOPIC_OPTIONS.length > visibleTopicChips.length"
                class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
                @click="openFacetModal('topic')"
              >
                전체 보기 ({{ TOPIC_OPTIONS.length }}개)
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="하위주제">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold" :class="topics.length ? 'text-text-primary' : 'text-text-tertiary'">하위주제</span>
              <button v-if="subtopics.length" class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="subtopics = []">해제</button>
            </div>
            <AEmptyState v-if="topics.length === 0" size="sm" :icon="Lock" :description="'주제를 먼저 선택하면\n하위주제가 열립니다'" />
            <div v-else class="flex gap-2 flex-wrap items-center">
              <AFilterChip
                v-for="chip in subtopicChips"
                :key="chip.label"
                :label="chip.label"
                :count="chip.count"
                :active="chip.active"
                :disabled="chip.disabled"
                @click="subtopics = toggleIn(subtopics, chip.label)"
              />
              <button
                v-if="availableSubtopics.length > subtopicChips.length"
                class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
                @click="openFacetModal('subtopic')"
              >
                전체 보기 ({{ availableSubtopics.length }}개)
              </button>
              <span v-if="subtopicChips.length === 0" class="text-xs text-text-tertiary">해당 주제의 하위주제가 없습니다.</span>
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="태그">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold" :class="subtopics.length ? 'text-text-primary' : 'text-text-tertiary'">태그</span>
              <button v-if="tags.length" class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="tags = []">해제</button>
            </div>
            <AEmptyState v-if="subtopics.length === 0" size="sm" :icon="Lock" :description="'하위주제를 먼저 선택하면\n관련 태그가 열립니다'" />
            <div v-else class="flex gap-2 flex-wrap items-center">
              <AFilterChip
                v-for="chip in visibleTagChips"
                :key="chip.label"
                :label="chip.label"
                :active="chip.active"
                :disabled="chip.disabled"
                @click="tags = toggleIn(tags, chip.label)"
              />
              <button
                v-if="availableTags.length > visibleTagChips.length"
                class="h-[30px] px-2 bg-transparent border-none text-xs text-action-primary font-medium cursor-pointer whitespace-nowrap hover:text-action-primary-hover hover:underline"
                @click="openFacetModal('tag')"
              >
                전체 보기 ({{ availableTags.length }}개)
              </button>
              <span v-if="visibleTagChips.length === 0" class="text-xs text-text-tertiary">해당 하위주제의 태그가 없습니다.</span>
            </div>
          </div>
          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="파일 형식">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-text-primary">파일 형식</span>
              <button v-if="fileTypes.length" class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="fileTypes = []">해제</button>
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <AFilterChip
                v-for="chip in fileTypeChips"
                :key="chip.label"
                :label="chip.label"
                :active="chip.active"
                :disabled="chip.disabled"
                @click="fileTypes = toggleIn(fileTypes, chip.label)"
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
                @click="sizeRange = chip.value"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="기간">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-text-primary">기간</span>
              <button v-if="dateFrom || dateTo" class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover" @click="clearDateRange">해제</button>
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <AFilterChip
                v-for="preset in DATE_PRESETS"
                :key="preset.days"
                :label="preset.label"
                :active="isDatePresetActive(preset.days)"
                :disabled="datePresetCounts[preset.days] === 0 && !isDatePresetActive(preset.days)"
                @click="applyDatePreset(preset.days)"
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
                  v-model:start="dateFrom"
                  v-model:end="dateTo"
                  @update:end="onDateRangeEnd"
                />
              </template>
            </APopover>
          </div>
        </aside>

        <!-- 결과: xl 이상에서는 이 컬럼 자체가 여백 없는 2단 구조다 —
             위(헤더 묶음)는 고정, 아래(테이블)만 남은 세로 공간을 채우며 자체 스크롤한다.
             감싸는 이 div 에는 패딩을 두지 않는다 -->
        <div
          class="flex flex-col gap-3 min-w-0 transition-[opacity,transform] duration-[var(--duration-slow)] ease-standard xl:gap-0 xl:flex-1 xl:h-full xl:overflow-hidden"
          :class="revealed.results ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'"
          style="transition-delay: 120ms"
        >
          <!-- 검색바 구역: 흰 배경 + 하단 구분선. 선은 이 바깥 wrapper 자체의 테두리라
               안쪽 xl:px-5 패딩과 무관하게 가장자리까지 꽉 찬다(padding 은 border 안쪽에서만 적용된다) -->
          <div class="flex flex-col gap-3 bg-bg-surface border-b border-slate-100 xl:shrink-0 xl:px-5 xl:pt-4 xl:pb-4">
          <!-- 타이틀과 검색은 결과 열의 머리다 — 전체 폭 띠로 두면 화면이 T 자로 잘린다.
               h1 은 빼지 않고 위계만 낮춰(28px -> 20px) 검색바와 같은 줄에 둔다 -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-3">
            <div class="flex items-center gap-3 min-w-0">
              <h1 class="m-0 text-xl font-semibold text-text-primary tracking-tight shrink-0">파일 검색</h1>
              <span class="w-px h-4 bg-border-default shrink-0" aria-hidden="true"></span>
              <p class="m-0 text-sm text-text-tertiary truncate">수만 건의 자료를 조건별로 필터링합니다.</p>
            </div>
            <div class="relative w-full sm:w-[420px] max-w-full shrink-0" @focusin="searchFocused = true" @focusout="onSearchFocusOut">
              <!-- 그림자는 래퍼에 — 전역 input{box-shadow:none} 이 레이어 밖이라 유틸리티를 이긴다.
                   라운드를 md(6px)에서 xl(12px)로 깊게 줘서 히어로급 존재감을 만든다 -->
              <div class="absolute inset-0 rounded-xl shadow-elevation-1 pointer-events-none"></div>
              <AInput
                v-model="searchDraft"
                search
                placeholder="파일명, 키워드 검색"
                class="relative [&_input]:h-10 [&_input]:text-md [&_input]:rounded-xl [&_input]:pl-11 [&_input]:pr-20 [&_svg]:left-3.5"
                @keydown.enter.prevent="commitSearch"
              />
              <!-- 커밋 전에는 Enter 안내, 커밋된 값이 있으면 지우기, 비어 있을 땐 ⌘K 단축키 힌트.
                   ⌘K 는 팔레트를 여는 동일한 동작이라 배지를 눌러도 openPalette 로 간다 —
                   보이는 것과 실제 동작이 어긋나지 않게 -->
              <span
                v-if="searchDirty"
                aria-hidden="true"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 px-1.5 inline-flex items-center rounded border border-border-default bg-bg-canvas text-2xs text-text-tertiary pointer-events-none"
              >
                ⏎
              </span>
              <button
                v-else-if="searchDraft"
                aria-label="검색어 지우기"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover hover:text-text-primary"
                @click="setSearch('')"
              >
                <X :size="13" :stroke-width="1.5" />
              </button>
              <button
                v-else
                type="button"
                aria-label="명령 팔레트 열기 (Cmd/Ctrl+K)"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                @click="openPalette"
              >
                <kbd class="h-5 min-w-5 px-1 inline-flex items-center justify-center rounded border border-border-default bg-bg-canvas text-2xs font-medium text-text-tertiary font-sans">⌘</kbd>
                <kbd class="h-5 min-w-5 px-1 inline-flex items-center justify-center rounded border border-border-default bg-bg-canvas text-2xs font-medium text-text-tertiary font-sans">K</kbd>
              </button>

              <div
                v-if="searchFocused && !searchDraft"
                class="absolute top-[calc(100%+6px)] right-0 w-full z-30 p-1.5 flex flex-col gap-1 bg-bg-surface border border-border-default rounded-md shadow-elevation-2"
              >
                <span class="px-2 pt-1 text-2xs text-text-tertiary">추천 검색어</span>
                <button
                  v-for="kw in SUGGESTED_KEYWORDS"
                  :key="kw"
                  class="text-left px-2 py-1.5 rounded-sm bg-transparent border-none text-sm text-text-primary cursor-pointer hover:bg-bg-surface-hover"
                  @mousedown.prevent="setSearch(kw)"
                >
                  #{{ kw }}
                </button>
                <p class="m-0 px-2 py-1.5 border-t border-slate-100 text-2xs text-text-tertiary">
                  띄어쓰기로 여러 키워드를 묶을 수 있습니다 · Enter로 검색
                </p>
              </div>
            </div>
          </div>
          </div>

          <!-- 검색바 구역 아래는 전부 옅은 회색 zone — 선 대신 배경색 대비로 경계를 표현한다 -->
          <div class="flex flex-col gap-3 bg-bg-canvas xl:flex-1 xl:min-h-0 xl:overflow-hidden">
          <div class="flex flex-col gap-3 xl:shrink-0 xl:px-5 xl:pt-3">
          <div
            v-if="appliedConditions.length > 0"
            class="flex items-center gap-2 flex-wrap bg-bg-surface-selected border border-primary-100 rounded-md py-2 px-3"
          >
            <span class="text-xs text-text-tertiary font-medium shrink-0">적용 조건 {{ appliedConditions.length }}</span>
            <button
              v-for="cond in appliedConditions"
              :key="cond.label"
              :aria-label="`${cond.label} 조건 제거`"
              class="flex items-center gap-1 h-[24px] px-2 bg-bg-surface border border-[var(--color-primary-200)] rounded text-2xs text-primary-700 font-medium cursor-pointer hover:bg-primary-50"
              @click="cond.remove"
            >
              {{ cond.label }} <span aria-hidden="true" class="text-[10px] text-text-tertiary">✕</span>
            </button>
            <button class="ml-auto shrink-0 bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:underline hover:text-action-primary-hover" @click="clearAllConditions">모두 해제</button>
          </div>

          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="text-md text-text-primary" aria-live="polite">
              {{ resultKeywordPrefix }}<span class="font-bold text-action-primary">{{ filteredRows.length.toLocaleString() }}</span><span class="font-bold">건</span>
              <!-- 조건이 없으면 필터링 대상 = 전체이므로 "전체 N건 중"이 숫자만 반복하는 중복 표현이 된다 -->
              <span v-if="appliedConditions.length > 0" class="text-sm text-text-tertiary font-normal ml-2">(전체 {{ files.length.toLocaleString() }}건 중)</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <!-- 메인 검색과 '같은 종류'로 보이지 않도록 고스트 + 깔때기 아이콘 + '검색' 단어 제거 -->
              <div class="relative w-[190px] group">
                <ListFilter
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-icon-muted pointer-events-none"
                  :size="14"
                  :stroke-width="1.5"
                />
                <AInput
                  v-model="resultSearchDraft"
                  placeholder="목록 좁히기"
                  class="[&_input]:h-8 [&_input]:text-sm [&_input]:pl-8 [&_input]:pr-8 [&_input]:bg-slate-100 [&_input]:border-transparent hover:[&_input]:bg-slate-200"
                  @keydown.enter.prevent="commitResultSearch"
                />
                <button
                  v-if="resultSearchDraft"
                  aria-label="목록 좁히기 지우기"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover"
                  @click="setResultSearch('')"
                >
                  <X :size="12" :stroke-width="1.5" />
                </button>
              </div>
              <!-- 밀도는 표시 설정일 뿐이라 실제 필터(목록 좁히기)보다 가볍게 둔다.
                   올린 카드가 아니라 눌린 트랙 + 흰 썸 — 높이도 좁히기와 같은 32px.
                   썸에 shadow 를 걸지 않는 건 전역 button{box-shadow:none} 이 유틸리티를 이기기 때문 -->
              <ASegmentedControl v-model="density" :options="DENSITY_OPTIONS" aria-label="목록 밀도" />
            </div>
          </div>
          </div>

          <!-- 테이블 영역: 여백 없이 남은 세로 공간을 전부 채우고, 이 안에서만 스크롤된다 -->
          <div class="xl:flex-1 xl:min-h-0 xl:overflow-hidden">
          <!-- body 로 Teleport: 결과 컬럼의 등장 애니메이션이 남긴 translate-y-0 이
               transform:translate(0,0) 으로 남아 fixed 의 containing block 을 가로채므로,
               뷰포트 기준 고정을 보장하려면 그 조상 바깥으로 빼내야 한다 -->
          <ASelectionBar :count="selectedIds.length">
            <button class="flex items-center gap-1.5 h-[38px] px-4 bg-transparent border-none rounded-md text-sm text-slate-300 font-medium cursor-pointer whitespace-nowrap hover:bg-slate-700 hover:text-slate-100" @click="selectedIds = []">
              <X :size="14" :stroke-width="1.5" />
              선택 해제
            </button>
            <AButton variant="primary" class="!h-[38px] !rounded-md" @click="bulkDownload">
              <span class="flex items-center gap-2"><Download :size="15" :stroke-width="1.8" /> 다운로드</span>
            </AButton>
          </ASelectionBar>

          <!-- relative 가 없으면 내부 sr-only(position:absolute)가 overflow 클리핑을 빠져나가
               페이지 가로 스크롤을 만든다 — 스크롤 컨테이너는 스스로 containing block 이어야 한다 -->
          <div role="table" aria-label="파일 검색 결과" class="relative border-y border-border-default overflow-auto bg-bg-surface xl:h-full">
            <!-- sticky 는 row 자신의 '부모' 콘텐츠 박스를 벗어나 고정될 수 없다.
                 이 rowgroup 이 row 하나만 담고 있으면 높이가 row 와 똑같아서 고정될 여유가 0이 된다 —
                 그래서 row 대신 rowgroup 을 sticky 로 걸어, 부모를 table 전체(충분한 높이)로 만든다 -->
            <div role="rowgroup" class="sticky top-0 z-[1]">
              <div role="row" class="grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px_76px] min-w-[896px] bg-table-header-bg border-b border-table-header-border">
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] flex items-center justify-center">
                  <ACheckbox :model-value="allVisibleSelected" @update:model-value="toggleSelectAllVisible">
                    <span class="sr-only">현재 표시된 파일 전체 선택</span>
                  </ACheckbox>
                </div>
                <div role="columnheader" :aria-sort="ariaSortFor('name')" class="flex">
                  <button class="flex items-center gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary" :class="sortKey === 'name' ? 'text-text-primary' : 'text-text-secondary'" @click="toggleSort('name')">
                    파일명
                    <ArrowUp v-if="sortKey === 'name'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div role="columnheader" class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary">분류</div>
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary">종류</div>
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary">키워드 · 태그</div>
                <div role="columnheader" :aria-sort="ariaSortFor('date')" class="flex">
                  <button class="flex items-center gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary" :class="sortKey === 'date' ? 'text-text-primary' : 'text-text-secondary'" @click="toggleSort('date')">
                    수정일
                    <ArrowUp v-if="sortKey === 'date'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div role="columnheader" :aria-sort="ariaSortFor('size')" class="flex">
                  <button class="flex items-center justify-end gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary" :class="sortKey === 'size' ? 'text-text-primary' : 'text-text-secondary'" @click="toggleSort('size')">
                    크기
                    <ArrowUp v-if="sortKey === 'size'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] px-2"><span class="sr-only">작업</span></div>
              </div>
            </div>

            <div
              v-if="canSelectAllResults || allResultsSelected"
              class="flex items-center justify-center gap-2 flex-wrap min-w-[896px] py-2 px-4 bg-bg-surface-selected border-b border-border-default text-sm"
            >
              <template v-if="allResultsSelected">
                <span class="text-text-secondary">검색결과 {{ sortedRows.length.toLocaleString() }}건을 모두 선택했습니다.</span>
                <button class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:underline" @click="selectedIds = []">선택 해제</button>
              </template>
              <template v-else>
                <span class="text-text-secondary">현재 표시된 {{ visibleRows.length }}건을 선택했습니다.</span>
                <button class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:underline" @click="selectAllResults">검색결과 {{ sortedRows.length.toLocaleString() }}건 모두 선택</button>
              </template>
            </div>
            <div role="rowgroup">
              <div
                v-for="(item, i) in visibleRows"
                :key="item.id"
                role="row"
                :aria-selected="selectedIds.includes(item.id)"
                class="group grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px_76px] min-w-[896px]"
                :class="[
                  i === visibleRows.length - 1 ? '' : 'border-b border-slate-100',
                  selectedIds.includes(item.id) ? 'bg-bg-surface-selected' : 'hover:bg-bg-surface-hover'
                ]"
                @click="onRowClick(item, $event)"
              >
                <div role="cell" class="py-[var(--table-cell-padding-y)] flex items-center justify-center">
                  <ACheckbox :model-value="selectedIds.includes(item.id)" @update:model-value="toggleRowSelect(item.id)">
                    <span class="sr-only">{{ item.name }} 선택</span>
                  </ACheckbox>
                </div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] flex items-center gap-2 min-w-0">
                  <component :is="ICON_BY_EXT[item.ext]" class="text-icon-default shrink-0" :size="16" :stroke-width="1.5" />
                  <button
                    data-preview-trigger
                    class="min-w-0 truncate text-left bg-transparent border-none p-0 text-[length:var(--density-text-size)] text-text-primary font-medium cursor-pointer hover:underline"
                    @click="openFileDetail(item)"
                  >
                    {{ item.name }}
                  </button>
                </div>
                <div role="cell" class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary">{{ item.category }}</div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)]">
                  <span
                    class="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-bold rounded-sm tracking-wide"
                    :style="{ background: EXT_STYLE_MAP[item.ext].bg, color: EXT_STYLE_MAP[item.ext].text }"
                  >{{ item.ext }}</span>
                </div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] flex gap-2 flex-wrap items-center min-w-0">
                  <span v-for="t in item.tags" :key="t" class="text-2xs font-medium text-text-tertiary">{{ t }}</span>
                </div>
                <div role="cell" class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary whitespace-nowrap">{{ item.date }}</div>
                <div role="cell" class="flex items-center justify-end py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary text-right [font-feature-settings:'tnum']">{{ item.sizeLabel }}</div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-1.5 flex items-center justify-center gap-0.5">
                  <!-- 호버로만 드러내되 DOM 에는 늘 있어서 Tab 으로 닿는다 -->
                  <button
                    :aria-label="`${item.name} 상세 보기`"
                    class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer opacity-0 transition-opacity duration-[var(--duration-fast)] ease-standard hover:bg-bg-surface-hover hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    @click="openFileDetail(item)"
                  >
                    <Info :size="15" :stroke-width="1.8" />
                  </button>
                  <button
                    :aria-label="`${item.name} 다운로드`"
                    class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer opacity-0 transition-opacity duration-[var(--duration-fast)] ease-standard hover:bg-bg-surface-hover hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    @click="downloadOne(item)"
                  >
                    <Download :size="15" :stroke-width="1.8" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="visibleRows.length === 0" class="p-6 border-t border-border-default">
              <AEmptyState
                :icon="SearchX"
                title="조건에 해당하는 파일이 없습니다"
                :description="`적용된 조건 ${appliedConditions.length}개가 서로 맞지 않을 수 있습니다. 조건을 줄여보세요.`"
              >
                <button
                  v-if="searchTerms.length"
                  class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
                  @click="setSearch('')"
                >
                  검색어만 지우기
                </button>
                <AButton v-if="appliedConditions.length" variant="primary" class="!h-control-md" @click="clearAllConditions">조건 모두 해제</AButton>
              </AEmptyState>
            </div>

            <!-- 무한 스크롤 감지선은 실제 스크롤 컨테이너(이 role=table div) 안에 있어야 한다.
                 밖에 두면 xl 레이아웃에서 상위 overflow-hidden 래퍼에 가려 교차가 영영 안 터진다 -->
            <div
              ref="loadMoreRef"
              class="flex items-center justify-center min-h-12 py-3 text-xs text-text-tertiary"
              aria-live="polite"
            >
              <span v-if="visibleRows.length < sortedRows.length">더 불러오는 중...</span>
              <span v-else-if="sortedRows.length > 0">전체 결과를 불러왔습니다.</span>
            </div>
          </div>
          </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 파일 상세 정보 모달 -->
    <AFileDetailModal
      v-model:open="fileDetailOpen"
      :file="fileDetail"
      :icon="fileDetailIcon"
      @download-original="onDownloadOriginal"
      @download-zip="onDownloadZip"
      @copy-link="onCopyLinkDetail"
      @breadcrumb-click="onBreadcrumbClickDetail"
      @topic-click="onTopicClickDetail"
      @meta-click="onMetaClickDetail"
      @relation-click="onRelationClickDetail"
    />

    <!-- 패싯 전체 보기: 사이드바에 다 담을 수 없을 때 검색으로 고른다 -->
    <ADialog
      :model-value="facetModal !== null"
      :title="`${facetModalTitle} 선택`"
      :description="`전체 ${facetModalTotal}개 · 선택 완료를 누르면 목록에 반영됩니다`"
      width="460px"
      @update:model-value="closeFacetModal"
    >
      <AInput v-model="facetQuery" search :placeholder="`${facetModalTitle} 검색`" />
      <div class="flex flex-col max-h-[320px] overflow-y-auto -mx-1 px-1">
        <div
          v-for="row in facetModalRows"
          :key="row.label"
          class="flex items-center justify-between gap-3 px-2 py-2 rounded-md"
          :class="row.count === 0 && !row.active ? '' : 'hover:bg-bg-surface-hover'"
        >
          <ACheckbox
            :model-value="row.active"
            :disabled="row.count === 0 && !row.active"
            @update:model-value="toggleFacetValue(row.label)"
          >
            <span class="text-sm">{{ row.label }}</span>
          </ACheckbox>
          <span
            class="text-xs [font-feature-settings:'tnum']"
            :class="row.count === 0 ? 'text-text-disabled' : 'text-text-tertiary'"
          >{{ row.count }}</span>
        </div>
        <p v-if="facetModalRows.length === 0" class="m-0 py-6 text-sm text-text-tertiary text-center">
          "{{ facetQuery }}"와 일치하는 {{ facetModalTitle }}이(가) 없습니다.
        </p>
      </div>
      <template #footer="{ close }">
        <button
          class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
          @click="close"
        >
          취소
        </button>
        <AButton variant="primary" class="!h-control-md" @click="confirmFacetModal">선택 완료</AButton>
      </template>
    </ADialog>

    <!-- ⌘K 커맨드 팔레트 -->
    <div v-if="paletteOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-bg-overlay-scrim" @click.self="closePalette">
      <ACommand
        ref="paletteRef"
        width="520px"
        :limit="12"
        group-label="필터를 고르거나 파일명을 입력하세요"
        placeholder="명령 또는 파일 검색…"
        :items="paletteItems"
        @select="runPaletteItem"
      />
    </div>

    <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50">
      <AToast :title="toastMessage" />
    </div>
  </div>
</template>
