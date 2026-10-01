<!--
  通用折線＋面積圖元件
  分工：D3 負責「算」（比例尺、路徑字串、刻度、找最近年份），Vue 負責「畫」（template 產生 SVG）
-->
<script setup>
import { computed, ref } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  rows:        { type: Array, required: true },   // 全部資料（每年一筆）
  valueKey:    { type: String, required: true },  // 要畫的欄位，例如 'births'
  color:       { type: String, required: true },  // CSS 變數前綴：'births' 或 'old'
  xDomain:     { type: Array, required: true },   // 共用的年份範圍
  yDomain:     { type: Array, default: null },    // 不給就用 [0, 最大值].nice()
  yFormat:     { type: Function, default: d => d },
  thresholds:  { type: Array, default: () => [] },  // 水平門檻虛線 [{ v, name }]
  annotations: { type: Array, default: () => [] },  // 標註點 [{ year, title, sub, anchor, dx, dy }]
  gapNote:     { type: String, default: '' },        // 沒資料區段的說明文字
  hoverYear:   { type: Number, default: null },      // 由父元件傳入，兩張圖同步
  label:       { type: String, default: '' },
})
const emit = defineEmits(['hover', 'leave'])

/* ---------- 尺寸 ---------- */
const W = 900, H = 290
const M = { t: 24, r: 110, b: 28, l: 56 }

/* ---------- D3：資料與比例尺 ---------- */
const series = computed(() => props.rows.filter(d => d[props.valueKey] != null))
const value = d => d[props.valueKey]

const x = computed(() => d3.scaleLinear(props.xDomain, [M.l, W - M.r]))
const y = computed(() => {
  const domain = props.yDomain ?? [0, d3.max(series.value, value)]
  const s = d3.scaleLinear(domain, [H - M.b, M.t])
  return props.yDomain ? s : s.nice()
})

const xTicks = computed(() => x.value.ticks(12))
const yTicks = computed(() => y.value.ticks(5))

const linePath = computed(() =>
  d3.line().x(d => x.value(d.year)).y(d => y.value(value(d)))(series.value))
const areaPath = computed(() =>
  d3.area().x(d => x.value(d.year)).y0(y.value(0)).y1(d => y.value(value(d)))(series.value))

/* 標註點：從年份找到資料，換算成座標 */
const notes = computed(() => props.annotations
  .map(a => ({ ...a, d: series.value.find(d => d.year === a.year) }))
  .filter(a => a.d)
  .map(a => ({ ...a, cx: x.value(a.year), cy: y.value(value(a.d)) })))

/* 沒資料區段（例如 65 歲以上比例 1974 年前沒有） */
const gap = computed(() => {
  const first = series.value[0]
  if (!props.gapNote || !first || first.year <= props.xDomain[0]) return null
  return { x: (x.value(props.xDomain[0]) + x.value(first.year)) / 2, y: y.value(y.value.domain()[1] * 0.12) }
})

/* ---------- Hover ---------- */
const svgRef = ref(null)
const bisect = d3.bisector(d => d.year).center

function onMove(event) {
  const [mx] = d3.pointer(event, svgRef.value)            // 滑鼠在 SVG 座標中的 x
  const d = series.value[bisect(series.value, x.value.invert(mx))]   // 換算成年份並找最近一筆
  if (d) emit('hover', { year: d.year, clientX: event.clientX, clientY: event.clientY })
}

const hoverPoint = computed(() => {
  if (props.hoverYear == null) return null
  const d = series.value.find(r => r.year === props.hoverYear)
  return d ? { cx: x.value(d.year), cy: y.value(value(d)) } : { cx: x.value(props.hoverYear), cy: null }
})
</script>

<template>
  <svg ref="svgRef" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label">
    <!-- y 軸格線與刻度 -->
    <g class="axis">
      <g v-for="t in yTicks" :key="'y' + t">
        <line :x1="M.l" :x2="W - M.r" :y1="y(t)" :y2="y(t)" class="grid" />
        <text :x="M.l - 8" :y="y(t)" dy="0.32em" text-anchor="end">{{ yFormat(t) }}</text>
      </g>
      <!-- x 軸刻度 -->
      <text v-for="t in xTicks" :key="'x' + t" :x="x(t)" :y="H - M.b + 18" text-anchor="middle">{{ t }}</text>
    </g>

    <!-- 門檻虛線 -->
    <g v-for="t in thresholds" :key="'th' + t.v">
      <line :x1="M.l" :x2="W - M.r" :y1="y(t.v)" :y2="y(t.v)" class="threshold" />
      <text :x="M.l + 6" :y="y(t.v) - 5" class="th-label">{{ t.v }}%　{{ t.name }}</text>
    </g>

    <!-- 面積與折線 -->
    <path :d="areaPath" :style="{ fill: `var(--${color}-fill)` }" opacity="0.6" />
    <path :d="linePath" :style="{ stroke: `var(--${color})` }" fill="none" stroke-width="2" />

    <text v-if="gap" :x="gap.x" :y="gap.y" text-anchor="middle" class="anno-sub">{{ gapNote }}</text>

    <!-- 標註 -->
    <g v-for="n in notes" :key="'n' + n.year">
      <circle :cx="n.cx" :cy="n.cy" r="4.5" :style="{ fill: `var(--${color})` }" class="ring" />
      <text :x="n.cx + (n.dx ?? 0)" :y="n.cy + (n.dy ?? 0)" :text-anchor="n.anchor ?? 'start'">
        <tspan class="anno">{{ n.title }}</tspan>
        <tspan v-if="n.sub" class="anno-sub" :x="n.cx + (n.dx ?? 0)" dy="15">{{ n.sub }}</tspan>
      </text>
    </g>

    <!-- hover：垂直虛線 + 圓點（兩張圖同步） -->
    <g v-if="hoverPoint" pointer-events="none">
      <line :x1="hoverPoint.cx" :x2="hoverPoint.cx" :y1="M.t" :y2="H - M.b" class="hover-line" />
      <circle v-if="hoverPoint.cy != null" :cx="hoverPoint.cx" :cy="hoverPoint.cy" r="5"
              :style="{ fill: `var(--${color})` }" class="ring" />
    </g>

    <!-- 透明感應區 -->
    <rect :x="M.l" :y="M.t" :width="W - M.l - M.r" :height="H - M.t - M.b"
          fill="transparent" style="cursor: crosshair"
          @pointermove="onMove" @pointerleave="emit('leave')" />
  </svg>
</template>

<style scoped>
svg { display: block; width: 100%; height: auto; overflow: visible; }
.axis text { fill: var(--text-2); font-size: 11px; }
.grid { stroke: var(--grid); }
.threshold { stroke: var(--threshold); stroke-dasharray: 4 4; }
.th-label { fill: var(--text-2); font-size: 11px; }
.anno { fill: var(--text-1); font-size: 12px; font-weight: 600; }
.anno-sub { fill: var(--text-2); font-size: 11px; }
.ring { stroke: var(--panel); stroke-width: 2; }
.hover-line { stroke: var(--text-3); stroke-dasharray: 3 3; }
</style>
