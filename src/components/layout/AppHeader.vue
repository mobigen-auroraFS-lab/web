<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { LogOut } from '@lucide/vue'
import logoUrl from '../../assets/logo.png'

/* 여러 제품 페이지가 생기면 이 목록에 항목만 추가하면 된다 */
const NAV_ITEMS = [
  { key: 'multimodal-search', label: '멀티모달 검색', href: '#multimodal-search' },
  { key: 'file-search', label: '파일 검색', href: '#file-search' }
]

defineProps({
  active: { type: String, default: 'file-search' }
})

const profileImageError = ref(false)
const headerVisible = ref(true)
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
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
  <header
    class="h-14 flex items-center justify-between px-8 bg-bg-surface border-b border-slate-100 sticky top-0 z-10 transition-transform duration-300 ease-out"
    :class="headerVisible ? 'translate-y-0' : '-translate-y-full'"
  >
    <div class="flex items-center gap-8 min-w-0">
      <a href="#file-search" class="flex items-center shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        <img :src="logoUrl" alt="AuroraFS · 파일 검색 홈으로 이동" class="h-5 w-auto object-contain" />
      </a>
      <nav class="flex items-center gap-1">
        <a
          v-for="item in NAV_ITEMS"
          :key="item.key"
          :href="item.href"
          class="flex items-center h-8 px-3 rounded-md text-base no-underline"
          :class="active === item.key ? 'font-semibold text-text-primary bg-slate-100' : 'font-medium text-text-secondary hover:bg-bg-surface-hover'"
        >{{ item.label }}</a>
      </nav>
    </div>
    <div class="flex items-center gap-3">
      <button class="flex items-center gap-2 bg-transparent border-none cursor-pointer py-1 px-2 rounded-md hover:bg-bg-surface-hover">
        <img
          v-if="!profileImageError"
          src="https://api.dicebear.com/9.x/notionists/svg?seed=hong-gildong&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear"
          alt="홍길동 프로필 사진"
          class="w-[30px] h-[30px] rounded-full object-cover shrink-0"
          @error="profileImageError = true"
        />
        <span v-else class="w-[30px] h-[30px] rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center shrink-0">홍</span>
        <span class="flex flex-col items-start gap-px">
          <span class="text-sm text-text-primary font-semibold leading-tight">홍길동</span>
          <span class="text-xs text-text-tertiary leading-tight">hong@data-portal.kr</span>
        </span>
      </button>
      <button title="로그아웃" aria-label="로그아웃" class="w-8 h-8 flex items-center justify-center bg-transparent border border-border-default rounded-md text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong hover:text-text-primary">
        <LogOut :size="16" :stroke-width="1.5" />
      </button>
    </div>
  </header>
</template>
