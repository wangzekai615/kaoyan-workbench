// 学习计划页：展示某科目按顺序的阶段任务，可逐项勾选「完成」
// 某阶段全部完成 → 自动为该科今日打卡（home 会联动显示）
import { $, esc, today } from '../utils.js'
import { state, toggleTask, taskId, isTaskDone } from '../state.js'
import { getPlan, CATEGORY_TIPS, currentStageIndex } from '../plans.js'
import { SUBJECTS } from '../config.js'
import { getSettings, remainingDays, newWordsForDate, reviewWordsForDate, VOCAB_SIZE } from '../vocabPlan.js'
import { EXAM_DATE } from '../config.js'

export function planHTML(subjectKey) {
  const subj = SUBJECTS.find((s) => s.key === subjectKey)
  const plan = getPlan(subjectKey)
  if (!subj || !plan) return '<div class="page"><div class="empty">计划未找到</div></div>'

  const cur = currentStageIndex(subjectKey)
  const tip = CATEGORY_TIPS[subjectKey] || ''

  // 每阶段统计数据
  const stageHtml = plan.stages
    .map((st, si) => {
      const doneCount = st.tasks.filter((_, ti) => isTaskDone(subjectKey, si, ti)).length
      const total = st.tasks.length
      const isCur = si === cur

      const tasksHtml = st.tasks
        .map((task, ti) => {
          const tid = taskId(subjectKey, si, ti)
          const done = isTaskDone(subjectKey, si, ti)
          return `<label class="task-row" data-subj="${subjectKey}" data-si="${si}" data-ti="${ti}">
            <span class="cb ${done ? 'on' : ''}">${done ? '✓' : ''}</span>
            <span class="task-t ${done ? 'done' : ''}">
              <b>${esc(task.t)}</b>
              ${task.tip ? `<span class="tip">💡 ${esc(task.tip)}</span>` : ''}
            </span>
          </label>`
        })
        .join('')

      return `<div class="stage ${isCur ? 'cur' : ''}">
        <div class="stage-head">
          <span class="stage-title">${si + 1}. ${esc(st.title)}</span>
          <span class="stage-progress">${doneCount}/${total} <span class="stage-bar"><i style="width:${Math.round((doneCount / total) * 100)}%"></i></span></span>
        </div>
        <div class="stage-tasks">${tasksHtml}</div>
      </div>`
    })
    .join('')

  // 英语专属：记单词入口卡
  let vocabCard = ''
  if (subjectKey === 'english') {
    const set = getSettings()
    const rDays = remainingDays(EXAM_DATE)
    const todayStr = today()
    let vocabBrief = ''
    if (set && set.startDate) {
      const nw = newWordsForDate(todayStr, set.startDate, set.newPerDay)
      const rw = reviewWordsForDate(todayStr, set.startDate, set.newPerDay)
      vocabBrief = `今日新学 <b>${nw.length}</b> 词 · 复习 <b>${rw.length}</b> 词`
    } else {
      vocabBrief = `还没有设置 · 距考研还有 ${rDays} 天`
    }
    vocabCard = `
      <div class="card vocab-entry" id="vocab-entry" style="cursor:pointer;border:2px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:12px;justify-content:space-between">
          <div>
            <div style="font-weight:800;font-size:16px">📚 六级核心单词</div>
            <div style="font-size:12px;color:var(--muted);margin-top:3px">${vocabBrief}</div>
          </div>
          <span class="badge" style="background:var(--accent);color:#fff;border:none">去背词 →</span>
        </div>
      </div>`
  }

  return `
  <div class="page no-nav">
    <div class="topbar">
      <button class="btn ghost" id="plan-back" style="padding:8px 12px;font-size:13px">← 返回</button>
      <h1 style="font-size:17px">${subj.emoji} ${subj.name} · 学习计划</h1>
      <span class="badge">第 ${cur + 1} 阶段</span>
    </div>

    ${vocabCard}

    <div class="card" style="margin-top:4px">
      <div style="font-size:13px;color:var(--muted)">${tip}</div>
      <div style="margin-top:10px;font-size:13px;background:#eef0f6;border-radius:10px;padding:10px;color:#454a5a;white-space:pre-wrap">${esc(plan.note)}</div>
    </div>

    <div style="padding:6px 16px 4px;font-weight:700;font-size:15px">分阶段任务</div>
    <div style="margin-top:2px">${stageHtml}</div>
    <div class="foot-note">今天完成该科任务 → 自动在首页打卡 ✔</div>
  </div>`
}

export function planBind(root, rerender) {
  root.addEventListener('click', (e) => {
    const back = e.target.closest('#plan-back')
    if (back) { rerender({ view: 'home' }); return }

    const vocabEntry = e.target.closest('#vocab-entry')
    if (vocabEntry) { rerender({ view: 'vocab' }); return }

    const row = e.target.closest('.task-row')
    if (row) {
      const { subj, si, ti } = row.dataset
      toggleTask(subj, Number(si), Number(ti))
      // 局部刷新勾选态 + 进度，不用整页刷新
      const tid = taskId(subj, Number(si), Number(ti))
      const done = isTaskDone(subj, Number(si), Number(ti))
      const cb = row.querySelector('.cb')
      const tt = row.querySelector('.task-t')
      cb.className = 'cb' + (done ? ' on' : '')
      cb.textContent = done ? '✓' : ''
      tt.className = 'task-t' + (done ? ' done' : '')
      updateStageProgress(row)
      return
    }
  })
}

function updateStageProgress(row) {
  const stage = row.closest('.stage')
  if (!stage) return
  const subj = row.dataset.subj
  const si = Number(row.dataset.si)
  const tasks = stage.querySelectorAll('.task-row')
  const done = Array.from(tasks).filter((t) => t.querySelector('.cb.on')).length
  const total = tasks.length
  const head = stage.querySelector('.stage-progress')
  if (head) {
    head.innerHTML = `${done}/${total} <span class="stage-bar"><i style="width:${Math.round((done / total) * 100)}%"></i></span>`
  }
}