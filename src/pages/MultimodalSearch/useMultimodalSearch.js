import { ref, computed, watch } from 'vue'
import {
  MODALITY_OPTIONS,
  TYPE_OPTIONS,
  TYPE_GENRE_MAP,
  GENRE_OPTIONS,
  COUNTRY_OPTIONS,
  DECADE_OPTIONS,
  DATE_PRESETS,
  EVIDENCE_BASIS,
  LINK_BASIS,
  generateFilms
} from './multimodalSearch.mock'

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
function toChip(label, active, count) {
  return { label, active, count, disabled: count === 0 && !active }
}

function includesTerm(haystack, term) {
  return haystack.toLowerCase().includes(term.toLowerCase())
}
const filmMetaText = (f) => `${f.title} ${f.type} ${f.genre} ${f.country} ${f.decade}`
const assetText = (a) => `${a.label} ${a.text}`

/* 관련도 — 실제로는 검색 엔진이 돌려주는 점수. 목업에서는 근거 유형의 기본값에 자료·검색어별로
   고정된 작은 편차를 더한다(같은 검색이면 늘 같은 점수가 나오게) */
function jitter(key) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 997
  return (h % 9) / 100
}
function relevance(asset, terms) {
  const hit = terms.filter((t) => includesTerm(assetText(asset), t))
  if (!hit.length) return 0
  const base = EVIDENCE_BASIS[asset.basis]?.base ?? 0.7
  return Math.min(0.99, Math.max(...hit.map((t) => base + jitter(asset.id + t))))
}
/* 점수 구간 — 화면에는 숫자 대신 등급으로 보여준다 */
function relevanceGrade(score) {
  if (score >= 0.85) return '높음'
  if (score >= 0.75) return '중간'
  return '낮음'
}
/* 연결 관련도 — 검색과 무관하게 이 자료가 작품에 얼마나 확실히 묶였는지 */
function linkRelevance(asset) {
  return Math.min(0.99, (LINK_BASIS[asset.linkBasis]?.base ?? 0.7) + jitter(asset.id))
}
const withRelevance = (a, terms) => {
  const score = relevance(a, terms)
  return { ...a, score, grade: relevanceGrade(score) }
}

/**
 * 멀티모달 검색 화면의 검색·필터 상태 로직.
 * 결과 단위는 자료 한 건이 아니라 작품이다. 검색어는 작품 정보뿐 아니라 연결된 모든 모달리티의 자료 내용까지
 * 훑고, 맞은 자료를 '근거'로 모은다. 여러 모달리티에서 함께 맞은 작품일수록 위로 올린다.
 * 필터 차원끼리는 AND, 한 차원 안의 선택지끼리는 OR로 묶는다 — 분야의 장르·국가·연대도 각각 별도 차원이다.
 */
export function useMultimodalSearch() {
  const films = ref(generateFilms())

  /* searchDraft는 입력 중인 값, searchValue는 Enter로 커밋되어 결과에 반영된 값 */
  const searchValue = ref('')
  const searchDraft = ref('')
  const resultSearchValue = ref('')
  const resultSearchDraft = ref('')
  /* 반드시 포함할 자료 — 고른 모달리티를 모두(AND) 갖춘 작품만 남긴다. 결과를 모달리티로 쪼개는 게 아니라
     '자료가 얼마나 갖춰졌는지'를 조건으로 거는 것이라, 근거·카드 표시는 거르지 않는다 */
  const modalities = ref([])
  const types = ref([])
  const genres = ref([])
  const countries = ref([])
  const decades = ref([])
  const dateFrom = ref(null)
  const dateTo = ref(null)

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
  const resultSearchTerms = computed(() => resultSearchValue.value.trim().split(/\s+/).filter(Boolean))
  const searchDirty = computed(() => searchDraft.value.trim() !== searchValue.value)

  /* ------------------------------------------------------------ filtering */

  /* 등록일은 작품이 아니라 자료의 등록일이다 — 기간 밖의 자료는 검색·근거·모달리티 판단에서 모두 빠진다 */
  const currentRange = computed(() => ({ from: toISODate(dateFrom.value), to: toISODate(dateTo.value) }))
  const hasDateRange = computed(() => !!(dateFrom.value || dateTo.value))
  function inRange(iso, range) {
    return (!range.from || iso >= range.from) && (!range.to || iso <= range.to)
  }

  const allTerms = computed(() => [...searchTerms.value, ...resultSearchTerms.value])
  const assetMatches = (a, terms) => terms.some((t) => includesTerm(assetText(a), t))

  /* 검색어 하나하나는 작품 정보나 기간 안의 연결 자료 중 어디에서든 맞으면 된다 — 서로 다른 모달리티가
     서로 다른 검색어를 채워 주는 것도 교차 근거로 인정한다 */
  function matchesAllTerms(film, terms, range) {
    return terms.every(
      (t) => includesTerm(filmMetaText(film), t) || film.assets.some((a) => inRange(a.date, range) && includesTerm(assetText(a), t))
    )
  }

  /* 이 작품에서 근거가 될 수 있는 자료 — 기간 안에 등록됐고, 검색 중이면 검색어가 맞은 자료.
     검색어가 작품 정보로만 채워진 작품은 기간 안의 자료 전체가 대상이다 */
  function relevantAssets(film, range) {
    const inScope = film.assets.filter((a) => inRange(a.date, range))
    if (!allTerms.value.length) return inScope
    const matched = inScope.filter((a) => assetMatches(a, allTerms.value))
    return matched.length ? matched : inScope
  }

  /* 패싯 카운트는 "그 차원을 제외한 나머지 조건"에서 세야 하므로 차원별 술어를 분리해 둔다.
     기간 프리셋 카운트는 range를 바꿔 끼워 같은 술어로 센다 */
  const PREDICATES = {
    modality: (f, range) => hasAllModalities(f, modalities.value, range),
    type: (f) => !types.value.length || types.value.includes(f.type),
    genre: (f) => !genres.value.length || genres.value.includes(f.genre),
    country: (f) => !countries.value.length || countries.value.includes(f.country),
    decade: (f) => !decades.value.length || decades.value.includes(f.decade),
    date: (f, range) => (!range.from && !range.to) || f.assets.some((a) => inRange(a.date, range)),
    search: (f, range) => matchesAllTerms(f, searchTerms.value, range),
    resultSearch: (f, range) => matchesAllTerms(f, resultSearchTerms.value, range)
  }
  const DIMENSIONS = Object.keys(PREDICATES)

  /* 등록일 범위 안에 고른 모달리티 자료가 하나씩이라도 다 있는지 */
  function hasAllModalities(film, required, range) {
    if (!required.length) return true
    const owned = new Set(film.assets.filter((a) => inRange(a.date, range)).map((a) => a.modality))
    return required.every((m) => owned.has(m))
  }

  function rowsExcept(dimension, range = currentRange.value) {
    return films.value.filter((f) => DIMENSIONS.every((d) => d === dimension || PREDICATES[d](f, range)))
  }

  const filteredFilms = computed(() => rowsExcept(null))

  function countModalities(assets) {
    const m = Object.fromEntries(MODALITY_OPTIONS.map((v) => [v, 0]))
    assets.forEach((a) => (m[a.modality] += 1))
    return m
  }

  const META_FIELDS = [
    ['title', '제목'],
    ['type', '유형'],
    ['genre', '장르'],
    ['country', '국가'],
    ['decade', '연대']
  ]

  /* 카드에 그릴 값을 붙인다.
     - evidence: 기간·모달리티 조건 안에서 검색어가 맞은 자료. 맞은 자료가 없으면 모달리티마다 최신 자료 한 건
     - evidenceModalityCount: 근거가 걸친 모달리티 수 — 정렬과 '교차' 표시에 쓴다
     - metaMatches: 검색어가 맞은 작품 정보 항목 — 자료가 아니라 작품 정보 때문에 결과에 든 경우를 알려준다 */
  const results = computed(() => {
    const terms = allTerms.value
    const rows = filteredFilms.value.map((film) => {
      const scoped = relevantAssets(film, currentRange.value).sort((a, b) => b.date.localeCompare(a.date))
      /* 근거는 관련도 높은 순 — 카드에는 앞의 몇 건만 보이므로 가장 확실한 근거가 먼저 나와야 한다 */
      const matched = terms.length
        ? scoped
            .filter((a) => assetMatches(a, terms))
            .map((a) => withRelevance(a, terms))
            .sort((a, b) => b.score - a.score)
        : []
      return {
        ...film,
        modalityCounts: countModalities(film.assets),
        evidence: matched.length ? matched : MODALITY_OPTIONS.map((m) => scoped.find((a) => a.modality === m)).filter(Boolean),
        isMatchedEvidence: matched.length > 0,
        evidenceModalityCount: new Set(matched.map((a) => a.modality)).size,
        metaMatches: terms.length ? META_FIELDS.filter(([k]) => terms.some((t) => includesTerm(film[k], t))).map(([, label]) => label) : [],
        scopedCount: scoped.length,
        latestDate: scoped[0]?.date ?? ''
      }
    })
    /* 교차 모달리티 수 → 맞은 근거 수 → 최근 자료 등록순. 검색어가 없으면 최근 자료 등록순만 남는다 */
    const matchedCount = (r) => (r.isMatchedEvidence ? r.evidence.length : 0)
    return rows.sort(
      (a, b) =>
        b.evidenceModalityCount - a.evidenceModalityCount || matchedCount(b) - matchedCount(a) || b.latestDate.localeCompare(a.latestDate)
    )
  })

  /* 칩 카운트는 작품 수다 */
  const VALUES_OF = {
    type: (f) => [f.type],
    genre: (f) => [f.genre],
    country: (f) => [f.country],
    decade: (f) => [f.decade]
  }
  function chipsFor(options, selected, dimension) {
    const counts = Object.create(null)
    rowsExcept(dimension).forEach((f) => {
      VALUES_OF[dimension](f).forEach((v) => {
        counts[v] = (counts[v] || 0) + 1
      })
    })
    return options.map((v) => toChip(v, selected.includes(v), counts[v] || 0))
  }

  const datePresetCounts = computed(() => {
    const to = toISODate(new Date())
    const m = Object.create(null)
    DATE_PRESETS.forEach((preset) => {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - (preset.days - 1))
      m[preset.days] = rowsExcept(null, { from: toISODate(fromDate), to }).length
    })
    return m
  })

  /* ---------------------------------------------------------------- chips */

  const typeChips = computed(() => chipsFor(TYPE_OPTIONS, types.value, 'type'))
  /* AND 조건이라 칩 숫자는 "이것까지 더 고르면 남는 작품 수"다 — 이미 고른 칩은 지금 결과 수와 같다 */
  const modalityChips = computed(() => {
    const base = rowsExcept('modality')
    return MODALITY_OPTIONS.map((m) => {
      const active = modalities.value.includes(m)
      const required = active ? modalities.value : [...modalities.value, m]
      return toChip(m, active, base.filter((f) => hasAllModalities(f, required, currentRange.value)).length)
    })
  })

  /* 장르만 유형에 종속된다 — 선택한 유형들의 장르 합집합만 보여준다 */
  const availableGenres = computed(() => {
    const set = new Set(types.value.flatMap((t) => TYPE_GENRE_MAP[t] || []))
    return GENRE_OPTIONS.filter((g) => set.has(g))
  })
  watch(types, () => {
    const allowed = new Set(availableGenres.value)
    genres.value = genres.value.filter((g) => allowed.has(g))
  })

  /* 분야 3갈래 — 그룹 안 칩 순서는 고정해 두어 선택할 때마다 자리를 바꾸지 않게 한다 */
  const fieldGroups = computed(() => [
    { key: 'genre', label: '장르', locked: types.value.length === 0, chips: chipsFor(availableGenres.value, genres.value, 'genre') },
    { key: 'country', label: '제작 국가', locked: false, chips: chipsFor(COUNTRY_OPTIONS, countries.value, 'country') },
    { key: 'decade', label: '개봉 연대', locked: false, chips: chipsFor(DECADE_OPTIONS, decades.value, 'decade') }
  ])

  const FIELD_REFS = { genre: genres, country: countries, decade: decades }
  function toggleField(key, label) {
    FIELD_REFS[key].value = toggleIn(FIELD_REFS[key].value, label)
  }
  const hasFieldSelection = computed(() => genres.value.length + countries.value.length + decades.value.length > 0)
  function clearFields() {
    genres.value = []
    countries.value = []
    decades.value = []
  }

  /* --------------------------------------------------------------- labels */

  const dateRangeLabel = computed(() => {
    if (!dateFrom.value && !dateTo.value) return '전체 기간'
    if (dateFrom.value && dateTo.value) return `${dateFrom.value.toLocaleDateString('ko-KR')} ~ ${dateTo.value.toLocaleDateString('ko-KR')}`
    if (dateFrom.value) return `${dateFrom.value.toLocaleDateString('ko-KR')} 이후`
    return `${dateTo.value.toLocaleDateString('ko-KR')} 이전`
  })

  /* ------------------------------------------------------ applied conditions */

  function conditionsOf(prefix, listRef) {
    return listRef.value.map((v) => ({ label: `${prefix}: ${v}`, remove: () => (listRef.value = listRef.value.filter((x) => x !== v)) }))
  }

  /* 사이드바 순서와 맞춘다 */
  const appliedConditions = computed(() => [
    ...searchTerms.value.map((t) => ({ label: `검색어: ${t}`, remove: () => removeSearchTerm(t) })),
    ...(resultSearchTerms.value.length ? [{ label: `결과 내 검색: ${resultSearchValue.value}`, remove: () => setResultSearch('') }] : []),
    ...conditionsOf('유형', types),
    ...conditionsOf('장르', genres),
    ...conditionsOf('국가', countries),
    ...conditionsOf('연대', decades),
    ...conditionsOf('포함 자료', modalities),
    ...(dateFrom.value || dateTo.value ? [{ label: `등록일: ${dateRangeLabel.value}`, remove: clearDateRange }] : [])
  ])

  const resultKeywordPrefix = computed(() => {
    if (searchTerms.value.length) return `"${searchTerms.value.join(' ')}" 검색결과 `
    if (appliedConditions.value.length) return '검색결과 '
    return '전체 작품 '
  })

  function clearAllConditions() {
    setSearch('')
    setResultSearch('')
    modalities.value = []
    types.value = []
    clearFields()
    clearDateRange()
  }
  function clearDateRange() {
    dateFrom.value = null
    dateTo.value = null
  }

  /* ---------------------------------------------------------- 작품 상세 모달 */

  const filmDetailOpen = ref(false)
  const filmDetailId = ref(null)
  function openFilmDetail(id) {
    filmDetailId.value = id
    filmDetailOpen.value = true
  }
  function closeFilmDetail() {
    filmDetailOpen.value = false
  }

  /* 모달은 기간·모달리티 조건과 상관없이 작품에 연결된 자료 전체를 보여주고, 지금 결과에서 근거가 된 자료만
     '일치'로 표시한다. 같은 장르 작품으로 옮겨 간 작품이 결과 밖이면 일치 표시는 없다 */
  const filmDetail = computed(() => {
    const film = films.value.find((f) => f.id === filmDetailId.value)
    if (!film) return null
    const row = results.value.find((r) => r.id === film.id)
    const matchedIds = new Set(row?.isMatchedEvidence ? row.evidence.map((a) => a.id) : [])
    const assets = film.assets
      /* 근거 유형·관련도는 늘 붙인다 — 검색 근거면 검색어 기준, 아니면 작품과의 연결 근거 기준 */
      .map((a) => {
        if (matchedIds.has(a.id)) return { ...withRelevance(a, allTerms.value), matched: true, scoreKind: 'search' }
        const score = linkRelevance(a)
        return { ...a, basis: a.linkBasis, score, grade: relevanceGrade(score), matched: false, scoreKind: 'link' }
      })
      .sort((a, b) => b.matched - a.matched || (b.score ?? 0) - (a.score ?? 0) || b.date.localeCompare(a.date))
    return {
      ...film,
      assets,
      matchedCount: matchedIds.size,
      modalityCounts: countModalities(film.assets),
      cross: crossEvidence(film),
      latestDate: film.assets.reduce((max, a) => (a.date > max ? a.date : max), ''),
      sameGenre: films.value
        .filter((f) => f.id !== film.id && f.genre === film.genre)
        .map((f) => ({ id: f.id, title: f.title, type: f.type, country: f.country, decade: f.decade, assetCount: f.assets.length }))
    }
  })

  /* 검색어별 근거 요약 — 검색어마다 어느 모달리티의 자료에 나오는지. 목록 카드의 근거와 같이 등록일 범위 안의
     자료만 센다. 모달리티 필터는 적용하지 않는다 — 걸러진 모달리티에도 근거가 있다는 걸 알려주기 위해서다 */
  function crossEvidence(film) {
    const pool = film.assets.filter((a) => inRange(a.date, currentRange.value))
    return allTerms.value.map((term) => {
      const hits = pool.filter((a) => includesTerm(assetText(a), term))
      return {
        term,
        modalities: MODALITY_OPTIONS.map((m) => ({ name: m, count: hits.filter((a) => a.modality === m).length })).filter((x) => x.count),
        metaHit: META_FIELDS.filter(([k]) => includesTerm(film[k], term)).map(([, label]) => label)
      }
    })
  }

  /* 장르는 유형을 골라야 열리는 구조라, 장르를 걸 때는 그 작품의 유형도 함께 건다 */
  function applyFilmClassification(level) {
    const film = filmDetail.value
    if (!film) return
    if (!types.value.includes(film.type)) types.value = [...types.value, film.type]
    if (level === 'genre' && !genres.value.includes(film.genre)) genres.value = [...genres.value, film.genre]
    closeFilmDetail()
  }

  /* --------------------------------------------------------------- toast */

  const toastMessage = ref('')
  let toastTimer = null
  function showToast(message) {
    toastMessage.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastMessage.value = ''), 2500)
  }
  /* 실제 API 연동 전까지는 안내만 띄운다 — 모달이 고른 자료 목록(assets)을 그대로 넘기면 된다 */
  function downloadFilmBundle({ film, label, assets }) {
    showToast(`${film.title} · ${label} ${assets.length}건을 ZIP으로 묶어 다운로드합니다.`)
  }

  /* --------------------------------------------------------- command palette */

  const paletteOpen = ref(false)

  /* 장르는 사이드바와 같이 선택한 유형에 딸린 것만 보여준다. 작품은 지금 결과 순서대로 */
  const paletteItems = computed(() => [
    ...(appliedConditions.value.length ? [{ label: '조건 모두 해제', hint: '동작', kind: 'clear' }] : []),
    ...TYPE_OPTIONS.map((v) => ({ label: v, hint: '유형', kind: 'type', value: v })),
    ...availableGenres.value.map((v) => ({ label: v, hint: '장르', kind: 'genre', value: v })),
    ...COUNTRY_OPTIONS.map((v) => ({ label: v, hint: '제작 국가', kind: 'country', value: v })),
    ...DECADE_OPTIONS.map((v) => ({ label: v, hint: '개봉 연대', kind: 'decade', value: v })),
    ...MODALITY_OPTIONS.map((v) => ({ label: `${v} 포함`, hint: '포함 자료', kind: 'modality', value: v })),
    ...results.value.map((f) => ({ label: f.title, hint: '작품', kind: 'film', value: f.id }))
  ])

  function closePalette() {
    paletteOpen.value = false
  }
  function runPaletteItem(item) {
    if (item.kind === 'clear') clearAllConditions()
    else if (item.kind === 'modality') modalities.value = toggleIn(modalities.value, item.value)
    else if (item.kind === 'type') types.value = toggleIn(types.value, item.value)
    else if (item.kind === 'film') openFilmDetail(item.value)
    else toggleField(item.kind, item.value)
    closePalette()
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

  return {
    films,

    searchDraft,
    resultSearchDraft,
    modalities,
    types,
    dateFrom,
    dateTo,

    searchDirty,
    commitSearch,
    setSearch,
    commitResultSearch,
    setResultSearch,

    results,
    hasDateRange,
    searchTerms,
    resultKeywordPrefix,

    typeChips,
    modalityChips,
    fieldGroups,
    toggleField,
    hasFieldSelection,
    clearFields,
    dateRangeLabel,
    datePresetCounts,
    appliedConditions,
    clearAllConditions,
    clearDateRange,

    applyDatePreset,
    isDatePresetActive,

    filmDetailOpen,
    filmDetail,
    openFilmDetail,
    applyFilmClassification,

    toastMessage,
    downloadFilmBundle,

    paletteOpen,
    paletteItems,
    closePalette,
    runPaletteItem,

    toggleIn
  }
}
