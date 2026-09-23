<template>
  <!-- xl 이상에서는 이 grid 자체가 앱쉘 구조다: 필터는 왼쪽에 고정된 채 자기 스크롤을 갖고,
       본문만 남은 폭을 채우며 늘어난다. 그 아래 화면은 기존처럼 페이지 전체가 스크롤된다 -->
  <div class="grid grid-cols-1 xl:flex gap-6 xl:gap-0 items-start xl:items-stretch xl:h-full">
    <!-- 필터 사이드바 -->
    <FilterSidebar
      :class="['transition-[opacity,transform] duration-[var(--duration-slow)] ease-standard', revealed.filter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2']"
      style="transition-delay: 60ms"
      :topics="topics"
      :subtopics="subtopics"
      :tags="tags"
      :file-types="fileTypes"
      :date-from="dateFrom"
      :date-to="dateTo"
      :visible-topic-chips="visibleTopicChips"
      :subtopic-chips="subtopicChips"
      :visible-tag-chips="visibleTagChips"
      :file-type-chips="fileTypeChips"
      :size-range-chips="sizeRangeChips"
      :date-preset-chips="datePresetChips"
      :date-range-label="dateRangeLabel"
      :show-more-topics="showMoreTopics"
      :show-more-subtopics="showMoreSubtopics"
      :show-more-tags="showMoreTags"
      @clear-topics="topics = []"
      @clear-subtopics="subtopics = []"
      @clear-tags="tags = []"
      @clear-file-types="fileTypes = []"
      @clear-date-range="clearDateRange"
      @toggle-topic="(label) => (topics = toggleIn(topics, label))"
      @toggle-subtopic="(label) => (subtopics = toggleIn(subtopics, label))"
      @toggle-tag="(label) => (tags = toggleIn(tags, label))"
      @toggle-file-type="(label) => (fileTypes = toggleIn(fileTypes, label))"
      @select-size="(value) => (sizeRange = value)"
      @apply-date-preset="applyDatePreset"
      @open-facet="openFacetModal"
      @update:date-from="(d) => (dateFrom = d)"
      @update:date-to="(d) => (dateTo = d)"
    />

    <!-- 결과: xl 이상에서는 이 컬럼 자체가 여백 없는 2단 구조다 —
         위(헤더 묶음)는 고정, 아래(테이블)만 남은 세로 공간을 채우며 자체 스크롤한다 -->
    <div
      class="flex flex-col gap-3 min-w-0 transition-[opacity,transform] duration-[var(--duration-slow)] ease-standard xl:gap-0 xl:flex-1 xl:h-full xl:overflow-hidden"
      :class="revealed.results ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'"
      style="transition-delay: 120ms"
    >
      <div class="flex flex-col gap-3 bg-bg-surface border-b border-slate-100 xl:shrink-0 xl:px-5 xl:pt-4 xl:pb-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-3">
          <div class="flex items-center gap-3 min-w-0">
            <h1 class="m-0 text-xl font-semibold text-text-primary tracking-tight shrink-0">파일 검색</h1>
            <span class="w-px h-4 bg-border-default shrink-0" aria-hidden="true"></span>
            <p class="m-0 text-sm text-text-tertiary truncate">수만 건의 자료를 조건별로 필터링합니다.</p>
          </div>
          <div class="relative w-full sm:w-[420px] max-w-full shrink-0">
            <div class="absolute inset-0 rounded-xl shadow-elevation-1 pointer-events-none"></div>
            <AInput
              v-model="searchDraft"
              search
              placeholder="파일명, 키워드 검색"
              class="relative [&_input]:h-10 [&_input]:text-md [&_input]:rounded-xl [&_input]:pl-11 [&_input]:pr-16"
              @keydown.enter.prevent="commitSearch"
            />
            <span
              v-if="searchDirty"
              aria-hidden="true"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 px-1.5 inline-flex items-center rounded border border-border-default bg-bg-canvas text-2xs text-text-tertiary pointer-events-none"
            >
              ⏎
            </span>
            <button
              v-else-if="searchDraft"
              aria-label="검색어 지우기"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover hover:text-text-primary"
              @click="setSearch('')"
            >
              <X :size="13" :stroke-width="1.5" />
            </button>
            <button
              v-else
              type="button"
              aria-label="명령 팔레트 열기 (Cmd/Ctrl+K)"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
              @click="openPalette"
            >
              <kbd
                class="h-5 min-w-5 px-1 inline-flex items-center justify-center rounded border border-border-default bg-bg-canvas text-2xs font-medium text-text-tertiary font-sans"
                >⌘</kbd
              >
              <kbd
                class="h-5 min-w-5 px-1 inline-flex items-center justify-center rounded border border-border-default bg-bg-canvas text-2xs font-medium text-text-tertiary font-sans"
                >K</kbd
              >
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 bg-bg-canvas xl:flex-1 xl:min-h-0 xl:overflow-hidden">
        <div class="flex flex-col gap-3 xl:shrink-0 xl:px-5 xl:pt-3">
          <div
            v-if="appliedConditions.length > 0"
            class="flex items-center gap-2 flex-wrap bg-bg-surface-selected border border-primary-100 rounded-md py-2 px-3"
          >
            <span class="text-xs text-text-tertiary font-medium shrink-0">적용 조건 {{ appliedConditions.length }}</span>
            <button
              v-for="cond in appliedConditions"
              :key="cond.label"
              :aria-label="`${cond.label} 조건 제거`"
              class="flex items-center gap-1 h-[24px] px-2 bg-bg-surface border border-[var(--color-primary-200)] rounded text-2xs text-primary-700 font-medium cursor-pointer hover:bg-primary-50"
              @click="cond.remove"
            >
              {{ cond.label }} <span aria-hidden="true" class="text-[10px] text-text-tertiary">✕</span>
            </button>
            <button
              class="ml-auto shrink-0 bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:underline hover:text-action-primary-hover"
              @click="clearAllConditions"
            >
              모두 해제
            </button>
          </div>

          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="text-md text-text-primary" aria-live="polite">
              {{ resultKeywordPrefix }}<span class="font-bold text-action-primary">{{ filteredRows.length.toLocaleString() }}</span
              ><span class="font-bold">건</span>
              <span v-if="appliedConditions.length > 0" class="text-sm text-text-tertiary font-normal ml-2"
                >(전체 {{ files.length.toLocaleString() }}건 중)</span
              >
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="relative w-[190px]">
                <ListFilter
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-icon-muted pointer-events-none"
                  :size="14"
                  :stroke-width="1.5"
                />
                <AInput
                  v-model="resultSearchDraft"
                  placeholder="목록 좁히기"
                  class="[&_input]:h-8 [&_input]:text-sm [&_input]:pl-8 [&_input]:pr-8 [&_input]:bg-slate-100 [&_input]:border-transparent hover:[&_input]:bg-slate-200"
                  @keydown.enter.prevent="commitResultSearch"
                />
                <button
                  v-if="resultSearchDraft"
                  aria-label="목록 좁히기 지우기"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover"
                  @click="setResultSearch('')"
                >
                  <X :size="12" :stroke-width="1.5" />
                </button>
              </div>
              <ASegmentedControl v-model="density" :options="DENSITY_OPTIONS" aria-label="목록 밀도" />
            </div>
          </div>
        </div>

        <div class="xl:flex-1 xl:min-h-0 xl:overflow-hidden">
          <ASelectionBar :count="selectedIds.length">
            <button
              class="flex items-center gap-1.5 h-[38px] px-4 bg-transparent border-none rounded-md text-sm text-slate-300 font-medium cursor-pointer whitespace-nowrap hover:bg-slate-700 hover:text-slate-100"
              @click="selectedIds = []"
            >
              <X :size="14" :stroke-width="1.5" />
              선택 해제
            </button>
            <AButton variant="primary" class="!h-[38px] !rounded-md" @click="bulkDownload">
              <span class="flex items-center gap-2"><Download :size="15" :stroke-width="1.8" /> 다운로드</span>
            </AButton>
          </ASelectionBar>

          <div
            role="table"
            aria-label="파일 검색 결과"
            class="relative border-y border-border-default overflow-auto bg-bg-surface xl:h-full"
          >
            <div role="rowgroup" class="sticky top-0 z-[1]">
              <div
                role="row"
                class="grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px_76px] min-w-[896px] bg-table-header-bg border-b border-table-header-border"
              >
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] flex items-center justify-center">
                  <ACheckbox :model-value="allVisibleSelected" @update:model-value="toggleSelectAllVisible">
                    <span class="sr-only">현재 표시된 파일 전체 선택</span>
                  </ACheckbox>
                </div>
                <div role="columnheader" :aria-sort="ariaSortFor('name')" class="flex">
                  <button
                    class="flex items-center gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary"
                    :class="sortKey === 'name' ? 'text-text-primary' : 'text-text-secondary'"
                    @click="toggleSort('name')"
                  >
                    파일명
                    <ArrowUp v-if="sortKey === 'name'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div
                  role="columnheader"
                  class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary"
                >
                  분류
                </div>
                <div
                  role="columnheader"
                  class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary"
                >
                  종류
                </div>
                <div
                  role="columnheader"
                  class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-xs font-medium text-text-secondary"
                >
                  키워드 · 태그
                </div>
                <div role="columnheader" :aria-sort="ariaSortFor('date')" class="flex">
                  <button
                    class="flex items-center gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary"
                    :class="sortKey === 'date' ? 'text-text-primary' : 'text-text-secondary'"
                    @click="toggleSort('date')"
                  >
                    수정일
                    <ArrowUp v-if="sortKey === 'date'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div role="columnheader" :aria-sort="ariaSortFor('size')" class="flex">
                  <button
                    class="flex items-center justify-end gap-1 w-full py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] bg-transparent border-none text-xs font-medium cursor-pointer hover:text-text-primary"
                    :class="sortKey === 'size' ? 'text-text-primary' : 'text-text-secondary'"
                    @click="toggleSort('size')"
                  >
                    크기
                    <ArrowUp v-if="sortKey === 'size'" :size="12" :stroke-width="2" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
                  </button>
                </div>
                <div role="columnheader" class="py-[var(--table-cell-padding-y)] px-2"><span class="sr-only">작업</span></div>
              </div>
            </div>

            <div
              v-if="canSelectAllResults || allResultsSelected"
              class="flex items-center justify-center gap-2 flex-wrap min-w-[896px] py-2 px-4 bg-bg-surface-selected border-b border-border-default text-sm"
            >
              <template v-if="allResultsSelected">
                <span class="text-text-secondary">검색결과 {{ sortedRows.length.toLocaleString() }}건을 모두 선택했습니다.</span>
                <button
                  class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:underline"
                  @click="selectedIds = []"
                >
                  선택 해제
                </button>
              </template>
              <template v-else>
                <span class="text-text-secondary">현재 표시된 {{ visibleRows.length }}건을 선택했습니다.</span>
                <button
                  class="bg-transparent border-none text-sm text-action-primary font-semibold cursor-pointer hover:underline"
                  @click="selectAllResults"
                >
                  검색결과 {{ sortedRows.length.toLocaleString() }}건 모두 선택
                </button>
              </template>
            </div>
            <div role="rowgroup">
              <div
                v-for="(item, i) in visibleRows"
                :key="item.id"
                role="row"
                :aria-selected="selectedIds.includes(item.id)"
                class="group grid grid-cols-[36px_1fr_90px_70px_200px_120px_80px_76px] min-w-[896px]"
                :class="[
                  i === visibleRows.length - 1 ? '' : 'border-b border-slate-100',
                  selectedIds.includes(item.id) ? 'bg-bg-surface-selected' : 'hover:bg-bg-surface-hover'
                ]"
                @click="onRowClick(item, $event)"
              >
                <div role="cell" class="py-[var(--table-cell-padding-y)] flex items-center justify-center">
                  <ACheckbox :model-value="selectedIds.includes(item.id)" @update:model-value="toggleRowSelect(item.id)">
                    <span class="sr-only">{{ item.name }} 선택</span>
                  </ACheckbox>
                </div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] flex items-center gap-2 min-w-0">
                  <component :is="ICON_BY_EXT[item.ext]" class="text-icon-default shrink-0" :size="16" :stroke-width="1.5" />
                  <button
                    class="min-w-0 truncate text-left bg-transparent border-none p-0 text-[length:var(--density-text-size)] text-text-primary font-medium cursor-pointer hover:underline"
                    @click="openFileDetail(item)"
                  >
                    {{ item.name }}
                  </button>
                </div>
                <div
                  role="cell"
                  class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary"
                >
                  {{ item.category }}
                </div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)]">
                  <span
                    class="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-bold rounded-sm tracking-wide"
                    :style="{ background: EXT_STYLE_MAP[item.ext].bg, color: EXT_STYLE_MAP[item.ext].text }"
                    >{{ item.ext }}</span
                  >
                </div>
                <div
                  role="cell"
                  class="py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] flex gap-2 flex-wrap items-center min-w-0"
                >
                  <span v-for="t in item.tags" :key="t" class="text-2xs font-medium text-text-tertiary">{{ t }}</span>
                </div>
                <div
                  role="cell"
                  class="flex items-center py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary whitespace-nowrap"
                >
                  {{ item.date }}
                </div>
                <div
                  role="cell"
                  class="flex items-center justify-end py-[var(--table-cell-padding-y)] px-[var(--table-cell-padding-x)] text-[length:var(--density-text-size)] text-text-tertiary text-right [font-feature-settings:'tnum']"
                >
                  {{ item.sizeLabel }}
                </div>
                <div role="cell" class="py-[var(--table-cell-padding-y)] px-1.5 flex items-center justify-center gap-0.5">
                  <button
                    :aria-label="`${item.name} 상세 보기`"
                    class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer opacity-0 transition-opacity duration-[var(--duration-fast)] ease-standard hover:bg-bg-surface-hover hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    @click="openFileDetail(item)"
                  >
                    <Info :size="15" :stroke-width="1.8" />
                  </button>
                  <button
                    :aria-label="`${item.name} 다운로드`"
                    class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer opacity-0 transition-opacity duration-[var(--duration-fast)] ease-standard hover:bg-bg-surface-hover hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    @click="downloadOne(item)"
                  >
                    <Download :size="15" :stroke-width="1.8" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="visibleRows.length === 0" class="p-6 border-t border-border-default">
              <AEmptyState
                :icon="SearchX"
                title="조건에 해당하는 파일이 없습니다"
                :description="`적용된 조건 ${appliedConditions.length}개가 서로 맞지 않을 수 있습니다. 조건을 줄여보세요.`"
              >
                <button
                  v-if="searchTerms.length"
                  class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
                  @click="setSearch('')"
                >
                  검색어만 지우기
                </button>
                <AButton v-if="appliedConditions.length" variant="primary" class="!h-control-md" @click="clearAllConditions"
                  >조건 모두 해제</AButton
                >
              </AEmptyState>
            </div>

            <div ref="loadMoreRef" class="flex items-center justify-center min-h-12 py-3 text-xs text-text-tertiary" aria-live="polite">
              <span v-if="visibleRows.length < sortedRows.length">더 불러오는 중...</span>
              <span v-else-if="sortedRows.length > 0">전체 결과를 불러왔습니다.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 파일 상세 정보 모달 -->
  <AFileDetailModal
    v-model:open="fileDetailOpen"
    :file="fileDetail"
    :icon="fileDetailIcon"
    @download-original="onDownloadOriginal"
    @download-zip="onDownloadZip"
    @copy-link="onCopyLinkDetail"
    @breadcrumb-click="onBreadcrumbClickDetail"
    @topic-click="onTopicClickDetail"
    @meta-click="onMetaClickDetail"
    @relation-click="onRelationClickDetail"
  />

  <!-- 패싯 전체 보기: 사이드바에 다 담을 수 없을 때 검색으로 고른다 -->
  <ADialog
    :model-value="facetModal !== null"
    :title="`${facetModalTitle} 선택`"
    :description="`전체 ${facetModalTotal}개 · 선택 완료를 누르면 목록에 반영됩니다`"
    width="460px"
    @update:model-value="closeFacetModal"
  >
    <AInput v-model="facetQuery" search :placeholder="`${facetModalTitle} 검색`" />
    <div class="flex flex-col max-h-[320px] overflow-y-auto -mx-1 px-1">
      <div
        v-for="row in facetModalRows"
        :key="row.label"
        class="flex items-center justify-between gap-3 px-2 py-2 rounded-md"
        :class="row.count === 0 && !row.active ? '' : 'hover:bg-bg-surface-hover'"
      >
        <ACheckbox :model-value="row.active" :disabled="row.count === 0 && !row.active" @update:model-value="toggleFacetValue(row.label)">
          <span class="text-sm">{{ row.label }}</span>
        </ACheckbox>
        <span class="text-xs [font-feature-settings:'tnum']" :class="row.count === 0 ? 'text-text-disabled' : 'text-text-tertiary'">{{
          row.count
        }}</span>
      </div>
      <p v-if="facetModalRows.length === 0" class="m-0 py-6 text-sm text-text-tertiary text-center">
        "{{ facetQuery }}"와 일치하는 {{ facetModalTitle }}이(가) 없습니다.
      </p>
    </div>
    <template #footer="{ close }">
      <button
        class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
        @click="close"
      >
        취소
      </button>
      <AButton variant="primary" class="!h-control-md" @click="confirmFacetModal">선택 완료</AButton>
    </template>
  </ADialog>

  <!-- ⌘K 커맨드 팔레트 -->
  <div
    v-if="paletteOpen"
    class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-bg-overlay-scrim"
    @click.self="closePalette"
  >
    <ACommand
      ref="paletteRef"
      width="520px"
      :limit="12"
      group-label="필터를 고르거나 파일명을 입력하세요"
      placeholder="명령 또는 파일 검색…"
      :items="paletteItems"
      @select="runPaletteItem"
    />
  </div>

  <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50">
    <AToast :title="toastMessage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { X, Download, SearchX, ArrowUp, ListFilter, Info } from '@lucide/vue'

import AInput from '../../components/AInput.vue'
import AButton from '../../components/AButton.vue'
import ACheckbox from '../../components/ACheckbox.vue'
import AToast from '../../components/AToast.vue'
import ADialog from '../../components/ADialog.vue'
import AFileDetailModal from '../../components/AFileDetailModal.vue'
import ACommand from '../../components/ACommand.vue'
import AEmptyState from '../../components/AEmptyState.vue'
import ASelectionBar from '../../components/ASelectionBar.vue'
import ASegmentedControl from '../../components/ASegmentedControl.vue'
import FilterSidebar from '../../layout/FilterSidebar.vue'

import { ICON_BY_EXT, EXT_STYLE_MAP, DENSITY_OPTIONS } from './fileSearch.mock'
import { useFileSearch } from './useFileSearch'

const {
  files,
  searchDraft,
  resultSearchDraft,
  topics,
  subtopics,
  tags,
  dateFrom,
  dateTo,
  fileTypes,
  sizeRange,
  selectedIds,
  sortKey,
  sortDir,
  toastMessage,
  fileDetailOpen,
  fileDetailTarget,
  density,
  facetModal,
  facetQuery,
  searchTerms,
  searchDirty,
  commitSearch,
  setSearch,
  commitResultSearch,
  setResultSearch,
  filteredRows,
  sortedRows,
  visibleRows,
  allVisibleSelected,
  allResultsSelected,
  canSelectAllResults,
  resultKeywordPrefix,
  visibleTopicChips,
  showMoreTopics,
  subtopicChips,
  showMoreSubtopics,
  visibleTagChips,
  showMoreTags,
  fileTypeChips,
  sizeRangeChips,
  datePresetChips,
  dateRangeLabel,
  appliedConditions,
  clearAllConditions,
  clearDateRange,
  toggleSort,
  ariaSortFor,
  applyDatePreset,
  selectAllResults,
  toggleSelectAllVisible,
  toggleRowSelect,
  loadMoreRows,
  bulkDownload,
  downloadOne,
  openFileDetail,
  closeFileDetail,
  onRowClick,
  fileDetail,
  onDownloadOriginal,
  onDownloadZip,
  onCopyLinkDetail,
  onBreadcrumbClickDetail,
  onTopicClickDetail,
  onMetaClickDetail,
  onRelationClickDetail,
  openFacetModal,
  closeFacetModal,
  confirmFacetModal,
  facetModalTitle,
  facetModalTotal,
  facetModalRows,
  toggleFacetValue,
  paletteOpen,
  paletteItems,
  closePalette,
  runPaletteItem,
  applyUrlState,
  toggleIn
} = useFileSearch()

const fileDetailIcon = computed(() => (fileDetailTarget.value ? ICON_BY_EXT[fileDetailTarget.value.ext] : null))

/* ---------------------------------------------------------------- reveal-in */

const revealed = ref({ hero: false, filter: false, results: false })

/* ------------------------------------------------------------ 무한 스크롤 */

const loadMoreRef = ref(null)
let loadObserver = null

function observeLoadMore() {
  if (!loadObserver || !loadMoreRef.value) return
  loadObserver.observe(loadMoreRef.value)
}

/* --------------------------------------------------------- command palette */

const paletteRef = ref(null)

function openPalette() {
  paletteOpen.value = true
  nextTick(() => {
    paletteRef.value?.reset()
    paletteRef.value?.focus()
  })
}

/* ------------------------------------------------------------- 키보드 단축키 */

function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteOpen.value ? closePalette() : openPalette()
    return
  }
  if (e.key !== 'Escape') return
  if (paletteOpen.value) closePalette()
  else if (facetModal.value) closeFacetModal()
  else if (fileDetailOpen.value) closeFileDetail()
}

onMounted(() => {
  applyUrlState()
  window.addEventListener('hashchange', applyUrlState)
  window.addEventListener('keydown', onGlobalKeydown)
  if ('IntersectionObserver' in window) {
    loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRows()
      },
      { rootMargin: '240px 0px' }
    )
    observeLoadMore()
  }
  requestAnimationFrame(() => {
    revealed.value = { hero: true, filter: true, results: true }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', applyUrlState)
  window.removeEventListener('keydown', onGlobalKeydown)
  loadObserver?.disconnect()
  loadObserver = null
})
</script>
