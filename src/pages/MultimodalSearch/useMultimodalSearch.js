import { ref, computed, watch } from 'vue'
import { useFileDetail } from '../../composables/useFileDetail'
import { downloadAsset } from '../FileSearch/fileSearch.api'
import {
  PAGE_SIZE,
  MODALITY_ORDER,
  MODALITY_LABELS,
  fetchEntities,
  fetchEntityFacets,
  fetchEntityCard,
  downloadEntityBundle,
  downloadEntityAssets,
  normalizeEntity,
  buildEntityDetail
} from './multimodalSearch.api'

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
  const listError = ref('')

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

  async function fetchList() {
    const seq = ++listSeq
    listLoading.value = true
    loadingMore.value = false
    listError.value = ''
    try {
      const body = await fetchEntities({ ...conditionParams(), limit: PAGE_SIZE })
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
      listError.value = e.message
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
  let facetSeq = 0

  async function fetchFacets() {
    const seq = ++facetSeq
    try {
      const body = await fetchEntityFacets({ entityType: entityType.value, areas: areas.value, modalities: modalities.value })
      if (seq !== facetSeq) return
      facetTypes.value = body.types ?? []
      facetAreas.value = body.areas ?? []
      facetModalities.value = body.modalities ?? []
    } catch {
      /* 칩 건수는 부가 정보라, 실패해도 목록은 그대로 보여준다 */
      if (seq === facetSeq) {
        facetTypes.value = []
        facetAreas.value = []
        facetModalities.value = []
      }
    }
  }

  watch([searchValue, resultSearchValue, entityType, areas, modalities], fetchList, { immediate: true })
  watch([entityType, areas, modalities], fetchFacets, { immediate: true })

  const typeChips = computed(() => facetTypes.value.map((t) => toChip(t.name, entityType.value === t.name, t.entities)))
  function toggleType(name) {
    entityType.value = entityType.value === name ? '' : name
  }

  /* 갈래는 서버가 묶어 주는 기준(skill)별로 나눠 보여준다 — 칩 순서는 서버 순서를 그대로 쓴다 */
  const areaGroups = computed(() => {
    const groups = new Map()
    facetAreas.value.forEach((a) => {
      if (!groups.has(a.skill)) groups.set(a.skill, [])
      groups.get(a.skill).push(toChip(a.name, areas.value.includes(a.name), a.entities))
    })
    return [...groups].map(([label, chips]) => ({ label, chips }))
  })
  function toggleArea(name) {
    areas.value = toggleIn(areas.value, name)
  }

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

  const entityDetailOpen = ref(false)
  const entityDetailTarget = ref(null)
  const entityDetail = ref(null)
  const entityDetailStatus = ref('ready')
  const entityDetailError = ref('')
  let detailSeq = 0

  async function loadEntityDetail(target) {
    const seq = ++detailSeq
    entityDetailStatus.value = 'loading'
    entityDetailError.value = ''
    try {
      const card = await fetchEntityCard(target.type, target.uid)
      if (seq !== detailSeq) return
      entityDetail.value = buildEntityDetail(card)
      entityDetailStatus.value = 'ready'
    } catch (e) {
      if (seq !== detailSeq) return
      entityDetail.value = null
      entityDetailStatus.value = 'error'
      entityDetailError.value = e.message
    }
  }

  /** target: 목록 카드(normalizeEntity 결과) — 응답을 기다리는 동안 이름·종류를 먼저 보여준다 */
  function openEntityDetail(target) {
    entityDetailTarget.value = target
    entityDetail.value = null
    entityDetailOpen.value = true
    loadEntityDetail(target)
  }
  function closeEntityDetail() {
    entityDetailOpen.value = false
  }
  function retryEntityDetail() {
    if (entityDetailTarget.value) loadEntityDetail(entityDetailTarget.value)
  }

  /* 묶음 다운로드 — 연결 자료 전체는 카드 묶음, 보고 있는 자료 유형 탭만은 그 탭의 자산 id 로 고른 자산 묶음을 받는다 */
  const downloading = ref(false)
  async function downloadEntity({ key, assetIds }) {
    const target = entityDetailTarget.value
    if (!target || downloading.value) return
    downloading.value = true
    try {
      if (key === 'all') {
        const r = await downloadEntityBundle(target.type, target.uid)
        showToast(
          r.missing > 0
            ? `${target.name} · ${r.count}건 다운로드를 시작했습니다. (${r.missing}건 제외)`
            : `${target.name} · ${r.count}건 다운로드를 시작했습니다.`,
          3000
        )
      } else {
        const r = await downloadEntityAssets(assetIds, { onError: (message) => showToast(message, 4000) })
        showToast(`${target.name} · ${r.count}건 다운로드를 시작했습니다.`, 3000)
      }
    } catch (e) {
      showToast(e.message, 4000)
    } finally {
      downloading.value = false
    }
  }

  /* ------------------------------------------------- 연결 자료 → 파일 상세 */

  /* 개체 상세 모달 위에 파일 상세 모달을 겹쳐 연다 — 닫으면 개체 상세로 돌아온다.
     파일 상세는 파일 검색과 같은 모달 · 같은 조회(GET /assets/{id})를 쓴다 */
  const {
    open: fileDetailOpen,
    detail: fileDetail,
    status: fileDetailStatus,
    error: fileDetailError,
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
    loadingMore,
    listError,
    hasMore,
    loadMoreRows,
    retryList: fetchList,
    searchTerms,
    resultKeywordPrefix,

    typeChips,
    toggleType,
    areaGroups,
    toggleArea,
    modalityChips,
    toggleModality,
    appliedConditions,
    clearAllConditions,

    entityDetailOpen,
    entityDetailTarget,
    entityDetail,
    entityDetailStatus,
    entityDetailError,
    openEntityDetail,
    retryEntityDetail,
    applyEntityType,
    fileDetailOpen,
    fileDetail,
    fileDetailStatus,
    fileDetailError,
    openFileDetail,
    retryFileDetail,
    onFileMetaClick,
    onFileBreadcrumbClick,
    onFileTopicClick,
    downloadFileOriginal,
    downloadEntity,
    downloading,

    toastMessage,

    paletteOpen,
    paletteItems,
    closePalette,
    runPaletteItem
  }
}
