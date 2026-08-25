// 番茄钟：本地计时 + 系统通知。用「结束时间戳」校对后台休眠带来的漂移。
import { $, fmtDur } from '../utils.js'
import { addTimerHist } from '../state.js'
import { FOCUS_MIN, BREAK_MIN, LONGBREAK_MIN } from '../config.js'

const FOCUS = FOCUS_MIN * 60
const BREAK = BREAK_MIN * 60
const LONG = LONGBREAK_MIN * 60

export function timerHTML() {
  return `
  <div class="page">
    <div class="topbar"><h1>🍅 番茄钟</h1><span class="badge">专注让人高效</span></div>

    <div class="card">
      <div class="timer-ring" id="ring">
        <div class="time" id="time">25:00<small>专注</small></div>
      </div>
      <div class="timer-ctrl">
        <button class="btn accent" id="tm-start">开始</button>
        <button class="btn ghost" id="tm-reset">重置</button>
      </div>
      <div class="timer-round" id="tm-round">第 1 轮 · 今日 0 个番茄</div>
    </div>

    <div class="card">
      <h3>本日记录</h3>
      <div id="tm-today" class="stat-grid" style="grid-template-columns:repeat(2,1fr)">
        <div class="stat-cell"><div class="v" id="today-n">0</div><div class="k">已专注(个)</div></div>
        <div class="stat-cell"><div class="v" id="today-min">0</div><div class="k">分钟</div></div>
      </div>
    </div>
  </div>`
}

export function timerBind(root) {
  const ring = $('#ring', root)
  const timeEl = $('#time', root)
  const roundEl = $('#tm-round', root)
  const btn = $('#tm-start', root)
  const todayN = $('#today-n', root)
  const todayMin = $('#today-min', root)

  let mode = 'focus'        // focus | break
  let endAt = null          // 期望结束时间戳
  let timer = null
  let left = FOCUS

  const readToday = () => {
    // 简单本地汇总：统计最近记录（演示用，不影响核心逻辑）
  }
  const updateToday = () => {
    // 显示占位，真实累计在 state.timerHist
  }

  function ringBg() {
    const total = mode === 'focus' ? FOCUS : mode === 'long' ? LONG : BREAK
    const p = 1 - left / total
    ring.style.background = `conic-gradient(${mode === 'focus' ? '#ff9f43' : '#2ecc8f'} ${p * 360}deg, #eef0f6 0deg)`
  }

  function render() {
    timeEl.innerHTML = `${fmtDur(left)}<small>${mode === 'focus' ? '专注' : '休息'}</small>`
    ringBg()
  }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'icons/icon-192.png' })
      }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    } catch { /* 忽略 */ }
  }

  function tick() {
    const remain = Math.max(0, Math.round((endAt - Date.now()) / 1000))
    left = remain
    render()
    if (remain <= 0) return onDone()
    timer = setTimeout(tick, 250)
  }

  function onDone() {
    if (mode === 'focus') {
      addTimerHist(FOCUS_MIN)
      notify('🍅 专注结束', '休息一下吧')
      const r = parseInt(localStorage.getItem('kyw_round') || '1', 10) || 1
      mode = r >= 4 ? 'long' : 'break'
      left = r >= 4 ? LONG : BREAK
      localStorage.setItem('kyw_round', String((r % 4) + 1))
      roundEl.textContent = `第 ${r} 轮完成 · 长休息就位`
    } else {
      notify('☕ 休息结束', '开始下一轮专注')
      mode = 'focus'
      left = FOCUS
      roundEl.textContent = '准备新一轮专注'
    }
    endAt = null
    btn.textContent = '开始'
    render()
  }

  function start() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    if (endAt) return // 运行中
    endAt = Date.now() + left * 1000
    btn.textContent = '暂停'
    tick()
  }
  function pause() {
    if (!endAt) return
    left = Math.max(0, Math.round((endAt - Date.now()) / 1000))
    endAt = null
    clearTimeout(timer)
    btn.textContent = '继续'
    render()
  }
  function reset() {
    clearTimeout(timer)
    endAt = null
    mode = 'focus'
    left = FOCUS
    btn.textContent = '开始'
    roundEl.textContent = '第 1 轮 · 今日 0 个番茄'
    render()
  }

  btn.addEventListener('click', () => (endAt ? pause() : start()))
  $('#tm-reset', root).addEventListener('click', reset)
  render()
}