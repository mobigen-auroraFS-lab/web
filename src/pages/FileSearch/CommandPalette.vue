<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-bg-overlay-scrim" @click.self="close">
    <ACommand
      ref="commandRef"
      width="520px"
      :limit="12"
      group-label="필터를 고르거나 파일명을 입력하세요"
      placeholder="명령 또는 파일 검색…"
      :items="items"
      @select="(item) => emit('select', item)"
    />
  </div>
</template>
<script setup>
import { ref, nextTick, watch } from 'vue'
import ACommand from '../../components/ACommand.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, required: true }
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
