// 刷题记录：力扣/牛客/其他，总览统计 + 本周分布 + 标签分布 + 待重做 + 记录增删筛选
import { $, esc, today, toast } from '../utils.js'
import { state, addCoding, delCoding } from '../state.js'

const TAGS = ['数组', '链表', '树', '图', '动态规划', '贪心', '回溯', '字符串', '哈希', '其他']
const STATUS = { todo: '待重做', ok: '已掌握', star: '⭐ 经典' }
const STATUS_COLOR = { todo: '#f2994a', ok: '#2ecc8f', star: '#ffb800' }
const SOURCES = ['力扣', '牛客', '洛谷', '其他']

export function codingHTML(filter = 'all') {
  // ---------- 数据汇总 ----------
  const all = state.coding
  const total = all.length
  const byStatus = { todo: 0, ok: 0, star: 0 }
  const byTag = {}
  all.forEach((x) => {
    if (byStatus[x.status] !== undefined) byStatus[x.status]++
    const t = x.tag || '其他'
    byTag[t] = (byTag[t] || 0) + 1
  })

  // 最近 7 天分布
  const recent = []
  const wd = ['一', '二', '三', '四', '五', '六', '日']
  for (let i = 6; i >= 0; i--) {
    const dt = new Date()
    dt.setDate(dt.getDate() - i)
    const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    recent.push({ ds, label: i === 0 ? '今' : wd[dt.getDay() === 0 ? 6 : dt.getDay() - 1], n: all.filter((x) => x.date === ds).length })
  }
  const maxRecent = Math.max(1, ...recent.map((r) => r.n))

  // 待重做
  const todoList = all.filter((x) => x.status === 'todo').sort((a, b) => b.ts - a.ts).slice(0, 5)

  // 随机一题
  const randomItem = total ? all[Math.floor(Math.random() * total)] : null

  // ---------- 列表 ----------
  const list = (filter === 'all' ? all : all.filter((c) => c.tag === filter))
    .sort((a, b) => b.ts - a.ts)

  const items = list.length
    ? list.map((x) => `<div class="bar-row" style="flex-wrap:wrap">
        <span class="lk" style="width:auto">${x.pid ? esc(x.pid) : ''}</span>
        <b style="flex:1;font-size:14px">${esc(x.title)}</b>
        <span class="tag" style="background:${STATUS_COLOR[x.status] || '#eef0f6'}22;color:${STATUS_COLOR[x.status] || '#889'}">${esc(STATUS[x.status] || x.status)}</span>
        <span style="width:100%;padding-left:2px;font-size:12px;color:var(--muted)">
          <span class="tag">${esc(x.source || '')}</span>
          <span class="tag" style="background:${x.tag ? '#ffe9d6' : '#eef0f6'};color:#b06b1f">${esc(x.tag || '未分类')}</span>
          ${x.date} · <button class="btn ghost act" data-act="del" data-id="${x.id}" style="padding:2px 8px;font-size:11px">删除</button>
        </span>
      </div>`).join('')
    : '<div class="empty">这个分类还没有题，去刷一道吧 💪</div>'

  const chips = ['all', ...TAGS]

  // 标签分布（最多显示 6 个，其余收起）
  const tagRows = TAGS.filter((t) => byTag[t]).sort((a, b) => (byTag[b] || 0) - (byTag[a] || 0)).slice(0, 6)
    .map((t) => `<div class="bar-row">
        <span class="lk" style="width:auto">${t}</span>
        <div class="track"><i style="width:${Math.min(100, ((byTag[t] || 0) / Math.max(1, ...Object.values(byTag))) * 100)}%;background:#4a7dff"></i></div>
        <span style="width:30px;text-align:right;color:var(--muted);font-size:12px">${byTag[t]}</span>
      </div>`).join('')

  return `
  <div class="page">
    <div class="topbar">
      <h1>⚔️ 刷题</h1>
      <button class="btn accent" id="cd-add" style="padding:8px 14px;font-size:13px">＋ 记录</button>
    </div>

    <!-- 总览统计 -->
    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-top:4px">
      <div class="stat-cell"><div class="v">${total}</div><div class="k">总题数</div></div>
      <div class="stat-cell"><div class="v" style="color:var(--green)">${byStatus.ok}</div><div class="k">已掌握</div></div>
      <div class="stat-cell"><div class="v" style="color:#f2994a">${byStatus.todo}</div><div class="k">待重做</div></div>
      <div class="stat-cell"><div class="v" style="color:#ffb800">${byStatus.star}</div><div class="k">经典</div></div>
    </div>

    <!-- 最近 7 天 -->
    <div class="card">
      <h3>最近 7 天</h3>
      <div class="weekview">
        ${recent.map((r) => `<div class="day ${r.ds === today() ? 'active' : ''}">
          <div>${r.label}</div>
          <div class="dot ${r.n ? '' : 'blank'}"></div>
          <div style="font-size:10px;color:var(--muted)">${r.n || ''}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- 随机一题 -->
    ${randomItem ? `
    <div class="card" id="cd-random" style="cursor:pointer;background:linear-gradient(135deg,#fff8f0,#fff)">
      <div style="display:flex;align-items:center;gap:10px;justify-content:space-between">
        <div>
          <div style="font-size:12px;color:var(--muted)">🎲 随机一题 · 温故知新</div>
          <div style="font-weight:700;font-size:15px;margin-top:3px">${randomItem.pid ? esc(randomItem.pid) + ' ' : ''}${esc(randomItem.title)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">${esc(randomItem.source || '')} · ${esc(randomItem.tag || '未分类')} · <span style="color:${STATUS_COLOR[randomItem.status] || '#889'}">${esc(STATUS[randomItem.status] || randomItem.status)}</span></div>
        </div>
        <span class="badge" style="background:var(--accent);color:#fff;border:none">换一题 →</span>
      </div>
    </div>` : ''}

    <!-- 标签分布 -->
    <div class="card">
      <h3>标签分布</h3>
      ${tagRows || '<div class="sub">刷题后这里会显示你的薄弱项分布</div>'}
    </div>

    <!-- 待重做 -->
    <div class="card">
      <h3>🔁 最近待重做</h3>
      ${todoList.length
        ? todoList.map((x) => `<div class="bar-row">
            <span class="lk" style="width:auto">${x.pid ? esc(x.pid) : ''}</span>
            <b style="flex:1;font-size:13px">${esc(x.title)}</b>
            <span style="font-size:11px;color:var(--muted)">${esc(x.tag || '')} · ${x.date}</span>
          </div>`).join('')
        : '<div class="sub">没有等待重做的题，全部拿下 🎉</div>'}
    </div>

    <!-- 记录列表 -->
    <div style="display:flex;gap:8px;padding:4px 16px 12px;overflow-x:auto">
      ${chips.map((k) => `<button class="btn chip ${filter === k ? 'accent' : 'ghost'}" data-filter="${k}" style="padding:7px 12px;font-size:13px;white-space:nowrap">${k === 'all' ? '全部' : k}</button>`).join('')}
    </div>
    <div id="cd-list" style="padding:0 12px">${items}</div>

    <div class="modal-mask hidden" id="cd-modal">
      <div class="modal">
        <h2>记录一道题</h2>
        <div class="modal-body">
          <div class="row">
            <div class="field grow"><label>来源</label>
              <select id="cd-source">${SOURCES.map((s) => `<option>${s}</option>`).join('')}</select>
            </div>
            <div class="field" style="width:88px;flex:none"><label>题号</label><input id="cd-pid" placeholder="1" inputmode="numeric" /></div>
          </div>
          <div class="field"><label>题目</label><input id="cd-title" placeholder="如：两数之和" /></div>
          <div class="field"><label>分类</label>
            <select id="cd-tag">${TAGS.map((t) => `<option>${t}</option>`).join('')}</select>
          </div>
          <div class="field"><label>状态</label>
            <select id="cd-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          </div>
        </div>
        <div class="modal-actions">
          <div class="row">
            <button class="btn ghost grow" id="cd-cancel">取消</button>
            <button class="btn grow" id="cd-save" style="background:var(--accent)">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

export function codingBind(root, rerender) {
  function currentFilter() {
    const active = $('.chip.active')
    return (active && active.dataset.filter) || 'all'
  }
  function open() {
    $('#cd-modal', root).classList.remove('hidden')
  }
  function close() {
    $('#cd-modal', root).classList.add('hidden')
  }

  root.addEventListener('click', (e) => {
    const add = e.target.closest('#cd-add')
    const chip = e.target.closest('.chip')
    const del = e.target.closest('[data-act="del"]')
    const random = e.target.closest('#cd-random')
    if (random) {
      // 换一题：重新渲染（随机种子变化）
      rerender({ view: 'coding', filter: currentFilter() })
      return
    }
    if (add) open()
    else if (chip) rerender({ view: 'coding', filter: chip.dataset.filter })
    else if (del) {
      delCoding(del.dataset.id)
      rerender({ view: 'coding', filter: currentFilter() })
    }
  })

  $('#cd-cancel', root).addEventListener('click', close)
  $('#cd-save', root).addEventListener('click', () => {
    const title = $('#cd-title', root).value.trim()
    const pid = $('#cd-pid', root).value.trim()
    if (!title && !pid) { alert('请填写题目或题号'); return }
    addCoding({
      source: $('#cd-source', root).value,
      pid,
      title,
      tag: $('#cd-tag', root).value,
      status: $('#cd-status', root).value,
      date: today(),
    })
    close()
    rerender({ view: 'coding', filter: currentFilter() })
  })
}