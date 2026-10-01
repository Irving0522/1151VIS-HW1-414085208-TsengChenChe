<!-- 跟著滑鼠的提示框；靠近視窗右側時自動改放左邊 -->
<script setup>
import { computed, ref } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  datum:   { type: Object, default: null },   // 目前 hover 的那一年資料
  clientX: { type: Number, default: 0 },
  clientY: { type: Number, default: 0 },
})

const el = ref(null)
const fmtN = d3.format(',')

const pos = computed(() => {
  const w = el.value?.offsetWidth ?? 180
  const left = props.clientX + 16 + w > window.innerWidth ? props.clientX - w - 16 : props.clientX + 16
  return { left: left + 'px', top: props.clientY + 16 + 'px' }
})
</script>

<template>
  <div ref="el" class="tooltip" :class="{ show: datum }" :style="pos">
    <template v-if="datum">
      <div class="yr">{{ datum.year }} 年（民國 {{ datum.year - 1911 }} 年）</div>
      <div class="row"><span><i style="background: var(--births)"></i>出生數</span><b>{{ fmtN(datum.births) }} 人</b></div>
      <div class="row"><span><i style="background: var(--births)"></i>粗出生率</span><b>{{ datum.birth_rate.toFixed(2) }}‰</b></div>
      <div class="row"><span><i style="background: var(--old)"></i>65 歲以上</span>
        <b>{{ datum.pct_65p != null ? datum.pct_65p.toFixed(2) + '%' : '無資料' }}</b></div>
    </template>
  </div>
</template>

<style scoped>
.tooltip {
  position: fixed; pointer-events: none; opacity: 0; transition: opacity .12s;
  background: var(--panel); color: var(--text-1); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 10px; font-size: 12px; line-height: 1.6; box-shadow: 0 4px 16px rgba(0,0,0,.15); min-width: 150px;
}
.tooltip.show { opacity: 1; }
.yr { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.row { display: flex; justify-content: space-between; gap: 14px; color: var(--text-2); }
.row b { color: var(--text-1); font-variant-numeric: tabular-nums; }
i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
</style>
