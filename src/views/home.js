// 首页：倒计时 + 今日打卡 + 科目进度
import { $, esc, today, last7, daysUntil } from '../utils.js'
import { state, toggleCheckin, todayProgress, isTaskDone } from '../state.js'
import { SUBJECTS, EXAM_DATE, EXAM_DATE_CN } from '../config.js'
import { getPlan } from '../plans.js'

const fmtDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`

// 某科目的计划总完成度（跨阶段）
function subjectDoneRatio(subjKey) {
  const plan = getPlan(subjKey)
  if (!plan) return { done: 0, total: 0 }
  let done = 0, total = 0
  plan.stages.forEach((st, si) => {
    st.tasks.forEach((_, ti) => {
      total++
      if (isTaskDone(subjKey, si, ti)) done++
    })
  })
  return { done, total }
}

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
    const mut = getPlan(s.key)
    const ratio = subjectDoneRatio(s.key)
    const donePct = mut && ratio.total ? Math.round((ratio.done / ratio.total) * 100) : 0
    // 今日在该科计划里完成的任务数
    const todayDone = state.taskDone[s.key] ? Object.keys(state.taskDone[s.key]).length : 0
    return `<div class="card subject-card" data-k="${s.key}" style="cursor:pointer">
      <div class="swatch" style="background:${s.color}22;color:${s.color}">${s.emoji}</div>
      <div class="grow">
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600">
          <span>${s.name}</span>
          <span style="color:${s.color}">计划完成 ${donePct}%</span>
        </div>
        <div class="bar"><i style="width:${donePct}%;background:${s.color}"></i></div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--muted);margin-top:5px">
          <span>${ratio.done}/${ratio.total} 项 · 今日完成 ${todayDone} 项</span>
          ${doneToday
            ? `<span class="btn cancel-checkin" data-k="${s.key}" style="padding:3px 10px;font-size:11px;border-radius:999px">✕ 取消打卡</span>`
            : `<span class="ok-chip">点击查看计划 →</span>`}
        </div>
      </div>
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

export function homeBind(root, rerender) {
  root.addEventListener('click', (e) => {
    // 点击「取消打卡」→ 确认后取消该科今日打卡
    const cancelBtn = e.target.closest('.cancel-checkin')
    if (cancelBtn) {
      const key = cancelBtn.dataset.k
      const subject = SUBJECTS.find((s) => s.key === key)
      if (confirm(`取消「${subject ? subject.name : ''}」今天的打卡？`)) {
        toggleCheckin(today(), key)
        rerender({ view: 'home' })   // 整页重渲染，卡片状态 + 周视图圆点同步更新
      }
      return
    }

    const card = e.target.closest('[data-k]')
    if (card && !e.target.closest('.cancel-checkin')) {
      // 点击科目卡片（非取消按钮）→ 进入该科学习计划
      rerender({ view: 'plan', subject: card.dataset.k })
      return
    }
  })
}