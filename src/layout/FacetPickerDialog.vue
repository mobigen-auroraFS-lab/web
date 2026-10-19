<template>
  <!-- 필터 '전체 보기' 창 — 사이드바에 다 담지 못한 선택지를 검색해 고른다. 고르는 동안의 임시 선택(draft)과
       반영 시점은 호출 쪽 composable이 쥐고, 이 컴포넌트는 그리기만 한다 -->
  <ADialog
    :model-value="open"
    :title="`${title} 선택`"
    :description="`전체 ${total}개 · 건수는 전체 자료 기준 · 선택 완료를 누르면 목록에 반영됩니다`"
    width="460px"
    @update:model-value="$emit('close')"
  >
    <AInput :model-value="query" search :placeholder="`${title} 검색`" @update:model-value="$emit('update:query', $event)" />
    <div class="flex flex-col max-h-[320px] overflow-y-auto scrollbar-subtle -mx-1 px-1">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex items-center justify-between gap-3 px-2 py-2 rounded-md"
        :class="row.count === 0 && !row.active ? '' : 'hover:bg-bg-surface-hover'"
      >
        <ACheckbox :model-value="row.active" :disabled="row.count === 0 && !row.active" @update:model-value="$emit('toggle', row.label)">
          <span class="text-sm">{{ row.label }}</span>
        </ACheckbox>
        <span class="text-xs [font-feature-settings:'tnum']" :class="row.count === 0 ? 'text-text-disabled' : 'text-text-tertiary'">{{
          row.count.toLocaleString()
        }}</span>
      </div>
      <p v-if="rows.length === 0" class="m-0 py-6 text-sm text-text-tertiary text-center">
        "{{ query }}"와 일치하는 {{ title }}이(가) 없습니다.
      </p>
    </div>
    <template #footer="{ close }">
      <button
        class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
        @click="close"
      >
        취소
      </button>
      <AButton variant="primary" class="!h-control-md" @click="$emit('confirm')">선택 완료</AButton>
    </template>
  </ADialog>
</template>

<script setup>
import ADialog from '../components/ADialog.vue'
import AInput from '../components/AInput.vue'
import ACheckbox from '../components/ACheckbox.vue'
import AButton from '../components/AButton.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  total: { type: Number, default: 0 },
  /* [{ label, count, active }] — 정렬·검색 필터링은 호출 쪽에서 끝낸 상태로 받는다 */
  rows: { type: Array, required: true },
  query: { type: String, default: '' }
})
defineEmits(['close', 'toggle', 'confirm', 'update:query'])
</script>
