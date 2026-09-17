<script setup>
import { computed } from 'vue'
import { currentPath } from './router'
import DesignGuide from './pages/DesignGuide/DesignGuide.vue'
import DefaultLayout from './components/layout/DefaultLayout.vue'
import FileSearch from './pages/FileSearch/FileSearch.vue'

/* 제품 화면이 2개 이상 늘어나면 이 부분을 { key: component } 형태의 맵으로 다시 분리한다 */
const isCatalog = computed(() => currentPath.value === 'design-guide')
</script>

<template>
  <DesignGuide v-if="isCatalog" />
  <DefaultLayout v-else :active="currentPath">
    <FileSearch />
  </DefaultLayout>
</template>
