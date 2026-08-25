// 弹窗视口适配：iOS 键盘弹出时，visualViewport 高度变小，
// 动态调整 .modal 的最大高度，保证底部按钮始终在可视区内可见。
// 只响应 resize 事件（键盘弹/收都会触发），绝不轮询——避免和用户滚动打架（无法停留）。
// 用法：打开弹窗(.modal-mask 去掉 hidden)后调用 fitModalMask(maskEl)
let activeListener = null

export function fitModalMask(maskEl) {
  const modal = maskEl ? maskEl.querySelector('.modal') : null
  if (!modal) return

  // 清理旧监听
  if (activeListener) teardownModalFit()

  function applyHeight() {
    const vv = window.visualViewport
    const height = vv ? vv.height : window.innerHeight
    if (!height) return
    // 关键：maxHeight 只设上限，不强制 min。内容不满时用自然高度，避免弹窗异常压缩。
    // 留底部安全区（Home 条），但不超过当前可视高度太多。
    const cap = Math.max(220, height - 8)   // 8px 余量，不硬压
    modal.style.maxHeight = cap + 'px'
  }

  applyHeight()
  activeListener = { modal, applyHeight }

  // 锁定背景滚动（iOS 上避免 modal 与 .page 双层滚动互抢 → 停不住/回弹）
  const page = document.querySelector('.page')
  if (page) { page.dataset.scrollLock = '1'; page.style.overflowY = 'hidden' }

  // 只绑 resize：iOS 键盘弹出/收起、屏幕旋转都会触发。removeEventListener 用原引用。
  if (window.visualViewport) window.visualViewport.addEventListener('resize', applyHeight, { passive: true })
  window.addEventListener('resize', applyHeight, { passive: true })
  // 焦点变化也会导致 visualViewport 收缩（Safari 焦点滚动），补一个 focusin 兜底
  const onFocus = () => requestAnimationFrame(applyHeight)
  document.addEventListener('focusin', onFocus, { passive: true })
  activeListener.onFocus = onFocus
}

// —— 弹窗开合动画 ——
// 入场：移除 hidden → rAF 后加 show（触发过渡）
// 离场：先移除 show 播动画 → 动画结束再 hidden
function getNav() {
  return document.querySelector('.bottom-nav')
}
// 弹窗计数：多个弹窗同时开时，全部关闭才恢复导航
let navHideCount = 0

export function openModalMask(maskEl) {
  if (!maskEl) return
  maskEl.classList.remove('hidden')
  // 强制重排确保 transition 生效
  void maskEl.offsetHeight
  requestAnimationFrame(() => {
    maskEl.classList.add('show')
  })
  fitModalMask(maskEl)
  // 隐藏底部导航，让弹窗成为独立层
  const nav = getNav()
  if (nav && !nav.classList.contains('nav-hide')) {
    nav.classList.add('nav-hide')
    navHideCount++
  }
}

export function closeModalMask(maskEl) {
  if (!maskEl) return
  maskEl.classList.remove('show')
  teardownModalFit()
  // 恢复底部导航（计数安全，等离场动画后再解）
  if (navHideCount > 0) {
    navHideCount--
    if (navHideCount === 0) {
      setTimeout(() => {
        const nav = getNav()
        if (nav) nav.classList.remove('nav-hide')
      }, 180)  // 弹窗先滑出，底栏随后滑回，节奏更顺
    }
  }
  // 等离场过渡(~300ms)结束后再真正隐藏，避免 display:none 掐断动画
  clearTimeout(maskEl._closeT)
  maskEl._closeT = setTimeout(() => {
    if (!maskEl.classList.contains('show')) {
      maskEl.classList.add('hidden')
    }
  }, 320)
}

export function teardownModalFit() {
  if (!activeListener) return
  const { modal, applyHeight, onFocus } = activeListener
  if (window.visualViewport) window.visualViewport.removeEventListener('resize', applyHeight)
  window.removeEventListener('resize', applyHeight)
  if (onFocus) document.removeEventListener('focusin', onFocus)
  // 复位 style + 解锁背景滚动
  if (modal) modal.style.maxHeight = ''
  const page = document.querySelector('.page')
  if (page && page.dataset.scrollLock === '1') { page.style.overflowY = ''; delete page.dataset.scrollLock }
  activeListener = null
}