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

const state = { view: 'home', filter: {}, lastPos: null, anim: 'next' }  // anim: next|prev|up|none

const buildHTML = (v) => {
  switch (v) {
    case 'home': return homeHTML()
    case 'plan': return planHTML(state.subject || 'math')
    case 'vocab': return vocabHTML()
    case 'timer': return timerHTML()
    case 'notes': return notesHTML(state.filter.notes)
    case 'coding': return codingHTML(state.filter.coding)
    case 'stats': return statsHTML()
    default: return ''
  }
}

function render() {
  const v = state.view
  const anim = state.anim || 'next'
  const html = buildHTML(v)

  // —— 旧页面离场动画 ——
  const oldPage = app.querySelector('.page')
  if (oldPage && anim !== 'none') {
    const leaveClass = anim === 'up' ? 'page-leave-down' : (anim === 'rev' ? 'page-leave-prev' : 'page-leave-next')
    oldPage.classList.remove('page-enter-next', 'page-enter-prev', 'page-enter-up')
    oldPage.classList.add(leaveClass)
  }
  // 底部导航立即更新（不参与过渡）
  app.querySelectorAll('.bottom-nav').forEach((n) => n.remove())
  app.insertAdjacentHTML('beforeend', navHTML())

  // 延迟插入新页面，让旧页离场先播放一半（更快，避免两段都吃满时长）
  const delay = oldPage && anim !== 'none' ? 70 : 0
  setTimeout(() => {
    // 移除旧页面（不含 nav）
    app.querySelectorAll('.page').forEach((n) => n.remove())

    const newRoot = document.createElement('div')
    newRoot.innerHTML = html.trim() ? html : '<div class="page"></div>'
    const pageEl = newRoot.querySelector('.page') || newRoot.children[0]
    if (pageEl) {
      const enterClass = anim === 'up' ? 'page-enter-up' : (anim === 'rev' ? 'page-enter-prev' : 'page-enter-next')
      pageEl.classList.add(enterClass)
    }
    // 保持滚动
    if (state.lastPos !== null) pageEl && (pageEl.scrollTop = state.lastPos)

    app.prepend(newRoot.children[0] || newRoot)
    const root = app

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

    // 下拉刷新
    const p = root.querySelector('.page')
    if (p && v !== 'timer') {
      attachPullRefresh(p, (done) => {
        const target = v
        keepScroll()
        refreshSW().then(() => {
          state.anim = 'none'
          renderPreservingView(target)
          state.anim = 'next'
          done()
          if (navigator.vibrate) navigator.vibrate(30)
        })
      })
    }
  }, delay)
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

const DETAIL_VIEWS = ['plan', 'vocab']  // 详情页（从底部进入）

function goto(opts) {
  if (opts.view !== state.view) keepScroll()
  if (opts.view === state.view) {
    // 同视图刷新（如筛选切换）用淡入淡出
    state.anim = 'none'
  } else if (DETAIL_VIEWS.includes(opts.view)) {
    state.anim = 'up'          // 进入详情：从下往上
  } else if (DETAIL_VIEWS.includes(state.view)) {
    state.anim = 'rev'         // 从详情返回主视图：反向
  } else {
    state.anim = 'next'
  }
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
  // 根据 Tab 顺序决定方向：往前(next)还是往后(rev)
  const idxCur = TABS.findIndex((t) => t.id === state.view)
  const idxNext = TABS.findIndex((t) => t.id === id)
  state.anim = idxNext > idxCur ? 'next' : 'rev'
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
  state.anim = 'none'   // 刷新不播动画
  render()
}

// 下拉刷新时：检查 Service Worker 是否有新版，若有则整页重新加载拿最新代码
let swReloaded = false  // 整页 reload 过一次后永久停（防循环）
function refreshSW() {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      setTimeout(resolve, 250); return
    }
    let fired = false
    const listener = () => {
      if (!swReloaded) {
        swReloaded = true
        window.location.reload()   // 新 SW 接管 → 重载拿最新 bundle
      }
    }
    // 每次调用都监听 controllerchange；只要触发过 reload 就再也不触发第二次
    navigator.serviceWorker.addEventListener('controllerchange', listener)
    navigator.serviceWorker.ready
      .then((reg) => reg.update())
      .then(() => {
        // 给 800ms 观察 controllerchange；没有则视为无新版，仅本地重渲染
        setTimeout(() => { if (!fired) resolve() }, 800)
        // 若 reload 已发生，listener 内部已改 swReloaded
      })
      .catch(() => resolve())
  })
}

// 初始化
loadAll()
state.anim = 'none'   // 首屏不播动画
bindCloudRerender(() => {
  if (document.visibilityState === 'hidden') return
  if (state.view === 'stats' || state.view === 'home') render()
})
render()
state.anim = 'next'

// 启动时静默检查 SW 更新：有新版本自动整页重载（保持用最新代码）
;(async () => {
  try {
    await refreshSW()
  } catch { /* 忽略 */ }
})()