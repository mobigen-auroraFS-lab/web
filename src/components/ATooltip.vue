<template>
  <span ref="triggerRef" class="inline-flex font-sans" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide" @click="hide">
    <slot />
    <!-- body에 그려 고정 위치로 띄운다 — 트리거가 overflow 로 잘리는 영역(예: 스크롤되는 사이드바) 안에 있어도
         툴팁이 함께 잘리지 않는다 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-[var(--duration-fast)] ease-standard"
        leave-active-class="transition-opacity duration-[var(--duration-fast)] ease-standard"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          role="tooltip"
          class="fixed z-[90] pointer-events-none px-2.5 py-1.5 rounded-sm bg-slate-800 text-text-inverse text-xs whitespace-nowrap shadow-elevation-2 font-sans"
          :style="position"
        >
          {{ text }}
          <span class="absolute w-0 h-0" :class="ARROW_CLASS[placement]" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
/**
 * 마우스를 올리거나 키보드로 포커스하면 트리거 옆에 짧은 설명을 띄운다.
 * placement 로 트리거의 위·오른쪽·아래 중 어디에 띄울지 고른다.
 * 누르면 닫는다 — 누른 결과로 트리거가 숨겨지면 mouseleave 가 오지 않아 툴팁이 남기 때문이다.
 */
import { ref } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  placement: { type: String, default: 'top' } // 'top' | 'right' | 'bottom'
})

/* 트리거와 툴팁 사이 간격 */
const GAP = 8

const ARROW_CLASS = {
  top: 'top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-800',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-b-[5px] border-b-slate-800',
  right: 'right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-800'
}

const triggerRef = ref(null)
const open = ref(false)
const position = ref({})

function show() {
  const r = triggerRef.value.getBoundingClientRect()
  if (props.placement === 'right') {
    position.value = { left: `${r.right + GAP}px`, top: `${r.top + r.height / 2}px`, transform: 'translateY(-50%)' }
  } else if (props.placement === 'bottom') {
    position.value = { left: `${r.left + r.width / 2}px`, top: `${r.bottom + GAP}px`, transform: 'translateX(-50%)' }
  } else {
    position.value = { left: `${r.left + r.width / 2}px`, top: `${r.top - GAP}px`, transform: 'translate(-50%, -100%)' }
  }
  open.value = true
}

function hide() {
  open.value = false
}
</script>
