// 首页：倒计时 + 今日打卡 + 科目进度
import { $, esc, today, last7, daysUntil } from '../utils.js'
import { state, toggleCheckin, todayProgress } from '../state.js'
import { SUBJECTS, EXAM_DATE, EXAM_DATE_CN } from '../config.js'

const fmtDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`

export function homeHTML() {
  const days = daysUntil(EXAM_DATE)
  const seven = last7()
  const t = today()
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  const todayWeek = weeks[new Date(t + 'T00:00:00').getDay()]
  const prog = todayProgress(t)

  const weekCells = seven
    .map((d) => {
      const done = state.checkins[d.str] && Object.keys(state.checkins[d.str]).length
      const isT = d.str === t
      return `<div class="day ${isT ? 'active' : ''}">
        <div>${d.label}</div>
        <div class="dot ${done ? '' : 'blank'}"></div>
      </div>`
    })
    .join('')

  const subjects = SUBJECTS.map((s) => {
    const p = state.plans[s.key] ?? 0
    const doneToday = !!(state.checkins[t] || {})[s.key]
    return `<div class="card subject-card">
      <div class="swatch" style="background:${s.color}22;color:${s.color}">${s.emoji}</div>
      <div class="grow">
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600">
          <span>${s.name}</span>
          <span style="color:${s.color}">${p}%</span>
        </div>
        <div class="bar"><i style="width:${p}%;background:${s.color}"></i></div>
      </div>
      <button class="btn ${doneToday ? 'ghost' : 'accent'}" data-k="${s.key}" style="padding:8px 12px;font-size:13px;border-radius:999px">
        ${doneToday ? '✓ 已打卡' : '打卡'}
      </button>
    </div>`
  }).join('')

  return `
  <div class="page">
    <div class="topbar">
      <h1>上岸工作台</h1>
      <span class="badge ${days <= 100 ? 'warn' : ''}">📌 距考研 ${days} 天</span>
    </div>

    <div class="card countdown">
      <div class="days">${days}<small> 天</small></div>
      <div class="date">考研初试 ${EXAM_DATE_CN}（预计，以报考公告为准）· 今天是${todayWeek} · ${fmtDate(new Date())}</div>
    </div>

    <div class="card">
      <h3>本周打卡</h3>
      <div class="weekview">${weekCells}</div>
      <div style="font-size:12px;color:var(--muted);text-align:center">
        今日达标 <b style="color:var(--brand)">${prog.done}/${prog.total}</b> 科 · 本日进度 ${prog.pct}%
      </div>
    </div>

    <div style="padding:6px 16px 4px;font-weight:700;font-size:15px">科目进度</div>
    ${subjects}
    <div class="foot-note">打卡提升自信，进度见证努力 💪</div>
  </div>`
}

export function homeBind(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-k]')
    if (!btn) return
    const key = btn.dataset.k
    toggleCheckin(today(), key)
    const card = btn.closest('.subject-card')
    const done = !!state.checkins[today()]?.[key]
    btn.className = `btn ${done ? 'ghost' : 'accent'}`
    btn.textContent = done ? '✓ 已打卡' : '打卡'
    // 更新周视图小圆点
    const seven = last7()
    const idx = seven.findIndex((x) => x.str === today())
    const cell = $('.weekview').children[idx]
    const dot = cell ? cell.querySelector('.dot') : null
    if (dot) {
      const any = !!state.checkins[today()] && Object.keys(state.checkins[today()]).length
      dot.className = 'dot' + (any ? '' : ' blank')
    }
  })
}