// 考研上岸工作台 —— 入口
import './styles/global.css'
import { loadAll, bindCloudRerender } from './state.js'
import { homeHTML, homeBind } from './views/home.js'
import { timerHTML, timerBind } from './views/timer.js'
import { notesHTML, notesBind } from './views/notes.js'
import { codingHTML, codingBind } from './views/coding.js'
import { statsHTML, statsBind } from './views/stats.js'
import { swipeTab } from './swipe.js'

const app = document.getElementById('app')

// Service Worker（PWA 离线）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
}

const TABS = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'timer', label: '番茄钟', icon: '🍅' },
  { id: 'notes', label: '错题本', icon: '📚' },
  { id: 'coding', label: '刷题', icon: '⚔️' },
  { id: 'stats', label: '统计', icon: '📊' },
]

const state = { view: 'home', filter: {}, lastPos: null }

function render() {
  const v = state.view
  let html = ''
  useEffectCleanup()
  switch (v) {
    case 'home': html = homeHTML(); break
    case 'timer': html = timerHTML(); break
    case 'notes': html = notesHTML(state.filter.notes); break
    case 'coding': html = codingHTML(state.filter.coding); break
    case 'stats': html = statsHTML(); break
  }
  app.innerHTML = html + navHTML()

  const root = app
  // 记住滚动位置
  const page = root.querySelector('.page')
  if (page && state.lastPos !== null) { page.scrollTop = state.lastPos }

  bindNav(root)
  switch (v) {
    case 'home': homeBind(root); break
    case 'timer': timerBind(root); break
    case 'notes': notesBind(root, (next) => goto(next)); break
    case 'coding': codingBind(root, (next) => goto(next)); break
    case 'stats': statsBind(root); break
  }
  swipeTab(root, (dir) => tapTab(nextTab(dir)))

  return root
}

function navHTML() {
  return `<nav class="bottom-nav">${TABS.map((t) => `
    <button data-tab="${t.id}" class="${state.view === t.id ? 'active' : ''}">
      <span class="ic">${t.icon}</span>
      <span>${t.label}</span>
    </button>`).join('')}</nav>`
}

function bindNav(root) {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => tapTab(btn.dataset.tab))
  })
}

function goto(opts) {
  if (opts.view !== state.view) keepScroll()
  state.view = opts.view
  if (opts.filter) state.filter[opts.view] = opts.filter
  render()
}

function nextTab(dir) {
  const idx = TABS.findIndex((t) => t.id === state.view)
  const ni = (idx + dir + TABS.length) % TABS.length
  return TABS[ni].id
}

function tapTab(id) {
  if (id === state.view) return
  keepScroll()
  state.view = id
  render()
}

function keepScroll() {
  const page = app.querySelector('.page')
  if (page) state.lastPos = page.scrollTop
}

// 每次重渲染前清理子视图绑定的计时器等副作用
function useEffectCleanup() {}
// 番茄钟的 setInterval 在重渲染后自然失效（DOM 被替换）

// 初始化
loadAll()
bindCloudRerender(() => {
  if (document.visibilityState === 'hidden') return
  if (state.view === 'stats' || state.view === 'home') render()
})
render()