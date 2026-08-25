// 云同步适配层。
// 默认未启用（localStorage 自足）。若在 supabase-config.js 提供 URL + anonKey，
// 则启用 Supabase 同步：拉取远端 -> 合并本地 -> 回传，多端一致。
import { url as SUPABASE_URL, anonKey as SUPABASE_ANON } from './supabase-config.js'

let cfg = SUPABASE_URL && SUPABASE_ANON ? { url: SUPABASE_URL, anonKey: SUPABASE_ANON } : null

export function cloudInit() {
  // 预留：可在此建表/初始化远端，未启用时无操作
}

// 返回合并后的远端 state（如有变更），无则 null
export async function cloudSync(local) {
  if (!cfg) return null
  // TODO 接入 @supabase/supabase-js 后实现：拉取 latest snapshot -> 合并 -> 上传
  // 现在保持本地模式
  return null
}