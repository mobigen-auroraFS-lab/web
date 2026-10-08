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

        <div class="flex flex-col gap-3" role="group" aria-label="유형">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">유형</span>
            <button
              v-if="types.length"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="types = []"
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
              @click="types = toggleIn(types, chip.label)"
            />
          </div>
        </div>

        <!-- 분야 3갈래: 그룹끼리는 AND, 그룹 안에서는 OR. 장르만 유형에 따라 열린다 -->
        <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="분야">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">분야</span>
            <button
              v-if="hasFieldSelection"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="clearFields"
            >
              해제
            </button>
          </div>
          <div class="flex flex-col gap-5">
            <div v-for="group in fieldGroups" :key="group.key" class="flex flex-col gap-2" role="group" :aria-label="group.label">
              <span class="text-xs font-medium" :class="group.locked ? 'text-text-disabled' : 'text-text-tertiary'">{{ group.label }}</span>
              <AEmptyState v-if="group.locked" size="sm" :icon="Lock" description="유형을 선택하면 장르가 열립니다" />
              <div v-else class="flex gap-2 flex-wrap items-center">
                <AFilterChip
                  v-for="chip in group.chips"
                  :key="chip.label"
                  :label="chip.label"
                  :count="chip.count"
                  :active="chip.active"
                  :disabled="chip.disabled"
                  @click="toggleField(group.key, chip.label)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 반드시 포함할 자료 — 고른 모달리티를 모두 갖춘 작품만(AND). 결과를 쪼개는 조건이 아니라 보조 조건이라 아래쪽에 둔다 -->
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
              @click="modalities = toggleIn(modalities, chip.label)"
            />
          </div>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-100 pt-4" role="group" aria-label="등록일">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary">등록일</span>
            <button
              v-if="dateFrom || dateTo"
              class="bg-transparent border-none text-xs text-action-primary font-semibold cursor-pointer hover:text-action-primary-hover"
              @click="clearDateRange"
            >
              해제
            </button>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <AFilterChip
              v-for="preset in DATE_PRESETS"
              :key="preset.days"
              :label="preset.label"
              :active="isDatePresetActive(preset.days)"
              :disabled="datePresetCounts[preset.days] === 0 && !isDatePresetActive(preset.days)"
              @click="applyDatePreset(preset.days)"
            />
          </div>
          <APopover v-model="datePickerOpen" :panel-width="280" :panel-max-height="320">
            <template #trigger="{ toggle }">
              <button
                class="flex items-center gap-2 w-[200px] max-w-full h-control-md px-2.5 bg-bg-surface border border-border-default rounded-md cursor-pointer box-border hover:border-border-strong"
                :class="dateFrom || dateTo ? 'text-text-primary' : 'text-text-tertiary'"
                :aria-expanded="datePickerOpen"
                @click="toggle"
              >
                <CalendarIcon class="text-icon-default shrink-0" :size="14" :stroke-width="1.5" />
                <span class="truncate text-sm">{{ dateRangeLabel }}</span>
              </button>
            </template>
            <template #content>
              <ACalendar range v-model:start="dateFrom" v-model:end="dateTo" @update:end="onDateRangeEnd" />
            </template>
          </APopover>
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
                <p class="m-0 text-sm text-text-tertiary truncate">텍스트·이미지·영상을 함께 찾아 작품별로 묶어 보여줍니다.</p>
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
              {{ resultKeywordPrefix }}<span class="font-bold text-action-primary">{{ results.length.toLocaleString() }}</span
              ><span class="font-bold">편</span>
              <span v-if="appliedConditions.length > 0" class="text-sm text-text-tertiary font-normal ml-2"
                >(전체 {{ films.length.toLocaleString() }}편 중)</span
              >
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
          <ul
            v-if="results.length"
            aria-label="멀티모달 검색 결과"
            class="m-0 p-0 xl:pt-1 list-none grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4"
          >
            <li
              v-for="(film, i) in results"
              :key="film.id"
              :style="{ animationDelay: `${Math.min(i, 8) * 50}ms` }"
              class="animate-rise-in motion-reduce:animate-none group relative flex flex-col gap-3 min-w-0 rounded-lg border border-border-default bg-bg-surface p-4 cursor-pointer transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-standard hover:border-border-strong hover:shadow-elevation-2 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-focus-ring"
            >
              <!-- 제목 줄 오른쪽에 최근 자료 등록일을 둔다 — 작품끼리 최신성을 한눈에 비교하도록 -->
              <div class="flex items-start justify-between gap-3 min-w-0">
                <div class="flex flex-col gap-1 min-w-0">
                  <!-- 제목 버튼의 클릭 영역을 카드 전체로 늘린다 — 카드 어디를 눌러도 상세가 열리고, 키보드로는 제목에 한 번만 멈춘다 -->
                  <h3
                    class="m-0 text-md font-semibold text-text-primary truncate transition-colors duration-[var(--duration-fast)] group-hover:text-action-primary"
                  >
                    <button
                      type="button"
                      class="bg-transparent border-none p-0 font-[inherit] text-[length:inherit] text-inherit cursor-pointer focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
                      @click="openFilmDetail(film.id)"
                    >
                      {{ film.title }}
                    </button>
                  </h3>
                  <p class="m-0 text-xs text-text-tertiary truncate">
                    {{ film.type }} · {{ film.genre }} · {{ film.country }} · {{ film.decade }}
                  </p>
                </div>
                <p class="m-0 shrink-0 pt-0.5 text-2xs text-text-tertiary whitespace-nowrap [font-feature-settings:'tnum']">
                  등록일 {{ film.latestDate }}
                </p>
              </div>

              <!-- 이 작품에 연결된 모달리티별 자료 수 — 없는 모달리티도 자리를 지켜 작품끼리 비교할 수 있게 한다 -->
              <div class="flex gap-1.5 flex-wrap" aria-label="연결된 자료">
                <span
                  v-for="(n, m) in film.modalityCounts"
                  :key="m"
                  class="inline-flex items-center gap-1 h-6 px-2 rounded-md text-2xs font-semibold [font-feature-settings:'tnum']"
                  :style="n ? { background: MODALITY_STYLE[m].bg, color: MODALITY_STYLE[m].text } : null"
                  :class="n ? '' : 'bg-slate-50 text-text-disabled'"
                >
                  <component :is="MODALITY_STYLE[m].icon" :size="12" :stroke-width="1.8" aria-hidden="true" />
                  {{ m }} {{ n }}
                </span>
              </div>

              <div class="flex flex-col gap-1.5 border-t border-slate-100 pt-3 min-w-0">
                <!-- 제목 옆 건수: 검색 근거면 맞은 자료 수, 아니면 조건(기간·모달리티) 안의 연결 자료 수 -->
                <p class="m-0 text-2xs font-semibold text-text-tertiary [font-feature-settings:'tnum']">
                  <template v-if="film.isMatchedEvidence">
                    검색 근거 <span class="text-text-primary">{{ film.evidence.length }}건</span>
                    <span v-if="film.evidenceModalityCount > 1" class="text-action-primary"
                      >&nbsp;· {{ film.evidenceModalityCount }}개 모달리티 교차</span
                    >
                    <span v-if="film.metaMatches.length"> · 작품 정보({{ film.metaMatches.join(', ') }})</span>
                  </template>
                  <template v-else-if="film.metaMatches.length"
                    >작품 정보({{ film.metaMatches.join(', ') }})에서 일치 · 연결 자료
                    <span class="text-text-primary">{{ film.scopedCount }}건</span></template
                  >
                  <template v-else
                    >{{ hasDateRange ? '등록일 범위 안의 연결 자료' : '연결 자료' }}
                    <span class="text-text-primary">{{ film.scopedCount }}건</span></template
                  >
                </p>
                <ul class="m-0 p-0 list-none flex flex-col gap-1">
                  <li v-for="a in film.evidence.slice(0, 4)" :key="a.id" class="flex items-center gap-2 min-w-0 text-xs">
                    <component
                      :is="MODALITY_STYLE[a.modality].icon"
                      :size="13"
                      :stroke-width="1.8"
                      class="shrink-0"
                      :style="{ color: MODALITY_STYLE[a.modality].text }"
                      :aria-label="a.modality"
                    />
                    <span class="shrink-0 font-medium text-text-primary">{{ a.label }}</span>
                    <span class="shrink-0 text-text-tertiary [font-feature-settings:'tnum']">{{ a.locator }}</span>
                    <!-- 근거 유형 + 관련도 점(진할수록 높음). 색 없이 흰 바탕 테두리 배지 -->
                    <span
                      v-if="film.isMatchedEvidence"
                      class="shrink-0 inline-flex items-center gap-1 h-[18px] px-1.5 rounded-sm border border-border-default bg-bg-surface text-2xs font-medium text-text-secondary"
                      :title="`관련도 ${a.score.toFixed(2)}`"
                      ><span class="w-1.5 h-1.5 rounded-full" :style="{ background: GRADE_COLOR[a.grade] }" aria-hidden="true"></span
                      >{{ a.basis }}<span class="sr-only"> · 관련도 {{ a.grade }}</span></span
                    >
                    <span class="min-w-0 truncate text-text-secondary">{{ a.text }}</span>
                  </li>
                </ul>
                <p v-if="film.evidence.length > 4" class="m-0 text-2xs text-text-tertiary">외 {{ film.evidence.length - 4 }}건</p>
              </div>
            </li>
          </ul>

          <div v-else>
            <AEmptyState
              :icon="SearchX"
              title="조건에 해당하는 작품이 없습니다"
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
        </div>
      </div>
    </div>
  </div>

  <FilmDetailModal
    v-model:open="filmDetailOpen"
    :film="filmDetail"
    :modality-style="MODALITY_STYLE"
    :grade-color="GRADE_COLOR"
    :basis-icon="BASIS_ICON"
    @classification-click="applyFilmClassification"
    @film-click="openFilmDetail"
    @download="downloadFilmBundle"
  />

  <!-- 상세 모달(z-70) 위에 떠야 다운로드 안내가 보인다 -->
  <div v-if="toastMessage" class="fixed bottom-6 right-6 z-[80]">
    <AToast :title="toastMessage" />
  </div>

  <!-- ⌘K 커맨드 팔레트 -->
  <CommandPalette
    v-model:open="paletteOpen"
    :items="paletteItems"
    group-label="필터를 고르거나 작품명을 입력하세요"
    placeholder="명령 또는 작품 검색…"
    @select="runPaletteItem"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  Calendar as CalendarIcon,
  X,
  ListFilter,
  Lock,
  SearchX,
  Film,
  Image as ImageIcon,
  FileText,
  AudioLines,
  Captions,
  ScanText,
  Mic,
  ScanEye,
  Sparkles,
  Link2,
  Type,
  ScanSearch,
  PanelLeftClose,
  PanelLeftOpen
} from '@lucide/vue'

import AInput from '../../components/AInput.vue'
import AButton from '../../components/AButton.vue'
import ACalendar from '../../components/ACalendar.vue'
import AFilterChip from '../../components/AFilterChip.vue'
import AEmptyState from '../../components/AEmptyState.vue'
import APopover from '../../components/APopover.vue'
import ATooltip from '../../components/ATooltip.vue'
import AToast from '../../components/AToast.vue'

import { DATE_PRESETS } from './multimodalSearch.mock'
import { useMultimodalSearch } from './useMultimodalSearch'
import FilmDetailModal from './FilmDetailModal.vue'
import CommandPalette from '../../layout/CommandPalette.vue'
import AScrollTopButton from '../../components/AScrollTopButton.vue'
import { useHideOnScroll } from '../../composables/useHideOnScroll'

const {
  films,
  searchDraft,
  resultSearchDraft,
  modalities,
  types,
  dateFrom,
  dateTo,
  searchDirty,
  commitSearch,
  setSearch,
  commitResultSearch,
  setResultSearch,
  results,
  hasDateRange,
  searchTerms,
  resultKeywordPrefix,
  typeChips,
  modalityChips,
  fieldGroups,
  toggleField,
  hasFieldSelection,
  clearFields,
  dateRangeLabel,
  datePresetCounts,
  appliedConditions,
  clearAllConditions,
  clearDateRange,
  applyDatePreset,
  isDatePresetActive,
  filmDetailOpen,
  filmDetail,
  openFilmDetail,
  applyFilmClassification,
  toastMessage,
  downloadFilmBundle,
  paletteOpen,
  paletteItems,
  closePalette,
  runPaletteItem,
  toggleIn
} = useMultimodalSearch()

/* 모달리티별 배지 색·아이콘 — 파일 검색 목록의 확장자 배지 색과 맞춘다 (이미지·문서·영상) */
const MODALITY_STYLE = {
  문서: { icon: FileText, bg: 'color-mix(in oklch, var(--color-viz-1) 12%, white)', text: 'var(--color-viz-1)' },
  이미지: { icon: ImageIcon, bg: 'color-mix(in oklch, var(--color-viz-2) 12%, white)', text: 'var(--color-viz-2)' },
  영상: { icon: Film, bg: 'color-mix(in oklch, var(--color-viz-4) 12%, white)', text: 'var(--color-viz-4)' },
  음성: { icon: AudioLines, bg: 'color-mix(in oklch, var(--color-viz-6) 12%, white)', text: 'var(--color-viz-6)' }
}

/* ------------------------------------------------------------- 키보드 단축키 */

/* 작품 상세 모달이 떠 있으면 ⌘K를 무시한다 — 팔레트가 모달 아래 층이라 열려도 보이지 않는다.
   모달의 Escape는 모달이 스스로 처리한다 */
function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    if (filmDetailOpen.value) return
    e.preventDefault()
    paletteOpen.value = !paletteOpen.value
    return
  }
  if (e.key === 'Escape' && paletteOpen.value) closePalette()
}

/* 근거 유형별 아이콘 — 색 대신 모양으로 유형을 구분한다. 위 여섯은 검색 근거, 아래 셋은 작품 연결 근거 */
const BASIS_ICON = {
  본문: FileText,
  자막: Captions,
  OCR: ScanText,
  음성인식: Mic,
  '이미지 캡션': ScanEye,
  '장면 유사': Sparkles,
  '메타데이터 연결': Link2,
  '제목 자동 연결': Type,
  '장면 자동 연결': ScanSearch
}

/* 관련도 등급별 점 색 — 높음일수록 진한 브랜드색 */
const GRADE_COLOR = {
  높음: 'var(--color-action-primary)',
  중간: 'var(--color-primary-300)',
  낮음: 'var(--color-slate-300)'
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

/* 위치 계산·바깥 클릭·Escape는 APopover가 처리한다 — 범위가 완성될 때만 여기서 닫는다 */
/* 목록을 내리면 헤더(AppHeader)와 검색 영역을 차례로 감추고, 올리면 차례로 다시 보인다 */
const { visible: headerVisible, onScroll: onListScroll, show: showHeader } = useHideOnScroll()

/* xl 이상에서 필터를 아이콘만 남기고 접는다. 화면에 들어올 때마다 펼친 상태로 시작하도록 저장하지 않는다 */
const filterCollapsed = ref(false)
function toggleFilterPanel() {
  filterCollapsed.value = !filterCollapsed.value
}

/* 맨 위로 버튼이 지켜보고 올릴 목록 스크롤 영역 */
const listScrollRef = ref(null)

const datePickerOpen = ref(false)
function onDateRangeEnd(date) {
  if (date) datePickerOpen.value = false
}
</script>
