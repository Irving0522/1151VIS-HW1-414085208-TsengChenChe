<!--
  App.vue：載入資料、計算重點數字、把資料分給各元件
  HW2 預留：xDomain、hover 狀態都集中在這裡，之後加刷選放大、年份動畫只要改這些 ref
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import * as d3 from 'd3'
import { loadPopulation } from './utils/population.js'
import StatCards from './components/StatCards.vue'
import LineChart from './components/LineChart.vue'
import HoverTooltip from './components/HoverTooltip.vue'

const data = ref([])
const error = ref('')
onMounted(async () => {
  try { data.value = await loadPopulation() }
  catch (e) { error.value = '資料載入失敗：' + e.message }
})

const fmtN = d3.format(',')
const fmtWan = d => d === 0 ? '0' : (d / 10000).toFixed(d < 100000 ? 1 : 0) + ' 萬'

/* ---------- 從資料算出的重點 ---------- */
const xDomain = computed(() => d3.extent(data.value, d => d.year))
const last = computed(() => data.value.at(-1))
const peak = computed(() => d3.greatest(data.value, d => d.births))
const firstAge = computed(() => data.value.find(d => d.pct_65p != null))

const lede = computed(() => {
  if (!last.value) return ''
  const L = last.value, P = peak.value, F = firstAge.value
  return `${P.year} 年台灣一年出生 ${fmtN(P.births)} 人；到了 ${L.year} 年只剩 ${fmtN(L.births)} 人，`
    + `不到當年的 ${Math.ceil(L.births / P.births * 10) * 10}%。同一段時間，65 歲以上人口比例從 `
    + `${F.year} 年的 ${F.pct_65p.toFixed(1)}% 一路爬升到 ${L.pct_65p.toFixed(1)}%。`
})

const stats = computed(() => {
  if (!last.value) return []
  const L = last.value, P = peak.value, F = firstAge.value
  return [
    { k: `${L.year} 年出生數`, v: fmtN(L.births), d: `${P.year} 年高峰的 ${(L.births / P.births * 100).toFixed(0)}%` },
    { k: `${L.year} 年 65 歲以上比例`, v: L.pct_65p.toFixed(1) + '%', d: `約每 ${Math.round(100 / L.pct_65p)} 人就有 1 位長者` },
    { k: `${L.year} 年 0–11 歲比例`, v: L.pct_0_11.toFixed(1) + '%', d: `${F.year} 年為 ${F.pct_0_11.toFixed(1)}%` },
  ]
})

/* ---------- 標註 ---------- */
const birthNotes = computed(() => {
  if (!last.value) return []
  return [
    { year: peak.value.year, title: `${peak.value.year} 年高峰`, sub: fmtN(peak.value.births) + ' 人', anchor: 'middle', dy: -30 },
    { year: 2012, title: '2012 龍年', sub: fmtN(data.value.find(d => d.year === 2012)?.births ?? 0) + ' 人', anchor: 'middle', dy: -30 },
    { year: last.value.year, title: `${last.value.year} 年新低`, sub: fmtN(last.value.births) + ' 人', anchor: 'start', dx: 10, dy: -4 },
  ]
})

const THRESHOLDS = [{ v: 7, name: '高齡化社會' }, { v: 14, name: '高齡社會' }, { v: 20, name: '超高齡社會' }]
const elderNotes = computed(() => THRESHOLDS
  .map((t, i) => ({ t, i, d: data.value.find(d => d.pct_65p != null && d.pct_65p >= t.v) }))   // 跨過門檻的年份從資料找
  .filter(o => o.d)
  .map(({ t, i, d }) => i === 2
    ? { year: d.year, title: `${d.year} 年跨過 ${t.v}%`, anchor: 'start', dx: 10, dy: 4 }
    : { year: d.year, title: `${d.year} 年跨過 ${t.v}%`, anchor: 'end', dx: -8, dy: -8 }))

/* ---------- Hover（兩張圖共用同一個狀態，所以會同步） ---------- */
const hover = ref(null)   // { year, clientX, clientY }
const hoverDatum = computed(() => hover.value && data.value.find(d => d.year === hover.value.year))
</script>

<template>
  <main>
    <h1>出生越來越少，老人越來越多：<br>台灣在 2025 年跨過「超高齡社會」門檻</h1>
    <p class="lede">{{ lede }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="data.length">
      <StatCards :items="stats" />

      <section class="card">
        <h2><span class="sw" style="background: var(--births)"></span>每年出生數</h2>
        <p class="sub">單位：人（按登記日期）</p>
        <LineChart :rows="data" value-key="births" color="births" :x-domain="xDomain"
                   :y-format="fmtWan" :annotations="birthNotes" label="台灣每年出生數折線圖"
                   :hover-year="hover?.year ?? null" @hover="hover = $event" @leave="hover = null" />

        <h2 class="second"><span class="sw" style="background: var(--old)"></span>65 歲以上人口比例</h2>
        <p class="sub">單位：%；虛線為聯合國定義的高齡化門檻</p>
        <LineChart :rows="data" value-key="pct_65p" color="old" :x-domain="xDomain" :y-domain="[0, 25]"
                   :y-format="d => d + '%'" :thresholds="THRESHOLDS" :annotations="elderNotes"
                   :gap-note="`${firstAge?.year} 年前無資料`" label="台灣65歲以上人口比例折線圖"
                   :hover-year="hover?.year ?? null" @hover="hover = $event" @leave="hover = null" />
      </section>
    </template>

    <p class="source">資料來源：內政部戶政司「出生數及粗出生率（按登記日期，全國）」、「人口年齡結構重要指標」。
      出生數 1958–2025 年，人口年齡結構 1974–2025 年；原始 XLS 以 Excel 另存 CSV，清理與合併以 D3.js 完成，介面以 Vue 3 元件化。</p>

    <HoverTooltip :datum="hoverDatum" :client-x="hover?.clientX ?? 0" :client-y="hover?.clientY ?? 0" />
  </main>
</template>

<style scoped>
main { max-width: 960px; margin: 0 auto; padding: 32px 16px 48px; }
h1 { font-size: 28px; line-height: 1.35; margin: 0 0 8px; }
.lede { color: var(--text-2); font-size: 15px; line-height: 1.7; margin: 0 0 20px; min-height: 1.7em; }
.error { color: #d03b3b; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
.card h2 { font-size: 15px; margin: 0 0 2px; display: flex; align-items: center; gap: 8px; }
.card h2.second { margin-top: 14px; }
.sw { width: 12px; height: 3px; border-radius: 2px; display: inline-block; }
.sub { font-size: 12px; color: var(--text-2); margin: 0 0 6px; }
.source { font-size: 12px; color: var(--text-3); margin-top: 16px; line-height: 1.6; }
</style>
