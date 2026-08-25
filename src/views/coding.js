// 刷题记录：力扣/牛客/其他，简单增删与筛选
import { $, esc, today } from '../utils.js'
import { state, addCoding, delCoding } from '../state.js'

const TAGS = ['数组', '链表', '树', '图', '动态规划', '贪心', '回溯', '字符串', '哈希', '其他']
const STATUS = { todo: '待重做', ok: '已掌握', star: '⭐ 经典' }
const SOURCES = ['力扣', '牛客', '洛谷', '其他']

export function codingHTML(filter = 'all') {
  const list = state.coding
    .filter((c) => filter === 'all' || c.tag === filter)
    .sort((a, b) => b.ts - a.ts)

  const items = list.length
    ? list.map((x) => `<div class="bar-row" style="flex-wrap:wrap">
        <span class="lk" style="width:auto">${x.pid ? esc(x.pid) : ''}</span>
        <b style="flex:1;font-size:14px">${esc(x.title)}</b>
        <span class="tag" style="background:#eef0f6">${esc(STATUS[x.status] || x.status)}</span>
        <span style="width:100%;padding-left:2px;font-size:12px;color:var(--muted)">
          <span class="tag">${esc(x.source || '')}</span>
          <span class="tag" style="background:${x.tag ? '#ffe9d6' : '#eef0f6'};color:#b06b1f">${esc(x.tag || '未分类')}</span>
          ${x.date} · <button class="btn ghost act" data-act="del" data-id="${x.id}" style="padding:2px 8px;font-size:11px">删除</button>
        </span>
      </div>`).join('')
    : '<div class="empty">还没有刷题记录，点右上角 ＋ 添加</div>'

  const chips = ['all', ...TAGS]

  return `
  <div class="page">
    <div class="topbar">
      <h1>⚔️ 刷题</h1>
      <button class="btn accent" id="cd-add" style="padding:8px 14px;font-size:13px">＋ 记录</button>
    </div>
    <div style="display:flex;gap:8px;padding:4px 14px 12px;overflow-x:auto">
      ${chips.map((k) => `<button class="btn chip ${filter === k ? 'accent' : 'ghost'}" data-filter="${k}" style="padding:7px 12px;font-size:13px;white-space:nowrap">${k === 'all' ? '全部' : k}</button>`).join('')}
    </div>
    <div id="cd-list" style="padding:0 12px">${items}</div>

    <div class="modal-mask hidden" id="cd-modal">
      <div class="modal">
        <h2>记录一道题</h2>
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
        <div class="row">
          <button class="btn ghost grow" id="cd-cancel">取消</button>
          <button class="btn grow" id="cd-save" style="background:var(--accent)">保存</button>
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