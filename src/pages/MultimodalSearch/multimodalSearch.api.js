import { Film, Image as ImageIcon, FileText, AudioLines } from '@lucide/vue'
import { apiFetch, downloadBundleByLink, downloadSelectionByForm, toQuery } from '../../api/client'

/* 사이드바엔 갈래 묶음마다 상위 몇 개만 — 나머지는 '전체 보기' 창에서 고른다. 파일 검색과 같은 기준이다 */
export const FACET_VISIBLE_COUNT = 8

/**
 * 멀티모달 검색 화면이 부르는 API 와, 응답을 화면 모델로 바꾸는 매핑.
 * 결과 단위는 개체(인물·장소·작품 등 — 같은 것에 관한 자료를 한 이름 아래 모은 것)다.
 * 계약은 IDD IF-ENTITY-01 · 02 · 05 를 따른다.
 */

export const PAGE_SIZE = 30

/* API 모달리티 → 화면 표기. 순서는 카드·모달의 배지 순서다 */
export const MODALITY_LABELS = { text: '문서', image: '이미지', video: '영상', audio: '음성' }
export const MODALITY_ORDER = Object.values(MODALITY_LABELS)

/* 모달리티별 배지 색·아이콘 — 파일 검색 목록의 확장자 배지 색과 맞춘다. 개체 카드 · 개체 상세 모달이 함께 쓴다 */
export const MODALITY_STYLE = {
  문서: { icon: FileText, bg: 'color-mix(in oklch, var(--color-viz-1) 12%, white)', text: 'var(--color-viz-1)' },
  이미지: { icon: ImageIcon, bg: 'color-mix(in oklch, var(--color-viz-2) 12%, white)', text: 'var(--color-viz-2)' },
  영상: { icon: Film, bg: 'color-mix(in oklch, var(--color-viz-4) 12%, white)', text: 'var(--color-viz-4)' },
  음성: { icon: AudioLines, bg: 'color-mix(in oklch, var(--color-viz-6) 12%, white)', text: 'var(--color-viz-6)' }
}
const MODALITY_CODES = Object.fromEntries(Object.entries(MODALITY_LABELS).map(([code, label]) => [label, code]))

/* 화면 표기(문서·이미지…) 목록을 API 값(text·image…)의 쉼표 한 줄로 바꾼다 */
const modalityParam = (labels) => labels?.map((l) => MODALITY_CODES[l]).join(',')

const entityKey = (type, uid) => `${type}/${uid}`
const entityPath = (type, uid) => `/mm-meta/${encodeURIComponent(type)}/${encodeURIComponent(uid)}`

/* ------------------------------------------------------------------- 호출 */

/** IF-ENTITY-01 — areas · modalities 는 쉼표 한 줄이다(같은 이름 반복이 아니다). 여럿 고르면 모두 가진 개체만(AND) */
export function fetchEntities({ q, refine, entityType, areas, modalities, cursor, limit = PAGE_SIZE }, options) {
  return apiFetch(
    `/mm-meta${toQuery({ q, refine, entity_type: entityType, areas: areas?.join(','), modalities: modalityParam(modalities), cursor, limit })}`,
    options
  )
}

/** IF-ENTITY-02 — q · refine 을 받지 않아 검색 중에도 건수는 전체 자료 기준이다.
    자료 유형 칩 건수는 "이미 고른 유형에 이 칩을 더 누르면 남는 개체 수"(AND)다 */
export function fetchEntityFacets({ entityType, areas, modalities }, options) {
  return apiFetch(
    `/mm-meta/facets${toQuery({ entity_type: entityType, areas: areas?.join(','), modalities: modalityParam(modalities) })}`,
    options
  )
}

/** IF-ENTITY-05 */
export function fetchEntityCard(type, uid) {
  return apiFetch(entityPath(type, uid))
}

/** IF-ENTITY-06 — 카드의 구성 자산 전부 zip(묶음 링크 · 건수 · 용량 상한 없음) */
export function downloadEntityBundle(type, uid) {
  return downloadBundleByLink(`${entityPath(type, uid)}/bundle`)
}

/** IF-ASSET-17 — 고른 자산들 zip(폼 제출) — 상세에서 보고 있는 자료 유형 탭만 받을 때 */
export function downloadEntityAssets(assetIds, options) {
  return downloadSelectionByForm(assetIds, options)
}

/* ------------------------------------------------------------- 응답 매핑 */

/** 목록 행 → 카드. 검색 경로(q · refine)에서만 match_reason 이 온다 */
export function normalizeEntity(row) {
  return {
    id: entityKey(row.entity_type, row.entity_uid),
    type: row.entity_type,
    uid: row.entity_uid,
    name: row.name,
    description: row.description ?? '',
    areas: row.areas ?? [],
    modalities: (row.modalities ?? []).map((m) => MODALITY_LABELS[m]).filter(Boolean),
    confirmedCount: row.confirmed_count ?? 0,
    matchReason: row.match_reason ?? ''
  }
}

/* 소속 상태 — 사람이 확인했는지. 확인 전(proposed)은 자동 연결이라 틀릴 수 있다 */
const STATUS_LABELS = { proposed: '확인 전', active: '확인됨' }

/** 개체 카드 → 상세 모달 */
export function buildEntityDetail(card) {
  const groups = card.modalities ?? []
  const modalityCounts = Object.fromEntries(MODALITY_ORDER.map((m) => [m, 0]))
  const assets = []
  groups.forEach((g) => {
    const label = MODALITY_LABELS[g.modality]
    if (!label) return
    modalityCounts[label] = g.count
    g.assets.forEach((a) =>
      assets.push({
        id: a.asset_id,
        modality: label,
        name: a.file_name,
        forms: a.forms ?? [],
        status: STATUS_LABELS[a.status] ?? a.status
      })
    )
  })
  return {
    id: entityKey(card.entity_type, card.entity_uid),
    type: card.entity_type,
    uid: card.entity_uid,
    name: card.name,
    description: card.description ?? '',
    total: card.total ?? assets.length,
    confirmedCount: card.confirmed_count ?? 0,
    formCounts: card.form_counts ?? [],
    modalityCounts,
    assets
  }
}
