<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && film"
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
          <!-- 헤더: 파일 상세 모달과 같은 구성 — 분류 경로·제목·핵심 메타를 스크롤 내내 유지한다 -->
          <header class="flex items-center gap-4 px-4 sm:px-6 py-5 border-b border-border-default shrink-0">
            <div class="flex-1 min-w-0 flex flex-col gap-1.5">
              <nav aria-label="분류 경로" class="flex items-center gap-1 text-sm">
                <button
                  type="button"
                  class="bg-transparent border-none p-0 text-text-tertiary font-medium cursor-pointer hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                  @click="$emit('classification-click', 'type')"
                >
                  {{ film.type }}
                </button>
                <ChevronRight :size="13" :stroke-width="2" class="text-text-tertiary shrink-0" />
                <button
                  type="button"
                  class="bg-transparent border-none p-0 text-text-tertiary font-medium cursor-pointer hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                  @click="$emit('classification-click', 'genre')"
                >
                  {{ film.genre }}
                </button>
              </nav>
              <h2 :id="titleId" class="m-0 text-2xl font-bold text-text-primary truncate">{{ film.title }}</h2>
              <div class="flex items-center gap-4 flex-wrap text-sm text-text-tertiary">
                <span class="inline-flex items-center gap-1.5"><Globe :size="14" :stroke-width="1.5" />{{ film.country }}</span>
                <span class="inline-flex items-center gap-1.5"><Clock :size="14" :stroke-width="1.5" />{{ film.decade }}</span>
              </div>
            </div>

            <!-- 연결 자료 묶음 다운로드 — 전체 / 검색 근거분 / 보고 있는 모달리티 탭 기준 -->
            <div ref="downloadMenuRef" class="relative shrink-0">
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
                  class="w-full text-left px-3 py-2.5 text-sm text-text-primary bg-transparent border-none cursor-pointer hover:bg-bg-surface-hover"
                  @click="selectDownload(opt)"
                >
                  {{ opt.label }} <span class="text-text-tertiary [font-feature-settings:'tnum']">(zip · {{ opt.count }}건)</span>
                </button>
              </div>
            </div>

            <button
              ref="closeBtnRef"
              type="button"
              aria-label="작품 상세 정보 닫기"
              class="shrink-0 w-9 h-9 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              @click="requestClose"
            >
              <X :size="18" :stroke-width="1.5" />
            </button>
          </header>

          <!-- 본문: 여기만 스크롤된다 -->
          <div class="flex-1 overflow-y-auto scrollbar-subtle px-6 sm:px-8 py-8 flex flex-col gap-10">
            <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12">
              <!-- 좌측: 대표 설명 -->
              <section class="flex flex-col gap-2 min-w-0">
                <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">대표 설명</h3>
                <p class="m-0 text-base text-text-primary leading-relaxed">{{ film.summary }}</p>
              </section>

              <!-- 우측: 헤더와 겹치는 작품 정보 표 대신, 모달리티 구성을 둔다 -->
              <div class="flex flex-col gap-2 min-w-0">
                <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">모달리티 구성</h3>
                <!-- 라운드 테두리 박스로 묶는다. 안은 2×2 배열 — 없는 모달리티도 자리를 지켜 빈 곳이 드러나게 하고,
                     마지막 줄 두 칸은 아래 선을 뺀다. 합계 줄은 박스 하단에 붙인다 -->
                <div class="rounded-lg border border-border-default overflow-hidden">
                  <ul class="m-0 px-4 py-1 list-none min-w-0 grid grid-cols-2 gap-x-6">
                    <li
                      v-for="(n, m) in film.modalityCounts"
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
                      <span class="w-10 shrink-0 text-sm font-medium" :class="n ? 'text-text-primary' : 'text-text-disabled'">{{ m }}</span>
                      <span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                        <span
                          class="block h-full rounded-full"
                          :style="{ width: `${(n / maxModalityCount) * 100}%`, background: modalityStyle[m].text }"
                        ></span>
                      </span>
                      <span
                        class="w-8 shrink-0 text-right text-xs [font-feature-settings:'tnum']"
                        :class="n ? 'font-semibold text-text-primary' : 'text-text-disabled'"
                        >{{ n ? `${n}건` : '없음' }}</span
                      >
                    </li>
                  </ul>
                  <p
                    class="m-0 px-4 py-2.5 border-t border-slate-100 bg-bg-canvas text-xs text-text-tertiary [font-feature-settings:'tnum']"
                  >
                    연결 자료 <span class="font-semibold text-text-primary">{{ film.assets.length }}건</span> · 최근 자료 등록
                    {{ film.latestDate }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 연결 자료 전체 — 폭 전체를 쓴다. 모달리티 탭으로 나눠 보고, 현재 검색에서 근거가 된 자료를 위에 표시한다 -->
            <section ref="assetsSectionRef" class="flex flex-col gap-2 min-w-0 scroll-mt-4">
              <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">
                연결 자료
                <span v-if="film.matchedCount" class="text-action-primary">· 검색 근거 {{ film.matchedCount }}건</span>
              </h3>
              <!-- 검색어별로 근거가 걸친 모달리티 — 검색 중일 때만. 연한 박스로 묶어 탭과 구분하고, 색은 아이콘에만 쓴다.
                   칩을 누르면 그 모달리티 탭으로 바뀐다 -->
              <div
                v-if="film.cross.length"
                class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-bg-canvas border border-slate-100 px-4 py-3"
              >
                <span class="text-xs font-semibold text-text-tertiary">검색어별 근거</span>
                <div v-for="row in film.cross" :key="row.term" class="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span class="mr-0.5 text-sm font-semibold text-text-primary">{{ row.term }}</span>
                  <button
                    v-for="m in row.modalities"
                    :key="m.name"
                    type="button"
                    class="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-bg-surface border border-border-default text-xs font-medium text-text-secondary cursor-pointer [font-feature-settings:'tnum'] hover:border-border-strong hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    :aria-label="`${row.term} 근거가 있는 ${m.name} 자료 ${m.count}건 보기`"
                    @click="showModality(m.name)"
                  >
                    <component
                      :is="modalityStyle[m.name].icon"
                      :size="13"
                      :stroke-width="1.8"
                      :style="{ color: modalityStyle[m.name].text }"
                      aria-hidden="true"
                    />{{ m.name }} {{ m.count }}
                  </button>
                  <span v-if="!row.modalities.length" class="text-xs text-text-tertiary">자료에 없음</span>
                  <span v-if="row.metaHit.length" class="text-xs text-text-tertiary">+ 작품 정보({{ row.metaHit.join(', ') }})</span>
                </div>
              </div>
              <!-- 탭과 목록은 간격 없이 붙인다 — 목록이 탭에 딸린 내용으로 읽히도록. 마지막 행도 밑줄을 둬 목록 끝을 닫는다 -->
              <div class="min-w-0">
                <ALineTabs :key="`${film.id}-${tabsKey}`" v-model="activeTab" :tabs="tabs" />
                <ul class="m-0 p-0 list-none">
                  <li
                    v-for="a in visibleAssets"
                    :key="a.id"
                    class="flex items-center gap-3 min-w-0 -mx-3 px-3 py-3 border-b border-slate-100 transition-colors duration-[var(--duration-fast)] ease-standard hover:bg-[var(--table-row-hover-bg)]"
                  >
                    <span
                      class="shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
                      :style="{ background: modalityStyle[a.modality].bg, color: modalityStyle[a.modality].text }"
                    >
                      <component :is="modalityStyle[a.modality].icon" :size="15" :stroke-width="1.8" :aria-label="a.modality" />
                    </span>
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div class="flex items-center gap-2 min-w-0 text-sm">
                        <span class="shrink-0 font-semibold text-text-primary">{{ a.label }}</span>
                        <!-- 근거 유형 — 검색 근거면 어떻게 찾았는지(OCR·자막…), 아니면 작품에 어떻게 묶였는지(메타데이터·자동 연결).
                             색 없이 흰 바탕 테두리 + 유형 아이콘으로 구분한다 -->
                        <span
                          class="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border border-border-default bg-bg-surface text-2xs font-medium text-text-secondary"
                          ><component
                            :is="basisIcon[a.basis]"
                            :size="11"
                            :stroke-width="2"
                            class="text-icon-default"
                            aria-hidden="true"
                          />{{ a.basis }}</span
                        >
                      </div>
                      <p class="m-0 text-sm text-text-secondary truncate">{{ a.text }}</p>
                    </div>
                    <!-- 관련도 · 등록일 — 오른쪽 묶음. 관련도는 검색 근거면 검색어 기준, 아니면 작품과의 연결 기준이다 -->
                    <div class="shrink-0 flex items-center gap-4 sm:gap-10">
                      <span
                        class="inline-flex items-center gap-1.5 h-5 px-1.5 rounded-sm text-2xs font-semibold"
                        :class="GRADE_BADGE[a.grade]"
                        :title="`${a.scoreKind === 'search' ? '검색어 관련도' : '작품 연결 관련도'} ${a.score.toFixed(2)}`"
                        ><span
                          class="w-1.5 h-1.5 rounded-full shrink-0"
                          :style="{ background: gradeColor[a.grade] }"
                          aria-hidden="true"
                        ></span
                        >관련도 {{ a.grade }}</span
                      >
                      <span class="text-xs text-text-tertiary whitespace-nowrap [font-feature-settings:'tnum']">{{ a.date }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            <!-- 같은 장르 작품 — 누르면 이 모달 안에서 그 작품으로 바뀐다 -->
            <section class="flex flex-col gap-2">
              <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">같은 장르 작품 ({{ film.sameGenre.length }})</h3>
              <div
                v-if="film.sameGenre.length === 0"
                class="flex flex-col items-center gap-2 py-12 rounded-lg border border-dashed border-border-default"
              >
                <Inbox class="text-icon-muted" :size="22" :stroke-width="1.25" />
                <p class="m-0 text-sm text-text-tertiary">같은 장르의 다른 작품이 없습니다.</p>
              </div>
              <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                <button
                  v-for="f in film.sameGenre"
                  :key="f.id"
                  type="button"
                  class="group relative flex flex-col items-start gap-1.5 min-w-0 text-left p-3 rounded-lg border border-border-default bg-bg-surface cursor-pointer hover:bg-bg-surface-hover-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  @click="$emit('film-click', f.id)"
                >
                  <ArrowUpRight
                    class="absolute top-3 right-3 text-icon-muted opacity-0 transition-opacity duration-[var(--duration-fast)] ease-standard group-hover:opacity-100 group-focus-visible:opacity-100"
                    :size="14"
                    :stroke-width="1.8"
                    aria-hidden="true"
                  />
                  <span class="w-full pr-5 text-sm font-semibold text-text-primary truncate">{{ f.title }}</span>
                  <span class="w-full text-xs text-text-tertiary truncate">{{ f.type }} · {{ f.country }} · {{ f.decade }}</span>
                  <span class="text-2xs text-text-tertiary [font-feature-settings:'tnum']">연결 자료 {{ f.assetCount }}건</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * 작품 상세 모달 — 멀티모달 검색 카드에서 작품을 열어 연결 자료 전체와 작품 정보를 확인한다.
 * 겉모습은 파일 검색의 FileDetailModal과 맞췄지만, 파일 한 건이 아니라 작품(자료 묶음) 단위라서
 * 파일 전용 항목(용량·추출 텍스트) 대신 대표 설명과 연결 자료 묶음 다운로드를 둔다.
 */
import { ref, computed, watch, nextTick, useId, onMounted, onBeforeUnmount } from 'vue'
import { X, ChevronRight, ChevronDown, Download, Globe, Clock, ArrowUpRight, Inbox } from '@lucide/vue'
import ALineTabs from '../../components/ALineTabs.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /* useMultimodalSearch 의 filmDetail */
  film: { type: Object, default: null },
  /* 모달리티별 { icon, bg, text } — 목록 카드와 같은 색을 쓰도록 화면에서 넘겨받는다 */
  modalityStyle: { type: Object, required: true },
  /* 관련도 등급(높음·중간·낮음)별 점 색 — 목록 카드와 맞추도록 화면에서 넘겨받는다 */
  gradeColor: { type: Object, required: true },
  /* 근거 유형별 아이콘 — 목록 카드와 맞추도록 화면에서 넘겨받는다 */
  basisIcon: { type: Object, required: true }
})
const emit = defineEmits(['update:open', 'classification-click', 'film-click', 'download'])

const titleId = useId()
const dialogRef = ref(null)
const closeBtnRef = ref(null)

function requestClose() {
  emit('update:open', false)
}

/* ------------------------------------------------------- 포커스·스크롤 관리 */

let previouslyFocused = null
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeBtnRef.value?.focus()
    } else {
      document.body.style.overflow = ''
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
  { label: ALL, count: props.film?.assets.length ?? 0 },
  ...Object.entries(props.film?.modalityCounts ?? {}).map(([m, n]) => ({ label: m, count: n, disabled: n === 0 }))
])
/* 탭 라벨이 곧 모달리티 이름(또는 전체)이다 */
const activeTab = ref('')
watch(
  () => props.film?.id,
  () => {
    activeTab.value = tabs.value[0].label
  },
  { immediate: true }
)
const visibleAssets = computed(() => {
  const modality = activeTab.value
  const assets = props.film?.assets ?? []
  return modality === ALL ? assets : assets.filter((a) => a.modality === modality)
})

/* ------------------------------------------------------------ 묶음 다운로드 */

const downloadMenuOpen = ref(false)
const downloadMenuRef = ref(null)
function onClickOutsideDownloadMenu(e) {
  if (downloadMenuRef.value && !downloadMenuRef.value.contains(e.target)) downloadMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', onClickOutsideDownloadMenu))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutsideDownloadMenu))
watch(
  () => props.film?.id,
  () => {
    downloadMenuOpen.value = false
  }
)

/* 검색 근거분은 근거 자료가 있을 때만, 모달리티 묶음은 해당 탭을 보고 있을 때만 보여준다 */
const downloadOptions = computed(() => {
  const assets = props.film?.assets ?? []
  const modality = activeTab.value
  const matched = assets.filter((a) => a.matched)
  return [
    { key: 'all', label: '연결 자료 전체', assets },
    ...(matched.length ? [{ key: 'matched', label: '검색 근거 자료만', assets: matched }] : []),
    ...(modality !== ALL ? [{ key: 'modality', label: `${modality} 자료만`, assets: visibleAssets.value }] : [])
  ].map((o) => ({ ...o, count: o.assets.length }))
})
function selectDownload(opt) {
  downloadMenuOpen.value = false
  emit('download', { film: props.film, label: opt.label, assets: opt.assets })
}

/* ------------------------------------------------------ 검색어별 근거 요약 */

const assetsSectionRef = ref(null)

/* 관련도 배지 — 높음만 브랜드 톤으로 띄우고 나머지는 중립 톤으로 가라앉힌다 */
const GRADE_BADGE = {
  높음: 'bg-primary-50 text-primary-700',
  중간: 'bg-slate-100 text-text-secondary',
  낮음: 'bg-slate-50 text-text-tertiary'
}

const maxModalityCount = computed(() => Math.max(1, ...Object.values(props.film?.modalityCounts ?? {})))

/* ALineTabs는 처음 받은 값만 기억하므로, 밖에서 탭을 바꿀 때는 key를 올려 다시 그린다 */
const tabsKey = ref(0)
/* 검색어별 근거의 모달리티를 누르면 그 탭으로 바꾸고 연결 자료 목록으로 내려간다 */
function showModality(m) {
  const tab = tabs.value.find((t) => t.label === m)
  if (!tab || tab.disabled) return
  activeTab.value = tab.label
  tabsKey.value += 1
  nextTick(() => assetsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>
