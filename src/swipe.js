// 轻量左右滑动切 Tab（移动端友好）
export function swipeTab(root, onSwipe) {
  let startX = null
  let startY = null
  let startT = null

  root.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]
    startX = t.clientX
    startY = t.clientY
    startT = Date.now()
  }, { passive: true })

  root.addEventListener('touchend', (e) => {
    if (startX == null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    const dt = Date.now() - startT
    // 横向位移足够、竖向往上少、时间短，认为是翻页手势
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
      if (dx < 0) onSwipe(1)
      else onSwipe(-1)
    }
    startX = startY = startT = null
  }, { passive: true })
}