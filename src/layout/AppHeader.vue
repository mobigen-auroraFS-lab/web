<template>
  <header
    class="h-14 flex items-center justify-between px-8 bg-bg-surface border-b border-slate-100 sticky top-0 z-10 transition-[translate,margin-top] duration-[var(--duration-slow)] ease-standard animate-rise-in motion-reduce:animate-none xl:relative xl:shrink-0"
    :class="[headerVisible ? 'translate-y-0' : '-translate-y-full', listHeaderVisible ? '' : 'xl:-mt-14']"
    @focusin="showHeader"
  >
    <div class="flex items-center gap-8 min-w-0">
      <a
        href="#file-search"
        class="flex items-center shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <img :src="logoUrl" alt="AuroraFS · 파일 검색 홈으로 이동" class="h-5 w-auto object-contain" />
      </a>
      <nav class="flex items-center gap-1">
        <a
          v-for="item in NAV_ITEMS"
          :key="item.key"
          :href="item.href"
          :target="item.newTab ? '_blank' : undefined"
          :rel="item.newTab ? 'noopener' : undefined"
          class="flex items-center h-8 px-3 rounded-md text-base no-underline"
          :class="
            active === item.key
              ? 'font-semibold text-text-primary bg-slate-100'
              : 'font-medium text-text-secondary hover:bg-bg-surface-hover'
          "
          >{{ item.label }}</a
        >
      </nav>
    </div>
    <div class="flex items-center gap-3">
      <!-- 프로필 영역은 누를 때 하는 일이 없어(계정 화면 · 메뉴가 정해지지 않음 — 화면별 API 호출 기획서 부록 D) 지금은
           <div> 로 둔다. 계정 메뉴가 생기면 <button class="... cursor-pointer hover:bg-bg-surface-hover"> 로 되돌리고 클릭 핸들러를 단다 -->
      <div class="flex items-center gap-2 py-1 px-2 rounded-md">
        <!-- 사진은 /me 에 없어(IDD IF-AUTH-04) 이름 첫 글자 원으로 둔다 — 외부 아바타 서비스는 부르지 않는다 -->
        <span
          class="w-[30px] h-[30px] rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center shrink-0"
          aria-hidden="true"
          >{{ displayName.charAt(0) }}</span
        >
        <span class="text-sm text-text-primary font-semibold leading-tight">{{ displayName }}</span>
      </div>
      <!-- 로그인 화면이 없어 로그아웃이 할 일이 없다(IDD 공통규약 401) — 감춰 둔다. 로그인 화면이 생기면 hidden 만 걷는다 -->
      <button
        title="로그아웃"
        aria-label="로그아웃"
        class="hidden w-8 h-8 flex items-center justify-center bg-transparent border border-border-default rounded-md text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong hover:text-text-primary"
      >
        <LogOut :size="16" :stroke-width="1.5" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { LogOut } from '@lucide/vue'
import logoUrl from '../assets/images/logo.png'
import { fetchMe } from '../api/client'
import { useHideOnScroll } from '../composables/useHideOnScroll'

/* 여러 제품 페이지가 생기면 이 목록에 항목만 추가하면 된다 */
const NAV_ITEMS = [
  { key: 'multimodal-search', label: '멀티모달 검색', href: '#multimodal-search' },
  { key: 'file-search', label: '파일 검색', href: '#file-search' },
  /* 개발 중 확인용 메뉴 — 제품 화면이 아니라 운영 빌드에서는 뺀다(라우터 · App.vue 도 같은 조건).
     디자인 가이드엔 헤더가 없어 돌아올 길이 없으므로 새 창으로 연다 */
  ...(import.meta.env.DEV ? [{ key: 'design-guide', label: '디자인 가이드', href: '#design-guide', newTab: true }] : [])
]

defineProps({
  active: { type: String, default: 'file-search' }
})

const displayName = ref('사용자')
/* xl 미만: 페이지(window) 스크롤에 맞춰 위로 밀어 숨긴다 */
const headerVisible = ref(true)
/* xl 이상: 페이지는 고정이고 목록만 스크롤하므로, 목록 스크롤에 맞춰 헤더 자리를 접는다.
   이때는 sticky를 끈다(xl:relative) — sticky가 음수 margin으로 올린 헤더를 다시 top:0에 붙잡기 때문이다 */
const { visible: listHeaderVisible, show: showHeader } = useHideOnScroll()
let lastScrollY = 0

function onWindowScroll() {
  const currentScrollY = Math.max(window.scrollY, 0)
  if (currentScrollY <= 8) {
    headerVisible.value = true
  } else if (currentScrollY > lastScrollY + 4) {
    headerVisible.value = false
  } else if (currentScrollY < lastScrollY - 4) {
    headerVisible.value = true
  }
  lastScrollY = currentScrollY
}

onMounted(() => {
  lastScrollY = window.scrollY
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  /* 가입 때 이름을 안 줬으면 display_name 이 null — 로그인 아이디, 그것도 없는 개발용 주체는 user_id 로 보인다.
     인증이 꺼진 운영은 익명 주체(user_id 'anonymous')라 「게스트」로 보인다 */
  fetchMe()
    .then((me) => {
      const name = me.display_name ?? me.login_id
      displayName.value = name ?? (me.user_id === 'anonymous' ? '게스트' : (me.user_id ?? '게스트'))
    })
    .catch(() => (displayName.value = '게스트'))
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
})
</script>
