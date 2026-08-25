// 本地存储封装：读写 JSON，自动降级（隐私窗口等场景）
const mem = new Map()

function canUse() {
  try {
    const k = '__ky_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch { return false }
}
const OK = canUse()

export function loadJSON(key, fallback = null) {
  if (!OK) return mem.has(key) ? mem.get(key) : fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch { return fallback }
}

export function saveJSON(key, val) {
  mem.set(key, val)
  if (!OK) return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* 满则忽略 */ }
}

// 本地实现去重且有序的日期键集合
export function uniqueDates(list) {
  const s = new Set()
  for (const d of list) s.add(d)
  return Array.from(s).sort()
}