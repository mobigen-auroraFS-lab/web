<template>
  <div class="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-slate-100 font-sans" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      class="inline-flex items-center h-7 px-2.5 rounded-sm text-xs font-medium border-none cursor-pointer"
      :class="modelValue === opt.value ? 'bg-bg-surface text-text-primary' : 'bg-transparent text-text-tertiary hover:text-text-primary'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
/**
 * 소수의 선택지 중 하나를 고르는 알약 트랙 토글(예: 밀도 좁게/보통/넓게).
 * ARadioGroup과 의미는 같지만(상호배타 단일 선택) 세로 목록이 아니라
 * 가로로 눌린 트랙 안에 촘촘히 배치되는 게 다르다 — 뷰 옵션·정렬 방향처럼
 * 폼 필드라기보다 "지금 화면을 어떻게 보여줄지"를 고르는 가벼운 토글에 쓴다.
 */
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true }, // [{ value, label }]
  ariaLabel: { type: String, default: '' }
})
defineEmits(['update:modelValue'])
</script>
