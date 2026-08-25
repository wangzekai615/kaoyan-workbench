// 弹窗视口适配：iOS 键盘弹出时，visualViewport 高度变小，
// 动态压扁 .modal 的 max-height，保证底部按钮始终在可视区内可见。
// 用法：打开弹窗(.modal-mask 去掉 hidden)后调用 fitModalMask(maskEl)
let activeListener = null

export function fitModalMask(maskEl) {
  const modal = maskEl ? maskEl.querySelector('.modal') : null
  if (!modal) return
  applyHeight()

  function applyHeight() {
    // 优先用 visualViewport（iOS 键盘会压缩它）；兼容性回退用 innerHeight
    const vv = window.visualViewport
    const height = vv ? vv.height : window.innerHeight
    // 底部安全区留白（Home 条），键盘打开时常为 0
    modal.style.maxHeight = Math.min(height * 0.9, height - 20) + 'px'
  }

  // 清理旧监听
  if (activeListener) teardown()
  activeListener = { maskEl, modal, applyHeight }

  if (window.visualViewport) window.visualViewport.addEventListener('resize', applyHeight)
  window.addEventListener('resize', applyHeight)
  // 键盘通常触发 resize / visualViewport.resize，短轮询兜底（iOS 某些场景）
  modal._vvTimer = setInterval(applyHeight, 300)
}

export function teardownModalFit() {
  if (!activeListener) return
  const { applyHeight, modal } = activeListener
  if (window.visualViewport) window.visualViewport.removeEventListener('resize', applyHeight)
  window.removeEventListener('resize', applyHeight)
  if (modal) clearInterval(modal._vvTimer)
  activeListener = null
}