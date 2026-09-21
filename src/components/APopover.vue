<script setup>
/**
 * 트리거 옆에 뜨는 위치 인식 플로팅 패널. 뷰포트 가장자리를 벗어나지 않도록
 * 가로 위치를 clamp 하고, 아래에 펼칠 자리가 없으면 위로 뒤집는다.
 *
 * 패널은 body 로 teleport 되고 fixed 로 배치되므로, 스크롤 가능한 사이드바 안의
 * 트리거(overflow: hidden/auto 조상)에 붙여도 잘리지 않는다. 위치는 트리거의
 * getBoundingClientRect 를 기준으로 열릴 때·리사이즈·스크롤마다 다시 계산한다.
 * scroll 리스너는 capture 단계에 건다 — scroll 이벤트는 버블링하지 않으므로,
 * 트리거를 담은 임의의 스크롤 조상(예: overflow-y-auto 사이드바)에서 발생한
 * 스크롤까지 window 하나에서 잡으려면 capture 가 필요하다.
 *
 * 열림 상태는 v-model(boolean)로 호출부가 들고 있는다 — 트리거 클릭 한 곳뿐 아니라
 * "값을 고르면 자동으로 닫는다" 같은 호출부 쪽 로직도 자연스럽게 끼워 넣을 수 있다.
 */
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  panelWidth: { type: Number, default: 280 },
  /* 위로 펼치기로 전환하는 기준 — 패널의 대략적인 높이 */
  panelMaxHeight: { type: Number, default: 320 }
})
const emit = defineEmits(['update:modelValue'])

const triggerRef = ref(null)
const panelRef = ref(null)
const position = ref({ left: 0, top: 0, transform: 'none' })

function close() {
  emit('update:modelValue', false)
}
function toggle() {
  emit('update:modelValue', !props.modelValue)
}

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const edgePadding = 8
  const left = Math.min(
    Math.max(rect.left, edgePadding),
    Math.max(edgePadding, window.innerWidth - props.panelWidth - edgePadding)
  )
  const canOpenAbove = rect.top >= props.panelMaxHeight + edgePadding * 2
  position.value = {
    left,
    top: canOpenAbove ? rect.top - edgePadding : rect.bottom + edgePadding,
    transform: canOpenAbove ? 'translateY(-100%)' : 'none'
  }
}

function onClickOutside(e) {
  if (triggerRef.value?.contains(e.target)) return
  if (panelRef.value?.contains(e.target)) return
  close()
}
function onKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) close()
}

let bound = false
function bindGlobalListeners() {
  if (bound) return
  bound = true
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, { capture: true, passive: true })
  window.addEventListener('keydown', onKeydown)
}
function unbindGlobalListeners() {
  if (!bound) return
  bound = false
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, { capture: true })
  window.removeEventListener('keydown', onKeydown)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      bindGlobalListeners()
      nextTick(updatePosition)
    } else {
      unbindGlobalListeners()
    }
  },
  { immediate: true }
)
onBeforeUnmount(unbindGlobalListeners)

defineExpose({ updatePosition })
</script>

<template>
  <span ref="triggerRef">
    <slot name="trigger" :open="modelValue" :toggle="toggle" :close="close" />
  </span>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="panelRef"
      class="fixed z-[60]"
      :style="{ left: `${position.left}px`, top: `${position.top}px`, transform: position.transform }"
    >
      <slot name="content" :close="close" />
    </div>
  </Teleport>
</template>
