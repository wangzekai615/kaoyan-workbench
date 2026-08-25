// OCR 模块：用 Tesseract.js 识别图片中的文字（中文+英文）
// 资源（worker/core/语言包）打包在 public/vendor/ocr/，同源加载，无需外部 CDN、无需 API key
import { createWorker } from 'tesseract.js'
import { toast } from './utils.js'

const BASE = import.meta.env.BASE_URL // /kaoyan-workbench/
const VENDOR = `${BASE}vendor/ocr/`
// worker/core 需要完整 URL（Worker 里 importScripts 不接受根路径 /xxx）
const ORIGIN = location.origin
const WORKER_URL = ORIGIN + VENDOR + 'worker.min.js'
// 核心用 SIMD 变体（内嵌 wasm），worker 按名字匹配 tesseract-core-*.wasm.js
const CORE_URL = ORIGIN + VENDOR + 'tesseract-core-simd.wasm.js'
const LANG_PATH = ORIGIN + VENDOR
const LANGS = 'chi_sim+eng'   // 中文简体 + 英文

let workerPromise = null
let busy = false
// 当前进度回调（每次识别时设置，worker logger 内调用）
let progressCb = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS, 1, {
      workerPath: WORKER_URL,
      corePath: CORE_URL,
      langPath: LANG_PATH,
      workerBlobURL: false, // 直接用完整 URL 建 Worker，避免 blob worker 的 importScripts 问题
      // v7 用法：进度只能通过 logger 回调（运行在主线程，不会 postMessage 进 worker）
      logger: (m) => {
        if (m && m.status === 'recognizing text') {
          progressCb?.(Math.round((m.progress || 0) * 100))
        }
      },
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
    progressCb = onProgress || null
    const res = await worker.recognize(image, {}, { text: true })  // 第三参是识别选项，不是回调
    busy = false
    progressCb = null
    return (res.data && res.data.text) ? res.data.text.trim() : ''
  } catch (e) {
    busy = false
    progressCb = null
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