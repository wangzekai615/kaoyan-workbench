// 错题本 / 笔记：支持科目筛选、新增、编辑、删除
import { $, esc, today } from '../utils.js'
import { state, addNote, updateNote, delNote } from '../state.js'
import { SUBJECTS } from '../config.js'
import { ICONS } from '../icons.js'

const CATS = ['错题', '笔记', '公式', '易错点']

export function notesHTML(filter = 'all') {
  const list = state.notes
    .filter((n) => filter === 'all' || n.subject === filter)
    .sort((a, b) => b.ts - a.ts)

  const items = list.length
    ? list.map((n) => {
        const s = SUBJECTS.find((x) => x.key === n.subject)
        return `<div class="note-item" data-id="${n.id}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="n-title">${esc(n.title)}</span>
            <span style="display:flex;gap:2px">
              <button class="btn ghost act" data-act="edit" data-id="${n.id}" style="padding:5px 9px;font-size:12px">${ICONS.edit}</button>
              <button class="btn ghost act" data-act="del" data-id="${n.id}" style="padding:5px 9px;font-size:12px;color:var(--accent-2)">${ICONS.trash}</button>
            </span>
          </div>
          <div class="n-meta">
            <span class="tag" style="background:${(s && s.color) || '#888'}18;color:${(s && s.color) || '#888'}">${(s && s.emoji) || '📝'} ${(s && s.name) || '其他'}</span>
            <span class="note-cat">${n.cat || ''}</span>
            <span style="float:right;color:var(--muted)">${new Date(n.ts).toLocaleDateString('zh-CN')}</span>
          </div>
          ${n.body ? `<div class="n-body">${esc(n.body)}</div>` : ''}
        </div>`
      }).join('')
    : '<div class="empty">还没有错题/笔记，点右下角 ＋ 添加</div>'

  const chips = ['all', ...SUBJECTS.map((s) => s.key)]
  const chipLabel = (k) => (k === 'all' ? '全部' : SUBJECTS.find((s) => s.key === k)?.name || k)

  return `
  <div class="page">
    <div class="topbar">
      <h1>📚 错题与笔记</h1>
      <button class="btn accent" id="nb-add" style="padding:8px 14px;font-size:13px">${ICONS.plus} 新增</button>
    </div>
    <div style="display:flex;gap:8px;padding:4px 14px 12px;overflow-x:auto">
      ${chips.map((k) => `<button class="btn ${filter === k ? 'accent' : 'ghost'} chip" data-filter="${k}" style="padding:7px 14px;font-size:13px;white-space:nowrap">${chipLabel(k)}</button>`).join('')}
    </div>
    <div id="nb-list" style="padding:0 12px">${items}</div>

    <div class="modal-mask hidden" id="nb-modal">
      <div class="modal">
        <h2>${'新增/编辑'}</h2>
        <div class="field">
          <label>科目</label>
          <select id="nb-subject">${SUBJECTS.map((s) => `<option value="${s.key}">${s.emoji} ${s.name}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>类型</label>
          <select id="nb-cat">${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>标题</label><input id="nb-title" placeholder="如：极限的定义" /></div>
        <div class="field"><label>内容（可空）</label><textarea id="nb-body" rows="4" placeholder="知识点 / 错因 / 解法"></textarea></div>
        <div class="row">
          <button class="btn ghost grow" id="nb-cancel">取消</button>
          <button class="btn grow" id="nb-save" style="background:var(--accent)">保存</button>
        </div>
      </div>
    </div>
  </div>`
}

export function notesBind(root, rerender) {
  root.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#nb-add')
    const chip = e.target.closest('.chip')
    const act = e.target.closest('[data-act]')

    if (addBtn) openModal(null)
    else if (chip) rerender({ view: 'notes', filter: chip.dataset.filter })
    else if (act) {
      if (act.dataset.act === 'edit') {
        const n = state.notes.find((x) => x.id === act.dataset.id)
        openModal(n)
      } else if (act.dataset.act === 'del') {
        if (confirm('删除这条记录？')) {
          delNote(act.dataset.id)
          rerender({ view: 'notes', filter: currentFilter() })
        }
      }
    }
  })

  function currentFilter() {
    const active = $('.chip.active')
    return (active && active.dataset.filter) || 'all'
  }

  let editingId = null
  function openModal(note) {
    editingId = note ? note.id : null
    const modal = $('#nb-modal', root)
    $('#nb-subject', root).value = note ? note.subject : SUBJECTS[0].key
    $('#nb-cat', root).value = note ? (note.cat || '错题') : '错题'
    $('#nb-title', root).value = note ? note.title : ''
    $('#nb-body', root).value = note ? (note.body || '') : ''
    modal.classList.remove('hidden')
  }
  function closeModal() {
    $('#nb-modal', root).classList.add('hidden')
  }

  $('#nb-cancel', root).addEventListener('click', closeModal)
  $('#nb-save', root).addEventListener('click', () => {
    const title = $('#nb-title', root).value.trim()
    if (!title) { alert('请填写标题'); return }
    const payload = {
      subject: $('#nb-subject', root).value,
      cat: $('#nb-cat', root).value,
      title,
      body: $('#nb-body', root).value.trim(),
    }
    if (editingId) updateNote(editingId, payload)
    else addNote(payload)
    closeModal()
    rerender({ view: 'notes', filter: currentFilter() })
  })
}