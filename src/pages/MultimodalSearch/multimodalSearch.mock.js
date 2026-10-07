/**
 * API 연동 전 임시 데이터 — 영화 작품과, 작품마다 연결된 모달리티별 자료.
 * 작품명은 모두 가상의 제목이다. 실제 API가 준비되면 이 파일만 교체하면 된다.
 */
export { DATE_PRESETS } from '../FileSearch/fileSearch.api'

export const MODALITY_OPTIONS = ['문서', '이미지', '영상', '음성']

/* 1차 분류 — 작품 형식 */
export const TYPE_OPTIONS = ['극영화', '다큐멘터리', '애니메이션', '단편/독립', '실험영화']

/* 2차 분류(분야) 중 장르만 유형에 따라 선택지가 달라진다 */
export const TYPE_GENRE_MAP = {
  극영화: ['드라마', '멜로/로맨스', '액션', '스릴러', '코미디', '공포', 'SF', '가족'],
  다큐멘터리: ['사회', '인물', '자연', '역사'],
  애니메이션: ['가족', '판타지', 'SF', '코미디'],
  '단편/독립': ['드라마', '사회', '실험'],
  실험영화: ['실험', '영상예술']
}
export const GENRE_OPTIONS = [...new Set(Object.values(TYPE_GENRE_MAP).flat())]
export const COUNTRY_OPTIONS = ['한국', '미국', '일본', '프랑스', '중국/홍콩', '기타']
export const DECADE_OPTIONS = ['~1960년대', '1970년대', '1980년대', '1990년대', '2000년대', '2010년대 이후']

/* 근거 유형 — 자료에서 검색 가능한 텍스트를 어떻게 얻었는지. 실제로는 모달리티별 분석 파이프라인
   (자막·음성인식·OCR·캡션 생성·장면 임베딩)이 정한다. base는 이 유형으로 맞았을 때의 기본 관련도 */
export const EVIDENCE_BASIS = {
  본문: { base: 0.9 },
  자막: { base: 0.87 },
  OCR: { base: 0.83 },
  음성인식: { base: 0.8 },
  '이미지 캡션': { base: 0.76 },
  '장면 유사': { base: 0.68 }
}

/* 연결 근거 — 자료가 이 작품에 묶인 방식. 검색과 무관하게 늘 있다. 실제로는 등록 시 작품 ID 매핑이거나
   AI 자동 연결(제목·장면 유사)이 정한다. base는 이 방식으로 연결됐을 때의 기본 관련도 */
export const LINK_BASIS = {
  '메타데이터 연결': { base: 0.95 },
  '제목 자동 연결': { base: 0.8 },
  '장면 자동 연결': { base: 0.7 }
}
const LINK_METHODS = Object.keys(LINK_BASIS)

/* 작품 하나에 딸린 자료 — 자료 종류가 모달리티와 근거 위치(타임코드·컷·페이지·트랙) 표기, 근거 유형을 정한다 */
const pad2 = (n) => String(n).padStart(2, '0')
const ASSET_KINDS = [
  {
    label: '본편',
    modality: '영상',
    locator: (n) => `${pad2(10 + (n % 80))}:${pad2((n * 7) % 60)}`,
    text: (m) => `${m} 장면`,
    basis: (n) => (n % 2 ? '자막' : '장면 유사')
  },
  {
    label: '예고편',
    modality: '영상',
    locator: (n) => `00:${pad2((n * 3) % 60)}`,
    text: (m) => `${m} 오프닝 장면`,
    basis: () => '장면 유사'
  },
  { label: '포스터', modality: '이미지', locator: () => '메인', text: (m) => `${m} 배경 포스터`, basis: () => 'OCR' },
  {
    label: '스틸컷',
    modality: '이미지',
    locator: (n) => `컷 ${1 + (n % 12)}`,
    text: (m) => `${m} 촬영 현장 스틸`,
    basis: () => '이미지 캡션'
  },
  {
    label: '시나리오',
    modality: '문서',
    locator: (n) => `p.${5 + (n % 80)}`,
    text: (m) => `"${m}에서 다시 만나기로 했다"`,
    basis: () => '본문'
  },
  { label: '보도자료', modality: '문서', locator: () => 'p.1', text: (m) => `${m} 모티프 소개`, basis: () => '본문' },
  { label: 'OST', modality: '음성', locator: (n) => `트랙 ${1 + (n % 10)}`, text: (m) => `'${m}의 노래'`, basis: () => '음성인식' }
]
/* 작품마다 소재 2개를 두고 자료들이 번갈아 언급하게 한다 — 같은 소재가 여러 모달리티에 걸쳐 나와야
   교차 근거가 생긴다 */
const MOTIFS = ['항구', '기차', '비', '편지', '골목', '바다', '시장', '학교', '등대', '눈', '정원', '밤거리']
const TITLE_A = ['마지막', '푸른', '잃어버린', '조용한', '붉은', '먼', '작은', '긴']
const TITLE_B = ['여름', '항구', '기억', '도시', '밤', '편지', '정원', '계절']

/* 받침 유무로 조사를 고른다 — 소재 이름이 바뀌어도 문장이 자연스럽게 */
const hasBatchim = (word) => (word.charCodeAt(word.length - 1) - 0xac00) % 28 !== 0
const josa = (word, withB, withoutB) => word + (hasBatchim(word) ? withB : withoutB)

/* 작품 대표 설명 — 실제로는 연결 자료 전반을 요약한 값이 API로 온다. 여기서는 소재·분류·자료 구성으로 만든다 */
function describeFilm({ type, genre, country, decade, motifs, assets }) {
  const where = country === '기타' ? '' : `${country}에서 `
  const kinds = [...new Set(assets.map((a) => a.label))].join('·')
  return (
    `${decade} ${where}제작된 ${genre} ${type}입니다. ${josa(motifs[0], '과', '와')} ${josa(motifs[1], '을', '를')} 중심 소재로 하며, ` +
    `${kinds} 등 연결 자료 ${assets.length}건에 두 소재가 반복해서 나타납니다.`
  )
}

function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * 작품 30편, 작품마다 4~6건의 연결 자료(같은 종류가 두 번 나올 수 있다).
 * 등록일은 자료마다 있다 — 오늘 기준으로 흩어 두어야 '최근 N일' 프리셋이 의미를 갖는다.
 */
export function generateFilms(filmCount = 30) {
  const films = []
  for (let i = 0; i < filmCount; i++) {
    const type = TYPE_OPTIONS[i % TYPE_OPTIONS.length]
    const genres = TYPE_GENRE_MAP[type]
    const motifs = [MOTIFS[i % MOTIFS.length], MOTIFS[(i * 5 + 3) % MOTIFS.length]]
    /* 작품마다 모달리티 하나씩을 비워 둔다(다섯 편 중 한 편은 전부 보유) — 모달리티 필터가 실제로 걸러지게 */
    const missing = MODALITY_OPTIONS[i % (MODALITY_OPTIONS.length + 1)]
    const kinds = ASSET_KINDS.filter((kind) => kind.modality !== missing)
    const assetCount = 4 + (i % 3)
    const assets = []
    for (let k = 0; k < assetCount; k++) {
      const kind = kinds[(i + k * 2) % kinds.length]
      const n = i * 7 + k * 11
      assets.push({
        id: `${i}-${k}`,
        label: kind.label,
        modality: kind.modality,
        locator: kind.locator(n),
        text: kind.text(motifs[k % 2]),
        basis: kind.basis(n),
        /* 다섯 건 중 세 건은 메타데이터로, 나머지는 자동 연결로 묶였다고 둔다 */
        linkBasis: LINK_METHODS[Math.max(0, ((i + k) % 5) - 2)],
        date: daysAgoISO((i * 7 + k * 13) % 180)
      })
    }
    const film = {
      id: String(i),
      title: `${TITLE_A[i % TITLE_A.length]} ${TITLE_B[(i + Math.floor(i / TITLE_A.length)) % TITLE_B.length]}`,
      type,
      genre: genres[Math.floor(i / TYPE_OPTIONS.length) % genres.length],
      country: COUNTRY_OPTIONS[(i * 5) % COUNTRY_OPTIONS.length],
      decade: DECADE_OPTIONS[(i + Math.floor(i / 4)) % DECADE_OPTIONS.length],
      /* 대표 소재 — 대표 설명 문장에 쓴다 */
      motifs,
      assets
    }
    film.summary = describeFilm(film)
    films.push(film)
  }
  return films
}
