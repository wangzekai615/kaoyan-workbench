// 考研上岸工作台 —— 入口
import './styles/global.css'
import { loadAll, bindCloudRerender } from './state.js'
import { homeHTML, homeBind } from './views/home.js'
import { planHTML, planBind } from './views/plan.js'
import { vocabHTML, vocabBind } from './views/vocab.js'
import { timerHTML, timerBind } from './views/timer.js'
import { notesHTML, notesBind } from './views/notes.js'
import { codingHTML, codingBind } from './views/coding.js'
import { statsHTML, statsBind } from './views/stats.js'
import { swipeTab } from './swipe.js'
import { attachPullRefresh } from './pullRefresh.js'

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
    case 'plan': html = planHTML(state.subject || 'math'); break
    case 'vocab': html = vocabHTML(); break
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
    case 'home': homeBind(root, (next) => goto(next)); break
    case 'plan': planBind(root, (next) => goto(next)); break
    case 'vocab': vocabBind(root, (next) => goto(next)); break
    case 'timer': timerBind(root); break
    case 'notes': notesBind(root, (next) => goto(next)); break
    case 'coding': codingBind(root, (next) => goto(next)); break
    case 'stats': statsBind(root); break
  }
  swipeTab(root, (dir) => tapTab(nextTab(dir)))

  // 下拉刷新：所有带 .page 的视图都可下拉重载当前页
  const p = root.querySelector('.page')
  if (p && v !== 'timer') {
    attachPullRefresh(p, (done) => {
      // 重新 loadAll + 重渲染当前视图（保持用户所在位置）
      const target = v
      keepScroll()
      refreshSW().then(() => {
        renderPreservingView(target)
        done()
        if (navigator.vibrate) navigator.vibrate(30)
      })
    })
  }

  return root
}

function navHTML() {
  // 计划/背词详情页隐藏底部导航（返回即可）
  if (state.view === 'plan' || state.view === 'vocab') return ''
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
  // 学习计划：记录要查看的科目
  if (opts.subject) state.subject = opts.subject
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

// 下拉刷新：重新加载本地数据并重渲染当前视图（不切换 Tab）
function renderPreservingView(target) {
  loadAll()
  state.view = target
  render()
}

// 下拉刷新时：检查 Service Worker 是否有新版，若有则整页重新加载拿最新代码
function refreshSW() {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      setTimeout(resolve, 250); return
    }
    let reloaded = false
    navigator.serviceWorker.ready
      .then((reg) => reg.update())
      .then(() => listener())
      .catch(() => resolve())

    function listener() {
      // 初次 update 后，检查是否有新 SW 已 activate
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()   // 新 SW 接管 → 重载拿最新 bundle
      })
      // 给 800ms 观察 controllerchange；没有则视为无新版，仅本地重渲染
      setTimeout(() => { if (!reloaded) resolve() }, 800)
    }
  })
}

// 初始化
loadAll()
bindCloudRerender(() => {
  if (document.visibilityState === 'hidden') return
  if (state.view === 'stats' || state.view === 'home') render()
})
render()