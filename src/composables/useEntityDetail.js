import { ref } from 'vue'
import {
  fetchEntityCard,
  downloadEntityBundle,
  downloadEntityAssets,
  buildEntityDetail
} from '../pages/MultimodalSearch/multimodalSearch.api'

/**
 * 개체 상세 모달(pages/MultimodalSearch/EntityDetailModal)의 상태 · 조회 · 묶음 받기 — 멀티모달 검색 · 파일 검색(소속 개체 칩)이 함께 쓴다.
 * 모달이 포커스 저장/복귀를 스스로 처리하므로 여는 쪽은 대상({ type, uid, name })만 넘기면 된다.
 * showToast 는 받기 결과 안내에 쓰는 화면의 알림 함수다.
 */
export function useEntityDetail({ showToast }) {
  const open = ref(false)
  const target = ref(null)
  const detail = ref(null)
  const status = ref('ready')
  const error = ref('')
  /* 다시 보내 볼 만한 실패인지(연결 실패 · 5xx · 시간 초과) — 404 · 422 는 「다시 시도」 대신 닫기를 보인다 */
  const retryable = ref(true)
  let seq = 0

  /* 조건이 빠르게 바뀌어도 마지막 요청의 응답만 반영한다 */
  async function load(t) {
    const mySeq = ++seq
    status.value = 'loading'
    error.value = ''
    try {
      const card = await fetchEntityCard(t.type, t.uid)
      if (mySeq !== seq) return
      detail.value = buildEntityDetail(card)
      status.value = 'ready'
    } catch (e) {
      if (mySeq !== seq) return
      detail.value = null
      status.value = 'error'
      retryable.value = e.retryable !== false
      error.value = e.message
    }
  }

  /** t: 개체 카드({ id, type, uid, name }) — 응답을 기다리는 동안 이름 · 종류를 먼저 보여준다 */
  function openDetail(t) {
    target.value = t
    detail.value = null
    open.value = true
    load(t)
  }
  function close() {
    open.value = false
  }
  function retry() {
    if (target.value) load(target.value)
  }

  /* 묶음 다운로드 — 연결 자료 전체는 카드 묶음, 보고 있는 자료 유형 탭만은 그 탭의 자산 id 로 고른 자산 묶음을 받는다 */
  const downloading = ref(false)
  async function download({ key, assetIds }) {
    const t = target.value
    if (!t || downloading.value) return
    downloading.value = true
    try {
      if (key === 'all') {
        const r = await downloadEntityBundle(t.type, t.uid)
        showToast(
          r.missing > 0
            ? `${t.name} · ${r.count}건 다운로드를 시작했습니다. (${r.missing}건 제외)`
            : `${t.name} · ${r.count}건 다운로드를 시작했습니다.`,
          3000
        )
      } else {
        const r = await downloadEntityAssets(assetIds, { onError: (message) => showToast(message, 4000) })
        showToast(`${t.name} · ${r.count}건 다운로드를 시작했습니다.`, 3000)
      }
    } catch (e) {
      showToast(e.message, 4000)
    } finally {
      downloading.value = false
    }
  }

  return { open, target, detail, status, error, retryable, openDetail, close, retry, downloading, download }
}
