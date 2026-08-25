// 工作台配置：科目与目标设定
export const SUBJECTS = [
  { key: 'math',      name: '数学',  emoji: '📐', color: '#3b6ef6', total: 100 },
  { key: 'english',   name: '英语',  emoji: '📖', color: '#7c4dff', total: 100 },
  { key: 'politics',  name: '政治',  emoji: '📜', color: '#e54d6e', total: 100 },
  { key: 'cs408',     name: '408',   emoji: '💻', color: '#0fa47f', total: 100 },
  { key: 'coding',    name: '算法',  emoji: '⚔️', color: '#f2994a', total: 100 },
]

// 每个科目复习进度以百分制估算：当前计划/总计划
export const PLAN_TOTAL = 100
// 初始进度(演示用，可自行修改)
export const INIT_PLAN = {
  math: 38,
  english: 42,
  politics: 8,
  cs408: 20,
  coding: 30,
}

// 考研初试（明年 12 月，约 2027-12-25；具体日期以报考公告为准）
export const EXAM_DATE = '2027-12-25'
export const EXAM_DATE_CN = '2027年12月25日'

// 番茄钟
export const FOCUS_MIN = 25
export const BREAK_MIN = 5
export const LONGBREAK_AFTER = 4   // 第 4 个专注后进入长休息
export const LONGBREAK_MIN = 15

// GitHub Pages 子路径（vite base 保持一致）
export const BASE = '/kaoyan-workbench/'

// 年度统计起始（本地存储键）
export const STORE_KEYS = {
  plans: 'kyw_plans',          // { math: 40, ... }  默认 INIT_PLAN
  checkins: 'kyw_checkins',    // { 'YYYY-MM-DD': { math:1, english:1, ... } }
  notes: 'kyw_notes',          // [{ id, subject, title, body, cat, ts }]
  coding: 'kyw_coding',        // [{ id, date, pid, title, tag, status, ts }]
  sets: 'kyw_timer_history',   // [{ date, n, min }]
  taskDone: 'kyw_taskdone',    // { [subjectKey]: { [taskId]: true } } 学习计划任务完成
  started: 'kyw_first_use',
}

export function detectIcon() {
  // iOS Safari 不支持 SVG favicon，这里仅用于 <link>，不做额外分支
}