// 通用工具：日期、格式化、DOM 辅助
export const $ = (sel, root = document) => root.querySelector(sel)
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel))

export function pad(n) { return String(n).padStart(2, '0') }

// YYYY-MM-DD（本地时区）
export function today() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate())
}

export function daysUntil(dateStr) {
  const [y, m, d] = (dateStr || today()).split('-').map(Number)
  const target = new Date(y, m - 1, d).setHours(0, 0, 0, 0)
  const now = new Date().setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// 最近 7 个日期（从今天往前），返回 [{str, label}]
export function last7() {
  const out = []
  for (let i = 6; i >= 0; i--) out.push({ str: addDays(today(), -i), label: null })
  const wd = ['日', '一', '二', '三', '四', '五', '六']
  return out.map((d) => {
    const dt = new Date(d.str + 'T00:00:00')
    return { ...d, label: dt.getDay() === new Date().getDay() ? '今' : wd[dt.getDay()] }
  })
}

export function nowHM() {
  const d = new Date()
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

// 秒 -> M:SS 或 H:MM:SS
export function fmtDur(sec) {
  sec = Math.max(0, Math.floor(sec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 简单弹窗反馈
export function toast(msg) {
  let el = $('#toast-wrap')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast-wrap'
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '86px', transform: 'translateX(-50%)',
      background: 'rgba(30,34,48,.92)', color: '#fff', padding: '9px 16px',
      borderRadius: '12px', fontSize: '13px', zIndex: 200, transition: 'opacity .2s',
      maxWidth: '80vw', textAlign: 'center', pointerEvents: 'none',
    })
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.style.opacity = '1'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.opacity = '0' }, 1800)
}