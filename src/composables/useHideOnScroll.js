import { ref, onMounted } from 'vue'

/* 이만큼 같은 방향으로 움직여야 바꾼다 — 트랙패드의 미세한 흔들림에 깜빡이지 않도록 */
const THRESHOLD = 8
/* 맨 위 근처에서는 항상 보인다 */
const TOP_ZONE = 8
/* 접히는 동안은 판정을 쉰다 — 스크롤 영역 높이가 바뀌며 scrollTop이 저절로 줄어드는 걸
   "위로 스크롤"로 오인해 끝에서 접혔다 펴지기를 반복하지 않도록.
   헤더 → 검색 영역이 차례로 다 접히는 시간(--duration-slow + --hide-on-scroll-stagger)보다 조금 길게 둔다 */
const LOCK_MS = 400

/* 스크롤은 화면(목록)에서, 감추는 건 헤더(AppHeader)와 화면의 검색 영역이 하므로 상태를 모듈에 하나만 둬 함께 본다 */
const visible = ref(true)
/* 마지막으로 방향이 꺾인 지점 — 여기서 THRESHOLD 이상 멀어지면 상태를 바꾼다 */
let anchor = 0
let lockedUntil = 0

function onScroll(e) {
  const y = Math.max(e.target.scrollTop, 0)
  const now = performance.now()
  if (now < lockedUntil) {
    anchor = y
    return
  }

  let next = visible.value
  if (y <= TOP_ZONE) next = true
  else if (visible.value) {
    if (y < anchor) anchor = y
    else if (y - anchor > THRESHOLD) next = false
  } else {
    if (y > anchor) anchor = y
    else if (anchor - y > THRESHOLD) next = true
  }

  if (next !== visible.value) {
    visible.value = next
    anchor = y
    lockedUntil = now + LOCK_MS
  }
}

/* 감춰진 동안 키보드로 들어오면 다시 보여준다 */
function show() {
  visible.value = true
}

/**
 * 스크롤을 내리면 감추고, 올리면 다시 보이는 상태.
 * 자체 스크롤 영역의 @scroll 에 onScroll 을 연결하고, 감출 요소는 visible 을 읽는다.
 * 화면이 바뀌면 새 목록은 맨 위에서 시작하므로 다시 보이는 상태로 돌린다.
 */
export function useHideOnScroll() {
  onMounted(() => {
    visible.value = true
    anchor = 0
  })
  return { visible, onScroll, show }
}
