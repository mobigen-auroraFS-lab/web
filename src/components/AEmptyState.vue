<script setup>
/**
 * 점선 박스 안에 아이콘 + 안내 문구를 보여주는 빈 상태.
 *
 * 두 크기를 지원한다:
 * - sm: 제목 없이 짧은 설명 한 줄(줄바꿈 가능) — 필터가 상위 조건에 잠겨 있을 때의
 *   인라인 안내처럼, 좁은 사이드바 공간에 끼워 넣는 조용한 알림용
 * - md(기본): 아이콘 + 제목 + 설명 + (선택) 복구 액션 — 검색 결과가 0건일 때처럼
 *   화면의 주요 콘텐츠 자리를 대신 채우는 용도
 *
 * description 의 줄바꿈은 HTML이 아니라 실제 개행 문자로 넣는다(white-space:pre-line) —
 * 문자열 프롭으로 마크업을 주입하지 않기 위함이다.
 */
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' } // 'sm' | 'md'
})
</script>

<template>
  <div
    class="flex flex-col items-center rounded-md border border-dashed border-border-default font-sans"
    :class="size === 'sm' ? 'gap-1.5 py-5 px-3' : 'gap-3 py-10 px-6'"
  >
    <component
      :is="icon"
      class="text-icon-muted"
      :size="size === 'sm' ? 14 : 28"
      :stroke-width="size === 'sm' ? 1.5 : 1.25"
    />
    <template v-if="size === 'sm'">
      <p v-if="description" class="m-0 text-xs text-text-tertiary text-center whitespace-pre-line">{{ description }}</p>
    </template>
    <template v-else>
      <div v-if="title || description" class="flex flex-col items-center gap-1">
        <p v-if="title" class="m-0 text-base font-semibold text-text-primary">{{ title }}</p>
        <p v-if="description" class="m-0 text-sm text-text-tertiary text-center whitespace-pre-line">{{ description }}</p>
      </div>
      <div v-if="$slots.default" class="flex items-center gap-2 flex-wrap justify-center pt-1">
        <slot />
      </div>
    </template>
  </div>
</template>
