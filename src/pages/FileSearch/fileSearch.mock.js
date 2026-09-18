import { Image as ImageIcon, FileText, Video, Archive } from '@lucide/vue'

/**
 * API 연동 전 임시로 사용하는 목업 데이터.
 * 실제 API가 준비되면 이 파일 전체(특히 generateFiles/buildFileDetail)를
 * API 호출 함수로 교체하면 된다.
 */

export const TOPIC_OPTIONS = ['의료', '연구', '교육', '행정', '보험청구', '임상시험', '재활', '영상의학', '병리', '약제', '간호', '진단검사', '응급의료', '건강검진', '재택의료']
export const SUBTOPIC_OPTIONS = ['영상검사', '기록', '판독', '기타', '초음파리포트', '내시경기록', '수술기록', '퇴원요약', '검진결과지', '처방기록', '간호기록', '병리결과']
export const TAG_OPTIONS = ['#흉부', '#판독', '#정기검진', '#CT', '#MRI', '#초음파', '#내시경', '#혈액검사', '#소견서', '#영상판독', '#응급', '#외래', '#입원', '#퇴원요약']
export const FILE_TYPE_OPTIONS = ['JPG', 'PNG', 'PDF', 'XLSX', 'DOCX', 'MP4', 'ZIP']
export const SIZE_RANGE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'under1', label: '1MB 미만' },
  { value: '1to10', label: '1~10MB' },
  { value: 'over10', label: '10MB 이상' }
]
/* 정렬 가능한 컬럼 — 처음 누를 때 쓰는 기본 방향을 함께 둔다 */
export const SORTABLE = { name: 'asc', date: 'desc', size: 'desc' }
export const DATE_PRESETS = [
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 }
]
export const DENSITY_OPTIONS = [
  { value: 'compact', label: '좁게' },
  { value: 'comfortable', label: '보통' },
  { value: 'spacious', label: '넓게' }
]

/* 사이드바엔 '결과가 있는 순'으로 상위 몇 개만 — 나머지는 '전체 보기' 모달에서 고른다 */
export const FACET_VISIBLE_COUNT = 8

/* 주제 -> 하위주제 -> 태그로 이어지는 계층 구조 */
export const TOPIC_SUBTOPIC_MAP = {
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
export const SUBTOPIC_TAG_MAP = {
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

export const CATEGORY_BY_EXT = { JPG: '이미지', PNG: '이미지', PDF: '문서', XLSX: '문서', DOCX: '문서', MP4: '영상', ZIP: '기타' }

/* 확장자 -> 배지 색상/아이콘. 목업이 아니라 뷰 표시 규칙이지만, 상세 모달의
   관계 자료(buildRelations)에서도 같은 값이 필요해 데이터 생성 로직과 함께 둔다 */
export const EXT_STYLE_MAP = {
  JPG: { bg: 'color-mix(in oklch, var(--color-viz-2) 16%, white)', text: 'var(--color-viz-2)' },
  PNG: { bg: 'color-mix(in oklch, var(--color-viz-2) 16%, white)', text: 'var(--color-viz-2)' },
  PDF: { bg: 'color-mix(in oklch, var(--color-viz-5) 16%, white)', text: 'var(--color-viz-5)' },
  XLSX: { bg: 'color-mix(in oklch, var(--color-viz-3) 16%, white)', text: 'var(--color-viz-3)' },
  DOCX: { bg: 'color-mix(in oklch, var(--color-viz-1) 16%, white)', text: 'var(--color-viz-1)' },
  MP4: { bg: 'color-mix(in oklch, var(--color-viz-4) 16%, white)', text: 'var(--color-viz-4)' },
  ZIP: { bg: 'var(--color-slate-100)', text: 'var(--color-text-tertiary)' }
}
export const ICON_BY_EXT = { JPG: ImageIcon, PNG: ImageIcon, PDF: FileText, XLSX: FileText, DOCX: FileText, MP4: Video, ZIP: Archive }

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

export function generateFiles(count = 100) {
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

/* ------------------------------------------------ 파일 상세 정보 샘플 데이터 */

/* AFileDetailModal이 기대하는 FileDetail 모양으로 목록 행을 부풀린다.
   실제 API가 붙으면 이 함수를 fetch 결과로 바꿔치기하면 된다 — 컴포넌트는
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

function buildTopics(item, allFiles) {
  const relatedCount = allFiles.filter((f) => f.subtopic === item.subtopic).length
  return [{ id: item.subtopic, label: `${item.topic} · ${item.subtopic}`, relatedCount, clickable: true }]
}

function buildMultimodalMeta(item, allFiles) {
  return item.tags.map((t) => ({ id: t, label: t, count: allFiles.filter((f) => f.tags.includes(t)).length }))
}

function buildRelations(item, allFiles) {
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
  const related = allFiles
    .filter((f) => f.id !== item.id && f.subtopic === item.subtopic)
    .map((f) => toRelation(f, '유사 자료', `같은 ${item.subtopic} 분류에 속한 자료로, 관련 태그(${f.tags.join(', ')})를 공유합니다.`))
  const sameTopic = allFiles
    .filter((f) => f.id !== item.id && f.topic === item.topic && f.subtopic !== item.subtopic)
    .map((f) => toRelation(f, '동일 주제', `${item.topic} 주제 안에서 서로 다른 하위 분류로 등록되어 있습니다.`))
  return { related, sameTopic }
}

/**
 * @param {*} item 목록의 파일 한 건
 * @param {*[]} allFiles 관계/통계 계산에 쓰이는 전체 목록
 * @returns {import('../../components/AFileDetailModal.vue').FileDetail|null}
 */
export function buildFileDetail(item, allFiles) {
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
    topics: buildTopics(item, allFiles),
    multimodalMeta: buildMultimodalMeta(item, allFiles),
    relations: buildRelations(item, allFiles)
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
