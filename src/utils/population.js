/* ============================================================
 * 資料載入與清理：直接讀 Excel「另存新檔 → CSV」的原始檔，不需事先整理
 *   public/data/births_raw.csv ← 出生數及粗出生率（工作表「全國(登記)」）
 *   public/data/age_raw.csv    ← 人口年齡結構指標
 * ============================================================ */
import * as d3 from 'd3'

const BASE = import.meta.env.BASE_URL   // Vite 的部署根目錄，讓 dev 和 build 後路徑都正確

// 1. 讀檔並自動判斷編碼：先試 UTF-8，失敗就當 Big5（Excel 一般「CSV」存檔是 Big5）
async function loadRows(url) {
  const buf = await d3.buffer(url)
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { text = new TextDecoder('big5').decode(buf) }
  return d3.csvParseRows(text.replace(/^﻿/, ''))   // 去掉 BOM，逐列讀成陣列
}

// 2. 把儲存格轉成數字：處理千分位逗號、空白、「…」「-」等缺值符號
function num(cell) {
  if (cell == null) return null
  const s = String(cell).replace(/[,\s]/g, '')
  if (s === '' || /^[…\-－—]+$/.test(s)) return null
  const v = +s
  return Number.isFinite(v) ? v : null
}

// 3. 只留資料列：第一欄是「民國NN年」的才算，並換成西元年
function dataRows(rows) {
  return rows
    .map(r => ({ r, m: String(r[0] ?? '').match(/民國\s*(\d+)\s*年/) }))
    .filter(d => d.m)
    .map(d => ({ year: +d.m[1] + 1911, r: d.r }))
}

export async function loadPopulation() {
  const [birthRaw, ageRaw] = await Promise.all([
    loadRows(`${BASE}data/births_raw.csv`),
    loadRows(`${BASE}data/age_raw.csv`),
  ])

  // 出生檔欄位：0 民國年｜1 西元年｜2 出生數計｜3 男｜4 女｜5 性比例｜6 粗出生率
  const births = dataRows(birthRaw).map(({ year, r }) => ({ year, births: num(r[2]), birth_rate: num(r[6]) }))

  // 年齡檔欄位：0 民國年｜1 西元年｜2 總計｜之後每個年齡層兩欄（人數、%）
  const GROUPS = ['0_4', '0_6', '0_11', '12_17', '20p', '65p']
  const ages = dataRows(ageRaw).map(({ year, r }) => {
    const o = { year, total_pop: num(r[2]) }
    GROUPS.forEach((g, i) => { o['pop_' + g] = num(r[3 + i * 2]); o['pct_' + g] = num(r[4 + i * 2]) })
    return o
  })

  // 4. 依年份合併（出生資料從 1958、年齡資料從 1974 開始，沒有的欄位是 null）
  const birthByYear = d3.index(births, d => d.year)
  const ageByYear = d3.index(ages, d => d.year)
  const years = d3.sort(d3.union(births.map(d => d.year), ages.map(d => d.year)))
  const data = years
    .map(y => ({ pct_65p: null, pct_0_11: null, ...birthByYear.get(y), ...ageByYear.get(y), year: y }))
    .filter(d => d.births != null)

  console.table(data.slice(-3))   // 開 F12 檢查最後三年有沒有讀對
  return data
}
