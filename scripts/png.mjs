// 零依赖 PNG 编码 + 简化 SVG 光栅化。
// 目标：桌面跳转项目里生成本地图标，可离线、可复现。
// SVG 光栅化覆盖本文档 icon.svg 用到的子集（矩形/圆角矩形/圆形，纯色）。

// ---------- 颜色 ----------
function parseHex(hex) {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    const [r, g, b] = h
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), 255]
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
  }
  return [0, 0, 0, 255]
}

// ---------- 简易 SVG 解析：仅处理我们需要的标签 ----------
const re = /<(\w+)([^>]*)\/>|<(\w+)([^>]*)>([\s\S]*?)<\/\3>/g
function attrStr(name, str) {
  const m = str.match(new RegExp(name + '="([^"]*)"'))
  return m ? m[1] : null
}
function splitAttrs(str) {
  const out = {}
  const re2 = /([\w-]+)="([^"]*)"/g
  let m
  while ((m = re2.exec(str))) out[m[1]] = m[2]
  return out
}

// 把所有 <g fill=...> 继承到子元素（本图标只用 fill）
function flattenFill(root) {
  const walk = (node, parentFill) => {
    const fill = node.attrs.fill || parentFill
    node.fill = fill
    if (node.children) for (const c of node.children) walk(c, fill)
  }
  walk(root, null)
  return root
}

function parseSvg(src) {
  const svg = { tag: 'svg', attrs: {}, children: [] }
  const stack = [svg]
  const tokenRe = /<(\/?)([\w-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
  let m
  while ((m = tokenRe.exec(src))) {
    const closing = m[1] === '/'
    const tag = m[2]
    const args = m[3] || ''
    const selfClose = m[4] === '/'
    if (closing) {
      stack.pop()
      continue
    }
    const node = { tag, attrs: splitAttrs(args), children: [], fill: null }
    stack[stack.length - 1].children.push(node)
    if (!selfClose) stack.push(node)
  }
  return flattenFill(svg)
}

// ---------- 光栅化 ----------
const EPS = 1.5
export function rasterize(svgSrc, size) {
  const img = new Uint8Array(size * size * 4)
  const root = parseSvg(svgSrc)
  // 顶层 rect 是背景（覆盖全部），我们按“先画最底层的形状，后画的覆盖先画的”来，
  // 依次按顺序填充即可；圆角矩形用 SDF 判定每像素。
  const draw = (node) => {
    const fill = parseHex(node.fill || '#000000')
    const attrs = node.attrs
    const cx = (size / 512) * 0.5 // 以 512 为坐标基准
    if (node.tag === 'rect') {
      const x = (parseFloat(attrs.x) || 0) * (size / 512)
      const y = (parseFloat(attrs.y) || 0) * (size / 512)
      const w = (parseFloat(attrs.width) || 0) * (size / 512)
      const h = (parseFloat(attrs.height) || 0) * (size / 512)
      const r = (parseFloat(attrs.rx) || 0) * (size / 512)
      const x0 = Math.max(0, Math.floor(x))
      const y0 = Math.max(0, Math.floor(y))
      const x1 = Math.min(size, Math.ceil(x + w))
      const y1 = Math.min(size, Math.ceil(y + h))
      const px = new Float32Array(size * size)
      // 圆角 SDF
      const r2 = r
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const pxC = xx + 0.5 - (x + w / 2)
          const pyC = yy + 0.5 - (y + h / 2)
          const hw = w / 2 - r2
          const hh = h / 2 - r2
          const dx = Math.max(Math.abs(pxC) - hw, 0)
          const dy = Math.max(Math.abs(pyC) - hh, 0)
          const dist = Math.sqrt(dx * dx + dy * dy) - r2
          // 抗锯齿：alpha 由距离场决定
          const alpha = Math.max(0, Math.min(1, 0.5 - dist))
          px[yy * size + xx] = alpha
        }
      }
      // 覆盖写
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const a = px[yy * size + xx]
          if (a <= 0) continue
          const o = (yy * size + xx) * 4
          img[o] = fill[0]
          img[o + 1] = fill[1]
          img[o + 2] = fill[2]
          img[o + 3] = Math.round(fill[3] * a)
        }
      }
    } else if (node.tag === 'circle') {
      const cxx = (parseFloat(attrs.cx) || 0) * (size / 512)
      const cyy = (parseFloat(attrs.cy) || 0) * (size / 512)
      const rr = (parseFloat(attrs.r) || 0) * (size / 512)
      for (let yy = 0; yy < size; yy++) {
        for (let xx = 0; xx < size; xx++) {
          const d = Math.hypot(xx + 0.5 - cxx, yy + 0.5 - cyy) - rr
          const a = Math.max(0, Math.min(1, 0.5 - d))
          if (a <= 0) continue
          const o = (yy * size + xx) * 4
          img[o] = fill[0]; img[o + 1] = fill[1]; img[o + 2] = fill[2]
          img[o + 3] = Math.round(fill[3] * a)
        }
      }
    }
  }
  // 按出现顺序绘制
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()
    if (node.children) for (const c of node.children) stack.push(c)
    if (node.tag !== 'svg' && node.tag !== 'g') draw(node)
  }
  return img
}

// ---------- PNG 编码（无压缩依赖，用 deflate 存储） ----------
function adler32(data) {
  let a = 1, b = 0
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

export const SVG = { rasterize }

export const PNG = {
  // 输入 RGBA 数组（Uint8Array，长度 size*size*4），输出 PNG Buffer
  encode(rgba, w, h) {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    const chunk = (type, data) => {
      const len = Buffer.alloc(4)
      len.writeUInt32BE(data.length, 0)
      const typeBuf = Buffer.from(type, 'ascii')
      const crc = Buffer.alloc(4)
      crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
      return Buffer.concat([len, typeBuf, data, crc])
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(w, 0)
    ihdr.writeUInt32BE(h, 4)
    ihdr[8] = 8   // bit depth
    ihdr[9] = 6   // color type RGBA
    // 原始扫描线：每行前加 filter byte 0
    const raw = Buffer.alloc((w * 4 + 1) * h)
    for (let y = 0; y < h; y++) {
      raw[y * (w * 4 + 1)] = 0
      rgba.copy?.(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
      // Uint8Array 没有 .copy，若入参是 Uint8Array 则手动拷贝
      if (!rgba.copy) {
        for (let i = 0; i < w * 4; i++) raw[y * (w * 4 + 1) + 1 + i] = rgba[y * w * 4 + i]
      }
    }
    const deflated = deflate(raw)
    const idat = chunk('IDAT', deflated)
    return Buffer.concat([
      sig,
      chunk('IHDR', ihdr),
      idat,
      chunk('IEND', Buffer.alloc(0)),
    ])
  },
}

// crc32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// deflate: 用存储块（每 65535 字节一个），最简、无压缩。PNG 文件稍大，够用。
function deflate(data) {
  const blocks = []
  const MAX = 65535
  for (let off = 0; off < data.length; off += MAX) {
    const len = Math.min(MAX, data.length - off)
    const last = off + len >= data.length
    const slice = data.subarray(off, off + len)
    const head = Buffer.alloc(5)
    head[0] = last ? 1 : 0
    head.writeUInt16LE(len & 0xffff, 1)
    head.writeUInt16LE((~len) & 0xffff, 3)
    blocks.push(head, Buffer.from(slice))
  }
  const body = Buffer.concat(blocks)
  const hdr = Buffer.from([0x78, 0x01]) // deflate, no compression level fast
  const ad = Buffer.alloc(4)
  ad.writeUInt32BE(adler32(data), 0)
  return Buffer.concat([hdr, body, ad])
}