<template>
  <div class="relative inline-flex group font-sans">
    <slot />
    <div
      class="opacity-0 invisible transition-opacity duration-[120ms] ease-standard group-hover:opacity-100 group-hover:visible absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-sm bg-slate-800 text-text-inverse text-xs whitespace-nowrap shadow-elevation-2 z-10"
    >
      {{ text }}
      <div
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-800"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, required: true }
})
</script>
