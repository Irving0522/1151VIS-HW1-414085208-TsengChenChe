<!-- 上方三張數字卡：數值全部由資料計算 -->
<script setup>
defineProps({ items: { type: Array, required: true } })   // [{ k, v, d }]
</script>

<template>
  <div class="stats">
    <div v-for="s in items" :key="s.k" class="stat">
      <div class="k">{{ s.k }}</div>
      <div class="v">{{ s.v }}</div>
      <div class="d">{{ s.d }}</div>
    </div>
  </div>
</template>

<style scoped>
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
@media (max-width: 640px) { .stats { grid-template-columns: 1fr; } }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
.k { font-size: 12px; color: var(--text-2); }
.v { font-size: 28px; font-weight: 700; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.d { font-size: 12px; color: var(--text-3); }
</style>
