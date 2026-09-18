import { ref } from 'vue'

/**
 * URL 해시(#...) 기반의 아주 가벼운 자체 라우터.
 * vue-router 없이, "지금 어떤 페이지를 보여줄지"만 반응형으로 추적한다.
 * 페이지가 늘어나 중첩 라우트/가드 등이 필요해지면 이때 vue-router 도입을 검토한다.
 */

function readPath() {
  return location.hash.replace(/^#\/?/, '') || 'file-search'
}

export const currentPath = ref(readPath())

window.addEventListener('hashchange', () => {
  currentPath.value = readPath()
})
