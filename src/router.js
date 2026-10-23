import { ref } from 'vue'

/**
 * URL 해시(#...) 기반의 아주 가벼운 자체 라우터.
 * vue-router 없이, "지금 어떤 페이지를 보여줄지"만 반응형으로 추적한다.
 * 페이지가 늘어나 중첩 라우트/가드 등이 필요해지면 이때 vue-router 도입을 검토한다.
 */

const DEFAULT_PATH = 'file-search'
const KNOWN_PATHS = ['file-search', 'multimodal-search', 'design-guide']

/* 화면 이름은 해시의 '?' 앞까지다 — 뒤는 그 화면의 조건(#file-search?q=…)이라 화면 고르기 · 메뉴 강조에 섞지 않는다.
   모르는 경로는 기본 화면 주소로 바로잡는다(히스토리를 쌓지 않게 replaceState) */
function readPath() {
  const path = location.hash.replace(/^#\/?/, '').split('?')[0]
  if (!path) return DEFAULT_PATH
  if (KNOWN_PATHS.includes(path)) return path
  history.replaceState(null, '', `#${DEFAULT_PATH}`)
  return DEFAULT_PATH
}

export const currentPath = ref(readPath())

window.addEventListener('hashchange', () => {
  currentPath.value = readPath()
})
