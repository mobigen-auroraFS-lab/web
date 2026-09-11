<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Type a command or search...' },
  groupLabel: { type: String, default: '' },
  items: {
    type: Array,
    required: true
    // [{ label, disabled }]
  }
})

const emit = defineEmits(['select'])

const query = ref('')
const filtered = computed(() =>
  props.items.filter((item) => item.label.toLowerCase().includes(query.value.toLowerCase()))
)
const highlighted = ref(0)

function select(item) {
  if (item.disabled) return
  emit('select', item)
}
</script>

<template>
  <div class="bg-bg-surface border border-border-default rounded-lg w-[340px] shadow-elevation-2 font-sans">
    <input
      v-model="query"
      class="block box-border w-full p-4 border-b border-border-default text-2xs text-text-primary outline-none placeholder:text-text-tertiary"
      :placeholder="placeholder"
    />
    <div class="flex flex-col px-1.5 pb-1.5">
      <div v-if="groupLabel" class="text-2xs text-text-tertiary px-2 pt-2 pb-1">{{ groupLabel }}</div>
      <div
        v-for="(item, i) in filtered"
        :key="item.label"
        class="p-2 rounded-sm text-sm"
        :class="
          item.disabled
            ? 'text-text-disabled cursor-not-allowed'
            : ['text-text-primary cursor-pointer', highlighted === i ? 'bg-bg-surface-hover' : '']
        "
        @mouseenter="highlighted = i"
        @click="select(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
