<script setup>
/**
 * 파일 상세 정보 모달 — 목록/카드에서 항목을 열어 원본 메타데이터, 추출 정보,
 * 관계 파일을 한 화면에서 확인하는 대형 중앙 모달.
 *
 * 데이터 계약 (실제 API 응답을 이 모양으로만 맞추면 그대로 연결된다):
 *
 * @typedef {Object} FileDetailBreadcrumb
 * @property {string} label          예: '스포츠', '골프'
 * @property {string} level          'topic' | 'subtopic' — 클릭 시 어느 단계까지 필터를 적용할지 구분한다
 *
 * @typedef {Object} FileDetailBasicInfoItem
 * @property {string} key            고유 키 (예: 'duration')
 * @property {string} label          화면에 표시할 라벨 (예: 'duration', '페이지 수')
 * @property {string|number|null} [value]  없으면 '정보 없음'으로 표시
 *
 * @typedef {Object} FileDetailTopic
 * @property {string} id
 * @property {string} label
 * @property {number} relatedCount   관련 파일 수
 * @property {boolean} [clickable]   기본 true — false면 비활성 표시
 *
 * @typedef {Object} FileDetailMeta
 * @property {string} id
 * @property {string} label          인물·작품·기관 등 메타 이름
 * @property {number} count          확인된 관련 파일 수
 *
 * @typedef {Object} FileDetailRelation
 * @property {string} id
 * @property {string} typeBadge      콘텐츠 유형 (예: 영상, 이미지, 문서)
 * @property {{ bg: string, text: string }} [typeBadgeStyle]  없으면 중립 색으로 표시
 * @property {Object|Function} [icon]  목록의 확장자 아이콘과 동일한 컴포넌트 — 없으면 아이콘 생략
 * @property {string} name           파일명
 * @property {string} [relationType] 관계 유형 (예: 동일 촬영, 참조, 연계)
 *
 * @typedef {Object} FileDetail
 * @property {string} id
 * @property {string} name                파일명 — 헤더의 대표 제목
 * @property {string} typeBadge           파일 유형 배지 겸 '데이터 유형' (예: 문서, 이미지, 영상)
 * @property {{ bg: string, text: string }} [typeBadgeStyle]  없으면 중립 색으로 표시
 * @property {string} [fileFormat]        예: 'pdf' — 헤더 배지·'파일 형식' 행
 * @property {string} [sizeLabel]         예: '4.2MB' — 헤더 메타 줄
 * @property {string} [uploadedAt]        예: '2026-07-11' — 헤더 메타 줄·'등록일' 행
 * @property {string} [source]            예: 'dataset_A' — '출처' 행
 * @property {FileDetailBreadcrumb[]} [breadcrumb]  헤더 아래 분류 경로. '대분류 / 중분류' 행에도 쓰인다
 * @property {{ summary: string }} extractedInfo
 * @property {string} [fullText]          전문 보기에 펼쳐질 추출 원문
 * @property {'ready'|'empty'|'error'} [fullTextStatus]  없으면 fullText 유무로 자동 판단
 * @property {string} [fullTextError]     fullTextStatus 'error'일 때 보여줄 메시지
 * @property {FileDetailBasicInfoItem[]} basicInfo  '상세 정보'의 확장 메타로 표시된다
 * @property {FileDetailTopic[]} topics
 * @property {FileDetailMeta[]} multimodalMeta
 * @property {{ related: FileDetailRelation[], sameTopic: FileDetailRelation[] }} relations
 */

import { ref, computed, watch, nextTick, useId, onMounted, onBeforeUnmount } from 'vue'
import { X, Download, ChevronDown, Share2, Star, Database, Calendar, LoaderCircle, CircleAlert, Inbox, ChevronRight } from '@lucide/vue'
import ALineTabs from './ALineTabs.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {import('vue').PropType<FileDetail|null>} */
  file: { type: Object, default: null },
  /** 'ready' | 'loading' | 'error' — file 이 null 인데 ready 면 자동으로 empty 상태로 표시된다 */
  status: { type: String, default: 'ready' },
  errorMessage: { type: String, default: '' },
  /** 요약 배지 옆에 보여줄 아이콘 컴포넌트 (선택) */
  icon: { type: [Object, Function], default: null }
})

const emit = defineEmits([
  'update:open',
  'download-original',
  'download-zip',
  'copy-link',
  'toggle-favorite',
  'breadcrumb-click',
  'topic-click',
  'meta-click',
  'relation-click',
  'retry'
])

const titleId = useId()
const dialogRef = ref(null)
const closeBtnRef = ref(null)

const effectiveStatus = computed(() => {
  if (props.status === 'loading') return 'loading'
  if (props.status === 'error') return 'error'
  if (!props.file) return 'empty'
  return 'ready'
})

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

function getFocusable() {
  if (!dialogRef.value) return []
  return [...dialogRef.value.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
}
/* 다이얼로그 밖으로 Tab 이 빠져나가지 않도록 가둔다 */
function onTabKey(e) {
  const focusables = getFocusable()
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

/* ------------------------------------------------------------- 헤더 액션 */

const downloadMenuOpen = ref(false)
const downloadMenuRef = ref(null)

function onClickOutsideDownloadMenu(e) {
  if (downloadMenuRef.value && !downloadMenuRef.value.contains(e.target)) downloadMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', onClickOutsideDownloadMenu))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutsideDownloadMenu))

function selectDownload(kind) {
  downloadMenuOpen.value = false
  if (kind === 'original') emit('download-original', props.file)
  else if (kind === 'zip') emit('download-zip', props.file)
}

const breadcrumbPathLabel = computed(() => (props.file?.breadcrumb ?? []).map((c) => c.label).join(' / '))

/* 즐겨찾기는 이 컴포넌트가 자체 보유하는 시각 상태다 — 영속화가 필요하면
   호출 쪽에서 'toggle-favorite' 를 받아 file.isFavorite 로 되돌려 넣으면 된다 */
const isFavorite = ref(false)
function toggleFavorite() {
  isFavorite.value = !isFavorite.value
  emit('toggle-favorite', props.file, isFavorite.value)
}

/* --------------------------------------------------------------- 상세 정보 */

/* 'format' 은 배지·'파일 형식' 행, 'file_size' 는 헤더 메타 줄로 이미 나가므로 확장 메타에서는 뺀다 */
const extendedMeta = computed(() => (props.file?.basicInfo ?? []).filter((i) => i.key !== 'format' && i.key !== 'file_size'))

/* ------------------------------------------------------------- 전문 보기 */

watch(
  () => props.file,
  () => {
    downloadMenuOpen.value = false
    isFavorite.value = false
  }
)
const fullTextStatus = computed(() => props.file?.fullTextStatus || (props.file?.fullText ? 'ready' : 'empty'))

/* --------------------------------------------------------- 관계 정보 탭 */

const relationTabsMeta = computed(() => {
  const related = props.file?.relations?.related?.length ?? 0
  const sameTopic = props.file?.relations?.sameTopic?.length ?? 0
  return [
    { key: 'related', label: `연관 데이터 (${related})` },
    { key: 'sameTopic', label: `같은 분류 파일 (${sameTopic})` }
  ]
})
const activeTabLabel = ref(relationTabsMeta.value[0]?.label ?? '')
/* 카드가 많을 때는 페이지네이션 대신 '더 보기'로 이어붙인다 —
   APagination 은 영문 Previous/Next 고정 텍스트라 한글 UI와 어긋나고,
   페이지당 개수 선택기까지 딸려 있어 이 목록엔 과하다 */
const RELATION_PAGE_SIZE = 8
const relationVisibleCount = ref(RELATION_PAGE_SIZE)

watch(
  () => props.file,
  () => {
    activeTabLabel.value = relationTabsMeta.value[0]?.label ?? ''
    relationVisibleCount.value = RELATION_PAGE_SIZE
  }
)

const activeTabKey = computed(
  () => relationTabsMeta.value.find((t) => t.label === activeTabLabel.value)?.key ?? 'related'
)
watch(activeTabKey, () => {
  relationVisibleCount.value = RELATION_PAGE_SIZE
})

const activeRelationList = computed(() => props.file?.relations?.[activeTabKey.value] ?? [])
const visibleRelations = computed(() => activeRelationList.value.slice(0, relationVisibleCount.value))
const moreRelationsCount = computed(() => Math.max(0, activeRelationList.value.length - relationVisibleCount.value))
function showMoreRelations() {
  relationVisibleCount.value += RELATION_PAGE_SIZE
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
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
        <!-- 헤더: 아이콘·정체성·핵심 메타·주요 액션을 한데 모아 스크롤 내내 유지한다 -->
        <header class="flex items-center gap-4 px-4 sm:px-6 py-5 border-b border-border-default shrink-0">
          <div
            v-if="file && icon"
            class="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            :style="file.typeBadgeStyle ? { background: file.typeBadgeStyle.bg, color: file.typeBadgeStyle.text } : { background: 'var(--color-slate-100)', color: 'var(--color-text-tertiary)' }"
          >
            <component :is="icon" :size="26" :stroke-width="1.5" />
          </div>

          <div v-if="file" class="flex-1 min-w-0 flex flex-col gap-1.5">
            <nav v-if="file.breadcrumb?.length" aria-label="분류 경로" class="flex items-center gap-1 text-sm">
              <template v-for="(crumb, i) in file.breadcrumb" :key="crumb.label">
                <ChevronRight v-if="i > 0" :size="13" :stroke-width="2" class="text-text-tertiary shrink-0" />
                <button
                  type="button"
                  class="bg-transparent border-none p-0 text-text-tertiary font-medium cursor-pointer hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                  @click="$emit('breadcrumb-click', crumb)"
                >
                  {{ crumb.label }}
                </button>
              </template>
            </nav>
            <h2 :id="titleId" class="m-0 text-2xl font-bold text-text-primary truncate">{{ file.name }}</h2>
            <div class="flex items-center gap-4 flex-wrap text-sm text-text-tertiary">
              <span v-if="file.sizeLabel" class="inline-flex items-center gap-1.5">
                <Database :size="14" :stroke-width="1.5" />{{ file.sizeLabel }}
              </span>
              <span v-if="file.uploadedAt" class="inline-flex items-center gap-1.5">
                <Calendar :size="14" :stroke-width="1.5" />{{ file.uploadedAt }}
              </span>
            </div>
          </div>
          <h2 v-else :id="titleId" class="m-0 flex-1 text-xl font-bold text-text-primary">파일 상세 정보</h2>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="file"
              type="button"
              :aria-pressed="isFavorite"
              aria-label="즐겨찾기"
              class="w-9 h-9 flex items-center justify-center rounded-md bg-bg-surface border border-border-default cursor-pointer hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              :class="isFavorite ? 'text-status-warning-text border-status-warning-text' : 'text-icon-default'"
              @click="toggleFavorite"
            >
              <Star :size="16" :stroke-width="1.5" :fill="isFavorite ? 'currentColor' : 'none'" />
            </button>
            <button
              v-if="file"
              type="button"
              aria-label="링크 공유"
              class="w-9 h-9 flex items-center justify-center rounded-md bg-bg-surface border border-border-default text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              @click="$emit('copy-link', file)"
            >
              <Share2 :size="16" :stroke-width="1.5" />
            </button>

            <div v-if="file" ref="downloadMenuRef" class="relative">
              <button
                type="button"
                class="h-9 inline-flex items-center gap-1.5 px-3 rounded-md bg-action-primary border-none text-sm font-medium text-text-inverse cursor-pointer hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                :aria-expanded="downloadMenuOpen"
                @click="downloadMenuOpen = !downloadMenuOpen"
              >
                <Download :size="14" :stroke-width="1.8" />
                다운로드
                <ChevronDown :size="14" :stroke-width="1.8" />
              </button>
              <div
                v-if="downloadMenuOpen"
                class="absolute top-[calc(100%+6px)] right-0 w-60 rounded-lg border border-border-default bg-bg-surface shadow-elevation-2 overflow-hidden z-10 py-1"
              >
                <button
                  type="button"
                  class="w-full text-left px-3 py-2.5 text-sm text-text-primary bg-transparent border-none cursor-pointer hover:bg-bg-surface-hover"
                  @click="selectDownload('original')"
                >
                  이 데이터만 <span class="text-text-tertiary">(원본 1건)</span>
                </button>
                <button
                  type="button"
                  class="w-full text-left px-3 py-2.5 text-sm text-text-primary bg-transparent border-none cursor-pointer hover:bg-bg-surface-hover"
                  @click="selectDownload('zip')"
                >
                  연관 데이터 묶음 <span class="text-text-tertiary">(zip)</span>
                </button>
                <button
                  type="button"
                  disabled
                  class="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-sm text-text-disabled bg-transparent border-none cursor-not-allowed"
                >
                  <span>분류 묶음 <span class="text-text-disabled">(zip)</span></span>
                  <span class="text-2xs font-semibold text-text-tertiary bg-slate-100 rounded-sm px-1.5 py-0.5 shrink-0">미결</span>
                </button>
              </div>
            </div>

            <button
              ref="closeBtnRef"
              type="button"
              aria-label="파일 상세 정보 닫기"
              class="shrink-0 w-9 h-9 flex items-center justify-center rounded-md bg-transparent border-none text-icon-default cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              @click="requestClose"
            >
              <X :size="18" :stroke-width="1.5" />
            </button>
          </div>
        </header>

        <!-- 본문: 여기만 스크롤된다 -->
        <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-8">
          <!-- 로딩 -->
          <div v-if="effectiveStatus === 'loading'" class="flex flex-col items-center justify-center gap-3 py-24 text-text-tertiary">
            <LoaderCircle class="animate-spin" :size="28" :stroke-width="1.5" />
            <span class="text-sm">불러오는 중입니다…</span>
          </div>

          <!-- 오류 -->
          <div v-else-if="effectiveStatus === 'error'" class="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <CircleAlert class="text-status-danger-text" :size="28" :stroke-width="1.5" />
            <p class="m-0 text-sm font-medium text-text-primary">{{ errorMessage || '파일 정보를 불러오지 못했습니다.' }}</p>
            <button
              type="button"
              class="h-control-md px-3 rounded-md bg-bg-surface border border-border-default text-sm text-text-secondary font-medium cursor-pointer hover:bg-bg-surface-hover hover:text-text-primary"
              @click="$emit('retry')"
            >
              다시 시도
            </button>
          </div>

          <!-- 표시할 파일 없음 -->
          <div v-else-if="effectiveStatus === 'empty'" class="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Inbox class="text-icon-muted" :size="28" :stroke-width="1.25" />
            <p class="m-0 text-sm text-text-tertiary">표시할 파일 정보가 없습니다.</p>
          </div>

          <!-- 본문: 좌측은 사람이 읽는 요약·원문, 우측은 훑어보는 메타 사이드바 -->
          <div v-else class="flex flex-col gap-10">
            <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12">
              <!-- 좌측: 요약 → 키워드·분류 라벨 → 추출 텍스트(전문, 상시 노출) -->
              <div class="flex flex-col gap-8 min-w-0">
                <section class="flex flex-col gap-3 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">요약</h3>
                  <p class="m-0 text-base text-text-primary leading-relaxed">{{ file.extractedInfo.summary }}</p>
                </section>

                <section v-if="file.topics?.length || file.multimodalMeta?.length" class="flex flex-col gap-3 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">키워드·분류 라벨</h3>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="t in file.topics"
                      :key="t.id"
                      type="button"
                      :disabled="t.clickable === false"
                      class="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border border-border-default bg-bg-surface text-sm disabled:cursor-default"
                      :class="t.clickable === false ? '' : 'cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'"
                      @click="$emit('topic-click', t)"
                    >
                      <span class="font-medium text-text-primary">{{ t.label }}</span>
                      <span class="text-2xs text-text-tertiary bg-slate-100 rounded-full px-1.5 py-0.5 [font-feature-settings:'tnum']">{{ t.relatedCount.toLocaleString() }}</span>
                    </button>
                    <button
                      v-for="m in file.multimodalMeta"
                      :key="m.id"
                      type="button"
                      class="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border border-border-default bg-bg-surface text-sm cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      @click="$emit('meta-click', m)"
                    >
                      <span class="font-medium text-text-primary">{{ m.label }}</span>
                      <span class="text-2xs text-text-tertiary bg-slate-100 rounded-full px-1.5 py-0.5 [font-feature-settings:'tnum']">{{ m.count.toLocaleString() }}</span>
                    </button>
                  </div>
                </section>

                <section class="flex flex-col gap-3 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">추출 텍스트</h3>
                  <div class="rounded-lg border border-dashed border-border-default bg-bg-canvas p-4 max-h-[280px] overflow-y-auto">
                    <p v-if="fullTextStatus === 'ready'" class="m-0 text-sm text-text-secondary leading-relaxed whitespace-pre-line">{{ file.fullText }}</p>
                    <p v-else-if="fullTextStatus === 'error'" class="m-0 text-sm text-status-danger-text leading-relaxed">
                      {{ file.fullTextError || '원본 텍스트를 불러오지 못했습니다. 요약·메타 정보는 계속 확인할 수 있습니다.' }}
                    </p>
                    <p v-else class="m-0 text-sm text-text-tertiary">추출된 전문이 없습니다.</p>
                  </div>
                </section>
              </div>

              <!-- 우측: 훑어보는 상세 정보 — 두 그룹은 테두리 대신 넓은 간격으로만 구분한다 -->
              <div class="flex flex-col gap-12 min-w-0">
                <section class="flex flex-col gap-3 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">상세 정보</h3>
                  <dl class="m-0">
                    <div v-if="file.fileFormat" class="flex items-baseline gap-4 py-3.5 border-b border-slate-100">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">파일 형식</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate">{{ file.fileFormat }}</dd>
                    </div>
                    <div v-if="file.sizeLabel" class="flex items-baseline gap-4 py-3.5 border-b border-slate-100">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">파일 크기</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate [font-feature-settings:'tnum']">{{ file.sizeLabel }}</dd>
                    </div>
                    <div v-if="file.typeBadge" class="flex items-baseline gap-4 py-3.5 border-b border-slate-100">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">데이터 유형</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate">{{ file.typeBadge }}</dd>
                    </div>
                    <div v-if="breadcrumbPathLabel" class="flex items-baseline gap-4 py-3.5 border-b border-slate-100">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">대분류 / 중분류</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate">{{ breadcrumbPathLabel }}</dd>
                    </div>
                    <div v-if="file.uploadedAt" class="flex items-baseline gap-4 py-3.5 border-b border-slate-100">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">등록일</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate [font-feature-settings:'tnum']">{{ file.uploadedAt }}</dd>
                    </div>
                    <div v-if="file.source" class="flex items-baseline gap-4 py-3.5">
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">출처</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate">{{ file.source }}</dd>
                    </div>
                  </dl>
                </section>

                <section v-if="extendedMeta.length" class="flex flex-col gap-3 min-w-0">
                  <h3 class="m-0 text-xs font-semibold text-text-tertiary tracking-wide">확장 메타</h3>
                  <dl class="m-0">
                    <div
                      v-for="item in extendedMeta"
                      :key="item.key"
                      class="flex items-baseline gap-4 py-3.5 border-b border-slate-100 last:border-b-0"
                    >
                      <dt class="w-28 shrink-0 text-sm font-semibold text-text-primary truncate">{{ item.label }}</dt>
                      <dd class="m-0 text-sm text-text-tertiary truncate [font-feature-settings:'tnum']">{{ item.value ?? '정보 없음' }}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>

            <!-- 관계 정보 — 신뢰도·설명 없이 파일명과 관계만 바로 훑는 카드 그리드 -->
            <section class="flex flex-col gap-3">
              <ALineTabs :key="file.id" v-model="activeTabLabel" :tabs="relationTabsMeta.map((t) => ({ label: t.label }))" />

              <div
                v-if="activeRelationList.length === 0"
                class="flex flex-col items-center gap-2 py-12 rounded-lg border border-dashed border-border-default"
              >
                <Inbox class="text-icon-muted" :size="22" :stroke-width="1.25" />
                <p class="m-0 text-sm text-text-tertiary">표시할 관계가 없습니다.</p>
              </div>

              <template v-else>
                <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  <button
                    v-for="rel in visibleRelations"
                    :key="rel.id"
                    type="button"
                    class="flex flex-col items-start gap-1.5 min-w-0 text-left p-3 rounded-lg border border-border-default bg-bg-surface cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    @click="$emit('relation-click', rel)"
                  >
                    <span
                      class="inline-flex items-center h-5 px-1.5 rounded-sm text-[10px] font-bold tracking-wide"
                      :style="rel.typeBadgeStyle ? { background: rel.typeBadgeStyle.bg, color: rel.typeBadgeStyle.text } : { background: 'var(--color-slate-100)', color: 'var(--color-text-tertiary)' }"
                    >{{ rel.typeBadge }}</span>
                    <span class="w-full flex items-center gap-1.5 min-w-0">
                      <component :is="rel.icon" v-if="rel.icon" class="text-icon-default shrink-0" :size="14" :stroke-width="1.5" />
                      <span class="text-sm font-semibold text-text-primary truncate">{{ rel.name }}</span>
                    </span>
                    <span v-if="rel.relationType" class="w-full text-xs text-text-tertiary truncate">{{ rel.relationType }}</span>
                  </button>
                </div>

                <button
                  v-if="moreRelationsCount > 0"
                  type="button"
                  class="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-bg-surface border border-border-default shadow-elevation-1 text-sm font-semibold text-text-secondary cursor-pointer hover:bg-bg-surface-hover hover:border-border-strong hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  @click="showMoreRelations"
                >
                  {{ Math.min(RELATION_PAGE_SIZE, moreRelationsCount) }}건 더 보기
                  <ChevronDown :size="14" :stroke-width="2" />
                </button>
              </template>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
