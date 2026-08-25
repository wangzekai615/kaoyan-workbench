// 应用状态：本地存储 + 可选 Supabase 云同步
import { loadJSON, saveJSON, uniqueDates } from './store.js'
import { STORE_KEYS, SUBJECTS, INIT_PLAN } from './config.js'
import { today, addDays } from './utils.js'
import { cloudInit, cloudSync } from './cloud.js'

export const state = {
  plans: { ...INIT_PLAN },
  checkins: {},            // { date: { subject: true } }
  notes: [],
  coding: [],
  timerHist: [],           // { date, n, min }
  theme: 'light',
}

export function loadAll() {
  state.plans = { ...INIT_PLAN, ...(loadJSON(STORE_KEYS.plans, {}) || {}) }
  state.checkins = loadJSON(STORE_KEYS.checkins, {}) || {}
  state.notes = loadJSON(STORE_KEYS.notes, []) || []
  state.coding = loadJSON(STORE_KEYS.coding, []) || []
  state.timerHist = loadJSON(STORE_KEYS.timer_history, []) || []
  state.theme = loadJSON('kyw_theme', 'light') || 'light'
}

export function persistAll() {
  saveJSON(STORE_KEYS.plans, state.plans)
  saveJSON(STORE_KEYS.checkins, state.checkins)
  saveJSON(STORE_KEYS.notes, state.notes)
  saveJSON(STORE_KEYS.coding, state.coding)
  saveJSON(STORE_KEYS.timer_history, state.timerHist)
  saveJSON('kyw_theme', state.theme)
  syncCloud()
}

// ---------- 业务操作（写前先深拷贝避免引用污染） ----------
export function setPlan(key, val) {
  const v = Math.max(0, Math.min(100, Number(val) || 0))
  state.plans[key] = v
  persistAll()
}

export function toggleCheckin(date, key) {
  if (!state.checkins[date]) state.checkins[date] = {}
  if (state.checkins[date][key]) {
    delete state.checkins[date][key]
    if (!Object.keys(state.checkins[date]).length) delete state.checkins[date]
  } else {
    state.checkins[date][key] = true
  }
  persistAll()
}

export function addNote(note) {
  state.notes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...note })
  persistAll()
}

export function updateNote(id, patch) {
  const i = state.notes.findIndex((n) => n.id === id)
  if (i >= 0) { state.notes[i] = { ...state.notes[i], ...patch }; persistAll() }
}

export function delNote(id) {
  state.notes = state.notes.filter((n) => n.id !== id)
  persistAll()
}

export function addCoding(c) {
  state.coding.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...c })
  persistAll()
}

export function delCoding(id) {
  state.coding = state.coding.filter((x) => x.id !== id)
  persistAll()
}

export function addTimerHist(min) {
  state.timerHist.push({ date: today(), n: 1, min })
  persistAll()
}

export function codingDays() {
  return uniqueDates(state.coding.map((x) => x.date))
}

export function checkinDays() {
  return uniqueDates(Object.keys(state.checkins))
}

// 科目完成度：当天打了卡的科目占全部科目比例
export function todayProgress(date = today()) {
  const d = state.checkins[date] || {}
  const done = Object.keys(d).filter((k) => SUBJECTS.some((s) => s.key === k)).length
  return { done, total: SUBJECTS.length, pct: Math.round((done / SUBJECTS.length) * 100) }
}

// 连续打卡天数
export function streaks() {
  let cur = 0
  let d = today()
  while (state.checkins[d] && Object.keys(state.checkins[d]).length) {
    cur++
    d = addDays(d, -1)
  }
  return cur
}

// ---------- 云同步（Supabase 可选，未配置则为空操作） ----------
let syncing = false
export function bindCloudRerender(render) { if (typeof render === 'function') _render = render }
let _render = null
export function syncCloud() {
  if (syncing) return
  syncing = true
  cloudSync(state).then((remote) => {
    syncing = false
    if (remote) {
      Object.assign(state, remote)
      persistLocalOnly()
      if (_render) _render()
    }
  }).catch(() => { syncing = false })
}
function persistLocalOnly() {
  saveJSON(STORE_KEYS.plans, state.plans)
  saveJSON(STORE_KEYS.checkins, state.checkins)
  saveJSON(STORE_KEYS.notes, state.notes)
  saveJSON(STORE_KEYS.coding, state.coding)
  saveJSON(STORE_KEYS.timer_history, state.timerHist)
}
export function initCloud() { cloudInit() }