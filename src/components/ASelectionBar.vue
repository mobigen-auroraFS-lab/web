<script setup>
/**
 * 목록에서 여러 항목을 선택했을 때 화면 하단 중앙에 떠서 개수와 일괄 액션을
 * 보여주는 툴바. count 가 0 이면 렌더링하지 않는다.
 *
 * body 로 teleport 한다 — 등장 애니메이션이 남긴 transform 이 부모 트리 어딘가에
 * 있으면 fixed 의 containing block 을 가로채 뷰포트 기준 고정이 깨지기 때문에,
 * 항상 그 문제에서 안전하도록 컴포넌트 자체가 body 밖으로 나간다.
 *
 * 액션 버튼들은 기본 슬롯으로 받는다 — "선택 해제"는 어디서 쓰든 같지만 그 다음
 * 액션(다운로드/삭제/이동 등)은 호출부마다 다르기 때문이다.
 */
defineProps({
  count: { type: Number, required: true },
  label: { type: String, default: '건 선택됨' }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="count > 0"
      role="status"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-32px)] pointer-events-none font-sans"
    >
      <div class="pointer-events-auto flex items-center gap-1 flex-wrap justify-center bg-[var(--color-slate-900)] rounded-lg py-1.5 pl-4.5 pr-1.5 shadow-elevation-3">
        <div class="flex items-center gap-2.5 pr-4">
          <span class="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary-500 text-text-inverse text-xs font-bold [font-feature-settings:'tnum']">{{ count }}</span>
          <span class="text-sm text-slate-100 font-medium whitespace-nowrap">{{ label }}</span>
        </div>
        <div class="w-px h-[22px] bg-slate-700 shrink-0"></div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
