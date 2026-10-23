import { ref, computed, watch } from 'vue'
import { useFileDetail } from '../../composables/useFileDetail'
import { useEntityDetail } from '../../composables/useEntityDetail'
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
  downloadAsset,
  downloadRelationBundle,
  downloadCategoryBundle,
  downloadSelectionBundle,
  readStoredDensity,
  DENSITY_STORAGE_KEY
} from './fileSearch.api'

/* 서버가 태그를 묶는 열쇠와 같은 정규화(NFKC · 공백 제거 · 소문자) */
function tagKey(v) {
  return String(v).normalize('NFKC').replace(/\s+/g, '').toLowerCase()
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
  /* 크기 구간(under1 · 1to10 · over10) — 여럿 고르면 「또는」이다(서버 size_bucket 반복 인자) */
  const sizeBuckets = ref([])
  const selectedIds = ref([])
  const sortKey = ref('date')
  const sortDir = ref('desc')
  const toastMessage = ref('')
  const {
    open: fileDetailOpen,
    target: fileDetailTarget,
    detail: fileDetail,
    status: fileDetailStatus,
    error: fileDetailError,
    retryable: fileDetailRetryable,
    openDetail: openFileDetail,
    close: closeFileDetail,
    retry: retryFileDetail
  } = useFileDetail()

  /* 파일 상세의 소속 개체 칩이 여는 개체 상세 — 멀티모달 검색과 같은 모달 · 같은 로직이다 */
  const {
    open: entityDetailOpen,
    target: entityDetailTarget,
    detail: entityDetail,
    status: entityDetailStatus,
    error: entityDetailError,
    retryable: entityDetailRetryable,
    openDetail: openEntityDetail,
    retry: retryEntityDetail,
    downloading: entityDownloading,
    download: downloadEntity,
    bundleConfirm: entityBundleConfirm,
    answerBundleConfirm: answerEntityBundleConfirm
  } = useEntityDetail({ showToast })
  const density = ref(readStoredDensity())

  const facetModal = ref(null)
  const facetQuery = ref('')
  const facetDraft = ref([])

  /* 어떤 감시(watch)보다 먼저 URL 조건을 읽는다 — 감시가 초기값 반영까지 '변경'으로 보고
     다시 조회하면 새로고침·공유 링크마다 같은 목록을 두 번 받게 된다 */
  applyUrlState()

  /* Enter로만 커밋한다 — 타이핑 중엔 서버 조회/URL 어느 것도 움직이지 않는다 */
  function commitSearch() {
    const prev = searchValue.value
    searchValue.value = searchDraft.value.trim()
    syncSortToSearch(prev)
  }
  /* 칩 제거·지우기 버튼은 타이핑이 아니라 한 번의 명확한 클릭이므로 즉시 반영하고,
     입력창 내용도 함께 맞춰 커밋된 값과 어긋나지 않게 한다 */
  function setSearch(v) {
    const prev = searchValue.value
    searchDraft.value = v
    searchValue.value = v
    syncSortToSearch(prev)
  }
  /* 검색어가 생기면 관련도순, 없어지면 등록일순으로 — 관련도는 검색어가 있어야 뜻이 있다(서버 기본값도 relevance).
     검색어를 바꾸는 쪽에서 같은 틱에 부르므로 조회는 한 번만 일어난다 */
  function syncSortToSearch(prev) {
    if (searchValue.value && !prev) {
      sortKey.value = 'relevance'
      sortDir.value = 'desc'
    } else if (!searchValue.value && sortKey.value === 'relevance') {
      sortKey.value = 'date'
      sortDir.value = 'desc'
    }
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
  /* 목록 요청 실패 — { message, retryable }. 실패하면 이전 결과를 지워 새 조건의 결과처럼 보이지 않게 한다 */
  const listError = ref(null)
  /* 필터 칩은 첫 응답이 오기 전에만 스켈레톤으로 둔다 — 이후 조건이 바뀔 때마다 칩을 지우면
     고른 칩이 사라졌다 나타나 깜빡이므로, 그때는 이전 칩을 둔 채 숫자만 갈아 끼운다 */
  const facetsLoaded = ref(false)
  const filtersLoading = computed(() => listLoading.value && !facetsLoaded.value)

  /* 같은 이름을 반복해 보내는 배열 규칙은 toQuery 가 처리한다 */
  function conditionParams() {
    return {
      q: searchValue.value,
      refine: resultSearchValue.value,
      topic: topics.value,
      subtopic: subtopics.value,
      tag: tags.value,
      file_ext: fileTypes.value.map((e) => e.toLowerCase()),
      size_bucket: sizeBuckets.value,
      created_from: toISODate(dateFrom.value),
      created_to: toISODate(dateTo.value)
    }
  }
  /* 날짜 정렬은 등록일(created)이다 — 목록 날짜 · 기간 필터와 같은 기준이고 안정 정렬이라 이어 받기에서 행이 빠지지 않는다(수정일 정렬은 sort_unstable) */
  const sortParam = computed(() => {
    if (sortKey.value === 'relevance') return 'relevance'
    return `${sortKey.value === 'date' ? 'created' : sortKey.value}_${sortDir.value}`
  })

  /* 조건이 빠르게 여러 번 바뀌면 늦게 도착한 옛 응답이 새 결과를 덮어쓸 수 있다 —
     요청마다 번호를 매겨 마지막 요청의 응답만 반영한다 */
  let listSeq = 0

  /* 조건이 바뀌면 진행 중인 이전 목록 · 칩 요청을 끊는다 — 무거운 칩 집계가 서버에서 겹치지 않게 한다 */
  let listController = null

  async function fetchList() {
    const seq = ++listSeq
    listController?.abort()
    const controller = (listController = new AbortController())
    listLoading.value = true
    loadingMore.value = false
    listError.value = null
    const params = conditionParams()
    const [page, extra] = await Promise.allSettled([
      searchFiles({ ...params, sort: sortParam.value, limit: PAGE_SIZE }, { signal: controller.signal }),
      fetchFacetExtra(params, { signal: controller.signal })
    ])
    if (seq !== listSeq) return
    listLoading.value = false
    facetsLoaded.value = true

    if (page.status === 'fulfilled') {
      const body = page.value
      items.value = body.items.map(normalizeItem)
      total.value = body.total
      totalCapped.value = body.total_capped
      nextCursor.value = body.next_cursor
      depth.value = body.depth ?? Infinity
      facets.value = body.facets ?? {}
    } else {
      /* 이전 행 · 건수 · 커서를 그대로 두면 바뀐 머리말과 옛 결과가 함께 보인다 — 비우고 목록 자리에 오류를 보인다 */
      items.value = []
      total.value = 0
      totalCapped.value = false
      nextCursor.value = null
      depth.value = Infinity
      listError.value = { message: page.reason.message, retryable: page.reason.retryable !== false }
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
      /* 정렬값이 같은 행이 쪽 경계에서 다시 올 수 있어 이미 받은 행은 거른다 */
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
  /* /tags 의 total 은 자르기 전 같은 조건의 태그 종류 수다 — rows 는 최대 TAG_LIST_LIMIT 개라 total 이 더 클 수 있다(IDD IF-CAT-02) */
  const tagTotal = ref(0)
  /* 「전체 보기」 창 검색어로 서버에서 찾은 태그 — 받은 500개 안에서만 거르면 501번째 이후 태그를 못 찾는다. 검색어가 없으면 null */
  const tagSearch = ref(null)

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
        tagTotal.value = 0
        return
      }
      fetchTags({ topic: topics.value, subtopic: subtopics.value, limit: TAG_LIST_LIMIT })
        .then((body) => {
          if (seq !== tagSeq) return
          tagRows.value = body.rows ?? []
          tagTotal.value = body.total ?? tagRows.value.length
        })
        .catch(() => {
          if (seq !== tagSeq) return
          tagRows.value = []
          tagTotal.value = 0
        })
    },
    /* 새로고침 · 공유 링크로 하위주제가 걸린 채 열려도 태그 목록을 받는다 — 바뀔 때만 부르면 「전체 보기」가 빈다 */
    { deep: true, immediate: true }
  )

  /* 상위 조건을 풀면 그 아래 선택도 의미가 없어진다 — 잠금 구조를 그대로 따른다.
     바뀔 게 없을 때 새 배열을 넣으면 그것만으로 다시 조회되므로 실제로 달라질 때만 넣는다 */
  watch(topics, () => {
    const kept = !topics.value.length
      ? []
      : topicRows.value.length
        ? subtopics.value.filter((s) => subtopicOptions.value.has(s))
        : subtopics.value
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

  /* 태그 칩에는 원문 표기(label)를 보인다 — key 는 서버가 묶어 세는 정규화 키(공백 제거 · 소문자)라 「ai목소리」처럼 보인다.
     고른 값과 칩은 같은 정규화로 맞춰, 「전체 보기」에서 고른 원문과 칩이 같은 태그로 두 번 뜨지 않게 한다(W3) */
  const visibleTagChips = computed(() => {
    const entries = (facets.value.tag ?? []).map((e) => ({ label: e.label ?? e.key, norm: tagKey(e.label ?? e.key), count: e.count }))
    const countOf = new Map(entries.map((e) => [e.norm, e.count]))
    const pickedNorms = new Set(tags.value.map(tagKey))
    const picked = tags.value.map((v) => toChip(v, true, countOf.get(tagKey(v)) ?? null))
    const rest = entries.filter((e) => !pickedNorms.has(e.norm)).map((e) => toChip(e.label, false, e.count))
    return [...picked, ...rest].slice(0, Math.max(FACET_VISIBLE_COUNT, picked.length))
  })
  const showMoreTags = computed(() => tagOptions.value.size > visibleTagChips.value.length)

  /* 형식 칩은 서버가 소문자 확장자로 준다 — 화면·URL 은 지금처럼 대문자로 쓴다 */
  const fileTypeChips = computed(() => {
    const entries = (facetAxes.value.file_ext ?? []).map((e) => ({ key: e.key.toUpperCase(), count: e.count }))
    const keys = new Set(entries.map((e) => e.key))
    const missing = fileTypes.value.filter((v) => !keys.has(v)).map((v) => toChip(v, true, null))
    return [...missing, ...entries.map((e) => toChip(e.key, fileTypes.value.includes(e.key), e.count))]
  })

  /* 크기 칩 숫자는 크기 조건만 뺀 채 센 「누르면 나오는 수」라, 하나를 고른 채 다른 구간으로 갈아탈 수 있다(전달사항 1-1) */
  const sizeRangeChips = computed(() =>
    (facetAxes.value.file_size ?? []).map((e) => {
      const active = sizeBuckets.value.includes(e.key)
      return { label: SIZE_BUCKET_LABELS[e.key] ?? e.key, value: e.key, count: e.count, active, disabled: e.count === 0 && !active }
    })
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
    ...sizeBuckets.value.map((k) => ({
      label: `크기: ${SIZE_BUCKET_LABELS[k] ?? k}`,
      remove: () => (sizeBuckets.value = sizeBuckets.value.filter((x) => x !== k))
    })),
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
    const prev = searchValue.value
    searchDraft.value = ''
    searchValue.value = ''
    syncSortToSearch(prev)
    resultSearchDraft.value = ''
    resultSearchValue.value = ''
    topics.value = []
    subtopics.value = []
    tags.value = []
    fileTypes.value = []
    sizeBuckets.value = []
    dateFrom.value = null
    dateTo.value = null
  }
  function clearDateRange() {
    dateFrom.value = null
    dateTo.value = null
  }

  /* ------------------------------------------------------------- sorting */

  function sortByRelevance() {
    sortKey.value = 'relevance'
    sortDir.value = 'desc'
  }
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

  /* 전체 선택은 두지 않는다(기획 결정) — 서버가 쪽 단위로 주므로 행을 하나씩 고른다 */
  const visibleRows = items

  function toggleRowSelect(id) {
    selectedIds.value = toggleIn(selectedIds.value, id)
  }

  /* 같은 받기가 겹쳐 눌리지 않게 막는다 — 큰 zip 은 몇 초 걸린다 */
  const downloading = ref(false)

  async function runDownload(task, doneMessage) {
    if (downloading.value) return
    downloading.value = true
    try {
      const result = await task()
      showToast(doneMessage(result), 3000)
    } catch (e) {
      showToast(e.message, 4000)
    } finally {
      downloading.value = false
    }
  }

  function downloadOriginal(file) {
    return runDownload(
      () => downloadAsset(file),
      (r) => `${r.name} 다운로드를 시작했습니다.`
    )
  }

  /* 폼 제출이라 담긴 수는 받는 쪽(브라우저)에서 알 수 없다 — 서버가 오류 본문을 주면 그 문장을 보여 준다 */
  function downloadSelected() {
    const ids = [...selectedIds.value]
    return runDownload(
      () => downloadSelectionBundle(ids, { onError: (message) => showToast(message, 4000) }),
      (r) => `${r.count}건 다운로드를 시작했습니다.`
    )
  }

  /* 상세 모달의 「분류 묶음」 — 이 파일이 속한 분류(주제 · 하위주제)의 자료 전부. 큰 분류는 수천 건이다 */
  function downloadCategory(file) {
    return runDownload(
      () => downloadCategoryBundle(file),
      (r) => `${file.topics[0].label} 분류 ${r.count.toLocaleString()}건 다운로드를 시작했습니다.`
    )
  }

  /* 상세 모달의 「연관 데이터 묶음」 — 이 자산과 확인된 관계로 이어진 자산 zip */
  function downloadRelations(file) {
    return runDownload(
      () => downloadRelationBundle(file),
      (r) =>
        r.missing > 0
          ? `연관 데이터 ${r.count}건 다운로드를 시작했습니다. (${r.missing}건 제외)`
          : `연관 데이터 ${r.count}건 다운로드를 시작했습니다.`
    )
  }

  /* --------------------------------------------------------- 파일 상세 모달 */

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
  /* 소속 개체 칩 — 같은 이름의 태그로 파일 검색을 걸면 칩 숫자(개체에 묶인 파일 수)와 결과가 달라서, 개체 상세를 연다.
     카드의 연결 자료 수가 칩 숫자와 같다. 멀티모달 검색과 같이 파일 상세는 닫고 개체 상세를 연다 */
  function onMetaClickDetail(meta) {
    const [type, ...rest] = meta.id.split(':')
    closeFileDetail()
    openEntityDetail({ id: meta.id.replace(':', '/'), type, uid: rest.join(':'), name: meta.label })
  }
  /* 상세의 키워드 칩 — 그 태그로 목록을 거른다(목록 태그와 같은 출처라 이 파일도 나온다) */
  function onTagClickDetail(tag) {
    if (!tags.value.some((t) => tagKey(t) === tagKey(tag))) tags.value = [...tags.value, tag]
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
    tagSearch.value = null
    facetDraft.value = [...FACET_CONFIG[key].selected.value]
    facetModal.value = key
  }
  function closeFacetModal() {
    facetModal.value = null
    tagSearch.value = null
  }
  function confirmFacetModal() {
    FACET_CONFIG[facetModal.value].selected.value = facetDraft.value
    closeFacetModal()
  }

  /* 태그 창의 검색은 서버가 한다(/tags?q= · 부분 일치) — 받은 TAG_LIST_LIMIT 개 밖의 태그도 닿는다.
     타이핑마다 부르지 않도록 잠시 멈춘 뒤 부르고, 늦게 온 옛 응답은 버린다 */
  let tagSearchSeq = 0
  let tagSearchTimer = null
  watch(facetQuery, (value) => {
    clearTimeout(tagSearchTimer)
    const q = value.trim()
    const seq = ++tagSearchSeq
    if (facetModal.value !== 'tag' || !q) {
      tagSearch.value = null
      return
    }
    tagSearchTimer = setTimeout(() => {
      fetchTags({ topic: topics.value, subtopic: subtopics.value, q, limit: TAG_LIST_LIMIT })
        .then((body) => {
          if (seq === tagSearchSeq) tagSearch.value = { rows: body.rows ?? [], total: body.total ?? 0 }
        })
        .catch(() => {
          if (seq === tagSearchSeq) tagSearch.value = { rows: [], total: 0 }
        })
    }, 250)
  })

  const facetModalTitle = computed(() => (facetModal.value ? FACET_CONFIG[facetModal.value].title : ''))

  /* 태그는 서버가 센 총계를, 주제 · 하위주제는 받은 목록 수를 쓴다 */
  const facetModalTotal = computed(() => {
    if (!facetModal.value) return 0
    if (facetModal.value === 'tag') return tagSearch.value ? tagSearch.value.total : tagTotal.value
    return FACET_CONFIG[facetModal.value].options().size
  })
  /* 총계가 받은 목록보다 크면 「전체 N개 중 상위 M개」로 밝히기 위한 받은 수 — 넘치지 않으면 null */
  const facetModalShown = computed(() => {
    if (facetModal.value !== 'tag') return null
    const shown = tagSearch.value ? tagSearch.value.rows.length : tagRows.value.length
    return facetModalTotal.value > shown ? shown : null
  })

  /* 모달은 가나다순 — 체크하는 동안 목록이 눈앞에서 재정렬되면 안 된다 */
  const facetModalRows = computed(() => {
    if (!facetModal.value) return []
    const picked = facetDraft.value
    /* 태그 검색 중이면 서버가 이미 거른 결과라 다시 거르지 않는다 */
    const searched = facetModal.value === 'tag' && tagSearch.value
    const options = searched ? new Map(tagSearch.value.rows.map((r) => [r.tag, r.count])) : FACET_CONFIG[facetModal.value].options()
    const q = searched ? '' : facetQuery.value.trim().toLowerCase()
    return [...options.keys()]
      .filter((v) => !q || v.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((v) => ({ label: v, active: isPicked(picked, v), count: options.get(v) ?? 0 }))
  })

  /* 태그는 표기가 달라도(띄어쓰기 · 대소문자) 같은 태그다 — 주제 · 하위주제는 그대로 비교한다 */
  function isPicked(picked, v) {
    if (facetModal.value !== 'tag') return picked.includes(v)
    return picked.some((p) => tagKey(p) === tagKey(v))
  }
  function toggleFacetValue(label) {
    facetDraft.value =
      facetModal.value === 'tag' && isPicked(facetDraft.value, label)
        ? facetDraft.value.filter((p) => tagKey(p) !== tagKey(label))
        : toggleIn(facetDraft.value, label)
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
    if (sizeBuckets.value.length) p.set('size', sizeBuckets.value.join(','))
    if (dateFrom.value) p.set('from', toISODate(dateFrom.value))
    if (dateTo.value) p.set('to', toISODate(dateTo.value))
    /* 기본 정렬(검색어가 있으면 관련도, 없으면 등록일 최신순)은 주소에 적지 않는다 */
    const isDefaultSort = q ? sortKey.value === 'relevance' : sortKey.value === 'date' && sortDir.value === 'desc'
    if (!isDefaultSort) p.set('sort', sortKey.value === 'relevance' ? 'relevance' : `${sortKey.value}:${sortDir.value}`)
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
    sizeBuckets.value = splitParam(p.get('size')).filter((k) => SIZE_BUCKET_LABELS[k])
    dateFrom.value = parseISODate(p.get('from'))
    dateTo.value = parseISODate(p.get('to'))
    const [k, d] = (p.get('sort') || '').split(':')
    if (SORTABLE[k]) {
      sortKey.value = k
      sortDir.value = d === 'asc' || d === 'desc' ? d : 'desc'
    } else {
      /* 정렬이 없거나 relevance 면 검색어 유무로 정한다 — 검색어 없는 관련도순은 뜻이 없다 */
      sortKey.value = searchValue.value ? 'relevance' : 'date'
      sortDir.value = 'desc'
    }
  }

  /* 조건이 하나라도 바뀌면 처음부터 다시 받는다 — 옛 커서는 조건이 바뀌면 400 이다.
     같은 틱 안의 여러 변경(URL 적용 · 모두 해제)은 한 번의 조회로 묶인다 */
  watch(
    [searchValue, resultSearchValue, topics, subtopics, tags, fileTypes, sizeBuckets, dateFrom, dateTo, sortKey, sortDir],
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
    resultSearchValue,
    topics,
    subtopics,
    tags,
    dateFrom,
    dateTo,
    fileTypes,
    sizeBuckets,
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
    resultKeywordPrefix,
    totalLabel,
    listLoading,
    filtersLoading,
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
    sortByRelevance,
    ariaSortFor,
    applyDatePreset,

    toggleRowSelect,
    loadMoreRows,
    listError,
    retryList: fetchList,
    downloading,
    downloadOriginal,
    downloadRelations,
    downloadCategory,
    downloadSelected,

    openFileDetail,
    closeFileDetail,
    fileDetail,
    fileDetailStatus,
    fileDetailError,
    fileDetailRetryable,
    entityDetailOpen,
    entityDetailTarget,
    entityDetail,
    entityDetailStatus,
    entityDetailError,
    entityDetailRetryable,
    retryEntityDetail,
    entityDownloading,
    downloadEntity,
    entityBundleConfirm,
    answerEntityBundleConfirm,
    retryFileDetail,
    onBreadcrumbClickDetail,
    onTopicClickDetail,
    onMetaClickDetail,
    onRelationClickDetail,
    onTagClickDetail,

    openFacetModal,
    closeFacetModal,
    confirmFacetModal,
    facetModalTitle,
    facetModalTotal,
    facetModalShown,
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
