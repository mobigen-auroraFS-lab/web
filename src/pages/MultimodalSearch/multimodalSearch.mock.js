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

/* 작품 하나에 딸린 자료 — 자료 종류가 모달리티와 근거 위치(타임코드·컷·페이지·트랙) 표기를 정한다 */
const pad2 = (n) => String(n).padStart(2, '0')
const ASSET_KINDS = [
  { label: '본편', modality: '영상', locator: (n) => `${pad2(10 + (n % 80))}:${pad2((n * 7) % 60)}`, text: (m) => `${m} 장면` },
  { label: '예고편', modality: '영상', locator: (n) => `00:${pad2((n * 3) % 60)}`, text: (m) => `${m} 오프닝 장면` },
  { label: '포스터', modality: '이미지', locator: () => '메인', text: (m) => `${m} 배경 포스터` },
  { label: '스틸컷', modality: '이미지', locator: (n) => `컷 ${1 + (n % 12)}`, text: (m) => `${m} 촬영 현장 스틸` },
  { label: '시나리오', modality: '문서', locator: (n) => `p.${5 + (n % 80)}`, text: (m) => `"${m}에서 다시 만나기로 했다"` },
  { label: '보도자료', modality: '문서', locator: () => 'p.1', text: (m) => `${m} 모티프 소개` },
  { label: 'OST', modality: '음성', locator: (n) => `트랙 ${1 + (n % 10)}`, text: (m) => `'${m}의 노래'` }
]
/* 작품마다 소재 2개를 두고 자료들이 번갈아 언급하게 한다 — 같은 소재가 여러 모달리티에 걸쳐 나와야
   교차 근거가 생긴다 */
const MOTIFS = ['항구', '기차', '비', '편지', '골목', '바다', '시장', '학교', '등대', '눈', '정원', '밤거리']
const TITLE_A = ['마지막', '푸른', '잃어버린', '조용한', '붉은', '먼', '작은', '긴']
const TITLE_B = ['여름', '항구', '기억', '도시', '밤', '편지', '정원', '계절']

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
        date: daysAgoISO((i * 7 + k * 13) % 180)
      })
    }
    films.push({
      id: String(i),
      title: `${TITLE_A[i % TITLE_A.length]} ${TITLE_B[(i + Math.floor(i / TITLE_A.length)) % TITLE_B.length]}`,
      type,
      genre: genres[Math.floor(i / TYPE_OPTIONS.length) % genres.length],
      country: COUNTRY_OPTIONS[(i * 5) % COUNTRY_OPTIONS.length],
      decade: DECADE_OPTIONS[(i + Math.floor(i / 4)) % DECADE_OPTIONS.length],
      assets
    })
  }
  return films
}
