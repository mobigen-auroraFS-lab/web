<script setup>
import { ref } from 'vue'

defineProps({
  items: {
    type: Array,
    required: true
    // [{ label, disabled, divider, icon }]
  }
})

const emit = defineEmits(['select'])

const open = ref(false)
const pos = ref({ x: 0, y: 0 })

function onContextMenu(e) {
  e.preventDefault()
  const rect = e.currentTarget.getBoundingClientRect()
  pos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  open.value = true
}

function select(item) {
  if (item.disabled) return
  emit('select', item)
  open.value = false
}
</script>

<template>
  <div class="relative font-sans" @contextmenu="onContextMenu" @click="open = false">
    <slot />
    <div
      v-if="open"
      class="absolute w-[180px] rounded-lg border border-border-default bg-bg-surface shadow-elevation-2 overflow-hidden text-left z-10"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @click.stop
    >
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.divider" class="h-px bg-border-default my-1" />
        <div
          v-else
          class="flex items-center gap-2 p-2.5 text-base rounded-sm"
          :class="
            item.disabled
              ? 'text-text-disabled cursor-not-allowed'
              : 'text-text-primary cursor-pointer hover:bg-bg-surface-hover'
          "
          @click="select(item)"
        >
          <component :is="item.icon" v-if="item.icon" :size="13" :stroke-width="2.5" />
          {{ item.label }}
        </div>
      </template>
    </div>
  </div>
</template>
