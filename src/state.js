// 应用状态：本地存储 + 可选 Supabase 云同步
import { loadJSON, saveJSON, uniqueDates } from './store.js'
import { STORE_KEYS, SUBJECTS, INIT_PLAN } from './config.js'
import { today, addDays } from './utils.js'
import { getPlan } from './plans.js'
import { cloudInit, cloudSync } from './cloud.js'

export const state = {
  plans: { ...INIT_PLAN },
  checkins: {},            // { date: { subject: true } }
  notes: [],
  coding: [],
  timerHist: [],           // { date, n, min }
  taskDone: {},            // { subjectKey: { taskId: true } } 学习计划任务完成记录
  theme: 'light',
}

export function loadAll() {
  state.plans = { ...INIT_PLAN, ...(loadJSON(STORE_KEYS.plans, {}) || {}) }
  state.checkins = loadJSON(STORE_KEYS.checkins, {}) || {}
  state.notes = loadJSON(STORE_KEYS.notes, []) || []
  state.coding = loadJSON(STORE_KEYS.coding, []) || []
  state.timerHist = loadJSON(STORE_KEYS.timer_history, []) || []
  // 学习计划进度：任务按 id 记录是否完成
  state.taskDone = loadJSON(STORE_KEYS.taskDone, {}) || {}
  state.theme = loadJSON('kyw_theme', 'light') || 'light'
}

export function persistAll() {
  saveJSON(STORE_KEYS.plans, state.plans)
  saveJSON(STORE_KEYS.checkins, state.checkins)
  saveJSON(STORE_KEYS.notes, state.notes)
  saveJSON(STORE_KEYS.coding, state.coding)
  saveJSON(STORE_KEYS.timer_history, state.timerHist)
  saveJSON(STORE_KEYS.taskDone, state.taskDone)
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

// ---------- 学习计划任务打卡 ----------
// 任务 ID：由科目 + 阶段 + 任务下标生成，保证稳定
export function taskId(subject, stageIdx, taskIdx) {
  return `${subject}-s${stageIdx}-t${taskIdx}`
}

// 标记某科某阶段第 taskIdx 个任务完成/取消
// 只要今天完成了该科 ≥1 项任务 → 自动为该科今日打卡（每天都算“学了这科”）
export function toggleTask(subject, stageIdx, taskIdx) {
  const id = taskId(subject, stageIdx, taskIdx)
  if (!state.taskDone[subject]) state.taskDone[subject] = {}
  if (state.taskDone[subject][id]) {
    delete state.taskDone[subject][id]
  } else {
    state.taskDone[subject][id] = true
  }
  // 清理空对象
  if (!Object.keys(state.taskDone[subject]).length) delete state.taskDone[subject]

  // 该科今天还有已完成的任务 → 自动今日打卡；一个都没有了 → 取消今日该科打卡
  const hasDoneToday = !!state.taskDone[subject] && Object.keys(state.taskDone[subject]).length > 0
  if (!state.checkins[today()]) state.checkins[today()] = {}
  if (hasDoneToday) {
    state.checkins[today()][subject] = true
  } else {
    delete state.checkins[today()][subject]
    if (!Object.keys(state.checkins[today()]).length) delete state.checkins[today()]
  }
  persistAll()
}

export function isTaskDone(subject, stageIdx, taskIdx) {
  return !!state.taskDone[subject]?.[taskId(subject, stageIdx, taskIdx)]
}

// 学习计划：重置某科目全部任务完成进度（并同步取消该科今日打卡）
export function resetSubjectTasks(subject) {
  // 无条件清空该科任务进度
  if (state.taskDone[subject]) {
    delete state.taskDone[subject]
    if (!Object.keys(state.taskDone).length) state.taskDone = {}
  }
  // 同时撤掉该科今日打卡（任务清零 → 不应再显示已打卡）
  if (state.checkins[today()] && state.checkins[today()][subject]) {
    delete state.checkins[today()][subject]
    if (!Object.keys(state.checkins[today()]).length) delete state.checkins[today()]
  }
  persistAll()
}

export function addNote(note) {
  state.notes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...note })
  persistAll()
}

// 生成图片 id（用 crypto 随机）
export function newImgId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
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
  saveJSON(STORE_KEYS.taskDone, state.taskDone)
}
export function initCloud() { cloudInit() }