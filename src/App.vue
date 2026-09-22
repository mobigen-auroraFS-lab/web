<template>
  <DesignGuide v-if="isDesignGuide" />
  <DefaultLayout v-else :active="currentPath">
    <MultimodalSearch v-if="isMultimodalSearch" />
    <FileSearch v-else />
  </DefaultLayout>
</template>

<script setup>
import { computed } from 'vue'
import { currentPath } from './router'
import DesignGuide from './DesignGuide/DesignGuide.vue'
import DefaultLayout from './layout/DefaultLayout.vue'
import FileSearch from './pages/FileSearch/FileSearch.vue'
import MultimodalSearch from './pages/MultimodalSearch/MultimodalSearch.vue'

/* 제품 화면이 2개 이상 늘어나면 이 부분을 { key: component } 형태의 맵으로 다시 분리한다 */
const isDesignGuide = computed(() => currentPath.value === 'design-guide')
const isMultimodalSearch = computed(() => currentPath.value === 'multimodal-search')
</script>
