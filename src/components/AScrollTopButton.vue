<template>
  <Transition
    enter-active-class="transition-[opacity,translate] duration-[var(--duration-base)] ease-standard"
    leave-active-class="transition-[opacity,translate] duration-[var(--duration-base)] ease-standard"
    enter-from-class="opacity-0 translate-y-2"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-if="visible"
      type="button"
      aria-label="맨 위로"
      class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-slate-900)] border-none shadow-elevation-3 text-text-inverse cursor-pointer p-0 hover:bg-slate-700"
      @click="scrollToTop"
    >
      <ArrowUp :size="18" :stroke-width="1.8" />
    </button>
  </Transition>
</template>

<script setup>
/**
 * 자체 스크롤 영역(target)을 일정 거리 이상 내리면 나타나는 "맨 위로" 버튼.
 *
 * 밝은 목록 위에서 눈에 띄도록 선택 바(ASelectionBar)와 같은 어두운 배경에 흰 아이콘으로 둔다.
 *
 * 위치는 호출부가 정한다 — 스크롤 영역 바깥의 relative 부모 안에 absolute 로 감싸 둔다.
 * 스크롤되는 요소 안에 두면 내용과 함께 밀려 올라가 버리기 때문이다.
 */
import { ref, watch, onBeforeUnmount } from 'vue'
import { ArrowUp } from '@lucide/vue'

const props = defineProps({
  /* 스크롤을 지켜보고 맨 위로 올릴 요소 */
  target: { type: Object, default: null }
})

/* 한 화면 남짓 내려야 보인다 — 조금만 내렸을 땐 직접 올리는 편이 빠르다 */
const SHOW_AFTER_PX = 400

const visible = ref(false)

function onScroll() {
  visible.value = props.target.scrollTop > SHOW_AFTER_PX
}

watch(
  () => props.target,
  (el, prev) => {
    prev?.removeEventListener('scroll', onScroll)
    el?.addEventListener('scroll', onScroll, { passive: true })
    visible.value = false
  },
  { immediate: true }
)
onBeforeUnmount(() => props.target?.removeEventListener('scroll', onScroll))

function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  props.target?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
</script>
