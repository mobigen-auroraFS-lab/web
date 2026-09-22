<template>
  <div ref="wrap" class="flex gap-6 border-b border-border-default relative font-sans">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.label"
      :ref="(el) => setTabRef(el, i)"
      class="bg-transparent border-none py-2 px-0.5 pb-3 -mb-px text-base"
      :class="
        tab.disabled
          ? 'text-text-disabled cursor-not-allowed font-medium'
          : active === tab.label
            ? 'text-text-primary font-semibold cursor-pointer'
            : 'text-text-tertiary font-medium cursor-pointer'
      "
      :disabled="tab.disabled"
      @click="select(tab)"
    >
      {{ tab.label }}
    </button>
    <span
      class="absolute -bottom-px h-0.5 bg-text-primary transition-[left,width] duration-[180ms] ease-standard"
      :style="underlineStyle"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

const props = defineProps({
  tabs: {
    type: Array,
    required: true
    // [{ label, disabled }]
  },
  modelValue: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const active = ref(props.modelValue ?? props.tabs.find((t) => !t.disabled)?.label ?? null)
const wrap = ref(null)
const tabRefs = ref([])
const underlineStyle = ref({ left: '2px', width: '0px' })

function setTabRef(el, i) {
  if (el) tabRefs.value[i] = el
}

function updateUnderline() {
  const i = props.tabs.findIndex((t) => t.label === active.value)
  const el = tabRefs.value[i]
  if (!el || !wrap.value) return
  const wr = wrap.value.getBoundingClientRect()
  const tr = el.getBoundingClientRect()
  underlineStyle.value = { left: tr.left - wr.left + 2 + 'px', width: tr.width - 4 + 'px' }
}

function select(tab) {
  if (tab.disabled) return
  active.value = tab.label
  emit('update:modelValue', tab.label)
  nextTick(updateUnderline)
}

onMounted(() => nextTick(updateUnderline))
</script>
