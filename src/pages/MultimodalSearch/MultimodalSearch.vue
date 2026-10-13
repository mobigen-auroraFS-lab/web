<template>
  <!-- 레이아웃은 파일 검색과 같다: xl 이상에서 필터는 왼쪽에 고정된 채 자체 스크롤하고, 본문이 남은 폭을 채운다 -->
  <div class="grid grid-cols-1 xl:flex gap-6 xl:gap-0 items-start xl:items-stretch xl:h-full">
    <!-- 필터 사이드바 -->
    <aside
      aria-label="검색 필터"
      class="relative self-start animate-rise-in motion-reduce:animate-none xl:shrink-0 xl:self-stretch xl:m-3 xl:rounded-3xl xl:border xl:overflow-y-auto xl:overflow-x-hidden scrollbar-subtle xl:[&::-webkit-scrollbar-track]:my-6 xl:pl-6 xl:pr-[14px] xl:pt-7 xl:pb-10 xl:transition-[width,background-color,border-color,box-shadow] xl:duration-[var(--duration-slow)] xl:ease-standard"
      :class="
        filterCollapsed
          ? 'bg-bg-surface xl:bg-transparent xl:border-transparent xl:w-14 xl:[scrollbar-gutter:auto]'
          : 'bg-bg-surface xl:border-slate-100 xl:shadow-elevation-1 xl:w-[var(--sidebar-width)]'
      "
      style="animation-delay: 80ms"
    >
      <!-- 접힌 상태(xl 이상): 카드(배경·테두리·그림자)는 걷어내고 펼치기 아이콘만 남긴다 -->
      <div v-if="filterCollapsed" class="hidden xl:flex absolute inset-x-0 top-6 flex-col items-center gap-2">
        <ATooltip text="필터 펼치기" placement="bottom">
          <button
            type="button"
            aria-label="필터 펼치기"
            aria-expanded="false"
            class="flex w-8 h-8 items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer p-0 hover:bg-bg-surface-hover hover:text-text-primary"
            @click="toggleFilterPanel"
          >
            <PanelLeftOpen :size="18" :stroke-width="1.8" />
          </button>
        </ATooltip>
      </div>

      <!-- 펼친 내용은 폭을 고정해 둔다 — 카드 폭이 늘고 줄어드는 동안 칩이 줄바꿈되며 출렁이지 않고,
           overflow-x-hidden 에 잘린 채로 드러난다. 고정 폭 = 사이드바 폭 - 테두리 2 - 좌우 여백 24·14 - 스크롤바 칸 10 -->
      <div class="flex flex-col gap-5 xl:w-[calc(var(--sidebar-width)-50px)]" :class="filterCollapsed ? 'xl:hidden' : ''">
        <div class="flex items-center justify-between gap-2">
          <h2 class="m-0 text-lg font-bold text-text-primary">필터</h2>
          <ATooltip text="필터 접기" placement="bottom">
            <button
              type="button"
              aria-label="필터 접기"
              aria-expanded="true"
              class="hidden xl:flex w-8 h-8 items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer p-0 hover:bg-bg-surface-hover hover:text-text-primary"
              @click="toggleFilterPanel"
            >
              <PanelLeftClose :size="18" :stroke-width="1.8" />
            </button>
          </ATooltip>
        </div>
        <div class="border-b border-slate-100 -mt-2"></div>

        <p v-if="searchTerms.length" class="m-0 -mt-2 text-2xs text-text-tertiary">칩 건수는 검색어와 상관없이 전체 자료 기준입니다.</p>

        <div class="flex flex-col gap-3" role="group" aria-label="종류">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">종류</span>
            <button
              v-if="entityType"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="entityType = ''"
            >
              해제
            </button>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <AFilterChip
              v-for="chip in typeChips"
              :key="chip.label"
              :label="chip.label"
              :count="chip.count"
              :active="chip.active"
              :disabled="chip.disabled"
              @click="toggleType(chip.label)"
            />
          </div>
        </div>

        <!-- 갈래: 서버가 묶어 주는 기준별로 나눠 보여준다. 여럿 고르면 모두 가진 개체만 남는다(AND) -->
        <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="갈래">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">갈래</span>
            <button
              v-if="areas.length"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="areas = []"
            >
              해제
            </button>
          </div>
          <div class="flex flex-col gap-5">
            <div v-for="group in areaGroups" :key="group.label" class="flex flex-col gap-2" role="group" :aria-label="group.label">
              <span class="text-xs font-medium text-text-tertiary">{{ group.label }}</span>
              <div class="flex gap-2 flex-wrap items-center">
                <AFilterChip
                  v-for="chip in group.chips"
                  :key="chip.label"
                  :label="chip.label"
                  :count="chip.count"
                  :active="chip.active"
                  :disabled="chip.disabled"
                  @click="toggleArea(chip.label)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 반드시 포함할 자료 — 고른 자료 유형을 모두 가진 개체만(AND). 칩 숫자는 "이 칩을 더 누르면 남는 개체 수"다.
             등록일 필터는 개체에 날짜가 없어 두지 않는다 -->
        <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="반드시 포함할 자료">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">반드시 포함할 자료</span>
            <button
              v-if="modalities.length"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="modalities = []"
            >
              해제
            </button>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <AFilterChip
              v-for="chip in modalityChips"
              :key="chip.label"
              :label="chip.label"
              :count="chip.count"
              :active="chip.active"
              :disabled="chip.disabled"
              @click="toggleModality(chip.label)"
            />
          </div>
        </div>
      </div>
    </aside>

    <!-- 결과: xl 이상에서 위(헤더 묶음)는 고정, 아래(목록)만 남은 세로 공간을 채운다 -->
    <div
      class="flex flex-col gap-3 min-w-0 animate-rise-in motion-reduce:animate-none xl:gap-0 xl:flex-1 xl:h-full xl:overflow-hidden"
      style="animation-delay: 160ms"
    >
      <!-- 검색 영역: xl 이상에서 목록을 내리면 헤더에 이어 접히고, 올리면 헤더에 이어 펼쳐진다.
           grid 행 높이(1fr ↔ 0fr)를 transition 해 실제 높이를 몰라도 부드럽게 접고,
           transition-delay 로 헤더보다 한 박자 늦게 움직여 위에서부터 차례로 보이게 한다 -->
      <div
        class="border-b border-slate-100 xl:mx-4 transition-[grid-template-rows,opacity] duration-[var(--duration-slow)] delay-[var(--hide-on-scroll-stagger)] ease-standard xl:shrink-0 xl:grid"
        :class="headerVisible ? 'xl:grid-rows-[1fr]' : 'xl:grid-rows-[0fr] xl:opacity-0'"
        @focusin="showHeader"
      >
        <!-- 좌우 여백은 바깥(mx-4)과 여기(px-1)로 나눠 구분선이 텍스트 폭에 맞게 그어지게 한다.
             안쪽에 조금 남긴 여백은 접힘용 overflow-hidden에 검색창 그림자가 잘리지 않게 하는 몫이다 -->
        <div class="min-h-0 xl:overflow-hidden">
          <div class="flex flex-col gap-3 xl:px-1 xl:pt-4 xl:pb-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-3">
              <div class="flex items-center gap-3 min-w-0">
                <h1 class="m-0 text-xl font-semibold text-text-primary tracking-tight shrink-0">멀티모달 검색</h1>
                <span class="w-px h-4 bg-border-default shrink-0" aria-hidden="true"></span>
                <p class="m-0 text-sm text-text-tertiary truncate">
                  문서·이미지·영상·음성 자료를 인물·장소·작품 같은 개체별로 묶어 보여줍니다.
                </p>
              </div>
              <div class="relative w-full sm:w-[420px] max-w-full shrink-0">
                <div class="absolute inset-0 rounded-xl shadow-elevation-1 pointer-events-none"></div>
                <AInput
                  v-model="searchDraft"
                  search
                  placeholder="키워드 검색"
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
                  @click="paletteOpen = true"
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
        </div>
      </div>

      <div class="relative flex flex-col gap-3 bg-bg-canvas xl:flex-1 xl:min-h-0 xl:overflow-hidden">
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
              <template v-if="!listLoading && !listError">
                {{ resultKeywordPrefix }}<span class="font-bold text-action-primary">{{ total.toLocaleString() }}</span
                ><span class="font-bold">개</span>
                <span v-if="resultSearchValue && scopeTotal !== total" class="text-sm text-text-tertiary font-normal ml-2"
                  >(결과 내 검색 전 {{ scopeTotal.toLocaleString() }}개)</span
                >
              </template>
              <span v-else-if="listLoading" class="text-text-tertiary">불러오는 중…</span>
            </div>
            <div class="relative w-[190px] shrink-0">
              <ListFilter
                class="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-icon-muted pointer-events-none"
                :size="14"
                :stroke-width="1.5"
              />
              <AInput
                v-model="resultSearchDraft"
                placeholder="결과 내 검색"
                class="[&_input]:h-8 [&_input]:text-sm [&_input]:pl-8 [&_input]:pr-8 [&_input]:bg-slate-100 [&_input]:border-transparent hover:[&_input]:bg-slate-200"
                @keydown.enter.prevent="commitResultSearch"
              />
              <button
                v-if="resultSearchDraft"
                aria-label="결과 내 검색어 지우기"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 border-none bg-transparent text-text-tertiary rounded-full cursor-pointer flex items-center justify-center p-0 hover:bg-bg-surface-hover"
                @click="setResultSearch('')"
              >
                <X :size="12" :stroke-width="1.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- 목록 오른쪽 아래에 띄운다 — 스크롤되는 목록 밖에 둬야 내용과 함께 밀려가지 않는다 -->
        <div class="absolute right-6 bottom-6 z-[2]">
          <AScrollTopButton :target="listScrollRef" />
        </div>

        <!-- 목록: 카드 그리드. xl 이상에서는 이 영역만 남은 세로 공간을 채우며 자체 스크롤한다.
             hover 시 떠오른 카드가 스크롤 경계에 잘리지 않게 안쪽에 4px 여유를 두고, 같은 만큼 위로 당겨 간격은 그대로 둔다 -->
        <div
          ref="listScrollRef"
          class="xl:flex-1 xl:min-h-0 xl:-mt-1 xl:overflow-y-auto scrollbar-subtle xl:px-5 xl:pb-8"
          @scroll.passive="onListScroll"
        >
          <!-- 오류 — 검색 엔진 연결 실패(503) 등. 조건은 그대로 두고 다시 시도할 수 있게 한다 -->
          <AEmptyState v-if="listError" :icon="CircleAlert" title="목록을 불러오지 못했습니다" :description="listError">
            <button
              class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
              @click="retryList"
            >
              다시 시도
            </button>
          </AEmptyState>

          <ul
            v-else-if="results.length || listLoading"
            aria-label="멀티모달 검색 결과"
            :aria-busy="listLoading"
            class="m-0 p-0 xl:pt-1 list-none grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4"
          >
            <template v-if="!listLoading">
              <li
                v-for="(entity, i) in results"
                :key="entity.id"
                :style="{ animationDelay: `${Math.min(i, 8) * 50}ms` }"
                class="animate-rise-in motion-reduce:animate-none group relative flex flex-col gap-3 min-w-0 rounded-lg border border-border-default bg-bg-surface p-4 cursor-pointer transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-standard hover:border-border-strong hover:shadow-elevation-2 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-focus-ring"
              >
                <div class="flex items-start justify-between gap-3 min-w-0">
                  <div class="flex flex-col gap-1 min-w-0">
                    <!-- 제목 버튼의 클릭 영역을 카드 전체로 늘린다 — 카드 어디를 눌러도 상세가 열리고, 키보드로는 제목에 한 번만 멈춘다 -->
                    <h3
                      class="m-0 text-md font-semibold text-text-primary truncate transition-colors duration-[var(--duration-fast)] group-hover:text-action-primary"
                    >
                      <button
                        type="button"
                        class="bg-transparent border-none p-0 font-[inherit] text-[length:inherit] text-inherit cursor-pointer focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
                        @click="openEntityDetail(entity)"
                      >
                        {{ entity.name }}
                      </button>
                    </h3>
                    <p class="m-0 text-xs text-text-tertiary truncate">
                      {{ entity.type }}<template v-if="entity.areas.length"> · {{ entity.areas.join(' · ') }}</template>
                    </p>
                  </div>
                  <!-- '확인된 N건' — 완전성을 약속하지 않는 표현으로 쓴다(IDD IF-ENTITY-01) -->
                  <p class="m-0 shrink-0 pt-0.5 text-2xs text-text-tertiary whitespace-nowrap [font-feature-settings:'tnum']">
                    확인된 {{ entity.confirmedCount.toLocaleString() }}건
                  </p>
                </div>

                <p v-if="entity.description" class="m-0 text-sm text-text-secondary line-clamp-2">{{ entity.description }}</p>

                <!-- 갖춘 모달리티 — 목록 API 는 건수 없이 보유 여부만 준다. 없는 모달리티도 자리를 지켜 비교할 수 있게 한다 -->
                <div class="flex gap-1.5 flex-wrap border-t border-slate-100 pt-3" aria-label="갖춘 자료">
                  <span
                    v-for="m in MODALITY_ORDER"
                    :key="m"
                    class="inline-flex items-center gap-1 h-6 px-2 rounded-md text-2xs font-semibold"
                    :style="entity.modalities.includes(m) ? { background: MODALITY_STYLE[m].bg, color: MODALITY_STYLE[m].text } : null"
                    :class="entity.modalities.includes(m) ? '' : 'bg-slate-50 text-text-disabled'"
                  >
                    <component :is="MODALITY_STYLE[m].icon" :size="12" :stroke-width="1.8" aria-hidden="true" />
                    {{ m }}
                  </span>
                </div>

                <!-- 검색으로 들어온 개체만 — 서버가 무엇 때문에 맞았는지 알려준다 -->
                <p v-if="entity.matchReason" class="m-0 text-2xs text-text-tertiary truncate">일치: {{ entity.matchReason }}</p>
              </li>
            </template>
            <!-- 스켈레톤 카드 — 첫 조회·조건 변경 중엔 목록 자리를, 더 불러오는 중엔 목록 끝을 채운다 -->
            <li
              v-for="n in skeletonCardCount"
              :key="`sk-${n}`"
              aria-hidden="true"
              class="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4"
            >
              <span class="h-4 w-2/5 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
              <span class="h-3 w-3/5 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
              <span class="h-3.5 w-full rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
              <span class="h-6 w-4/5 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
            </li>
          </ul>

          <div v-else>
            <AEmptyState
              :icon="SearchX"
              title="조건에 해당하는 개체가 없습니다"
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

          <!-- 이어 받기 감시 지점 — 화면 가까이 오면 다음 쪽을 받는다 -->
          <div ref="loadMoreRef" class="flex items-center justify-center min-h-12 py-3 text-xs text-text-tertiary" aria-live="polite">
            <span v-if="loadingMore" class="sr-only">더 불러오는 중입니다</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <EntityDetailModal
    v-model:open="entityDetailOpen"
    :target="entityDetailTarget"
    :entity="entityDetail"
    :status="entityDetailStatus"
    :error-message="entityDetailError"
    :modality-style="MODALITY_STYLE"
    :downloading="downloading"
    @type-click="applyEntityType"
    @download="downloadEntity"
    @retry="retryEntityDetail"
  />

  <!-- 상세 모달(z-70) 위에 떠야 안내가 보인다 -->
  <div v-if="toastMessage" class="fixed bottom-6 right-6 z-[80]">
    <AToast :title="toastMessage" />
  </div>

  <!-- ⌘K 커맨드 팔레트 -->
  <CommandPalette
    v-model:open="paletteOpen"
    :items="paletteItems"
    group-label="필터를 고르거나 개체 이름을 입력하세요"
    placeholder="명령 또는 개체 검색…"
    @select="runPaletteItem"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  X,
  ListFilter,
  SearchX,
  CircleAlert,
  Film,
  Image as ImageIcon,
  FileText,
  AudioLines,
  PanelLeftClose,
  PanelLeftOpen
} from '@lucide/vue'

import AInput from '../../components/AInput.vue'
import AButton from '../../components/AButton.vue'
import AFilterChip from '../../components/AFilterChip.vue'
import AEmptyState from '../../components/AEmptyState.vue'
import ATooltip from '../../components/ATooltip.vue'
import AToast from '../../components/AToast.vue'

import { MODALITY_ORDER } from './multimodalSearch.api'
import { useMultimodalSearch } from './useMultimodalSearch'
import EntityDetailModal from './EntityDetailModal.vue'
import CommandPalette from '../../layout/CommandPalette.vue'
import AScrollTopButton from '../../components/AScrollTopButton.vue'
import { useHideOnScroll } from '../../composables/useHideOnScroll'

const {
  searchDraft,
  resultSearchDraft,
  resultSearchValue,
  entityType,
  areas,
  modalities,
  searchDirty,
  commitSearch,
  setSearch,
  commitResultSearch,
  setResultSearch,
  results,
  total,
  scopeTotal,
  listLoading,
  loadingMore,
  listError,
  loadMoreRows,
  retryList,
  searchTerms,
  resultKeywordPrefix,
  typeChips,
  toggleType,
  areaGroups,
  toggleArea,
  modalityChips,
  toggleModality,
  appliedConditions,
  clearAllConditions,
  entityDetailOpen,
  entityDetailTarget,
  entityDetail,
  entityDetailStatus,
  entityDetailError,
  openEntityDetail,
  retryEntityDetail,
  applyEntityType,
  downloadEntity,
  downloading,
  toastMessage,
  paletteOpen,
  paletteItems,
  closePalette,
  runPaletteItem
} = useMultimodalSearch()

/* 모달리티별 배지 색·아이콘 — 파일 검색 목록의 확장자 배지 색과 맞춘다 (이미지·문서·영상) */
const MODALITY_STYLE = {
  문서: { icon: FileText, bg: 'color-mix(in oklch, var(--color-viz-1) 12%, white)', text: 'var(--color-viz-1)' },
  이미지: { icon: ImageIcon, bg: 'color-mix(in oklch, var(--color-viz-2) 12%, white)', text: 'var(--color-viz-2)' },
  영상: { icon: Film, bg: 'color-mix(in oklch, var(--color-viz-4) 12%, white)', text: 'var(--color-viz-4)' },
  음성: { icon: AudioLines, bg: 'color-mix(in oklch, var(--color-viz-6) 12%, white)', text: 'var(--color-viz-6)' }
}

const skeletonCardCount = computed(() => (listLoading.value ? 6 : loadingMore.value ? 3 : 0))

/* ------------------------------------------------------------- 키보드 단축키 */

/* 개체 상세 모달이 떠 있으면 ⌘K를 무시한다 — 팔레트가 모달 아래 층이라 열려도 보이지 않는다.
   모달의 Escape는 모달이 스스로 처리한다 */
function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    if (entityDetailOpen.value) return
    e.preventDefault()
    paletteOpen.value = !paletteOpen.value
    return
  }
  if (e.key === 'Escape' && paletteOpen.value) closePalette()
}

/* 목록을 내리면 헤더(AppHeader)와 검색 영역을 차례로 감추고, 올리면 차례로 다시 보인다 */
const { visible: headerVisible, onScroll: onListScroll, show: showHeader } = useHideOnScroll()

/* xl 이상에서 필터를 아이콘만 남기고 접는다. 화면에 들어올 때마다 펼친 상태로 시작하도록 저장하지 않는다 */
const filterCollapsed = ref(false)
function toggleFilterPanel() {
  filterCollapsed.value = !filterCollapsed.value
}

/* 맨 위로 버튼이 지켜보고 올릴 목록 스크롤 영역 */
const listScrollRef = ref(null)

/* ------------------------------------------------------------ 무한 스크롤 */

const loadMoreRef = ref(null)
let loadObserver = null

/* 받은 쪽이 짧아 감시 지점이 계속 화면 안에 있으면 교차 상태가 바뀌지 않아 콜백이 다시 오지 않는다 —
   목록이 바뀔 때마다 다시 등록해 지금 상태로 한 번 더 판정받는다 */
watch(
  () => results.value.length,
  () => {
    if (!loadObserver || !loadMoreRef.value) return
    loadObserver.unobserve(loadMoreRef.value)
    loadObserver.observe(loadMoreRef.value)
  },
  { flush: 'post' }
)

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  if ('IntersectionObserver' in window) {
    loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRows()
      },
      { rootMargin: '240px 0px' }
    )
    if (loadMoreRef.value) loadObserver.observe(loadMoreRef.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  loadObserver?.disconnect()
  loadObserver = null
})
</script>
