import { ref, computed, watch } from 'vue'
import { useFileDetail } from '../../composables/useFileDetail'
import { useEntityDetail } from '../../composables/useEntityDetail'
import { downloadAsset } from '../FileSearch/fileSearch.api'
import {
  PAGE_SIZE,
  FACET_VISIBLE_COUNT,
  MODALITY_ORDER,
  MODALITY_LABELS,
  fetchEntities,
  fetchEntityFacets,
  normalizeEntity
} from './multimodalSearch.api'

const HASH_ROUTE = '#multimodal-search'
/* 화면 표기(문서 · 이미지 …) → 주소에 적는 API 값(text · image …) */
const MODALITY_CODE_OF = Object.fromEntries(Object.entries(MODALITY_LABELS).map(([code, label]) => [label, code]))

/* 주소의 여러 값은 쉼표로 묶는다 */
function splitParam(v) {
  return v ? v.split(',').filter(Boolean) : []
}
function toggleIn(list, val) {
  return list.includes(val) ? list.filter((v) => v !== val) : [...list, val]
}
function toChip(label, active, count) {
  return { label, active, count, disabled: count === 0 && !active }
}

/**
 * 멀티모달 검색 화면의 검색·필터 상태 로직.
 * 결과 단위는 자료 한 건이 아니라 개체(인물·장소·작품 등)다. 검색·좁히기·정렬은 모두 서버가 하므로
 * 조건이 바뀌면 처음부터 다시 받는다(IDD IF-ENTITY-01) — 정렬은 서버 고정(구성 자산 수 내림차순)이다.
 * 종류는 하나만, 갈래·자료 유형은 여럿 고를 수 있고 여럿이면 모두 가진 개체만 남는다(AND).
 */
export function useMultimodalSearch() {
  /* searchDraft는 입력 중인 값, searchValue는 Enter로 커밋되어 결과에 반영된 값 */
  const searchValue = ref('')
  const searchDraft = ref('')
  const resultSearchValue = ref('')
  const resultSearchDraft = ref('')
  /* 종류 — API 가 값 하나만 받는다 */
  const entityType = ref('')
  const areas = ref([])
  /* 반드시 포함할 자료 — 화면 표기(문서·이미지·영상·음성)로 들고 있다가 보낼 때 API 값으로 바꾼다 */
  const modalities = ref([])

  /* 어떤 감시보다 먼저 주소의 조건을 읽는다 — 감시가 초기값 반영까지 '변경'으로 보고 다시 조회하면
     새로고침 · 공유 링크마다 같은 목록을 두 번 받는다 */
  applyUrlState()

  function commitSearch() {
    searchValue.value = searchDraft.value.trim()
  }
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
  const searchDirty = computed(() => searchDraft.value.trim() !== searchValue.value)

  /* --------------------------------------------------------------- toast */

  const toastMessage = ref('')
  let toastTimer = null
  function showToast(message, ms = 2500) {
    toastMessage.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMessage.value = ''), ms)
  }

  /* ------------------------------------------------------------ 목록 조회 */

  const results = ref([])
  const total = ref(0)
  const scopeTotal = ref(0)
  const nextCursor = ref(null)
  const listLoading = ref(false)
  const loadingMore = ref(false)
  /* 목록 요청 실패 — { message, retryable }. 다시 시도는 연결 실패 · 5xx · 시간 초과에만 보인다 */
  const listError = ref(null)

  function conditionParams() {
    return {
      q: searchValue.value,
      refine: resultSearchValue.value,
      entityType: entityType.value,
      areas: areas.value,
      modalities: modalities.value
    }
  }

  /* 조건이 빠르게 여러 번 바뀌면 늦게 도착한 옛 응답이 새 결과를 덮어쓸 수 있다 — 마지막 요청만 반영한다 */
  let listSeq = 0

  /* 조건이 바뀌면 진행 중인 이전 목록 요청을 끊는다 */
  let listController = null

  async function fetchList() {
    const seq = ++listSeq
    listController?.abort()
    const controller = (listController = new AbortController())
    listLoading.value = true
    loadingMore.value = false
    listError.value = null
    try {
      const body = await fetchEntities({ ...conditionParams(), limit: PAGE_SIZE }, { signal: controller.signal })
      if (seq !== listSeq) return
      results.value = body.items.map(normalizeEntity)
      total.value = body.total
      scopeTotal.value = body.scope_total ?? body.total
      nextCursor.value = body.next_cursor
    } catch (e) {
      if (seq !== listSeq) return
      results.value = []
      total.value = 0
      nextCursor.value = null
      listError.value = { message: e.message, retryable: e.retryable !== false }
    } finally {
      if (seq === listSeq) listLoading.value = false
    }
  }

  const hasMore = computed(() => !!nextCursor.value)

  async function loadMoreRows() {
    if (!hasMore.value || loadingMore.value || listLoading.value) return
    const seq = listSeq
    loadingMore.value = true
    try {
      const body = await fetchEntities({ ...conditionParams(), cursor: nextCursor.value, limit: PAGE_SIZE })
      if (seq !== listSeq) return
      const seen = new Set(results.value.map((r) => r.id))
      results.value = [...results.value, ...body.items.map(normalizeEntity).filter((r) => !seen.has(r.id))]
      nextCursor.value = body.next_cursor
    } catch (e) {
      if (seq === listSeq) showToast(e.message, 4000)
    } finally {
      if (seq === listSeq) loadingMore.value = false
    }
  }

  /* ---------------------------------------------------------------- chips */

  /* 칩 건수 — 칩은 자기 축의 조건을 뺀 채 센다. 검색어로는 좁혀지지 않는다(IDD IF-ENTITY-02) */
  const facetTypes = ref([])
  const facetAreas = ref([])
  const facetModalities = ref([])
  /* 첫 집계가 오기 전에만 필터를 스켈레톤으로 둔다 — 이후엔 이전 칩을 둔 채 숫자만 갈아 끼운다 */
  const facetsLoaded = ref(false)
  const filtersLoading = computed(() => !facetsLoaded.value)
  /* 칩 조회 실패 — 「0건」과 구별해 사이드바에 실패 안내와 다시 시도를 보인다 */
  const facetsError = ref('')
  let facetSeq = 0
  let facetController = null

  async function fetchFacets() {
    const seq = ++facetSeq
    facetController?.abort()
    const controller = (facetController = new AbortController())
    try {
      const body = await fetchEntityFacets(
        { entityType: entityType.value, areas: areas.value, modalities: modalities.value },
        { signal: controller.signal }
      )
      if (seq !== facetSeq) return
      facetTypes.value = body.types ?? []
      facetAreas.value = body.areas ?? []
      facetModalities.value = body.modalities ?? []
      facetsError.value = ''
      facetsLoaded.value = true
    } catch (e) {
      /* 칩 건수는 부가 정보라, 실패해도 목록은 그대로 보여준다 */
      if (seq !== facetSeq) return
      facetsError.value = e.message
      facetsLoaded.value = true
    }
  }

  watch([searchValue, resultSearchValue, entityType, areas, modalities], fetchList, { immediate: true })

  /* ----------------------------------------------------------- URL 동기화 */

  /* 조건을 주소에 남긴다(#multimodal-search?q=…&type=…&area=a,b&mod=image,video) — 새로고침 · 주소 복사 ·
     다른 화면에 갔다 돌아올 때 같은 조건 · 같은 결과가 나온다. 파일 검색(useFileSearch)과 같은 방식이다 */
  function parseHashParams() {
    if (!location.hash.startsWith(HASH_ROUTE)) return null
    return new URLSearchParams(location.hash.slice(HASH_ROUTE.length).replace(/^\?/, ''))
  }
  function applyUrlState() {
    const p = parseHashParams()
    if (!p) return
    searchValue.value = p.get('q') || ''
    searchDraft.value = searchValue.value
    resultSearchValue.value = p.get('within') || ''
    resultSearchDraft.value = resultSearchValue.value
    entityType.value = p.get('type') || ''
    areas.value = splitParam(p.get('area'))
    modalities.value = splitParam(p.get('mod'))
      .map((code) => MODALITY_LABELS[code])
      .filter(Boolean)
  }
  function buildHash() {
    const p = new URLSearchParams()
    if (searchValue.value) p.set('q', searchValue.value)
    if (resultSearchValue.value) p.set('within', resultSearchValue.value)
    if (entityType.value) p.set('type', entityType.value)
    if (areas.value.length) p.set('area', areas.value.join(','))
    if (modalities.value.length) p.set('mod', modalities.value.map((l) => MODALITY_CODE_OF[l]).join(','))
    const qs = p.toString()
    return qs ? `${HASH_ROUTE}?${qs}` : HASH_ROUTE
  }
  /* 글자 하나마다 히스토리가 쌓이지 않도록 replaceState 로 바꾼다 — 뒤로가기는 「이 화면을 떠난다」다 */
  let urlWriteTimer = null
  watch([searchValue, resultSearchValue, entityType, areas, modalities], () => {
    clearTimeout(urlWriteTimer)
    urlWriteTimer = setTimeout(() => {
      const next = buildHash()
      if (location.hash.startsWith(HASH_ROUTE) && location.hash !== next) history.replaceState(null, '', next)
    }, 200)
  })
  watch([entityType, areas, modalities], fetchFacets, { immediate: true })

  const typeChips = computed(() => facetTypes.value.map((t) => toChip(t.name, entityType.value === t.name, t.entities)))
  function toggleType(name) {
    entityType.value = entityType.value === name ? '' : name
  }

  /* 갈래는 서버가 묶어 주는 기준(skill)별로 나눠 보여준다 — 칩 순서는 서버 순서를 그대로 쓴다.
     파일 검색과 같이 묶음마다 상위 몇 개만 보이고, 고른 칩은 순위와 상관없이 늘 앞에 붙든다 */
  const areaOptionsByGroup = computed(() => {
    const groups = new Map()
    facetAreas.value.forEach((a) => {
      if (!groups.has(a.skill)) groups.set(a.skill, [])
      groups.get(a.skill).push(a)
    })
    return groups
  })
  const areaGroups = computed(() =>
    [...areaOptionsByGroup.value].map(([label, options]) => {
      const picked = options.filter((a) => areas.value.includes(a.name))
      const rest = options.filter((a) => !areas.value.includes(a.name))
      const chips = [...picked, ...rest]
        .slice(0, Math.max(FACET_VISIBLE_COUNT, picked.length))
        .map((a) => toChip(a.name, areas.value.includes(a.name), a.entities))
      return { label, chips, showMore: options.length > chips.length }
    })
  )
  function toggleArea(name) {
    areas.value = toggleIn(areas.value, name)
  }

  /* 갈래 '전체 보기' 창 — 고르는 동안은 draft에 담고, 선택 완료 때 그 묶음의 선택만 바꿔 끼운다 */
  const areaModalGroup = ref(null)
  const areaModalQuery = ref('')
  const areaModalDraft = ref([])
  const areaModalOptions = computed(() => areaOptionsByGroup.value.get(areaModalGroup.value) ?? [])
  function openAreaModal(group) {
    areaModalGroup.value = group
    areaModalQuery.value = ''
    const names = new Set((areaOptionsByGroup.value.get(group) ?? []).map((a) => a.name))
    areaModalDraft.value = areas.value.filter((a) => names.has(a))
  }
  function closeAreaModal() {
    areaModalGroup.value = null
  }
  function toggleAreaDraft(name) {
    areaModalDraft.value = toggleIn(areaModalDraft.value, name)
  }
  function confirmAreaModal() {
    const names = new Set(areaModalOptions.value.map((a) => a.name))
    areas.value = [...areas.value.filter((a) => !names.has(a)), ...areaModalDraft.value]
    closeAreaModal()
  }
  /* 창 안은 가나다순 — 체크하는 동안 목록이 눈앞에서 재정렬되면 안 된다 */
  const areaModalRows = computed(() => {
    const q = areaModalQuery.value.trim().toLowerCase()
    return areaModalOptions.value
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map((a) => ({ label: a.name, count: a.entities, active: areaModalDraft.value.includes(a.name) }))
  })

  /* 자료 유형 칩 건수 — 서버가 항상 네 유형을 0건까지 준다. 건수는 "이 칩을 더 누르면 남는 개체 수"(AND)라
     이미 고른 칩은 지금 결과 수와 같다. 갈래 칩 건수는 자료 유형 조건을 적용하지 못한다(IDD IF-ENTITY-02) */
  const modalityChips = computed(() =>
    MODALITY_ORDER.map((label) => {
      const row = facetModalities.value.find((m) => MODALITY_LABELS[m.name] === label)
      return toChip(label, modalities.value.includes(label), row?.entities ?? 0)
    })
  )
  function toggleModality(label) {
    modalities.value = toggleIn(modalities.value, label)
  }

  /* ------------------------------------------------------ applied conditions */

  const appliedConditions = computed(() => [
    ...searchTerms.value.map((t) => ({ label: `검색어: ${t}`, remove: () => removeSearchTerm(t) })),
    ...(resultSearchValue.value ? [{ label: `결과 내 검색: ${resultSearchValue.value}`, remove: () => setResultSearch('') }] : []),
    ...(entityType.value ? [{ label: `종류: ${entityType.value}`, remove: () => (entityType.value = '') }] : []),
    ...areas.value.map((v) => ({ label: `갈래: ${v}`, remove: () => (areas.value = areas.value.filter((x) => x !== v)) })),
    ...modalities.value.map((v) => ({
      label: `포함 자료: ${v}`,
      remove: () => (modalities.value = modalities.value.filter((x) => x !== v))
    }))
  ])

  const resultKeywordPrefix = computed(() => {
    if (searchTerms.value.length) return `"${searchTerms.value.join(' ')}" 검색결과 `
    if (appliedConditions.value.length) return '검색결과 '
    return '전체 개체 '
  })

  function clearAllConditions() {
    setSearch('')
    setResultSearch('')
    entityType.value = ''
    areas.value = []
    modalities.value = []
  }

  /* ---------------------------------------------------------- 개체 상세 모달 */

  /* 조회 · 묶음 받기는 파일 검색의 소속 개체 칩과 같은 로직이라 composables/useEntityDetail 이 맡는다 */
  const {
    open: entityDetailOpen,
    target: entityDetailTarget,
    detail: entityDetail,
    status: entityDetailStatus,
    error: entityDetailError,
    retryable: entityDetailRetryable,
    openDetail: openEntityDetail,
    close: closeEntityDetail,
    retry: retryEntityDetail,
    downloading,
    download: downloadEntity
  } = useEntityDetail({ showToast })

  /* ------------------------------------------------- 연결 자료 → 파일 상세 */

  /* 개체 상세 모달 위에 파일 상세 모달을 겹쳐 연다 — 닫으면 개체 상세로 돌아온다.
     파일 상세는 파일 검색과 같은 모달 · 같은 조회(GET /assets/{id})를 쓴다 */
  const {
    open: fileDetailOpen,
    detail: fileDetail,
    status: fileDetailStatus,
    error: fileDetailError,
    retryable: fileDetailRetryable,
    openDetail: openFileDetail,
    close: closeFileDetail,
    retry: retryFileDetail
  } = useFileDetail()

  /* 파일 상세 안에서 소속 개체 칩을 누르면 그 개체로 옮겨 간다 */
  function onFileMetaClick(meta) {
    const [type, ...rest] = meta.id.split(':')
    closeFileDetail()
    openEntityDetail({ id: meta.id.replace(':', '/'), type, uid: rest.join(':'), name: meta.label })
  }

  /* 분류 경로 · 주제 칩은 개체 검색에는 없는 조건이라, 그 분류로 거른 파일 검색 화면으로 보낸다 */
  function goFileSearch(topic, subtopic) {
    const p = new URLSearchParams()
    p.set('topic', topic)
    if (subtopic) p.set('sub', subtopic)
    closeFileDetail()
    location.hash = `#file-search?${p}`
  }
  function onFileBreadcrumbClick(crumb) {
    const [topicCrumb, subtopicCrumb] = fileDetail.value?.breadcrumb ?? []
    if (topicCrumb) goFileSearch(topicCrumb.label, crumb.level === 'subtopic' ? subtopicCrumb?.label : null)
  }
  function onFileTopicClick(topicChip) {
    goFileSearch(topicChip.topic, topicChip.subtopic)
  }

  /* 파일 상세의 「이 데이터만」 — 연관 · 분류 묶음은 협의 전이라 모달에서 막혀 있다 */
  async function downloadFileOriginal(file) {
    if (downloading.value) return
    downloading.value = true
    try {
      const r = await downloadAsset(file)
      showToast(`${r.name} 다운로드를 시작했습니다.`, 3000)
    } catch (e) {
      showToast(e.message, 4000)
    } finally {
      downloading.value = false
    }
  }

  /* 모달의 종류 경로를 누르면 그 종류로 목록을 좁힌다 */
  function applyEntityType() {
    const type = entityDetail.value?.type ?? entityDetailTarget.value?.type
    if (type) entityType.value = type
    closeEntityDetail()
  }

  /* --------------------------------------------------------- command palette */

  const paletteOpen = ref(false)

  /* 갈래는 지금 고를 수 있는(건수가 있는) 것만, 개체는 지금 받은 결과 순서대로 */
  const paletteItems = computed(() => [
    ...(appliedConditions.value.length ? [{ label: '조건 모두 해제', hint: '동작', kind: 'clear' }] : []),
    ...typeChips.value.map((c) => ({ label: c.label, hint: '종류', kind: 'type', value: c.label })),
    ...areaGroups.value.flatMap((g) =>
      g.chips.filter((c) => !c.disabled).map((c) => ({ label: c.label, hint: '갈래', kind: 'area', value: c.label }))
    ),
    ...modalityChips.value.map((c) => ({ label: `${c.label} 포함`, hint: '포함 자료', kind: 'modality', value: c.label })),
    ...results.value.map((r) => ({ label: r.name, hint: r.type, kind: 'entity', value: r }))
  ])

  function closePalette() {
    paletteOpen.value = false
  }
  function runPaletteItem(item) {
    if (item.kind === 'clear') clearAllConditions()
    else if (item.kind === 'type') toggleType(item.value)
    else if (item.kind === 'area') toggleArea(item.value)
    else if (item.kind === 'modality') toggleModality(item.value)
    else if (item.kind === 'entity') openEntityDetail(item.value)
    closePalette()
  }

  return {
    searchDraft,
    resultSearchDraft,
    resultSearchValue,
    entityType,
    areas,
    modalities,

    searchDirty,
    commitSearch,
    setSearch,
    commitResultSearch,
    setResultSearch,

    results,
    total,
    scopeTotal,
    listLoading,
    filtersLoading,
    loadingMore,
    listError,
    facetsError,
    retryFacets: fetchFacets,
    hasMore,
    loadMoreRows,
    retryList: fetchList,
    searchTerms,
    resultKeywordPrefix,

    typeChips,
    toggleType,
    areaGroups,
    toggleArea,
    areaModalGroup,
    areaModalQuery,
    areaModalOptions,
    areaModalRows,
    openAreaModal,
    closeAreaModal,
    toggleAreaDraft,
    confirmAreaModal,
    modalityChips,
    toggleModality,
    appliedConditions,
    clearAllConditions,

    entityDetailOpen,
    entityDetailTarget,
    entityDetail,
    entityDetailStatus,
    entityDetailError,
    entityDetailRetryable,
    openEntityDetail,
    retryEntityDetail,
    applyEntityType,
    fileDetailOpen,
    fileDetail,
    fileDetailStatus,
    fileDetailError,
    fileDetailRetryable,
    openFileDetail,
    retryFileDetail,
    onFileMetaClick,
    onFileBreadcrumbClick,
    onFileTopicClick,
    downloadFileOriginal,
    downloadEntity,
    downloading,

    toastMessage,

    applyUrlState,

    paletteOpen,
    paletteItems,
    closePalette,
    runPaletteItem
  }
}
