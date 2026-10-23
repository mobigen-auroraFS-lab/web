<template>
  <DesignGuide v-if="isDesignGuide" />
  <DefaultLayout v-else :active="currentPath">
    <MultimodalSearch v-if="isMultimodalSearch" />
    <FileSearch v-else />
  </DefaultLayout>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { currentPath } from './router'
import DefaultLayout from './layout/DefaultLayout.vue'
import FileSearch from './pages/FileSearch/FileSearch.vue'
import MultimodalSearch from './pages/MultimodalSearch/MultimodalSearch.vue'

/* 디자인 가이드는 개발 중 확인용 — 운영 빌드에서는 import 자체가 빠진다(번들에도 들지 않는다) */
const DesignGuide = import.meta.env.DEV ? defineAsyncComponent(() => import('./DesignGuide/DesignGuide.vue')) : null
const isDesignGuide = computed(() => !!DesignGuide && currentPath.value === 'design-guide')
/* 제품 화면이 2개 이상 늘어나면 이 부분을 { key: component } 형태의 맵으로 다시 분리한다 */
const isMultimodalSearch = computed(() => currentPath.value === 'multimodal-search')
</script>
