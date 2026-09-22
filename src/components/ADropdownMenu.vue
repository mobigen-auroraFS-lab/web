<template>
  <div ref="root" class="relative inline-flex font-sans">
    <button
      type="button"
      class="h-control-xl px-4 rounded-md bg-action-secondary-bg text-action-secondary-text border border-action-secondary-border text-base box-border cursor-pointer"
      @click="open = !open"
    >
      <slot name="trigger">{{ label }}</slot>
    </button>
    <div
      v-if="open"
      class="absolute top-[calc(100%+6px)] left-0 w-60 rounded-lg border border-border-default bg-bg-surface shadow-elevation-2 overflow-hidden z-10"
    >
      <div v-if="heading" class="px-2.5 py-3 text-base font-semibold text-text-primary border-b border-border-default">
        {{ heading }}
      </div>
      <template v-for="(section, si) in sections" :key="si">
        <div v-if="si > 0" class="h-px bg-border-default my-1" />
        <div class="flex flex-col py-1">
          <div
            v-for="(item, ii) in section"
            :key="ii"
            class="flex items-center gap-2.5 px-2.5 py-2.5 mx-1 rounded-sm text-base [&_svg]:shrink-0"
            :class="
              item.disabled
                ? 'text-text-disabled cursor-not-allowed [&_svg]:text-text-disabled'
                : 'text-text-primary cursor-pointer hover:bg-bg-surface-hover [&_svg]:text-text-secondary'
            "
            @click="select(item)"
          >
            <component :is="item.icon" v-if="item.icon" :size="16" :stroke-width="2" />
            <span>{{ item.label }}</span>
            <span v-if="item.kbd" class="ml-auto text-xs text-text-tertiary">{{ item.kbd }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  label: { type: String, default: '' },
  heading: { type: String, default: '' },
  sections: {
    type: Array,
    required: true
    // [[{ label, kbd, disabled, icon }]]
  }
})

const emit = defineEmits(['select'])

const open = ref(false)
const root = ref(null)

function select(item) {
  if (item.disabled) return
  emit('select', item)
  open.value = false
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>
