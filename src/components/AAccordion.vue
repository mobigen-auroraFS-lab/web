<template>
  <div class="flex flex-col font-sans">
    <div v-for="(item, i) in items" :key="i" class="border-b border-border-default">
      <button
        class="flex justify-between items-center w-full box-border py-3 text-base font-medium text-text-primary cursor-pointer"
        :aria-expanded="openIndex === i"
        @click="toggle(i)"
      >
        {{ item.title }}
        <ChevronDown
          class="transition-transform duration-[180ms] ease-standard"
          :class="{ 'rotate-180': openIndex === i }"
          :size="14"
          :stroke-width="2"
        />
      </button>
      <div
        class="grid transition-[grid-template-rows] duration-[180ms] ease-standard"
        :class="openIndex === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <div class="pb-3 text-sm text-text-tertiary">{{ item.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronDown } from '@lucide/vue'

defineProps({
  items: {
    type: Array,
    required: true
    // [{ title: string, content: string }]
  }
})

const openIndex = ref(-1)

function toggle(i) {
  openIndex.value = openIndex.value === i ? -1 : i
}
</script>
