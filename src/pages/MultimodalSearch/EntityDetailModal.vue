<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && target"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-bg-overlay-scrim p-0 sm:p-6"
        @click.self="requestClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="relative w-screen h-[100dvh] sm:h-auto sm:w-[90vw] sm:max-w-[1200px] sm:max-h-[90vh] sm:rounded-lg bg-bg-surface border-0 sm:border sm:border-border-default shadow-elevation-3 flex flex-col overflow-hidden font-sans"
          @keydown.esc="requestClose"
          @keydown.tab="onTabKey"
        >
          <!-- 헤더: 파일 상세 모달과 같은 구성. 응답을 기다리는 동안에도 목록에서 고른 이름·종류는 먼저 보여준다 -->
          <header class="flex items-center gap-4 px-4 sm:px-6 py-5 border-b border-border-default shrink-0">
            <div class="flex-1 min-w-0 flex flex-col gap-1.5">
              <nav aria-label="분류 경로" class="flex items-center gap-1 text-sm">
                <button
                  type="button"
                  class="bg-transparent border-none p-0 text-text-tertiary font-medium cursor-pointer hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                  @click="$emit('type-click')"
                >
                  {{ target.type }}
                </button>
              </nav>
              <h2 :id="titleId" class="m-0 text-2xl font-bold text-text-primary truncate">{{ target.name }}</h2>
              <p v-if="entity" class="m-0 text-sm text-text-tertiary [font-feature-settings:'tnum']">
                확인된 {{ entity.confirmedCount.toLocaleString() }}건
              </p>
            </div>

            <!-- 연결 자료 묶음 다운로드 — 전체 / 보고 있는 모달리티 탭 기준.
                 개체 묶음 창구가 협의 전이라 메뉴는 "미결"로 비활성만 해 둔다 -->
            <div v-if="entity" ref="downloadMenuRef" class="relative shrink-0">
              <button
                type="button"
                class="h-9 inline-flex items-center gap-1.5 px-3 rounded-md bg-action-primary border-none text-sm font-medium text-text-inverse cursor-pointer hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                :aria-expanded="downloadMenuOpen"
                @click="downloadMenuOpen = !downloadMenuOpen"
              >
                <Download :size="14" :stroke-width="1.8" />
                묶음 다운로드
                <ChevronDown :size="14" :stroke-width="1.8" />
              </button>
              <div
                v-if="downloadMenuOpen"
                class="absolute top-[calc(100%+6px)] right-0 w-64 rounded-lg border border-border-default bg-bg-surface shadow-elevation-2 overflow-hidden z-10 py-1"
              >
                <button
                  v-for="opt in downloadOptions"
                  :key="opt.key"
                  type="button"
                  :disabled="downloading || opt.count === 0"
                  class="w-full text-left px-3 py-2.5 text-sm text-text-primary bg-transparent border-none cursor-pointer hover:bg-bg-surface-hover disabled:text-text-disabled disabled:cursor-not-allowed"
                  @click="selectDownload(opt)"
                >
                  {{ opt.label }} <span class="text-text-tertiary [font-feature-settings:'tnum']">(zip · {{ opt.count }}건)</span>
                </button>
              </div>
            </div>

            <button
              ref="closeBtnRef"
              type="button"
              aria-label="개체 상세 정보 닫기"
              class="shrink-0 w-9 h-9 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              @click="requestClose"
            >
              <X :size="18" :stroke-width="1.5" />
            </button>
          </header>

          <!-- 본문: 여기만 스크롤된다 -->
          <div class="flex-1 overflow-y-auto scrollbar-subtle px-6 sm:px-8 py-8 flex flex-col gap-10">
            <!-- 불러오는 중 -->
            <div v-if="status === 'loading'" class="flex flex-col gap-10">
              <span class="sr-only" role="status">개체 정보를 불러오는 중입니다</span>
              <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12" aria-hidden="true">
                <div class="flex flex-col gap-3">
                  <span class="h-3 w-16 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
                  <span class="h-4 w-full rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
                  <span class="h-4 w-3/5 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
                </div>
                <span class="h-[120px] rounded-lg animate-pulse motion-reduce:animate-none bg-slate-100"></span>
              </div>
              <div class="flex flex-col gap-2" aria-hidden="true">
                <span v-for="n in 5" :key="n" class="h-12 rounded animate-pulse motion-reduce:animate-none bg-slate-100"></span>
              </div>
            </div>

            <!-- 오류 -->
            <div v-else-if="status === 'error' || !entity" class="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <CircleAlert class="text-status-danger-text" :size="28" :stroke-width="1.5" />
              <p class="m-0 text-sm font-medium text-text-primary">{{ errorMessage || '개체 정보를 불러오지 못했습니다.' }}</p>
              <button
                type="button"
                class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
                @click="$emit('retry')"
              >
                다시 시도
              </button>
            </div>

            <template v-else>
              <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12">
                <!-- 좌측: 대표 설명 · 자료 성격 -->
                <div class="flex flex-col gap-8 min-w-0">
                  <section class="flex flex-col gap-2 min-w-0">
                    <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">대표 설명</h3>
                    <p class="m-0 text-base text-text-primary leading-relaxed">{{ entity.description || '설명이 없습니다.' }}</p>
                  </section>
                  <section v-if="entity.formCounts.length" class="flex flex-col gap-2 min-w-0">
                    <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">자료 성격</h3>
                    <ul class="m-0 p-0 list-none flex flex-wrap gap-1.5">
                      <li
                        v-for="f in entity.formCounts"
                        :key="f.name"
                        class="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-border-default text-xs font-medium text-text-secondary [font-feature-settings:'tnum']"
                      >
                        {{ f.name }} <span class="text-text-tertiary">{{ f.count }}</span>
                      </li>
                    </ul>
                  </section>
                </div>

                <!-- 우측: 모달리티 구성 -->
                <div class="flex flex-col gap-2 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">모달리티 구성</h3>
                  <!-- 2×2 배열 — 없는 모달리티도 자리를 지켜 빈 곳이 드러나게 하고, 마지막 줄 두 칸은 아래 선을 뺀다 -->
                  <div class="rounded-lg border border-border-default overflow-hidden">
                    <ul class="m-0 px-4 py-1 list-none min-w-0 grid grid-cols-2 gap-x-6">
                      <li
                        v-for="(n, m) in entity.modalityCounts"
                        :key="m"
                        class="flex items-center gap-2.5 min-w-0 py-2.5 border-b border-slate-100 [&:nth-last-child(-n+2)]:border-b-0"
                      >
                        <span
                          class="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                          :class="n ? '' : 'bg-slate-50 text-text-disabled'"
                          :style="n ? { background: modalityStyle[m].bg, color: modalityStyle[m].text } : null"
                        >
                          <component :is="modalityStyle[m].icon" :size="14" :stroke-width="1.8" aria-hidden="true" />
                        </span>
                        <span class="w-10 shrink-0 text-sm font-medium" :class="n ? 'text-text-primary' : 'text-text-disabled'">{{
                          m
                        }}</span>
                        <span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                          <span
                            class="block h-full rounded-full"
                            :style="{ width: `${(n / maxModalityCount) * 100}%`, background: modalityStyle[m].text }"
                          ></span>
                        </span>
                        <span
                          class="w-10 shrink-0 text-right text-xs [font-feature-settings:'tnum']"
                          :class="n ? 'font-semibold text-text-primary' : 'text-text-disabled'"
                          >{{ n ? `${n}건` : '없음' }}</span
                        >
                      </li>
                    </ul>
                    <p
                      class="m-0 px-4 py-2.5 border-t border-slate-100 bg-bg-canvas text-xs text-text-tertiary [font-feature-settings:'tnum']"
                    >
                      연결 자료 <span class="font-semibold text-text-primary">{{ entity.total.toLocaleString() }}건</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- 연결 자료 — 모달리티 탭으로 나눠 본다. 탭과 목록은 간격 없이 붙여 목록이 탭에 딸린 내용으로 읽히게 한다 -->
              <section class="flex flex-col gap-2 min-w-0">
                <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">연결 자료</h3>
                <div class="min-w-0">
                  <ALineTabs :key="entity.id" v-model="activeTab" :tabs="tabs" />
                  <ul class="m-0 p-0 list-none">
                    <li
                      v-for="a in visibleAssets"
                      :key="a.id"
                      class="-mx-3 border-b border-slate-100"
                    >
                      <!-- 행 전체가 파일 상세를 여는 버튼이다 — 키보드로는 행마다 한 번 멈춘다 -->
                      <button
                        type="button"
                        class="group flex w-full items-center gap-3 min-w-0 px-3 py-3 text-left bg-transparent border-none cursor-pointer transition-colors duration-[var(--duration-fast)] ease-standard hover:bg-[var(--table-row-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        :aria-label="`${a.name} 상세 보기`"
                        @click="$emit('asset-click', { id: a.id, name: a.name })"
                      >
                        <span
                          class="shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
                          :style="{ background: modalityStyle[a.modality].bg, color: modalityStyle[a.modality].text }"
                        >
                          <component :is="modalityStyle[a.modality].icon" :size="15" :stroke-width="1.8" :aria-label="a.modality" />
                        </span>
                        <div class="flex-1 min-w-0 flex flex-col gap-1">
                          <p class="m-0 text-sm font-medium text-text-primary truncate group-hover:text-action-primary">{{ a.name }}</p>
                          <div v-if="a.forms.length" class="flex flex-wrap gap-1">
                            <span
                              v-for="f in a.forms"
                              :key="f"
                              class="inline-flex items-center h-5 px-1.5 rounded-sm border border-border-default bg-bg-surface text-2xs font-medium text-text-secondary"
                              >{{ f }}</span
                            >
                          </div>
                        </div>
                        <!-- 소속 상태 — 확인 전은 자동 연결이라 틀릴 수 있음을 알린다 -->
                        <span
                          class="shrink-0 inline-flex items-center h-5 px-1.5 rounded-sm text-2xs font-semibold"
                          :class="a.status === '확인됨' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-text-tertiary'"
                          >{{ a.status }}</span
                        >
                      </button>
                    </li>
                  </ul>
                </div>
              </section>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * 개체 상세 모달 — 멀티모달 검색 카드에서 개체를 열어 연결 자료 전체를 확인한다(IDD IF-ENTITY-05).
 * 겉모습은 파일 검색의 FileDetailModal과 맞췄지만, 파일 한 건이 아니라 개체(자료 묶음) 단위라서
 * 파일 전용 항목(용량·추출 텍스트) 대신 대표 설명·자료 성격·연결 자료 묶음 다운로드를 둔다.
 */
import { ref, computed, watch, nextTick, useId, onMounted, onBeforeUnmount } from 'vue'
import { X, ChevronDown, Download, CircleAlert } from '@lucide/vue'
import ALineTabs from '../../components/ALineTabs.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /* 목록에서 고른 카드 — 응답 전에 헤더(이름·종류)를 그리는 데 쓴다 */
  target: { type: Object, default: null },
  /* useMultimodalSearch 의 entityDetail */
  entity: { type: Object, default: null },
  /* 'loading' | 'ready' | 'error' */
  status: { type: String, default: 'ready' },
  errorMessage: { type: String, default: '' },
  /* 모달리티별 { icon, bg, text } — 목록 카드와 같은 색을 쓰도록 화면에서 넘겨받는다 */
  modalityStyle: { type: Object, required: true },
  /* 묶음을 받는 중이면 메뉴를 막는다 */
  downloading: { type: Boolean, default: false }
})
const emit = defineEmits(['update:open', 'type-click', 'download', 'asset-click', 'retry'])

const titleId = useId()
const dialogRef = ref(null)
const closeBtnRef = ref(null)

function requestClose() {
  emit('update:open', false)
}

/* ------------------------------------------------------- 포커스·스크롤 관리 */

let previouslyFocused = null
let prevBodyOverflow = ''
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement
      /* 모달이 겹쳐 열릴 수 있어(개체 상세 위의 파일 상세) 닫을 때는 열기 전 값으로 되돌린다 */
      prevBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeBtnRef.value?.focus()
    } else {
      document.body.style.overflow = prevBodyOverflow
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  }
)
onBeforeUnmount(() => {
  if (props.open) document.body.style.overflow = ''
})

function onTabKey(e) {
  const focusables = [...(dialogRef.value?.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

/* ------------------------------------------------------------ 연결 자료 탭 */

const ALL = '전체'
const tabs = computed(() => [
  { label: ALL, count: props.entity?.assets.length ?? 0 },
  ...Object.entries(props.entity?.modalityCounts ?? {}).map(([m, n]) => ({ label: m, count: n, disabled: n === 0 }))
])
/* 탭 라벨이 곧 모달리티 이름(또는 전체)이다 */
const activeTab = ref(ALL)
watch(
  () => props.entity?.id,
  () => {
    activeTab.value = ALL
  }
)
const visibleAssets = computed(() => {
  const assets = props.entity?.assets ?? []
  return activeTab.value === ALL ? assets : assets.filter((a) => a.modality === activeTab.value)
})

const maxModalityCount = computed(() => Math.max(1, ...Object.values(props.entity?.modalityCounts ?? {})))

/* ------------------------------------------------------------ 묶음 다운로드 */

const downloadMenuOpen = ref(false)
const downloadMenuRef = ref(null)
function onClickOutsideDownloadMenu(e) {
  if (downloadMenuRef.value && !downloadMenuRef.value.contains(e.target)) downloadMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', onClickOutsideDownloadMenu))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutsideDownloadMenu))
watch(
  () => props.target?.id,
  () => {
    downloadMenuOpen.value = false
  }
)

function selectDownload(opt) {
  downloadMenuOpen.value = false
  emit('download', { key: opt.key, assetIds: opt.key === 'all' ? [] : visibleAssets.value.map((a) => a.id) })
}

/* 모달리티 묶음은 해당 탭을 보고 있을 때만 보여준다 */
const downloadOptions = computed(() => [
  { key: 'all', label: '연결 자료 전체', count: props.entity?.assets.length ?? 0 },
  ...(activeTab.value !== ALL ? [{ key: 'modality', label: `${activeTab.value} 자료만`, count: visibleAssets.value.length }] : [])
])
</script>
