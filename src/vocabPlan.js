// 单词每日计划 + 复习调度
// 新词：按天数区间切分词表
// 复习：1 / 3 / 7 / 15 天后回溯到当天的词
import { VOCAB, VOCAB_SIZE } from './vocab.js'
import { loadJSON, saveJSON } from './store.js'
import { today, addDays } from './utils.js'

const KEY_SETTINGS = 'kyw_vocab_settings'   // { startDate, newPerDay, reviewBatches }
const KEY_MASTERED = 'kyw_vocab_mastered'   // { wordIndex: true } 已掌握（少复习）

// 学习日编号：0 开始（startDate 为第 0 天）
export function dayIndex(dateStr, startDate) {
  return Math.max(0, Math.round((new Date(dateStr + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000))
}

// 计算每天都安排哪些新词
export function newWordsForDate(dateStr, startDate, newPerDay) {
  if (!startDate || !newPerDay) return []
  const di = dayIndex(dateStr, startDate)
  const from = di * newPerDay
  if (from >= VOCAB_SIZE) return []
  return VOCAB.slice(from, from + newPerDay)
}

// 复习单词：学过的、且在复习间隔(1/3/7/15)内轮到今天的
export function reviewWordsForDate(dateStr, startDate, newPerDay) {
  const out = []
  if (!startDate || !newPerDay) return out
  const di = dayIndex(dateStr, startDate)
  for (let i = 0; i <= di; i++) {
    // 第 i 天学的新词
    const from = i * newPerDay
    if (from >= VOCAB_SIZE) break
    const batch = VOCAB.slice(from, from + newPerDay)
    // 间隔天数
    const intervals = [1, 3, 7, 15]
    batch.forEach((v, bi) => {
      const globalIdx = from + bi
      // 已掌握则跳过复习
      if (getMastered().has(globalIdx)) return
      const gap = di - i
      if (intervals.includes(gap)) out.push({ word: v, learnedOn: i, gap })
    })
  }
  return out
}

// 已掌握集合
let masteredCache = null
function getMastered() {
  if (!masteredCache) {
    const map = loadJSON(KEY_MASTERED, {}) || {}
    masteredCache = new Map(Object.entries(map).map(([k, v]) => [Number(k), v]))
  }
  return masteredCache
}
export function saveMastered() {
  masteredCache = null // 下次重新读
  saveJSON(KEY_MASTERED, Object.fromEntries([...getMastered().entries()]))
  saveJSON(KEY_SETTINGS, getSettings())
}

// 读取/写入设置
export function getSettings() {
  return loadJSON(KEY_SETTINGS, null) || null
}
export function saveSettings(s) {
  saveJSON(KEY_SETTINGS, s)
  saveJSON(KEY_MASTERED, Object.fromEntries([...getMastered().entries()]))
}

export function setMastered(idx, on) {
  const m = getMastered()
  if (on) m.set(idx, true); else m.delete(idx)
  saveMastered()
}
export function isMastered(idx) {
  return getMastered().has(idx)
}

// 自动分配：根据距考研剩余天数，算每天该学几个才能学完并留出复习日
// 剩余天 = daysLeft；返回 { newPerDay, totalDays, daysLeft }
export function autoPlan(daysLeft) {
  // 预留最后 30 天纯复习
  const studyDays = Math.max(1, daysLeft - 30)
  const perDay = Math.max(1, Math.ceil(VOCAB_SIZE / studyDays))
  return {
    newPerDay: perDay,
    totalStudyDays: Math.ceil(VOCAB_SIZE / perDay),
    daysLeft,
  }
}

// 提示文案：距考研剩余天数
export function remainingDays(examDate) {
  return Math.round((new Date(examDate + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
}