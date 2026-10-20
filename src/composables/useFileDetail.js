import { ref } from 'vue'
import { fetchAssetDetail, fetchAssetMmMeta, fetchRelationKinds, buildFileDetail } from '../pages/FileSearch/fileSearch.api'

/* 관계 종류 이름은 거의 바뀌지 않는 작은 목록이라 처음 모달을 열 때 한 번만 받는다 — 화면이 여럿이어도 한 번이다 */
let relationKindsPromise = null
function loadRelationKinds() {
  relationKindsPromise ??= fetchRelationKinds()
    .then((body) => Object.fromEntries((body.rows ?? []).map((k) => [k.kind_code, k.kind_name_ko])))
    .catch(() => {
      relationKindsPromise = null
      return {}
    })
  return relationKindsPromise
}

/**
 * 파일 상세 모달(pages/FileSearch/FileDetailModal)의 상태와 조회 — 파일 검색 · 멀티모달 검색이 함께 쓴다.
 * 모달이 포커스 저장/복귀를 스스로 처리하므로 여는 쪽은 대상({ id, ... })만 넘기면 된다.
 */
export function useFileDetail() {
  const open = ref(false)
  const target = ref(null)
  const detail = ref(null)
  const status = ref('ready')
  const error = ref('')
  let seq = 0

  /* 조건이 빠르게 바뀌어도 마지막 요청의 응답만 반영한다 */
  async function load(id) {
    const mySeq = ++seq
    status.value = 'loading'
    error.value = ''
    try {
      const [asset, mmMeta, kindNames] = await Promise.all([
        fetchAssetDetail(id),
        fetchAssetMmMeta(id).catch(() => ({ items: [] })),
        loadRelationKinds()
      ])
      if (mySeq !== seq) return
      detail.value = buildFileDetail(asset, mmMeta, kindNames)
      status.value = 'ready'
    } catch (e) {
      if (mySeq !== seq) return
      detail.value = null
      status.value = 'error'
      /* 관계 · 개체 카드에 등록 전 자산이 섞여 오면 404 가 난다(IDD 11절 ⑤) */
      error.value = e.status === 404 ? '볼 수 없는 자료입니다. 삭제되었거나 아직 등록이 끝나지 않았을 수 있습니다.' : e.message
    }
  }

  function openDetail(item) {
    target.value = item
    open.value = true
    load(item.id)
  }
  function close() {
    open.value = false
  }
  function retry() {
    if (target.value) load(target.value.id)
  }

  return { open, target, detail, status, error, openDetail, close, retry }
}
