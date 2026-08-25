# 考研上岸工作台 🎯

一个在手机 / 电脑上都能用的个人考研学习工作台（PWA）。

- 📌 **学习计划**：数学 / 英语 / 政治 / 408 / 算法 五科，每科分「基础→强化→冲刺」三阶段任务清单 + 学习建议；完成任务自动联动打卡
- ✅ **每日打卡**：按科目打卡，周视图 + 连续坚持天数
- 🍅 **番茄钟**：25/5 专注与休息，后台计时不漂移，专注累计
- 📚 **错题与笔记**：分科目记录错题 / 笔记 / 公式，可筛选、编辑、删除
- ⚔️ **刷题记录**：力扣 / 牛客 / 洛谷，按标签分类
- 📊 **统计**：总览、科目进度、30 天打卡热力、刷题分布、番茄汇总
- ⏳ **倒计时**：考研初试（2027-12，可自行修改）

## 快速开始（本地运行）

```bash
npm install
npm run dev        # 开发预览 → http://localhost:5173/kaoyan-workbench/
npm run build      # 打包 → dist/
```

## 部署到手机

见 [DEPLOY.md](./DEPLOY.md)：三步让手机把工作台装成 App。

## 技术栈

- Vite + 原生 JS（无框架，改了就能跑）
- localStorage 本地存储；可配置 [Supabase](https://supabase.com) 云同步 → 见 `src/supabase-config.js`
- PWA（manifest + Service Worker）→ 手机可离线打开
- 全部代码零后端，静态托管即可

## 目录

```
kaoyan-workbench/
├─ index.html
├─ public/           # PWA 静态资源（sw.js、manifest、icons）
├─ src/
│  ├─ main.js        # 入口 + Tab 路由
│  ├─ state.js       # 状态与业务操作
│  ├─ cloud.js       # 云同步适配层
│  ├─ views/         # home / timer / notes / coding / stats
│  ├─ styles/        # 全局样式
│  └─ utils.js / store.js / config.js
└─ scripts/gen-icons.mjs   # 图标生成（npm run build 前可用）
```

## 自定义

- 修改考试日期：`src/config.js` → `EXAM_DATE`
- 换番茄时长：`src/config.js` → `FOCUS_MIN` 等
- 增删科目：`src/config.js` → `SUBJECTS`
- 重置数据：浏览器控制台 `localStorage.clear()` 后刷新