<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { User, CreditCard, Sun, Keyboard, Users, UserPlus, Plus, Code2, LifeBuoy, Cloud, LogOut } from '@lucide/vue'

import AButton from '../../components/AButton.vue'
import ABadge from '../../components/ABadge.vue'
import AAlert from '../../components/AAlert.vue'
import ADialog from '../../components/ADialog.vue'
import AAlertDialog from '../../components/AAlertDialog.vue'
import ACard from '../../components/ACard.vue'
import AAccordion from '../../components/AAccordion.vue'
import ACheckbox from '../../components/ACheckbox.vue'
import ASwitch from '../../components/ASwitch.vue'
import ARadioGroup from '../../components/ARadioGroup.vue'
import AChoiceCard from '../../components/AChoiceCard.vue'
import AInput from '../../components/AInput.vue'
import ATextarea from '../../components/ATextarea.vue'
import ASelect from '../../components/ASelect.vue'
import ACombobox from '../../components/ACombobox.vue'
import ADropdownMenu from '../../components/ADropdownMenu.vue'
import AContextMenu from '../../components/AContextMenu.vue'
import AMenubar from '../../components/AMenubar.vue'
import ALineTabs from '../../components/ALineTabs.vue'
import ACommand from '../../components/ACommand.vue'
import ADataTable from '../../components/ADataTable.vue'
import AHoverCard from '../../components/AHoverCard.vue'
import ATooltip from '../../components/ATooltip.vue'
import AToast from '../../components/AToast.vue'
import APagination from '../../components/APagination.vue'
import ACalendar from '../../components/ACalendar.vue'

const dialogOpen = ref(false)
const alertDialogOpen = ref(false)
const checked = ref(true)
const switchOn = ref(true)
const radioValue = ref('comfortable')
const choiceValue = ref('kubernetes')
const inputValue = ref('')
const textareaValue = ref('')
const selectValue = ref('')
const comboboxValue = ref('')
const page = ref(1)
const perPage = ref(10)
const selectedRow = ref(3)
const calendarDate = ref(new Date(2024, 0, 22))

const dropdownSections = [
  [
    { label: 'Profile', kbd: '⇧⌘P', icon: User },
    { label: 'Billing', kbd: '⌘B', icon: CreditCard },
    { label: 'Settings', kbd: '⌘S', icon: Sun },
    { label: 'Keyboard shortcuts', kbd: '⌘K', icon: Keyboard }
  ],
  [
    { label: 'Team', icon: Users },
    { label: 'Invite users', kbd: '›', icon: UserPlus },
    { label: 'New Team', kbd: '⌘+T', icon: Plus }
  ],
  [
    { label: 'GitHub', icon: Code2 },
    { label: 'Support', icon: LifeBuoy },
    { label: 'API', icon: Cloud, disabled: true }
  ],
  [{ label: 'Log out', kbd: '⇧⌘Q', icon: LogOut }]
]

const contextMenuItems = [
  { label: 'Back' },
  { label: 'Forward' },
  { label: 'Reload', disabled: true },
  { divider: true },
  { label: 'Show Bookmarks' }
]

const commandItems = [
  { label: 'Calendar' },
  { label: 'Search Emoji' },
  { label: 'Calculator', disabled: true }
]

const tableColumns = [
  { key: 'status', label: 'Status' },
  { key: 'email', label: 'Email' },
  { key: 'amount', label: 'Amount' }
]
const tableRows = [
  { id: 1, status: 'Success', email: 'ken99@yahoo.com', amount: '$316.00' },
  { id: 2, status: 'Processing', email: 'abe45@gmail.com', amount: '$242.00' },
  { id: 3, status: 'Selected', email: 'monserrat44@gmail.com', amount: '$837.00' }
]

/* ---------------------------------------------------------- Design Foundation */

const neutralScale = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const primaryScale = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const statusScales = [
  { name: 'Success', prefix: 'green', steps: ['50', '100', '600', '700'] },
  { name: 'Warning', prefix: 'amber', steps: ['50', '100', '600', '700'] },
  { name: 'Danger', prefix: 'red', steps: ['50', '100', '600', '700'] },
  { name: 'Info', prefix: 'info', steps: ['50', '100', '600', '700'] }
]
const semanticColors = [
  { label: 'bg-canvas', var: '--color-bg-canvas' },
  { label: 'bg-surface', var: '--color-bg-surface' },
  { label: 'bg-surface-hover', var: '--color-bg-surface-hover' },
  { label: 'bg-surface-selected', var: '--color-bg-surface-selected' },
  { label: 'border-default', var: '--color-border-default' },
  { label: 'border-strong', var: '--color-border-strong' },
  { label: 'text-primary', var: '--color-text-primary' },
  { label: 'text-secondary', var: '--color-text-secondary' },
  { label: 'text-tertiary', var: '--color-text-tertiary' },
  { label: 'action-primary', var: '--color-action-primary' },
  { label: 'focus-ring', var: '--color-focus-ring' },
  { label: 'link', var: '--color-link' },
  { label: 'status-success', var: '--color-status-success-bg' },
  { label: 'status-warning', var: '--color-status-warning-bg' },
  { label: 'status-danger', var: '--color-status-danger-bg' },
  { label: 'status-info', var: '--color-status-info-bg' }
]

const typeScale = [
  { key: '2xs', size: '11px', line: '1.4', weight: '400' },
  { key: 'xs', size: '12px', line: '1.4', weight: '500' },
  { key: 'sm', size: '13px', line: '1.4', weight: '400' },
  { key: 'base', size: '14px', line: '1.5', weight: '400' },
  { key: 'md', size: '16px', line: '1.4', weight: '500' },
  { key: 'lg', size: '18px', line: '1.3', weight: '600' },
  { key: 'xl', size: '20px', line: '1.3', weight: '600' },
  { key: '2xl', size: '24px', line: '1.25', weight: '600' },
  { key: '3xl', size: '28px', line: '1.2', weight: '600' }
]

const spacingScale = [
  { key: '0.5', px: '2px' }, { key: '1', px: '4px' }, { key: '1.5', px: '6px' }, { key: '2', px: '8px' },
  { key: '2.5', px: '10px' }, { key: '3', px: '12px' }, { key: '4', px: '16px' }, { key: '5', px: '20px' },
  { key: '6', px: '24px' }, { key: '8', px: '32px' }, { key: '10', px: '40px' }, { key: '12', px: '48px' },
  { key: '16', px: '64px' }
]

const controlHeights = [
  { key: 'xs', px: '24px' }, { key: 'sm', px: '28px' }, { key: 'md', px: '32px' },
  { key: 'lg', px: '36px' }, { key: 'xl', px: '40px' }
]
const rowHeights = [
  { key: 'compact', px: '32px' }, { key: 'comfortable', px: '40px' }, { key: 'spacious', px: '48px' }
]

const radiusScale = [
  { key: 'none', px: '0px' }, { key: 'sm', px: '4px' }, { key: 'md', px: '6px' },
  { key: 'lg', px: '8px' }, { key: 'xl', px: '12px' }, { key: 'full', px: '999px' }
]

const elevationScale = ['0', '1', '2', '3']

const breakpoints = [
  { label: 'bp-min', value: '1280px' },
  { label: 'bp-lg', value: '1440px' },
  { label: 'bp-xl', value: '1920px' }
]
const gridInfo = [
  { label: 'columns', value: '12' },
  { label: 'gutter', value: 'space-4 (16px)' },
  { label: 'margin', value: 'space-6 (24px)' },
  { label: 'max-width-form', value: '720px' }
]

const iconSizes = [
  { key: 'sm', px: '16px' }, { key: 'md', px: '20px' }, { key: 'lg', px: '24px' }
]

const motionDurations = [
  { key: 'fast', value: '120ms' }, { key: 'base', value: '180ms' }, { key: 'slow', value: '220ms' }
]

const vizColors = [
  { key: '1', hex: '#0d7dd4' }, { key: '2', hex: '#8c5ad3' }, { key: '3', hex: '#31983d' }, { key: '4', hex: '#d78d00' },
  { key: '5', hex: '#d44567' }, { key: '6', hex: '#00919b' }, { key: '7', hex: '#de6907' }, { key: '8', hex: '#009ed8' }
]

const densityLevels = [
  { key: 'compact', row: 'row-compact', padX: '8px', padY: '6px', text: '12px' },
  { key: 'comfortable', row: 'row-comfortable', padX: '12px', padY: '8px', text: '13px' },
  { key: 'spacious', row: 'row-spacious', padX: '16px', padY: '12px', text: '14px' }
]

/* ---------------------------------------------------------------- Side nav */

const navGroups = [
  {
    label: 'Design Foundation',
    items: [
      { id: 'color-neutral', label: 'Color — Neutral' },
      { id: 'color-primary', label: 'Color — Primary' },
      { id: 'color-status', label: 'Color — Status' },
      { id: 'color-semantic', label: 'Color — Semantic' },
      { id: 'typography', label: 'Typography' },
      { id: 'spacing', label: 'Spacing' },
      { id: 'sizing', label: 'Sizing' },
      { id: 'radius', label: 'Radius' },
      { id: 'border', label: 'Border' },
      { id: 'shadow', label: 'Shadow' },
      { id: 'grid-breakpoint', label: 'Grid & Breakpoint' },
      { id: 'iconography', label: 'Iconography' },
      { id: 'motion', label: 'Motion' },
      { id: 'data-viz', label: 'Data Visualization' },
      { id: 'density', label: 'Density' }
    ]
  },
  {
    label: 'Components',
    items: [
      { id: 'button', label: 'Button' },
      { id: 'badge', label: 'Badge' },
      { id: 'alert', label: 'Alert' },
      { id: 'dialog', label: 'Dialog / Alert Dialog' },
      { id: 'card', label: 'Card' },
      { id: 'accordion', label: 'Accordion' },
      { id: 'checkbox-switch', label: 'Checkbox / Switch' },
      { id: 'radio-group', label: 'Radio Group' },
      { id: 'choice-card', label: 'Choice Card' },
      { id: 'input-label', label: 'Input / Label' },
      { id: 'textarea', label: 'Textarea' },
      { id: 'select', label: 'Select Box' },
      { id: 'combobox', label: 'Combobox' },
      { id: 'dropdown-menu', label: 'Dropdown Menu' },
      { id: 'context-menu', label: 'Context Menu' },
      { id: 'menubar', label: 'Menubar' },
      { id: 'line-tabs', label: 'Line Tabs' },
      { id: 'command', label: 'Command' },
      { id: 'data-table', label: 'Data Table' },
      { id: 'hover-card', label: 'Hover Card' },
      { id: 'tooltip', label: 'Tooltip' },
      { id: 'toast', label: 'Toast' },
      { id: 'pagination', label: 'Pagination' },
      { id: 'calendar', label: 'Calendar' }
    ]
  }
]

const activeId = ref(navGroups[0].items[0].id)
let sectionObserver = null

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  const sections = navGroups
    .flatMap((g) => g.items)
    .map((i) => document.getElementById(i.id))
    .filter(Boolean)

  const lastEntry = new Map()
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => lastEntry.set(e.target.id, e))
      const visible = [...lastEntry.values()].filter((e) => e.isIntersecting)
      if (visible.length) {
        activeId.value = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        ).target.id
      }
    },
    { rootMargin: '0px 0px -70% 0px', threshold: 0 }
  )
  sections.forEach((el) => sectionObserver.observe(el))
})

onBeforeUnmount(() => sectionObserver?.disconnect())
</script>

<template>
  <div class="page">
    <nav class="sidenav">
      <div v-for="group in navGroups" :key="group.label" class="sidenav-group">
        <div class="sidenav-group-label">{{ group.label }}</div>
        <a
          v-for="item in group.items"
          :key="item.id"
          :href="`#${item.id}`"
          class="sidenav-link"
          :class="{ active: activeId === item.id }"
          @click.prevent="scrollToSection(item.id)"
        >{{ item.label }}</a>
      </div>
    </nav>

    <main class="preview">
    <h1 id="design-foundation" class="group-title">Design Foundation</h1>

    <section id="color-neutral">
      <h2>Color — Neutral (Slate)</h2>
      <div class="swatch-row">
        <div v-for="step in neutralScale" :key="'slate-' + step" class="swatch">
          <div
            class="swatch-color"
            :style="{ background: `var(--color-slate-${step})`, border: step === '0' ? '1px solid var(--color-border-default)' : 'none' }"
          ></div>
          <span class="swatch-label">slate-{{ step }}</span>
        </div>
      </div>
    </section>

    <section id="color-primary">
      <h2>Color — Primary</h2>
      <div class="swatch-row">
        <div v-for="step in primaryScale" :key="'primary-' + step" class="swatch">
          <div class="swatch-color" :style="{ background: `var(--color-primary-${step})` }"></div>
          <span class="swatch-label">primary-{{ step }}</span>
        </div>
      </div>
    </section>

    <section id="color-status">
      <h2>Color — Status</h2>
      <div class="stack">
        <div v-for="s in statusScales" :key="s.prefix" class="row">
          <span class="label" style="width: 64px">{{ s.name }}</span>
          <div class="swatch-row">
            <div v-for="step in s.steps" :key="s.prefix + step" class="swatch">
              <div class="swatch-color" :style="{ background: `var(--color-${s.prefix}-${step})` }"></div>
              <span class="swatch-label">{{ s.prefix }}-{{ step }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="color-semantic">
      <h2>Color — Semantic Tokens</h2>
      <div class="swatch-row">
        <div v-for="c in semanticColors" :key="c.label" class="swatch">
          <div class="swatch-color" :style="{ background: `var(${c.var})`, border: '1px solid var(--color-border-default)' }"></div>
          <span class="swatch-label">{{ c.label }}</span>
        </div>
      </div>
    </section>

    <section id="typography">
      <h2>Typography Scale</h2>
      <div class="stack">
        <div v-for="t in typeScale" :key="t.key" class="type-row">
          <span class="type-sample" :style="{ fontSize: t.size, lineHeight: t.line, fontWeight: t.weight }">Aa 가나다 123</span>
          <span class="type-meta">text-{{ t.key }} · {{ t.size }} / line {{ t.line }} / weight {{ t.weight }}</span>
        </div>
      </div>
    </section>

    <section id="spacing">
      <h2>Spacing Scale</h2>
      <div class="stack">
        <div v-for="s in spacingScale" :key="s.key" class="bar-row">
          <span class="bar-label">space-{{ s.key }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: s.px }"></div>
          </div>
          <span class="bar-value">{{ s.px }}</span>
        </div>
      </div>
    </section>

    <section id="sizing">
      <h2>Sizing — Control Heights / Row Heights</h2>
      <div class="stack">
        <div v-for="c in controlHeights" :key="c.key" class="bar-row">
          <span class="bar-label">control-{{ c.key }}</span>
          <div class="size-box" :style="{ height: c.px, width: '120px' }"></div>
          <span class="bar-value">{{ c.px }}</span>
        </div>
        <div v-for="r in rowHeights" :key="r.key" class="bar-row">
          <span class="bar-label">row-{{ r.key }}</span>
          <div class="size-box" :style="{ height: r.px, width: '120px' }"></div>
          <span class="bar-value">{{ r.px }}</span>
        </div>
      </div>
    </section>

    <section id="radius">
      <h2>Radius</h2>
      <div class="swatch-row">
        <div v-for="r in radiusScale" :key="r.key" class="swatch">
          <div class="radius-box" :style="{ borderRadius: r.px }"></div>
          <span class="swatch-label">radius-{{ r.key }} ({{ r.px }})</span>
        </div>
      </div>
    </section>

    <section id="border">
      <h2>Border</h2>
      <div class="stack">
        <div class="row"><span class="label" style="width: 120px">hairline (1px)</span><div class="border-sample" style="border-bottom-width: 1px"></div></div>
        <div class="row"><span class="label" style="width: 120px">thick (2px)</span><div class="border-sample" style="border-bottom-width: 2px"></div></div>
        <div class="row"><span class="label" style="width: 120px">dashed</span><div class="border-sample" style="border-bottom-width: 1px; border-bottom-style: dashed"></div></div>
      </div>
    </section>

    <section id="shadow">
      <h2>Shadow / Elevation</h2>
      <div class="swatch-row">
        <div v-for="e in elevationScale" :key="e" class="swatch">
          <div class="elevation-box" :style="{ boxShadow: `var(--elevation-${e})` }"></div>
          <span class="swatch-label">elevation-{{ e }}</span>
        </div>
      </div>
    </section>

    <section id="grid-breakpoint">
      <h2>Grid & Breakpoint</h2>
      <div class="stack">
        <div v-for="b in breakpoints" :key="b.label" class="row">
          <span class="label" style="width: 64px">{{ b.label }}</span>
          <span>{{ b.value }}</span>
        </div>
        <div v-for="g in gridInfo" :key="g.label" class="row">
          <span class="label" style="width: 64px">{{ g.label }}</span>
          <span>{{ g.value }}</span>
        </div>
      </div>
    </section>

    <section id="iconography">
      <h2>Iconography</h2>
      <div class="swatch-row">
        <div v-for="i in iconSizes" :key="i.key" class="swatch">
          <User :size="Number(i.px.replace('px', ''))" :stroke-width="1.5" />
          <span class="swatch-label">icon-{{ i.key }} ({{ i.px }})</span>
        </div>
      </div>
    </section>

    <section id="motion">
      <h2>Motion</h2>
      <div class="row">
        <div
          v-for="m in motionDurations"
          :key="m.key"
          class="motion-box"
          :style="{ transitionDuration: m.value, transitionTimingFunction: 'var(--easing-standard)' }"
        >
          {{ m.key }} ({{ m.value }})
        </div>
      </div>
      <span class="label">easing-standard: cubic-bezier(0.2, 0, 0, 1) — hover the boxes above</span>
    </section>

    <section id="data-viz">
      <h2>Data Visualization Palette</h2>
      <div class="swatch-row">
        <div v-for="v in vizColors" :key="v.key" class="swatch">
          <div class="swatch-color" :style="{ background: `var(--color-viz-${v.key})` }"></div>
          <span class="swatch-label">viz-{{ v.key }}</span>
        </div>
      </div>
    </section>

    <section id="density">
      <h2>Density</h2>
      <div class="stack">
        <div v-for="d in densityLevels" :key="d.key" class="row">
          <span class="label" style="width: 96px">{{ d.key }}</span>
          <div class="density-row" :style="{ height: `var(--${d.row})`, padding: `${d.padY} ${d.padX}`, fontSize: d.text }">
            cell text
          </div>
        </div>
      </div>
    </section>

    <h1 id="components-top" class="group-title">Components</h1>

    <section id="button">
      <h2>Button</h2>
      <div class="row">
        <span class="label">Primary</span>
        <AButton variant="primary">Default</AButton>
        <AButton variant="primary" disabled>Disabled</AButton>
      </div>
      <div class="row">
        <span class="label">Secondary</span>
        <AButton variant="secondary">Default</AButton>
        <AButton variant="secondary" disabled>Disabled</AButton>
      </div>
    </section>

    <section id="badge">
      <h2>Badge</h2>
      <div class="row">
        <ABadge>Badge</ABadge>
        <ABadge tone="success">완료</ABadge>
        <ABadge tone="danger">실패</ABadge>
      </div>
    </section>

    <section id="alert">
      <h2>Alert</h2>
      <div class="stack">
        <AAlert variant="info" title="Heads up!" description="You can add components to your app using the cli." />
        <AAlert variant="success" title="결제가 완료되었습니다." description="영수증이 등록된 이메일로 발송되었습니다." />
        <AAlert variant="warning" title="Your subscription will expire in 3 days." description="Renew now to avoid service interruption." />
        <AAlert variant="danger" title="결제에 실패했습니다." description="카드 정보를 확인한 후 다시 시도해 주세요." />
      </div>
    </section>

    <section id="dialog">
      <h2>Dialog / Alert Dialog</h2>
      <div class="row">
        <AButton variant="secondary" @click="dialogOpen = true">Open Dialog</AButton>
        <AButton variant="secondary" @click="alertDialogOpen = true">Open Alert Dialog</AButton>
      </div>
      <ADialog v-model="dialogOpen" title="Edit profile" description="Make changes to your profile here.">
        <AInput label="Name" model-value="Pedro Duarte" />
        <template #footer>
          <AButton variant="primary" @click="dialogOpen = false">Save changes</AButton>
        </template>
      </ADialog>
      <AAlertDialog v-model="alertDialogOpen" @confirm="alertDialogOpen = false" />
    </section>

    <section id="card">
      <h2>Card</h2>
      <ACard title="Create project" description="Deploy your new project in one-click.">
        <AInput label="Name" placeholder="Name of your project" />
        <template #footer>
          <AButton variant="secondary">Cancel</AButton>
          <AButton variant="primary">Deploy</AButton>
        </template>
      </ACard>
    </section>

    <section id="accordion">
      <h2>Accordion</h2>
      <div style="width: 340px">
        <AAccordion :items="[
          { title: 'Is it accessible?', content: 'Yes. It adheres to the WAI-ARIA design pattern.' },
          { title: 'Is it styled?', content: 'Yes. It comes with default styles that match the other components\' aesthetic.' }
        ]" />
      </div>
    </section>

    <section id="checkbox-switch">
      <h2>Checkbox / Switch</h2>
      <div class="row">
        <ACheckbox v-model="checked">Checkbox</ACheckbox>
        <ACheckbox :model-value="false" disabled>Disabled</ACheckbox>
      </div>
      <div class="row">
        <ASwitch v-model="switchOn">Switch</ASwitch>
        <ASwitch :model-value="false" disabled>Disabled</ASwitch>
      </div>
    </section>

    <section id="radio-group">
      <h2>Radio Group</h2>
      <ARadioGroup
        v-model="radioValue"
        :options="[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
          { value: 'disabled', label: 'Disabled', disabled: true }
        ]"
      />
    </section>

    <section id="choice-card">
      <h2>Choice Card</h2>
      <div style="width: 380px">
        <AChoiceCard
          v-model="choiceValue"
          :options="[
            { value: 'kubernetes', title: 'Kubernetes', description: 'Run GPU workloads on a K8s cluster.' },
            { value: 'vm', title: 'Virtual Machine', description: 'Access a cluster to run GPU workloads.' },
            { value: 'bare-metal', title: 'Bare Metal', description: '현재 리전에서 이용할 수 없습니다.', disabled: true }
          ]"
        />
      </div>
    </section>

    <section id="input-label">
      <h2>Input / Label</h2>
      <div class="stack" style="width: 250px">
        <AInput v-model="inputValue" search label="Search" placeholder="검색어를 입력하세요" />
        <AInput label="Default" placeholder="Email" />
        <AInput label="Disabled" placeholder="Email" disabled />
        <AInput label="Error" model-value="not-an-email" error="유효한 이메일을 입력해주세요." />
      </div>
    </section>

    <section id="textarea">
      <h2>Textarea</h2>
      <div style="width: 320px">
        <ATextarea v-model="textareaValue" label="Default" placeholder="Type your message here." />
      </div>
    </section>

    <section id="select">
      <h2>Select Box</h2>
      <div style="width: 250px">
        <ASelect
          v-model="selectValue"
          label="Default"
          placeholder="옵션을 선택하세요"
          :options="['Apple', 'Banana', 'Cherry']"
        />
      </div>
    </section>

    <section id="combobox">
      <h2>Combobox</h2>
      <ACombobox v-model="comboboxValue" placeholder="Select a framework.." :options="['Apple', 'Banana']" />
    </section>

    <section id="dropdown-menu">
      <h2>Dropdown Menu</h2>
      <ADropdownMenu label="Open Menu" heading="My Account" :sections="dropdownSections" />
    </section>

    <section id="context-menu">
      <h2>Context Menu</h2>
      <AContextMenu :items="contextMenuItems">
        <div class="context-area">우클릭 해보세요</div>
      </AContextMenu>
    </section>

    <section id="menubar">
      <h2>Menubar</h2>
      <AMenubar :items="[{ label: 'File' }, { label: 'Edit' }, { label: 'View' }, { label: 'Help', disabled: true }]" />
    </section>

    <section id="line-tabs">
      <h2>Line Tabs</h2>
      <ALineTabs :tabs="[{ label: 'Overview' }, { label: 'Analytics' }, { label: 'Reports' }, { label: 'Archived', disabled: true }]" />
    </section>

    <section id="command">
      <h2>Command</h2>
      <ACommand group-label="Suggestions" :items="commandItems" />
    </section>

    <section id="data-table">
      <h2>Data Table</h2>
      <div style="width: 500px">
        <ADataTable v-model="selectedRow" :columns="tableColumns" :rows="tableRows" />
      </div>
    </section>

    <section id="hover-card">
      <h2>Hover Card</h2>
      <AHoverCard title="@nextjs" description="The React Framework – created and maintained by @vercel." meta="Joined December 2021">
        <template #trigger>
          <AButton variant="secondary">@nextjs</AButton>
        </template>
      </AHoverCard>
    </section>

    <section id="tooltip">
      <h2>Tooltip</h2>
      <ATooltip text="Add to library">
        <AButton variant="secondary">Hover me</AButton>
      </ATooltip>
    </section>

    <section id="toast">
      <h2>Toast</h2>
      <AToast title="Event has been created" description="Sunday, December 03, 2023 at 9:00 AM" action-label="Undo" />
    </section>

    <section id="pagination">
      <h2>Pagination</h2>
      <APagination v-model:page="page" v-model:per-page="perPage" :page-count="10" />
    </section>

    <section id="calendar">
      <h2>Calendar</h2>
      <ACalendar v-model="calendarDate" />
    </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  align-items: flex-start;
  background: var(--color-bg-canvas);
  min-height: 100vh;
}
.sidenav {
  position: sticky;
  top: 0;
  align-self: flex-start;
  width: 220px;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 32px 12px;
  border-right: var(--border-width-hairline) solid var(--color-border-default);
  font-family: var(--font-family-sans);
}
.sidenav-group {
  margin-bottom: 24px;
}
.sidenav-group-label {
  font-size: var(--text-2xs-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
  padding: 0 10px 6px;
}
.sidenav-link {
  display: block;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm-size);
  color: var(--color-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidenav-link:hover {
  background: var(--color-bg-surface-hover);
  color: var(--color-text-primary);
}
.sidenav-link.active {
  background: var(--color-bg-surface-selected);
  color: var(--color-action-primary);
  font-weight: 600;
}

.preview {
  font-family: var(--font-family-sans);
  background: var(--color-bg-surface);
  flex: 1;
  min-width: 0;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.preview section {
  scroll-margin-top: 16px;
}
.group-title {
  scroll-margin-top: 16px;
}
h2 {
  font-size: var(--text-base-size);
  color: var(--color-text-primary);
  margin-bottom: 12px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.label {
  width: 64px;
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
}
.context-area {
  width: 200px;
  height: 100px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
}

.group-title {
  font-size: var(--text-2xl-size);
  font-weight: 700;
  color: var(--color-text-primary);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-border-default);
}

.swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 88px;
}
.swatch-color {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-1);
}
.swatch-label {
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
  text-align: center;
}

.type-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.type-sample {
  color: var(--color-text-primary);
  min-width: 160px;
}
.type-meta {
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bar-label {
  width: 110px;
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.bar-track {
  background: var(--color-bg-surface-hover);
  border-radius: var(--radius-sm);
}
.bar-fill {
  height: 16px;
  background: var(--color-action-primary);
  border-radius: var(--radius-sm);
}
.bar-value {
  font-size: var(--text-xs-size);
  color: var(--color-text-tertiary);
}

.size-box {
  background: var(--color-action-primary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.radius-box {
  width: 56px;
  height: 56px;
  background: var(--color-primary-100);
  border: 1px solid var(--color-primary-500);
}

.border-sample {
  width: 240px;
  border-bottom-style: solid;
  border-bottom-color: var(--color-border-strong);
}

.elevation-box {
  width: 72px;
  height: 56px;
  background: var(--color-bg-surface);
  border-radius: var(--radius-md);
}

.motion-box {
  width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-surface-hover);
  border-radius: var(--radius-md);
  font-size: var(--text-xs-size);
  color: var(--color-text-secondary);
  transition-property: transform, background;
  cursor: default;
}
.motion-box:hover {
  transform: translateX(24px);
  background: var(--color-primary-100);
}

.density-row {
  display: flex;
  align-items: center;
  background: var(--color-bg-surface-hover);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  box-sizing: border-box;
  width: 200px;
}
</style>
