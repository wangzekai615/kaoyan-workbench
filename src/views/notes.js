// 错题本 / 笔记：科目筛选、新增、图片拍照、OCR 识图取字、编辑、删除
import { $, esc, toast } from '../utils.js'
import { state, addNote, updateNote, delNote, newImgId } from '../state.js'
import { SUBJECTS } from '../config.js'
import { saveImage, deleteImage, getImage, compressImage } from '../imgstore.js'
import { ocrImage } from '../ocr.js'
import { ICONS } from '../icons.js'

const CATS = ['错题', '笔记', '公式', '易错点']

// 渲染图片（从 IndexedDB 取 blob 生成临时 URL）
function renderImg(container, imgId) {
  getImage(imgId).then((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const im = document.createElement('img')
    im.src = url
    im.className = 'note-img'
    im.addEventListener('click', () => window.open(url))
    container.innerHTML = ''
    container.appendChild(im)
  })
}

export function notesHTML(filter = 'all') {
  const list = state.notes
    .filter((n) => filter === 'all' || n.subject === filter)
    .sort((a, b) => b.ts - a.ts)

  const items = list.length
    ? list.map((n) => {
        const s = SUBJECTS.find((x) => x.key === n.subject)
        const imgSlot = n.imgId
          ? `<div class="note-imgbox" data-imgid="${n.imgId}" data-noteid="${n.id}"></div>`
          : ''
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
          ${imgSlot}
          ${n.body ? `<div class="n-body">${esc(n.body)}</div>` : ''}
        </div>`
      }).join('')
    : '<div class="empty">还没有错题/笔记，点右下角 ＋ 添加，或拍照记录</div>'

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
        <h2 id="nb-modal-title">新增错题</h2>
        <div class="modal-body">
          <div class="field">
            <label>科目</label>
            <select id="nb-subject">${SUBJECTS.map((s) => `<option value="${s.key}">${s.emoji} ${s.name}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>类型</label>
            <select id="nb-cat">${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
          </div>

          <!-- 拍照 / 相册 -->
          <div class="field">
            <label>题目照片（可拍照或从相册选）</label>
            <div class="img-pick">
              <label class="btn ghost pick-btn">
                📷 拍照
                <input type="file" accept="image/*" capture="environment" id="nb-photo" hidden />
              </label>
              <label class="btn ghost pick-btn">
                🖼 相册
                <input type="file" accept="image/*" id="nb-album" hidden />
              </label>
              <button class="btn ghost pick-btn" id="nb-ocr" type="button" disabled>🔍 识别文字</button>
            </div>
            <div id="nb-preview" class="preview hidden"><img id="nb-preview-img" alt="预览" /><button class="btn danger" id="nb-preview-del">移除</button></div>
            <div class="ocr-progress hidden" id="nb-ocr-prog">识别中 <span id="nb-ocr-pct">0%</span><div class="ocr-progbar"><i id="nb-ocr-bar"></i></div></div>
          </div>

          <div class="field"><label>标题</label><input id="nb-title" placeholder="如：极限的定义" /></div>
          <div class="field"><label>内容（识别文字会自动填入，也可手写）</label><textarea id="nb-body" rows="4" placeholder="知识点 / 错因 / 解法"></textarea></div>
        </div>
        <div class="modal-actions">
          <div class="row">
            <button class="btn ghost grow" id="nb-cancel">取消</button>
            <button class="btn grow" id="nb-save" style="background:var(--accent)">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

export function notesBind(root, rerender) {
  // ---------- 编辑态变量 ----------
  let editingId = null
  // 待保存的图片：{ imgId, dataUrl }（尚未写入 IndexedDB，点保存时才存）
  let pendingImg = null

  const modal = $('#nb-modal', root)
  const photoInp = $('#nb-photo', root)
  const albumInp = $('#nb-album', root)
  const previewBox = $('#nb-preview', root)
  const previewImg = $('#nb-preview-img', root)
  const ocrBtn = $('#nb-ocr', root)
  const ocrProg = $('#nb-ocr-prog', root)
  const ocrPct = $('#nb-ocr-pct', root)
  const ocrBar = $('#nb-ocr-bar', root)

  function currentFilter() {
    const active = $('.chip.active')
    return (active && active.dataset.filter) || 'all'
  }

  function openModal(note) {
    editingId = note ? note.id : null
    pendingImg = null
    $('#nb-modal-title', root).textContent = note ? '编辑错题' : '新增错题'
    $('#nb-subject', root).value = note ? note.subject : SUBJECTS[0].key
    $('#nb-cat', root).value = note ? (note.cat || '错题') : '错题'
    $('#nb-title', root).value = note ? note.title : ''
    $('#nb-body', root).value = note ? (note.body || '') : ''
    resetPicker()
    if (note && note.imgId) {
      // 编辑已有照片：读取并展示
      getImage(note.imgId).then((blob) => {
        if (!blob) return
        previewBox.classList.remove('hidden')
        previewImg.src = URL.createObjectURL(blob)
        pendingImg = { imgId: note.imgId, existing: true }
      })
    }
    modal.classList.remove('hidden')
  }
  function closeModal() { modal.classList.add('hidden') }

  function resetPicker() {
    previewBox.classList.add('hidden')
    previewImg.removeAttribute('src')
    ocrProg.classList.add('hidden')
    ocrPct.textContent = '0%'
    ocrBar.style.width = '0%'
    ocrBtn.disabled = true
  }

  async function onPickFile(file) {
    if (!file) return
    try {
      const { blob, dataUrl } = await compressImage(file)
      const imgId = newImgId()
      pendingImg = { imgId, blob, dataUrl }
      previewBox.classList.remove('hidden')
      previewImg.src = dataUrl
      ocrBtn.disabled = false
      toast('已读取照片')
    } catch (e) {
      toast('照片读取失败')
    }
  }

  photoInp.addEventListener('change', () => onPickFile(photoInp.files[0]))
  albumInp.addEventListener('change', () => onPickFile(albumInp.files[0]))
  $('#nb-preview-del', root).addEventListener('click', () => {
    if (pendingImg && !pendingImg.existing && pendingImg.imgId) deleteImage(pendingImg.imgId) // 未保存的临时占位，删掉
    pendingImg = null
    resetPicker()
  })

  ocrBtn.addEventListener('click', async () => {
    if (!pendingImg) return
    ocrBtn.disabled = true
    ocrProg.classList.remove('hidden')
    const text = await ocrImage(pendingImg.dataUrl || pendingImg.blob, (pct) => {
      ocrPct.textContent = pct + '%'
      ocrBar.style.width = pct + '%'
    })
    ocrProg.classList.add('hidden')
    ocrBtn.disabled = false
    if (text) {
      $('#nb-body', root).value += (($('#nb-body', root).value ? '\n' : '') + text)
      toast('识别完成，已填入内容')
    }
  })

  function closeModalInternal() { closeModal() }
  $('#nb-cancel', root).addEventListener('click', closeModalInternal)

  $('#nb-save', root).addEventListener('click', async () => {
    const title = $('#nb-title', root).value.trim()
    if (!title) { alert('请填写标题'); return }
    const payload = {
      subject: $('#nb-subject', root).value,
      cat: $('#nb-cat', root).value,
      title,
      body: $('#nb-body', root).value.trim(),
    }
    // 图片处理
    if (pendingImg && pendingImg.blob) {
      const imgId = pendingImg.imgId
      await saveImage(imgId, pendingImg.blob)
      payload.imgId = imgId
      payload.hasImg = true
    } else if (pendingImg && pendingImg.existing) {
      payload.imgId = pendingImg.imgId
    } else if (editingId) {
      // 编辑时移除原图（原图之前有图片）
      const old = state.notes.find((x) => x.id === editingId)
      if (old && old.imgId) { deleteImage(old.imgId); payload.imgId = null; payload.hasImg = false }
    }

    if (editingId) updateNote(editingId, payload)
    else addNote(payload)
    closeModal()
    rerender({ view: 'notes', filter: currentFilter() })
  })

  // ---------- 列表交互 ----------
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
          const n = state.notes.find((x) => x.id === act.dataset.id)
          if (n && n.imgId) deleteImage(n.imgId)
          delNote(act.dataset.id)
          rerender({ view: 'notes', filter: currentFilter() })
        }
      }
    }
  })

  // 渲染列表里的图片（IndexedDB → blob URL）
  requestAnimationFrame(() => {
    root.querySelectorAll('.note-imgbox').forEach((box) => {
      const imgId = box.dataset.imgid
      getImage(imgId).then((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const im = document.createElement('img')
        im.src = url
        im.className = 'note-img'
        im.addEventListener('click', () => window.open(url))
        box.appendChild(im)
      })
    })
  })
}