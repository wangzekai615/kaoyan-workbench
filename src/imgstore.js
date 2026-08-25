// IndexedDB 图片存储：错题照片（避免撑爆 localStorage）
const DB = 'ky-workbench'
const STORE = 'images'
const CACHE_KEY = 'kyw_img_ids'   // localStorage 记录已存图片 id（用于轻量索引）

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveImage(id, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id, blob })
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function getImage(id) {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result ? req.result.blob : null)
      req.onerror = () => reject(req.error)
    })
  } catch { return null }
}

export async function deleteImage(id) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* 忽略 */ }
}

// 压缩图片：file → dataURL（限定宽度，质量 0.72，避免内存/存储爆炸）
export function compressImage(file, maxW = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const w = Math.min(img.naturalWidth, maxW)
      const h = Math.round(img.naturalHeight * (w / img.naturalWidth))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => (blob ? resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.72) }) : reject(new Error('压缩失败'))), 'image/jpeg', 0.72)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')) }
    img.src = url
  })
}