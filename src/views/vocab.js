// 记单词界面：今日新词 + 复习 + 已掌握 + 设置每日计划
import { $, esc, today, toast } from '../utils.js'
import { state } from '../state.js'
import { VOCAB_SIZE } from '../vocab.js'
import {
  getSettings, saveSettings, setMastered, isMastered,
  newWordsForDate, reviewWordsForDate, autoPlan, remainingDays,
  dayIndex,
} from '../vocabPlan.js'
import { EXAM_DATE } from '../config.js'

// 渲染一张单词卡（新词或复习）
function wordCard(v, idx, opts = {}) {
  const mastered = isMastered(opts.globalIdx)
  return `<div class="word-card ${opts.kind === 'review' ? 'review' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="word-en">${esc(v[0])}</div>
      ${opts.kind === 'review' ? `<span class="tag" style="background:#e8ecff;color:#4a63c9">复习(间隔${opts.gap}天)</span>` : '<span class="tag">新词</span>'}
    </div>
    <div class="word-cn">${esc(v[2] || v[1] || '')}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn ghost grow sm mastered-btn ${mastered ? 'on' : ''}" data-gidx="${opts.globalIdx}">✓ ${mastered ? '已掌握' : '标记掌握'}</button>
      <button class="btn ghost sm speak-btn" data-word="${esc(v[0])}">🔊 发音</button>
    </div>
  </div>`
}

export function vocabHTML() {
  const set = getSettings()
  const rDays = remainingDays(EXAM_DATE)
  const todayStr = today()

  // 设置区块
  let settingsCard = ''
  if (!set || !set.startDate) {
    const auto = autoPlan(rDays)
    settingsCard = `
      <div class="card" id="vocab-setup">
        <h3>📝 设置每日单词计划</h3>
        <div class="sub">共 ${VOCAB_SIZE} 个六级核心词 · 距考研 ${rDays} 天</div>
        <div class="field"><label>开始日期</label><input type="date" id="vs-start" value="${todayStr}" /></div>
        <div class="row">
          <div class="field grow"><label>每天新学</label><input type="number" id="vs-new" min="1" max="60" value="${auto.newPerDay}" /></div>
          <div class="field grow"><label>每天复习</label>
            <select id="vs-review"><option value="auto">自动(1/3/7/15天)</option><option value="self">手动(固定每天)</option></select>
          </div>
        </div>
        <button class="btn accent block" id="vs-save">开始计划</button>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">建议：按考研剩余 ${rDays} 天，每天学 <b>${auto.newPerDay}</b> 个新词，约 ${auto.totalStudyDays} 天学完，余下留复习。</div>
      </div>`
  } else {
    const nw = newWordsForDate(todayStr, set.startDate, set.newPerDay)
    const rw = reviewWordsForDate(todayStr, set.startDate, set.newPerDay)
    const di = dayIndex(todayStr, set.startDate)
    const totalDone = Math.min(di * set.newPerDay, VOCAB_SIZE)
    const pct = Math.round((Math.min(di * set.newPerDay, VOCAB_SIZE) / VOCAB_SIZE) * 100)
    settingsCard = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">📅 本周词计划</h3>
          <button class="btn ghost sm" id="vs-reset" style="padding:6px 10px;font-size:12px">重新设置</button>
        </div>
        <div class="bar"><i style="width:${pct}%;background:var(--accent)"></i></div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">
          已安排 <b>${totalDone}/${VOCAB_SIZE}</b> 词 · 每天新学 <b>${set.newPerDay}</b> 个 · ${new Date(set.startDate + 'T00:00:00').toLocaleDateString('zh-CN')} 开始
        </div>
        <div class="vocab-stat">
          <span>今日新学 <b>${nw.length}</b></span>
          <span>今日复习 <b>${rw.length}</b></span>
          <span>距考研 <b>${rDays}</b> 天</span>
        </div>
      </div>`
  }

  // 单词列表区
  let wordSection = ''
  if (set && set.startDate) {
    const nw = newWordsForDate(todayStr, set.startDate, set.newPerDay)
    const rwList = reviewWordsForDate(todayStr, set.startDate, set.newPerDay)
    // 今天需要学的新词（全局下标）
    const nwCards = nw.map((v, i) => {
      const from = dayIndex(todayStr, set.startDate) * set.newPerDay
      return wordCard(v, i, { kind: 'new', globalIdx: from + i })
    }).join('')
    const rwCards = rwList.map((it) => wordCard(it.word, 0, { kind: 'review', globalIdx: VOCAB.indexOf(it.word), gap: it.gap })).join('')

    wordSection = `
      <div style="padding:6px 16px 4px;font-weight:700;font-size:15px">📖 今日新词（${nw.length}）</div>
      <div class="word-list">${nwCards || '<div class="empty">今天的新词已学完 🎉</div>'}</div>
      <div style="padding:6px 16px 4px;font-weight:700;font-size:15px">🔄 今日复习（${rwList.length}）</div>
      <div class="word-list">${rwCards || '<div class="empty">今天没有要复习的词</div>'}</div>`
  }

  return `
  <div class="page no-nav">
    <div class="topbar" style="display:flex;gap:8px">
      <button class="btn ghost" id="vb-back" style="padding:8px 12px;font-size:13px">← 返回</button>
      <h1 style="font-size:17px;flex:1">📚 记单词</h1>
    </div>

    ${settingsCard}
    ${wordSection}
    <div class="foot-note">点击单词卡片可看释义 · 标记掌握后不再重复复习 ⭐</div>
  </div>`
}

export function vocabBind(root, rerender) {
  root.addEventListener('click', (e) => {
    const back = e.target.closest('#vb-back')
    if (back) { rerender({ view: 'plan', subject: 'english' }); return }

    const start = e.target.closest('#vs-save')
    if (start) {
      const startDate = $('#vs-start', root).value || today()
      const newPerDay = parseInt($('#vs-new', root).value, 10) || 1
      if (!startDate) { toast('请选择开始日期'); return }
      saveSettings({ startDate, newPerDay, reviewMode: 'auto' })
      toast(`计划已开始：每天新学 ${newPerDay} 词`)
      rerender({ view: 'vocab' })
      return
    }

    const reset = e.target.closest('#vs-reset')
    if (reset) { saveSettings(null); rerender({ view: 'vocab' }); return }

    const masteredBtn = e.target.closest('.mastered-btn')
    if (masteredBtn) {
      const gidx = Number(masteredBtn.dataset.gidx)
      const on = !isMastered(gidx)
      setMastered(gidx, on)
      masteredBtn.classList.toggle('on', on)
      masteredBtn.textContent = on ? '✓ 已掌握' : '标记掌握'
      return
    }

    const speak = e.target.closest('.speak-btn')
    if (speak) {
      const word = speak.dataset.word
      try {
        const u = new SpeechSynthesisUtterance(word)
        u.lang = 'en-US'
        speechSynthesis.cancel()
        speechSynthesis.speak(u)
      } catch { /* 不支持则忽略 */ }
      return
    }
  })
}