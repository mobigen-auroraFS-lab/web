<template>
  <div class="min-h-screen bg-bg-canvas font-sans text-text-primary xl:h-screen xl:flex xl:flex-col xl:overflow-hidden">
    <AppHeader :active="active" />
    <!-- xl 이상: 본문이 헤더를 뺀 남은 높이를 채우고(헤더가 접히면 그만큼 늘어난다) 내부에서만 스크롤하는
         화면(예: 독립 스크롤 사이드바가 있는 FileSearch)을 지원한다. 그 아래 화면은
         지금까지처럼 페이지 전체가 스크롤되는 단일 레이아웃을 그대로 쓴다 -->
    <main
      class="max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-16 flex flex-col gap-8 xl:max-w-none xl:mx-0 xl:px-0 xl:py-0 xl:flex-1 xl:min-h-0 xl:overflow-hidden"
    >
      <slot />
    </main>
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'

defineProps({
  active: { type: String, default: 'file-search' }
})
</script>
