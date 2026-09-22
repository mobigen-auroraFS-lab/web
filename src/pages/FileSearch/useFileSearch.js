import { ref, computed, watch } from 'vue'
import {
  TOPIC_OPTIONS,
  SUBTOPIC_OPTIONS,
  TAG_OPTIONS,
  FILE_TYPE_OPTIONS,
  SIZE_RANGE_OPTIONS,
  SORTABLE,
  DATE_PRESETS,
  DENSITY_OPTIONS,
  TOPIC_SUBTOPIC_MAP,
  SUBTOPIC_TAG_MAP,
  FACET_VISIBLE_COUNT,
  generateFiles,
  buildFileDetail,
  readStoredDensity,
  DENSITY_STORAGE_KEY
} from './fileSearch.mock'

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
function parseISODate(v) {
  if (!v) return null
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
function matchesSizeRange(mb, range) {
  if (range === 'under1') return mb < 1
  if (range === '1to10') return mb >= 1 && mb <= 10
  if (range === 'over10') return mb > 10
  return true
}
function splitParam(v) {
  return v ? v.split(',').filter(Boolean) : []
}

const LOAD_BATCH_SIZE = 20
const HASH_ROUTE = '#file-search'

/**
 * 파일 검색 화면의 상태·필터링·정렬·URL 동기화 로직.
 * 화면(FileSearch.vue)은 이 함수가 반환하는 값을 템플릿/DOM 이벤트에 연결만 한다.
 * API 연동 시 files를 채우는 방식만 generateFiles() -> API 호출로 바꾸면 된다.
 */
export function useFileSearch() {
  const files = ref(generateFiles())

  /* searchValue: 실제 필터링/URL/적용조건에 쓰이는 "커밋된" 검색어.
     searchDraft: 입력창에 타이핑 중인 값 — Enter를 누르기 전까진 결과에 반영되지 않는다.
     대용량 데이터를 가정하면 키 입력마다 서버 왕복·전체 스캔이 일어나선 안 되므로,
     커밋 시점을 명시적으로 분리한다 */
  const searchValue = ref('흉부')
  const searchDraft = ref(searchValue.value)
  const resultSearchValue = ref('')
  const resultSearchDraft = ref('')
  const topics = ref(['의료'])
  const subtopics = ref(['영상검사'])
  const tags = ref(['#흉부'])
  const dateFrom = ref(null)
  const dateTo = ref(null)
  const fileTypes = ref([])
  const sizeRange = ref('')
  const selectedIds = ref([])
  const visibleCount = ref(LOAD_BATCH_SIZE)
  const sortKey = ref('date')
  const sortDir = ref('desc')
  const toastMessage = ref('')
  const fileDetailOpen = ref(false)
  const fileDetailTarget = ref(null)
  const density = ref(readStoredDensity())

  const facetModal = ref(null)
  const facetQuery = ref('')
  const facetDraft = ref([])

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

  /* 공백으로 구분된 각 키워드는 AND로 묶인다 — 검색창 하나로
     "결과 내 재검색"이 하던 좁히기를 대신한다 */
  const searchTerms = computed(() => searchValue.value.trim().split(/\s+/).filter(Boolean))
  const resultSearchTerms = computed(() => resultSearchValue.value.trim().split(/\s+/).filter(Boolean))
  /* 입력값이 아직 결과에 반영되지 않은 상태 — 작아진 검색창에서 이걸 알려주지 않으면
     사용자는 자기가 친 글자가 왜 안 먹는지 알 수 없다 */
  const searchDirty = computed(() => searchDraft.value.trim() !== searchValue.value)

  /* ------------------------------------------------------------ filtering */

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
    return files.value.filter((f) => DIMENSIONS.every((d) => d === dimension || PREDICATES[d](f)))
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
    if (fileDetailTarget.value && !rows.some((r) => r.id === fileDetailTarget.value.id)) closeFileDetail()
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
  const visibleTagChips = computed(() => topFacetChips(availableTags.value, tags.value, tagCounts.value))

  const fileTypeChips = computed(() => FILE_TYPE_OPTIONS.map((v) => toChip(v, fileTypes.value.includes(v), fileTypeCounts.value[v] || 0)))
  const sizeRangeChips = computed(() =>
    SIZE_RANGE_OPTIONS.map((o) => ({ ...toChip(o.label, sizeRange.value === o.value, sizeCounts.value[o.value] || 0), value: o.value }))
  )

  const dateRangeLabel = computed(() => {
    if (!dateFrom.value && !dateTo.value) return '전체 기간'
    if (dateFrom.value && dateTo.value) return `${dateFrom.value.toLocaleDateString('ko-KR')} ~ ${dateTo.value.toLocaleDateString('ko-KR')}`
    if (dateFrom.value) return `${dateFrom.value.toLocaleDateString('ko-KR')} 이후`
    return `${dateTo.value.toLocaleDateString('ko-KR')} 이전`
  })

  /* ------------------------------------------------------ applied conditions */

  const appliedConditions = computed(() => [
    ...searchTerms.value.map((t) => ({ label: `검색어: ${t}`, remove: () => removeSearchTerm(t) })),
    ...(resultSearchTerms.value.length ? [{ label: `목록 좁히기: ${resultSearchValue.value}`, remove: () => setResultSearch('') }] : []),
    ...topics.value.map((t) => ({ label: `주제: ${t}`, remove: () => (topics.value = topics.value.filter((x) => x !== t)) })),
    ...subtopics.value.map((t) => ({ label: `하위주제: ${t}`, remove: () => (subtopics.value = subtopics.value.filter((x) => x !== t)) })),
    ...tags.value.map((t) => ({ label: `태그: ${t}`, remove: () => (tags.value = tags.value.filter((x) => x !== t)) })),
    ...fileTypes.value.map((t) => ({ label: `형식: ${t}`, remove: () => (fileTypes.value = fileTypes.value.filter((x) => x !== t)) })),
    ...(sizeRange.value
      ? [{ label: `크기: ${SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange.value).label}`, remove: () => (sizeRange.value = '') }]
      : []),
    ...(dateFrom.value || dateTo.value
      ? [
          {
            label: `기간: ${dateRangeLabel.value}`,
            remove: () => {
              dateFrom.value = null
              dateTo.value = null
            }
          }
        ]
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
  function clearDateRange() {
    dateFrom.value = null
    dateTo.value = null
  }

  /* ------------------------------------------------------------- sorting */

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

  /* --------------------------------------------------------------- dates */

  function applyDatePreset(days) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    dateFrom.value = from
    dateTo.value = to
  }
  function isDatePresetActive(days) {
    if (!dateFrom.value || !dateTo.value) return false
    const expectedFrom = new Date()
    expectedFrom.setDate(expectedFrom.getDate() - (days - 1))
    return toISODate(dateFrom.value) === toISODate(expectedFrom) && toISODate(dateTo.value) === toISODate(new Date())
  }

  /* ------------------------------------------------------------- selection */

  function selectAllResults() {
    selectedIds.value = sortedRows.value.map((r) => r.id)
  }
  function toggleSelectAllVisible() {
    selectedIds.value = allVisibleSelected.value
      ? selectedIds.value.filter((id) => !visibleIds.value.includes(id))
      : [...new Set([...selectedIds.value, ...visibleIds.value])]
  }
  function toggleRowSelect(id) {
    selectedIds.value = toggleIn(selectedIds.value, id)
  }

  function loadMoreRows() {
    if (visibleCount.value >= sortedRows.value.length) return
    visibleCount.value = Math.min(visibleCount.value + LOAD_BATCH_SIZE, sortedRows.value.length)
  }

  /* --------------------------------------------------------------- toast */

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

  /* AFileDetailModal이 포커스 저장/복귀를 스스로 처리하므로 여는 쪽은 대상만 쥐면 된다 */
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

  const fileDetail = computed(() => buildFileDetail(fileDetailTarget.value, files.value))

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
    const item = files.value.find((f) => String(f.id) === relation.id)
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

  const paletteOpen = ref(false)

  const paletteItems = computed(() => [
    ...DENSITY_OPTIONS.map((o) => ({ label: `밀도: ${o.label}`, hint: '보기', kind: 'density', value: o.value })),
    ...(appliedConditions.value.length ? [{ label: '조건 모두 해제', hint: '동작', kind: 'clear' }] : []),
    ...TOPIC_OPTIONS.map((v) => ({ label: v, hint: '주제', kind: 'topic', value: v })),
    ...availableSubtopics.value.map((v) => ({ label: v, hint: '하위주제', kind: 'subtopic', value: v })),
    ...availableTags.value.map((v) => ({ label: v, hint: '태그', kind: 'tag', value: v })),
    ...FILE_TYPE_OPTIONS.map((v) => ({ label: v, hint: '형식', kind: 'fileType', value: v })),
    ...sortedRows.value.slice(0, 50).map((f) => ({ label: f.name, hint: '파일', kind: 'file', value: f.id }))
  ])

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
      const f = files.value.find((x) => x.id === item.value)
      if (f) openFileDetail(f)
    }
    closePalette()
  }

  /* --------------------------------------------------------- URL 상태 동기화 */

  /* 조건을 해시 쿼리에 실어 새로고침/공유에도 같은 화면이 열리게 한다.
     선택(selectedIds)은 일시적인 작업 상태라 URL에 넣지 않는다 */
  let urlWriteTimer = null
  let applyingFromUrl = false

  function parseHashParams() {
    if (!location.hash.startsWith(HASH_ROUTE)) return null
    return new URLSearchParams(location.hash.slice(HASH_ROUTE.length).replace(/^\?/, ''))
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
    /* pushState를 쓰면 글자 하나마다 히스토리가 쌓인다 — 뒤로가기는
       "이 페이지를 떠난다"로 두고 URL은 항상 현재 상태를 가리키게 한다 */
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

  /* ------------------------------------------------------------- density */

  watch(
    density,
    (v) => {
      document.documentElement.dataset.density = v
      try {
        localStorage.setItem(DENSITY_STORAGE_KEY, v)
      } catch {
        /* 저장할 수 없으면 이번 세션에만 적용된다 */
      }
    },
    { immediate: true }
  )

  return {
    files,

    searchDraft,
    resultSearchDraft,
    topics,
    subtopics,
    tags,
    dateFrom,
    dateTo,
    fileTypes,
    sizeRange,
    selectedIds,
    sortKey,
    sortDir,
    toastMessage,
    fileDetailOpen,
    fileDetailTarget,
    density,
    facetModal,
    facetQuery,

    searchTerms,
    searchDirty,
    commitSearch,
    setSearch,
    commitResultSearch,
    setResultSearch,

    filteredRows,
    sortedRows,
    visibleRows,
    visibleIds,
    allVisibleSelected,
    allResultsSelected,
    canSelectAllResults,
    resultKeywordPrefix,

    visibleTopicChips,
    availableSubtopics,
    subtopicChips,
    availableTags,
    visibleTagChips,
    fileTypeChips,
    sizeRangeChips,
    dateRangeLabel,
    datePresetCounts,
    appliedConditions,
    clearAllConditions,
    clearDateRange,

    toggleSort,
    ariaSortFor,
    applyDatePreset,
    isDatePresetActive,

    selectAllResults,
    toggleSelectAllVisible,
    toggleRowSelect,
    loadMoreRows,

    bulkDownload,
    downloadOne,

    openFileDetail,
    closeFileDetail,
    onRowClick,
    fileDetail,
    onDownloadOriginal,
    onDownloadZip,
    onCopyLinkDetail,
    onBreadcrumbClickDetail,
    onTopicClickDetail,
    onMetaClickDetail,
    onRelationClickDetail,

    openFacetModal,
    closeFacetModal,
    confirmFacetModal,
    facetModalTitle,
    facetModalTotal,
    facetModalRows,
    toggleFacetValue,

    paletteOpen,
    paletteItems,
    closePalette,
    runPaletteItem,

    applyUrlState,

    toggleIn
  }
}
