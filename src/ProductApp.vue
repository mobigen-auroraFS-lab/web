<script setup>
import { computed } from 'vue'
import { currentPath } from './router'
import DefaultLayout from './components/layout/DefaultLayout.vue'
import FileSearch from './pages/FileSearch/FileSearch.vue'

/* 페이지가 늘어나면 이 목록에만 추가하면 된다 */
const PAGES = {
  'file-search': FileSearch
}

const activePage = computed(() => PAGES[currentPath.value] || FileSearch)
</script>

<template>
  <DefaultLayout :active="currentPath">
    <component :is="activePage" />
  </DefaultLayout>
</template>
