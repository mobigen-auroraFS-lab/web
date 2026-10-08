<template>
  <button
    type="button"
    :role="radio ? 'radio' : undefined"
    :aria-pressed="!radio ? active : undefined"
    :aria-checked="radio ? active : undefined"
    :disabled="disabled"
    class="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-md text-xs font-medium whitespace-nowrap box-border border border-solid font-sans transition-colors duration-[var(--duration-fast)] ease-standard"
    :class="
      active
        ? 'bg-action-primary border-action-primary text-text-inverse font-semibold cursor-pointer'
        : disabled
          ? 'bg-bg-surface border-border-default text-text-disabled cursor-not-allowed'
          : 'bg-bg-surface border-border-default text-text-primary hover:bg-bg-surface-hover-subtle hover:border-border-strong cursor-pointer'
    "
    @click="$emit('click')"
  >
    {{ label }}
    <span
      v-if="count !== null"
      class="text-2xs [font-feature-settings:'tnum']"
      :class="active ? 'text-[var(--color-primary-100)]' : disabled ? 'text-text-disabled' : 'text-text-tertiary'"
      >{{ count.toLocaleString() }}</span
    >
  </button>
</template>

<script setup>
/**
 * 필터 토글 칩 — 주제/하위주제/태그/파일형식/크기/기간프리셋 등
 * "여러 값 중 하나 이상을 고르는" 필터 그룹에서 공통으로 쓰는 알약형 버튼.
 *
 * count 를 넘기면 라벨 옆에 결과 개수를 보여준다(패싯 카운트, 세 자리마다 콤마). 넘기지 않으면
 * 칩은 라벨만 표시한다 — 필터 성격에 따라 개수를 보여줄지는 호출부가 정한다.
 *
 * 선택 전 칩은 흰 바탕 + 연한 테두리로 둔다 — 칩이 많이 깔리는 사이드바가 회색 면으로 무거워지지
 * 않고, 채워진 선택 칩이 확실히 구분된다.
 *
 * disabled 는 "지금 이 값을 고르면 결과가 0건이 되는" 상태를 표현한다. 바탕·테두리는
 * 일반 칩과 동일하게 두고 글자만 흐리게 하는데, 테두리까지 지우면 버튼처럼 보이지
 * 않고 UI 가 깨진 것처럼 보이기 때문이다.
 */
defineProps({
  label: { type: String, required: true },
  count: { type: Number, default: null },
  active: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /* true 면 다중 선택군(단일 그룹 안 상호배타)을 나타내는 role="radio" */
  radio: { type: Boolean, default: false }
})
defineEmits(['click'])
</script>
