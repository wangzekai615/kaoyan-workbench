// 下拉刷新：在页面顶部下拉触发「刷新当前视图」
// 挂载到 .page 滚动容器，滚动到顶时下拉超过阈值触发。
// 基座要求：容器 position:relative 内部有 .pull-indicator 顶栏。
import { today } from './utils.js'

const PULL_DIST = 64    // 触发刷新所需下拉距离(px)
const MAX_DIST = 96     // 拖拽最大距离

// 给 .page 挂载下拉刷新
// onRefresh: (done) => 触发刷新，异步完成后调用 done() 收起指示器
export function attachPullRefresh(pageEl, onRefresh) {
  if (!pageEl) return
  // 初始 .page 可能有 transform 或 padding，这里直接操作 style
  let startY = null
  let pulling = false
  let startScrollTop = 0

  // 插入指示器（只插一次）
  let indicator = pageEl.querySelector('.pull-indicator')
  if (!indicator) {
    indicator = document.createElement('div')
    indicator.className = 'pull-indicator'
    indicator.innerHTML = '<div class="pull-spinner" style="display:none"></div><span class="pull-text">下拉刷新</span>'
    pageEl.prepend(indicator)
  }
  const spinner = indicator.querySelector('.pull-spinner')
  const text = indicator.querySelector('.pull-text')

  function setDist(d) {
    indicator.style.height = Math.round(d) + 'px'
    text.textContent = d >= PULL_DIST ? '释放刷新' : '下拉刷新'
    // 指示器随下拉渐显：直接把 transform 应用到整个 page
  }

  function reset() {
    pulling = false
    startY = null
    indicator.style.height = '0px'
    text.textContent = '下拉刷新'
    spinner.style.display = 'none'
    pageEl.style.transform = ''
  }

  pageEl.addEventListener('touchstart', (e) => {
    if (pageEl.scrollTop !== 0) return   // 不在顶部不响应
    if (e.touches.length !== 1) return
    startY = e.touches[0].clientY
    startScrollTop = pageEl.scrollTop
    pulling = true
  }, { passive: true })

  pageEl.addEventListener('touchmove', (e) => {
    if (!pulling) return
    const dy = e.touches[0].clientY - startY
    // 只在往下拉且 scrollTop 为 0 时才视为下拉
    if (pageEl.scrollTop > 0) { reset(); return }
    if (dy <= 0) { setDist(0); return }
    const d = Math.min(dy * 0.5, MAX_DIST)   // 阻尼
    setDist(d)
    pageEl.style.transform = `translateY(${d}px)`
    indicator.style.height = d + 'px'
    if (d >= PULL_DIST) text.textContent = '释放刷新'
    else text.textContent = '下拉刷新'
    e.preventDefault?.()
  }, { passive: false })

  pageEl.addEventListener('touchend', () => {
    if (!pulling) return
    const d = parseFloat(indicator.style.height || '0')
    pulling = false
    startY = null
    if (d >= PULL_DIST) {
      // 触发刷新
      text.textContent = '刷新中…'
      spinner.style.display = 'block'
      spinner.classList.add('spin')
      pageEl.style.transform = `translateY(0px)`
      indicator.style.height = '42px'
      onRefresh(() => {
        reset()
      })
    } else {
      reset()
    }
  }, { passive: true })

  return pageEl
}

// 追加：刷新时的顶部提示提示（复用 toast 更轻量，这里用 indicator 已有视觉）
export function nowStamp() {
  return `${today()} ${new Date().toTimeString().slice(0, 8)}`
}