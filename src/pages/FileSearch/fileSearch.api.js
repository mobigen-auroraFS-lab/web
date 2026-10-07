import { Image as ImageIcon, FileText, Video, Archive, Music, File } from '@lucide/vue'
import { apiFetch, downloadFile, toQuery } from '../../api/client'

/**
 * 파일 검색 화면이 부르는 API 와, 응답을 화면 모델로 바꾸는 매핑.
 * 계약은 `화면별_API_호출_기획서` · IDD(IF-ASSET-09 · 14 · 07 · 01 · 10, IF-CAT-01 · 02)를 따른다.
 */

/* ----------------------------------------------------------------- 표시 규칙 */

/* 정렬 가능한 컬럼 — 처음 누를 때 쓰는 기본 방향을 함께 둔다 */
export const SORTABLE = { name: 'asc', date: 'desc', size: 'desc' }
export const DATE_PRESETS = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 }
]
export const SIZE_BUCKET_LABELS = { under1: '1MB 미만', '1to10': '1~10MB', over10: '10MB 이상' }
export const DENSITY_OPTIONS = [
  { value: 'compact', label: '좁게' },
  { value: 'comfortable', label: '보통' },
  { value: 'spacious', label: '넓게' }
]

/* 사이드바엔 '결과가 있는 순'으로 상위 몇 개만 — 나머지는 '전체 보기' 모달에서 고른다 */
export const FACET_VISIBLE_COUNT = 8
export const PAGE_SIZE = 20

/* 배지·아이콘은 확장자를 먼저 보고, 표에 없는 확장자(txt · mp3 …)는 modality 로 정한다 —
   modality 는 API 가 늘 채워 주는 값이라 어떤 파일이 와도 빈 배지가 나오지 않는다 */
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

const BY_MODALITY = {
  text: { category: '문서', icon: FileText, style: EXT_STYLE_MAP.DOCX },
  image: { category: '이미지', icon: ImageIcon, style: EXT_STYLE_MAP.JPG },
  video: { category: '영상', icon: Video, style: EXT_STYLE_MAP.MP4 },
  audio: { category: '음성', icon: Music, style: { bg: 'color-mix(in oklch, var(--color-viz-6) 16%, white)', text: 'var(--color-viz-6)' } }
}
const NEUTRAL = { category: '기타', icon: File, style: EXT_STYLE_MAP.ZIP }

function extOf(fileName) {
  const m = /\.([^.]+)$/.exec(fileName || '')
  return m ? m[1].toUpperCase() : ''
}

function presentation(ext, modality) {
  const fallback = BY_MODALITY[modality] ?? NEUTRAL
  return {
    category: CATEGORY_BY_EXT[ext] ?? fallback.category,
    icon: ICON_BY_EXT[ext] ?? fallback.icon,
    extStyle: EXT_STYLE_MAP[ext] ?? fallback.style
  }
}

/* 목록의 크기 0 은 '모름'이다(서버가 NULL 을 0 으로 채운다 · IDD 11절 ⑫) */
function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}MB`
}

/* 날짜는 UTC 날짜 단위로 자르고 정렬한다 — 시각까지 보이면 같은 날 안의 순서가 뒤섞여 보인다 */
function utcDate(iso) {
  return iso ? iso.slice(0, 10) : ''
}

/** IF-ASSET-09 items[] 한 건 → 표의 한 행 */
export function normalizeItem(row) {
  const ext = (row.file_ext || '').toUpperCase()
  return {
    id: row.asset_id,
    name: row.file_name,
    ext: ext || '—',
    modality: row.modality,
    ...presentation(ext, row.modality),
    topics: row.topics ?? [],
    subtopics: row.subtopics ?? [],
    tags: row.tags ?? [],
    summary: row.summary ?? '',
    date: utcDate(row.updated_at),
    sizeLabel: formatBytes(row.file_size)
  }
}

/* ----------------------------------------------------------------- 호출 */

/** IF-ASSET-09 */
export function searchFiles(params) {
  return apiFetch(`/file-search${toQuery(params)}`)
}
/** IF-ASSET-14 — 형식 · 크기 · 기간 칩 건수 */
export function fetchFacetExtra(params) {
  return apiFetch(`/file-search/facet-extra${toQuery(params)}`)
}
/** IF-ASSET-07 */
export function fetchTopics() {
  return apiFetch('/topics')
}
/** IF-CAT-02 */
export function fetchTags(params) {
  return apiFetch(`/tags${toQuery(params)}`)
}
/** IF-ASSET-01 */
export function fetchAssetDetail(id) {
  return apiFetch(`/assets/${encodeURIComponent(id)}`)
}
/** IF-ASSET-10 — 없는 자산도 200 {items: []} 로 온다 */
export function fetchAssetMmMeta(id) {
  return apiFetch(`/assets/${encodeURIComponent(id)}/mm-meta`)
}
/** IF-CAT-01 */
export function fetchRelationKinds() {
  return apiFetch('/relation-kinds')
}

/* ------------------------------------------------------ 파일 상세 모달 매핑 */

function metaValue(v) {
  if (v === null || v === undefined) return null
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function relationCard({ asset_id, file_name, modality }, reason) {
  const p = presentation(extOf(file_name), modality)
  return { id: asset_id, name: file_name, ext: extOf(file_name), typeBadge: p.category, typeBadgeStyle: p.extStyle, icon: p.icon, reason }
}

/**
 * @param {*} detail IF-ASSET-01 응답
 * @param {*} mmMeta IF-ASSET-10 응답
 * @param {Record<string, string>} kindNames 관계 종류 코드 → 한글 이름(IF-CAT-01)
 * @returns {import('./FileDetailModal.vue').FileDetail}
 */
export function buildFileDetail(detail, mmMeta, kindNames) {
  const ext = (detail.file_ext || '').toUpperCase()
  const p = presentation(ext, detail.modality)
  const topic = detail.topics?.[0]
  const groups = detail.same_topic_groups ?? []
  const topicGroup = topic && groups.find((g) => g.topic_ko === topic.topic_ko)
  const subtopicGroup = topicGroup?.subtopics.find((s) => s.subtopic_ko === topic.subtopic_ko)

  const sizeLabel = formatBytes(detail.file_size)

  return {
    id: detail.asset_id,
    name: detail.file_name,
    icon: p.icon,
    typeBadge: p.category,
    typeBadgeStyle: p.extStyle,
    fileFormat: detail.file_ext ?? '',
    sizeLabel: sizeLabel === '—' ? '' : sizeLabel,
    uploadedAt: utcDate(detail.created_at),
    breadcrumb: topic
      ? [{ label: topic.topic_ko, level: 'topic' }, ...(topic.subtopic_ko ? [{ label: topic.subtopic_ko, level: 'subtopic' }] : [])]
      : [],
    /* 등급이 모자라면 summary 키 자체가 빠진다(IDD 공통규약 ext_meta 키 omit) */
    extractedInfo: { summary: detail.ext_meta?.summary || '요약 정보가 없습니다.' },
    basicInfo: Object.entries(detail.core_meta ?? {}).map(([key, value]) => ({ key, label: key, value: metaValue(value) })),
    topics: topic
      ? [
          {
            id: `${topic.topic_ko}>${topic.subtopic_ko ?? ''}`,
            label: topic.subtopic_ko ? `${topic.topic_ko} · ${topic.subtopic_ko}` : topic.topic_ko,
            relatedCount: subtopicGroup?.asset_count ?? topicGroup?.asset_count ?? 0,
            topic: topic.topic_ko,
            subtopic: topic.subtopic_ko
          }
        ]
      : [],
    multimodalMeta: (mmMeta?.items ?? []).map((m) => ({ id: `${m.entity_type}:${m.entity_uid}`, label: m.name, count: m.bundle_size })),
    relations: {
      /* 순서는 서버가 정한 등급 → 신뢰도 → 식별자 그대로 둔다 — 다시 정렬하면 사람이 확인한 관계가 밀린다 */
      related: (detail.relations ?? []).map((r) => relationCard(r, r.kind_codes.map((code) => kindNames[code] ?? code).join(' · '))),
      sameTopic: groups.flatMap((g) =>
        g.subtopics.flatMap((s) =>
          s.assets.filter((a) => a.asset_id !== detail.asset_id).map((a) => relationCard(a, `${g.topic_ko} · ${s.subtopic_ko || '기타'}`))
        )
      )
    }
  }
}

/* 화면 밀도는 이 브라우저에만 남기는 개인 취향 — 매번 다시 고르게 하면 의미가 없다.
   사생활 모드나 저장소 차단 환경에선 읽기/쓰기가 던지므로 조용히 기본값으로 돈다 */
export const DENSITY_STORAGE_KEY = 'aurora.fileSearch.density'
export function readStoredDensity() {
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY)
    return DENSITY_OPTIONS.some((o) => o.value === v) ? v : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

/* ------------------------------------------------------------ 파일 받기 */

/** IF-ASSET-03 — 원본 1건 */
export function downloadAsset(asset) {
  return downloadFile(`/assets/${encodeURIComponent(asset.id)}/download`, { fallbackName: asset.name })
}

/** IF-ASSET-12 — 고른 자산들 zip (서버 상한 200건 · 500MB) */
export function downloadSelectionBundle(ids) {
  return downloadFile('/assets/bundle', { method: 'POST', body: { asset_ids: ids }, fallbackName: 'assets.zip' })
}
