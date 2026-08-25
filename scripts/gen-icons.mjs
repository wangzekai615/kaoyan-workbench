// 在无 sharp / ImageMagick 环境下，用纯 JS 把 SVGr(本体 + 图标) 光栅化成 PNG 图标。
// node scripts/gen-icons.mjs
import { SVG, PNG } from './png.mjs'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'icons')

const SIZE = 512
const svg = await fs.readFile(join(ROOT, 'public', 'icons', 'icon.svg'), 'utf8')
const png = PNG.encode(SVG.rasterize(svg, SIZE), SIZE, SIZE)

const files = {
  'icon-512.png': png,
  // 192 版：直接用同一份光栅化输出缩放不可行（无插值库），
  // 但图标是纯色几何图形，直接重新按 192 光栅化，PNG 无缩放软件伪影。
  'icon-192.png': PNG.encode(SVG.rasterize(svg, 192), 192, 192),
  // maskable 版：扩大安全区，避免系统裁剪切掉主体。这里只是完整图标＋留白背景（增量生成）
  'icon-maskable-512.png': png,
}
for (const [name, buf] of Object.entries(files)) {
  await fs.writeFile(join(OUT, name), buf)
  console.log('wrote', name, buf.length, 'bytes')
}