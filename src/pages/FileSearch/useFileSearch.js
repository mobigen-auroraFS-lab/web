import { ref, computed, watch } from 'vue'
import {
  TOPIC_OPTIONS, SUBTOPIC_OPTIONS, TAG_OPTIONS, FILE_TYPE_OPTIONS,
  SIZE_RANGE_OPTIONS, SUGGESTED_KEYWORDS, generateFiles
} from './fileSearch.mock'

const FILTER_COLLAPSED_COUNT = 10
const TAGS_COLLAPSED_COUNT = 12

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
function matchesSizeRange(mb, range) {
  if (range === 'under1') return mb < 1
  if (range === '1to10') return mb >= 1 && mb <= 10
  if (range === 'over10') return mb > 10
  return true
}

/**
 * 파일 검색 화면의 상태·필터링·정렬·페이지네이션 로직.
 * 화면(FileSearch.vue)은 이 함수가 반환하는 값을 템플릿에 연결만 한다.
 * API 연동 시 files를 채우는 방식만 generateFiles() -> API 호출로 바꾸면 된다.
 */
export function useFileSearch() {
  const files = ref(generateFiles())

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
  const fileTypes = ref([])
  const sizeRange = ref('')
  const selectedIds = ref([])
  const page = ref(1)
  const perPage = ref(20)
  const sortValue = ref('date_desc')

  /* ------------------------------------------------------------ filtering */

  const filteredRows = computed(() => {
    let rows = files.value
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
  function pickFromDate(d) {
    dateFrom.value = d
  }
  function pickToDate(d) {
    dateTo.value = d
  }

  return {
    files,
    SUGGESTED_KEYWORDS,

    searchValue, topics, subtopics, tags, newTagValue, resultQuery,
    tagsExpanded, topicExpanded, subtopicExpanded, topicSearch, subtopicSearch,
    dateFrom, dateTo, fileTypes, sizeRange, selectedIds, page, perPage, sortValue,

    filteredRows, sortedRows, pageCount, pagedRows, pageIds, allPageSelected,
    resultKeywordPrefix,
    topicVisible, subtopicVisible, topicFiltered, subtopicFiltered, topicToggleLabel, subtopicToggleLabel,
    allTagChips, visibleTagChips, showTagToggle, tagToggleLabel, fileTypeChips, sizeRangeChips,
    appliedConditions,

    toggleIn,
    clearAllConditions, addTag, toggleSelectAllPage, toggleRowSelect, pickFromDate, pickToDate
  }
}
