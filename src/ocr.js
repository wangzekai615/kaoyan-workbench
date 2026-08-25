// OCR 模块：用 Tesseract.js 识别图片中的文字（中文+英文）
// 资源（worker/core/语言包）打包在 public/vendor/ocr/，同源加载，无需外部 CDN、无需 API key
import { createWorker } from 'tesseract.js'
import { toast } from './utils.js'

const BASE = import.meta.env.BASE_URL // /kaoyan-workbench/
const VENDOR = `${BASE}vendor/ocr/`
const WORKER_URL = VENDOR + 'worker.min.js'
const CORE_URL = VENDOR + 'tesseract-core.js'
const LANGS = 'chi_sim+eng'   // 中文简体 + 英文

let workerPromise = null
let busy = false

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS, 1, {
      workerPath: WORKER_URL,
      corePath: CORE_URL,
      langPath: VENDOR,
      logger: () => {},
    })
  }
  return workerPromise
}

// 识别图片(dataURL / blob) → 返回识别文本
// onProgress: (pct) 进度 0~100
export async function ocrImage(image, onProgress) {
  try {
    const worker = await getWorker()
    if (busy) { toast('有任务在识别中，稍候'); return null }
    busy = true
    const res = await worker.recognize(image, {}, {
      onprogress: ({ status, progress }) => {
        if (status === 'recognizing text') onProgress?.(Math.round(progress * 100))
      },
    })
    busy = false
    return (res.data && res.data.text) ? res.data.text.trim() : ''
  } catch (e) {
    busy = false
    console.error('OCR 失败', e)
    toast('识别失败，请检查网络后重试')
    return null
  }
}

// 加载语言包并返回是否就绪（预下载）
export async function warmUpOcr(onProgress) {
  try {
    const worker = await getWorker()
    return true
  } catch {
    return false
  }
}