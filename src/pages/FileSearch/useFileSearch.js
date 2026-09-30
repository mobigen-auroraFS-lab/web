import { ref, computed, watch } from 'vue'
import {
  SORTABLE,
  DATE_PRESETS,
  SIZE_BUCKET_LABELS,
  DENSITY_OPTIONS,
  FACET_VISIBLE_COUNT,
  PAGE_SIZE,
  normalizeItem,
  searchFiles,
  fetchFacetExtra,
  fetchTopics,
  fetchTags,
  fetchAssetDetail,
  fetchAssetMmMeta,
  fetchRelationKinds,
  buildFileDetail,
  readStoredDensity,
  DENSITY_STORAGE_KEY
} from './fileSearch.api'

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
function splitParam(v) {
  return v ? v.split(',').filter(Boolean) : []
}
/* 서버는 기간 칩을 UTC 오늘 기준으로 센다 — 프리셋도 같은 날을 기준으로 잡아야 칩 숫자와 결과가 맞는다 */
function utcToday() {
  return parseISODate(new Date().toISOString().slice(0, 10))
}
function daysBefore(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

const HASH_ROUTE = '#file-search'
const TAG_LIST_LIMIT = 500

/**
 * 파일 검색 화면의 상태·서버 조회·URL 동기화 로직.
 * 거르기·정렬·집계·페이지 나누기는 서버(GET /file-search)가 하고, 여기서는 조건을 들고 있다가
 * 바뀔 때마다 다시 묻는다. 화면(FileSearch.vue)은 반환값을 템플릿에 연결만 한다.
 */
export function useFileSearch() {
  /* searchValue: 서버 조회/URL/적용조건에 쓰이는 "커밋된" 검색어.
     searchDraft: 입력창에 타이핑 중인 값 — Enter를 누르기 전까진 결과에 반영되지 않는다 */
  const searchValue = ref('')
  const searchDraft = ref('')
  const resultSearchValue = ref('')
  const resultSearchDraft = ref('')
  const topics = ref([])
  const subtopics = ref([])
  const tags = ref([])
  const dateFrom = ref(null)
  const dateTo = ref(null)
  const fileTypes = ref([])
  const selectedIds = ref([])
  const sortKey = ref('date')
  const sortDir = ref('desc')
  const toastMessage = ref('')
  const fileDetailOpen = ref(false)
  const fileDetailTarget = ref(null)
  const density = ref(readStoredDensity())

  const facetModal = ref(null)
  const facetQuery = ref('')
  const facetDraft = ref([])

  /* 어떤 감시(watch)보다 먼저 URL 조건을 읽는다 — 감시가 초기값 반영까지 '변경'으로 보고
     다시 조회하면 새로고침·공유 링크마다 같은 목록을 두 번 받게 된다 */
  applyUrlState()

  /* Enter로만 커밋한다 — 타이핑 중엔 서버 조회/URL 어느 것도 움직이지 않는다 */
  function commitSearch() {
    searchValue.value = searchDraft.value.trim()
  }
  /* 칩 제거·지우기 버튼은 타이핑이 아니라 한 번의 명확한 클릭이므로 즉시 반영하고,
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

  const searchTerms = computed(() => searchValue.value.trim().split(/\s+/).filter(Boolean))
  const resultSearchTerms = computed(() => resultSearchValue.value.trim().split(/\s+/).filter(Boolean))
  /* 입력값이 아직 결과에 반영되지 않은 상태 — 작아진 검색창에서 이걸 알려주지 않으면
     사용자는 자기가 친 글자가 왜 안 먹는지 알 수 없다 */
  const searchDirty = computed(() => searchDraft.value.trim() !== searchValue.value)

  /* --------------------------------------------------------------- toast */

  let toastTimer = null
  function showToast(message, ms = 2500) {
    toastMessage.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMessage.value = ''), ms)
  }

  /* ------------------------------------------------------------ 목록 조회 */

  const items = ref([])
  const total = ref(0)
  const totalCapped = ref(false)
  const nextCursor = ref(null)
  const depth = ref(Infinity)
  const facets = ref({})
  const facetAxes = ref({})
  const listLoading = ref(false)
  const loadingMore = ref(false)

  /* 같은 이름을 반복해 보내는 배열 규칙은 toQuery 가 처리한다. 크기(size_bucket)는
     서버가 아직 501 이라 보내지 않는다 */
  function conditionParams() {
    return {
      q: searchValue.value,
      refine: resultSearchValue.value,
      topic: topics.value,
      subtopic: subtopics.value,
      tag: tags.value,
      file_ext: fileTypes.value.map((e) => e.toLowerCase()),
      created_from: toISODate(dateFrom.value),
      created_to: toISODate(dateTo.value)
    }
  }
  const sortParam = computed(() => `${sortKey.value === 'date' ? 'updated' : sortKey.value}_${sortDir.value}`)

  /* 조건이 빠르게 여러 번 바뀌면 늦게 도착한 옛 응답이 새 결과를 덮어쓸 수 있다 —
     요청마다 번호를 매겨 마지막 요청의 응답만 반영한다 */
  let listSeq = 0

  async function fetchList() {
    const seq = ++listSeq
    listLoading.value = true
    loadingMore.value = false
    const params = conditionParams()
    const [page, extra] = await Promise.allSettled([
      searchFiles({ ...params, sort: sortParam.value, limit: PAGE_SIZE }),
      fetchFacetExtra(params)
    ])
    if (seq !== listSeq) return
    listLoading.value = false

    if (page.status === 'fulfilled') {
      const body = page.value
      items.value = body.items.map(normalizeItem)
      total.value = body.total
      totalCapped.value = body.total_capped
      nextCursor.value = body.next_cursor
      depth.value = body.depth ?? Infinity
      facets.value = body.facets ?? {}
    } else {
      showToast(page.reason.message, 4000)
    }
    /* 형식·크기·기간 칩 건수는 부가 정보라, 실패해도 목록은 그대로 보여준다 */
    facetAxes.value = extra.status === 'fulfilled' ? (extra.value.axes ?? {}) : {}
  }

  /* 검색어가 있으면 첫 쪽이 offset 경로라 next_cursor 가 늘 비어 있다(IDD IF-ASSET-09) —
     그때는 받은 수로 이어 받고, 끝은 total(또는 서버의 조회 깊이)로 판단한다 */
  const hasMore = computed(() => {
    if (nextCursor.value) return true
    if (!searchValue.value) return false
    return items.value.length < total.value && items.value.length < depth.value
  })

  async function loadMoreRows() {
    if (!hasMore.value || loadingMore.value || listLoading.value) return
    const seq = listSeq
    loadingMore.value = true
    const params = { ...conditionParams(), sort: sortParam.value, limit: PAGE_SIZE, with_facets: false }
    if (nextCursor.value) params.cursor = nextCursor.value
    else params.offset = items.value.length
    try {
      const body = await searchFiles(params)
      if (seq !== listSeq) return
      /* 기본 정렬(수정일)은 값이 변하는 정렬이라 쪽 경계에서 같은 행이 다시 올 수 있다 */
      const seen = new Set(items.value.map((r) => r.id))
      items.value = [...items.value, ...body.items.map(normalizeItem).filter((r) => !seen.has(r.id))]
      nextCursor.value = body.next_cursor
    } catch (e) {
      if (seq === listSeq) showToast(e.message, 4000)
    } finally {
      if (seq === listSeq) loadingMore.value = false
    }
  }

  const totalLabel = computed(() => `${total.value.toLocaleString()}${totalCapped.value ? '건 이상' : '건'}`)

  /* ------------------------------------------------ 주제 · 태그 목록 (전체 자료 기준) */

  const topicRows = ref([])
  const tagRows = ref([])

  fetchTopics()
    .then((body) => (topicRows.value = body.topics ?? []))
    .catch((e) => showToast(e.message, 4000))

  const topicOptions = computed(() => {
    const counts = new Map()
    topicRows.value.forEach((r) => counts.set(r.topic_ko, r.topic_asset_count))
    return counts
  })
  const subtopicOptions = computed(() => {
    const counts = new Map()
    topicRows.value.forEach((r) => {
      if (r.subtopic_ko && topics.value.includes(r.topic_ko)) counts.set(r.subtopic_ko, (counts.get(r.subtopic_ko) ?? 0) + r.asset_count)
    })
    return counts
  })
  const tagOptions = computed(() => new Map(tagRows.value.map((r) => [r.tag, r.count])))

  /* 태그는 하위주제를 고른 뒤에야 열리므로, 그때 고른 주제·하위주제로 좁혀 받는다 —
     조건 없이 부르면 2~3초 걸린다(IDD IF-CAT-02) */
  let tagSeq = 0
  watch(
    [topics, subtopics],
    () => {
      const seq = ++tagSeq
      if (!subtopics.value.length) {
        tagRows.value = []
        return
      }
      fetchTags({ topic: topics.value, subtopic: subtopics.value, limit: TAG_LIST_LIMIT })
        .then((body) => {
          if (seq === tagSeq) tagRows.value = body.rows ?? []
        })
        .catch(() => {
          if (seq === tagSeq) tagRows.value = []
        })
    },
    { deep: true }
  )

  /* 상위 조건을 풀면 그 아래 선택도 의미가 없어진다 — 잠금 구조를 그대로 따른다.
     바뀔 게 없을 때 새 배열을 넣으면 그것만으로 다시 조회되므로 실제로 달라질 때만 넣는다 */
  watch(topics, () => {
    const kept = !topics.value.length ? [] : topicRows.value.length ? subtopics.value.filter((s) => subtopicOptions.value.has(s)) : subtopics.value
    if (kept.length !== subtopics.value.length) subtopics.value = kept
  })
  watch(subtopics, () => {
    if (!subtopics.value.length && tags.value.length) tags.value = []
  })

  /* --------------------------------------------------------------- labels */

  const resultKeywordPrefix = computed(() => {
    if (searchTerms.value.length) return `"${searchTerms.value.join(' ')}" 검색결과 `
    if (appliedConditions.value.length) return '검색결과 '
    return '전체 파일 '
  })

  /* ------------------------------------------------------------- 칩 */

  function toChip(label, active, count) {
    return { label, active, count, disabled: count === 0 && !active }
  }

  /* facets 는 건수 상위 12개만 오고 고른 값을 넣어 주지 않는다(IDD 11절 ③) —
     고른 값은 늘 칩으로 붙들고, 목록에 없으면 건수를 비운다 */
  function facetChips(entries = [], selectedList) {
    const counts = new Map(entries.map((e) => [e.key, e.count]))
    const picked = selectedList.map((v) => toChip(v, true, counts.get(v) ?? null))
    const rest = entries.filter((e) => !selectedList.includes(e.key)).map((e) => toChip(e.key, false, e.count))
    return [...picked, ...rest].slice(0, Math.max(FACET_VISIBLE_COUNT, picked.length))
  }

  const visibleTopicChips = computed(() => facetChips(facets.value.topic, topics.value))
  const showMoreTopics = computed(() => topicOptions.value.size > visibleTopicChips.value.length)

  const availableSubtopics = computed(() => [...subtopicOptions.value.keys()])
  const subtopicChips = computed(() => facetChips(facets.value.subtopic, subtopics.value))
  const showMoreSubtopics = computed(() => subtopicOptions.value.size > subtopicChips.value.length)

  const visibleTagChips = computed(() => facetChips(facets.value.tag, tags.value))
  const showMoreTags = computed(() => tagOptions.value.size > visibleTagChips.value.length)

  /* 형식 칩은 서버가 소문자 확장자로 준다 — 화면·URL 은 지금처럼 대문자로 쓴다 */
  const fileTypeChips = computed(() => {
    const entries = (facetAxes.value.file_ext ?? []).map((e) => ({ key: e.key.toUpperCase(), count: e.count }))
    const keys = new Set(entries.map((e) => e.key))
    const missing = fileTypes.value.filter((v) => !keys.has(v)).map((v) => toChip(v, true, null))
    return [...missing, ...entries.map((e) => toChip(e.key, fileTypes.value.includes(e.key), e.count))]
  })

  /* 크기로 거르기는 서버가 아직 지원하지 않는다(size_bucket 501) — 건수만 보여주고 누를 수 없게 둔다 */
  const sizeRangeChips = computed(() =>
    (facetAxes.value.file_size ?? []).map((e) => ({
      label: SIZE_BUCKET_LABELS[e.key] ?? e.key,
      value: e.key,
      count: e.count,
      active: false,
      disabled: true
    }))
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
    ...(resultSearchTerms.value.length ? [{ label: `결과 내 검색: ${resultSearchValue.value}`, remove: () => setResultSearch('') }] : []),
    ...topics.value.map((t) => ({ label: `주제: ${t}`, remove: () => (topics.value = topics.value.filter((x) => x !== t)) })),
    ...subtopics.value.map((t) => ({ label: `하위주제: ${t}`, remove: () => (subtopics.value = subtopics.value.filter((x) => x !== t)) })),
    ...tags.value.map((t) => ({ label: `태그: ${t}`, remove: () => (tags.value = tags.value.filter((x) => x !== t)) })),
    ...fileTypes.value.map((t) => ({ label: `형식: ${t}`, remove: () => (fileTypes.value = fileTypes.value.filter((x) => x !== t)) })),
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
    const today = utcToday()
    dateFrom.value = daysBefore(today, days - 1)
    dateTo.value = today
  }
  function isDatePresetActive(days) {
    if (!dateFrom.value || !dateTo.value) return false
    const today = utcToday()
    return toISODate(dateFrom.value) === toISODate(daysBefore(today, days - 1)) && toISODate(dateTo.value) === toISODate(today)
  }
  const datePresetChips = computed(() => {
    const counts = new Map((facetAxes.value.date_preset ?? []).map((e) => [e.key, e.count]))
    return DATE_PRESETS.map((preset) => {
      const active = isDatePresetActive(preset.days)
      const count = counts.get(String(preset.days))
      return { label: preset.label, days: preset.days, active, disabled: count === 0 && !active }
    })
  })

  /* ------------------------------------------------------------- selection */

  /* 서버는 쪽 단위로 주므로 선택은 지금까지 받은 행 안에서만 한다 */
  const visibleRows = items
  const visibleIds = computed(() => items.value.map((r) => r.id))
  const allVisibleSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedIds.value.includes(id)))

  function toggleSelectAllVisible() {
    selectedIds.value = allVisibleSelected.value
      ? selectedIds.value.filter((id) => !visibleIds.value.includes(id))
      : [...new Set([...selectedIds.value, ...visibleIds.value])]
  }
  function toggleRowSelect(id) {
    selectedIds.value = toggleIn(selectedIds.value, id)
  }

  /* --------------------------------------------------------- 파일 상세 모달 */

  const fileDetail = ref(null)
  const fileDetailStatus = ref('ready')
  const fileDetailError = ref('')
  let detailSeq = 0
  let relationKindsPromise = null

  /* 관계 종류 이름은 거의 바뀌지 않는 작은 목록이라 처음 모달을 열 때 한 번만 받는다 */
  function loadRelationKinds() {
    relationKindsPromise ??= fetchRelationKinds()
      .then((body) => Object.fromEntries((body.rows ?? []).map((k) => [k.kind_code, k.kind_name_ko])))
      .catch(() => {
        relationKindsPromise = null
        return {}
      })
    return relationKindsPromise
  }

  async function loadFileDetail(id) {
    const seq = ++detailSeq
    fileDetailStatus.value = 'loading'
    fileDetailError.value = ''
    try {
      const [detail, mmMeta, kindNames] = await Promise.all([
        fetchAssetDetail(id),
        fetchAssetMmMeta(id).catch(() => ({ items: [] })),
        loadRelationKinds()
      ])
      if (seq !== detailSeq) return
      fileDetail.value = buildFileDetail(detail, mmMeta, kindNames)
      fileDetailStatus.value = 'ready'
    } catch (e) {
      if (seq !== detailSeq) return
      fileDetail.value = null
      fileDetailStatus.value = 'error'
      /* 관계 카드에 등록 전 자산이 섞여 오면 404 가 난다(IDD 11절 ⑤) */
      fileDetailError.value = e.status === 404 ? '볼 수 없는 자료입니다. 삭제되었거나 아직 등록이 끝나지 않았을 수 있습니다.' : e.message
    }
  }

  /* FileDetailModal이 포커스 저장/복귀를 스스로 처리하므로 여는 쪽은 대상만 쥐면 된다 */
  function openFileDetail(item) {
    fileDetailTarget.value = item
    fileDetailOpen.value = true
    loadFileDetail(item.id)
  }
  function closeFileDetail() {
    fileDetailOpen.value = false
  }
  function retryFileDetail() {
    if (fileDetailTarget.value) loadFileDetail(fileDetailTarget.value.id)
  }

  function addTopicFilter(topic, subtopic) {
    if (topic && !topics.value.includes(topic)) topics.value = [...topics.value, topic]
    if (subtopic && !subtopics.value.includes(subtopic)) subtopics.value = [...subtopics.value, subtopic]
  }
  /* 주제 크럼은 대분류만, 하위주제 크럼은 대분류+하위주제를 함께 건다 —
     하위주제 필터는 대분류가 선택돼 있어야 열리는 잠금 구조를 그대로 따른다 */
  function onBreadcrumbClickDetail(crumb) {
    const [topicCrumb, subtopicCrumb] = fileDetail.value?.breadcrumb ?? []
    addTopicFilter(topicCrumb?.label, crumb.level === 'subtopic' ? subtopicCrumb?.label : null)
    closeFileDetail()
  }
  function onTopicClickDetail(topicChip) {
    addTopicFilter(topicChip.topic, topicChip.subtopic)
    closeFileDetail()
  }
  function onMetaClickDetail(meta) {
    if (!tags.value.includes(meta.label)) tags.value = [...tags.value, meta.label]
    closeFileDetail()
  }
  function onRelationClickDetail(relation) {
    openFileDetail({ id: relation.id, name: relation.name, ext: relation.ext })
  }

  /* ------------------------------------------------------ 패싯 전체 보기 모달 */

  /* 모달의 건수는 지금 결과가 아니라 전체 자료 기준이다(/topics · /tags) — 목업처럼 결과 기준 건수는 API 가 주지 않는다 */
  const FACET_CONFIG = {
    topic: { title: '주제', options: () => topicOptions.value, selected: topics },
    subtopic: { title: '하위주제', options: () => subtopicOptions.value, selected: subtopics },
    tag: { title: '태그', options: () => tagOptions.value, selected: tags }
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
  const facetModalTotal = computed(() => (facetModal.value ? FACET_CONFIG[facetModal.value].options().size : 0))

  /* 모달은 가나다순 — 체크하는 동안 목록이 눈앞에서 재정렬되면 안 된다 */
  const facetModalRows = computed(() => {
    if (!facetModal.value) return []
    const options = FACET_CONFIG[facetModal.value].options()
    const picked = facetDraft.value
    const q = facetQuery.value.trim().toLowerCase()
    return [...options.keys()]
      .filter((v) => !q || v.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((v) => ({ label: v, active: picked.includes(v), count: options.get(v) ?? 0 }))
  })

  function toggleFacetValue(label) {
    facetDraft.value = toggleIn(facetDraft.value, label)
  }

  /* --------------------------------------------------------- command palette */

  const paletteOpen = ref(false)

  const paletteItems = computed(() => [
    ...DENSITY_OPTIONS.map((o) => ({ label: `밀도: ${o.label}`, hint: '보기', kind: 'density', value: o.value })),
    ...(appliedConditions.value.length ? [{ label: '조건 모두 해제', hint: '동작', kind: 'clear' }] : []),
    ...[...topicOptions.value.keys()].map((v) => ({ label: v, hint: '주제', kind: 'topic', value: v })),
    ...availableSubtopics.value.map((v) => ({ label: v, hint: '하위주제', kind: 'subtopic', value: v })),
    ...[...tagOptions.value.keys()].map((v) => ({ label: v, hint: '태그', kind: 'tag', value: v })),
    ...fileTypeChips.value.map((c) => ({ label: c.label, hint: '형식', kind: 'fileType', value: c.label })),
    ...items.value.slice(0, 50).map((f) => ({ label: f.name, hint: '파일', kind: 'file', value: f.id }))
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
      const f = items.value.find((x) => x.id === item.value)
      if (f) openFileDetail(f)
    }
    closePalette()
  }

  /* --------------------------------------------------------- URL 상태 동기화 */

  /* 조건을 해시 쿼리에 실어 새로고침/공유에도 같은 화면이 열리게 한다.
     선택(selectedIds)은 일시적인 작업 상태라 URL에 넣지 않는다 */
  let urlWriteTimer = null

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
    searchValue.value = p.get('q') || ''
    searchDraft.value = searchValue.value
    resultSearchValue.value = p.get('within') || ''
    resultSearchDraft.value = resultSearchValue.value
    topics.value = splitParam(p.get('topic'))
    subtopics.value = splitParam(p.get('sub'))
    tags.value = splitParam(p.get('tag'))
    fileTypes.value = splitParam(p.get('type'))
    dateFrom.value = parseISODate(p.get('from'))
    dateTo.value = parseISODate(p.get('to'))
    const [k, d] = (p.get('sort') || '').split(':')
    sortKey.value = SORTABLE[k] ? k : 'date'
    sortDir.value = d === 'asc' || d === 'desc' ? d : 'desc'
  }

  /* 조건이 하나라도 바뀌면 처음부터 다시 받는다 — 옛 커서는 조건이 바뀌면 400 이다.
     같은 틱 안의 여러 변경(URL 적용 · 모두 해제)은 한 번의 조회로 묶인다 */
  watch(
    [searchValue, resultSearchValue, topics, subtopics, tags, fileTypes, dateFrom, dateTo, sortKey, sortDir],
    () => {
      /* 받지 않은 행은 새 결과에 있는지 알 수 없으므로 선택을 비운다 */
      selectedIds.value = []
      fetchList()
      scheduleUrlWrite()
    },
    { deep: true }
  )

  fetchList()

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
    searchDraft,
    resultSearchDraft,
    topics,
    subtopics,
    tags,
    dateFrom,
    dateTo,
    fileTypes,
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

    visibleRows,
    allVisibleSelected,
    resultKeywordPrefix,
    totalLabel,
    listLoading,
    loadingMore,
    hasMore,

    visibleTopicChips,
    showMoreTopics,
    subtopicChips,
    showMoreSubtopics,
    visibleTagChips,
    showMoreTags,
    fileTypeChips,
    sizeRangeChips,
    datePresetChips,
    dateRangeLabel,
    appliedConditions,
    clearAllConditions,
    clearDateRange,

    toggleSort,
    ariaSortFor,
    applyDatePreset,

    toggleSelectAllVisible,
    toggleRowSelect,
    loadMoreRows,

    openFileDetail,
    closeFileDetail,
    fileDetail,
    fileDetailStatus,
    fileDetailError,
    retryFileDetail,
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
