import { defineConfig } from 'vite'

// 部署在 GitHub Pages 子路径 /kaoyan-workbench/ 下，base 需对齐
// 本地开发 / 预览不依赖 base
export default defineConfig({
  base: '/kaoyan-workbench/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true,
  },
})