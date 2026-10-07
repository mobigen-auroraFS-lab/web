<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-bg-overlay-scrim" @click.self="close">
    <ACommand
      ref="commandRef"
      width="520px"
      :limit="12"
      :group-label="groupLabel"
      :placeholder="placeholder"
      :items="items"
      @select="(item) => emit('select', item)"
    />
  </div>
</template>
<script setup>
/**
 * ⌘K 커맨드 팔레트 — 파일 검색·멀티모달 검색이 함께 쓴다. 항목 구성과 실행은 각 화면 composable이 맡고,
 * 이 컴포넌트는 오버레이·열 때 초기화·포커스만 책임진다.
 */
import { ref, nextTick, watch } from 'vue'
import ACommand from '../components/ACommand.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, required: true },
  /* 목록 위 안내 문구·입력 placeholder — 화면마다 고를 수 있는 대상이 달라 호출 쪽에서 정한다 */
  groupLabel: { type: String, required: true },
  placeholder: { type: String, required: true }
})
const emit = defineEmits(['update:open', 'select'])

const commandRef = ref(null)

function close() {
  emit('update:open', false)
}

/* 열릴 때마다 이전 검색어를 지우고 입력에 포커스한다 —
   호출 쪽은 open만 true로 바꾸면 되고, 초기화는 이 컴포넌트가 책임진다 */
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    nextTick(() => {
      commandRef.value?.reset()
      commandRef.value?.focus()
    })
  }
)
</script>
