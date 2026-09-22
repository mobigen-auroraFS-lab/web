<template>
  <div class="bg-bg-surface border border-border-default rounded-lg shadow-elevation-2 font-sans" :style="{ width }">
    <input
      ref="inputEl"
      v-model="query"
      class="block box-border w-full p-4 border-b border-border-default text-2xs text-text-primary outline-none placeholder:text-text-tertiary"
      :placeholder="placeholder"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="select(filtered[highlighted])"
    />
    <div class="flex flex-col px-1.5 pb-1.5">
      <div v-if="groupLabel" class="text-2xs text-text-tertiary px-2 pt-2 pb-1">{{ groupLabel }}</div>
      <div ref="listEl" class="flex flex-col max-h-[320px] overflow-y-auto">
        <div
          v-for="(item, i) in filtered"
          :key="item.label"
          class="flex items-center justify-between gap-3 p-2 rounded-sm text-sm"
          :class="
            item.disabled
              ? 'text-text-disabled cursor-not-allowed'
              : ['text-text-primary cursor-pointer', highlighted === i ? 'bg-bg-surface-hover' : '']
          "
          @mouseenter="highlighted = i"
          @click="select(item)"
        >
          <span class="truncate">{{ item.label }}</span>
          <span v-if="item.hint" class="text-2xs text-text-tertiary shrink-0">{{ item.hint }}</span>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="px-2 py-3 text-sm text-text-tertiary text-center">결과 없음</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Type a command or search...' },
  groupLabel: { type: String, default: '' },
  items: {
    type: Array,
    required: true
    // [{ label, hint, disabled }]
  },
  width: { type: String, default: '340px' },
  limit: { type: Number, default: 0 }
})

const emit = defineEmits(['select'])

const query = ref('')
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  const hits = props.items.filter((item) => item.label.toLowerCase().includes(q))
  return props.limit > 0 ? hits.slice(0, props.limit) : hits
})
const highlighted = ref(0)

const inputEl = ref(null)
const listEl = ref(null)

watch(filtered, () => {
  highlighted.value = 0
})

function move(delta) {
  const n = filtered.value.length
  if (!n) return
  highlighted.value = (highlighted.value + delta + n) % n
  nextTick(() => {
    listEl.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
  })
}

function select(item) {
  if (!item || item.disabled) return
  emit('select', item)
}

function focus() {
  inputEl.value?.focus()
}
function reset() {
  query.value = ''
  highlighted.value = 0
}
defineExpose({ focus, reset })
</script>
