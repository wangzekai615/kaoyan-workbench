// 统计：打卡热力、科目进度分布、刷题分布、番茄总数
import { state } from '../state.js'
import { SUBJECTS, EXAM_DATE, EXAM_DATE_CN } from '../config.js'
import { daysUntil } from '../utils.js'

export function statsHTML() {
  const days = daysUntil(EXAM_DATE)
  const today = new Date()
  // 最近 30 天打卡序列
  const cells = []
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  for (let i = 29; i >= 0; i--) {
    const d = new Date(d0.getTime() - i * 86400000)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const c = state.checkins[ds] ? Object.keys(state.checkins[ds]).length : 0
    cells.push({ ds, c })
  }

  const heat = cells
    .map((x) => `<span class="heat" style="--lv:${x.c}">${x.c ? x.c : ''}</span>`)
    .join('')

  const totalCheckinDays = Object.keys(state.checkins).length
  const totalNotes = state.notes.length
  const totalSolve = state.coding.length
  const totalPomo = state.timerHist.reduce((sum, r) => sum + r.n, 0)
  const totalMin = state.timerHist.reduce((sum, r) => sum + r.min, 0)

  const subjectBars = SUBJECTS.map((s) => {
    const p = state.plans[s.key] ?? 0
    return `<div class="bar-row">
      <span class="lk">${s.emoji} ${s.name}</span>
      <div class="track"><i style="width:${p}%;background:${s.color}"></i></div>
      <span style="width:44px;text-align:right;color:var(--muted);font-size:12px">${p}%</span>
    </div>`
  }).join('')

  const codingBySub = {}
  state.coding.forEach((c) => { codingBySub[c.tag || c.subject || '未分类'] = (codingBySub[c.tag || c.subject || '未分类'] || 0) + 1 })
  const codingRows = Object.keys(codingBySub).map((k) => {
    const v = codingBySub[k]
    return `<div class="bar-row"><span class="lk" style="width:auto">${k}</span><div class="track" style="width:160px;flex:none;margin-left:auto"><i style="width:${Math.min(100, v * 4)}%;background:#4a7dff"></i></div><span style="width:30px;text-align:right;color:var(--muted);font-size:12px">${v}</span></div>`
  }).join('')

  return `
  <div class="page">
    <div class="topbar">
      <h1>📊 统计</h1>
      <span class="badge">坚持 ${totalCheckinDays} 天</span>
    </div>

    <div class="card">
      <h3>学习总览</h3>
      <div class="stat-grid">
        <div class="stat-cell"><div class="v">${days}</div><div class="k">距考研天数</div></div>
        <div class="stat-cell"><div class="v">${totalCheckinDays}</div><div class="k">打卡天数</div></div>
        <div class="stat-cell"><div class="v">${totalNotes}</div><div class="k">笔记/错题</div></div>
        <div class="stat-cell"><div class="v">${totalSolve}</div><div class="k">刷题数</div></div>
        <div class="stat-cell"><div class="v">${totalPomo}</div><div class="k">番茄数</div></div>
        <div class="stat-cell"><div class="v">${totalMin}</div><div class="k">专注分钟</div></div>
      </div>
    </div>

    <div class="card">
      <h3>科目进度</h3>
      ${subjectBars}
    </div>

    <div class="card">
      <h3>最近 30 天打卡热力</h3>
      <div class="heatmap">${heat}</div>
    </div>

    <div class="card">
      <h3>刷题分类</h3>
      ${state.coding.length ? codingRows : '<div class="empty">暂无刷题记录</div>'}
    </div>
    <div class="foot-note">计划 ${EXAM_DATE_CN} 初试，从容备考</div>
  </div>`
}

export function statsBind(root) {}