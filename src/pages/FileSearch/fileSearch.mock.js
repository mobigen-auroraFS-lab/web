/**
 * API 연동 전 임시로 사용하는 목업 데이터.
 * 실제 API가 준비되면 이 파일 전체를 API 호출 함수로 교체하면 된다.
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
export const SORT_OPTIONS = [
  { value: 'date_desc', label: '최신 수정일순' },
  { value: 'date_asc', label: '오래된 수정일순' },
  { value: 'name_asc', label: '파일명순' },
  { value: 'size_desc', label: '크기 큰순' }
]
export const SUGGESTED_KEYWORDS = ['흉부', '판독', 'CT', '정기검진']

export const CATEGORY_BY_EXT = { JPG: '이미지', PNG: '이미지', PDF: '문서', XLSX: '문서', DOCX: '문서', MP4: '영상', ZIP: '기타' }

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
