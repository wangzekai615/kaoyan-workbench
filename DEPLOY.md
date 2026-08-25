# 部署到手机（GitHub Pages + Supabase，全程免费）

目标：手机浏览器打开网址 → 添加到主屏幕 → 像 App 一样用，且手机、电脑记录同步。

---

## 第 1 步 · 创建 GitHub 仓库并推送

```bash
cd "C:\Users\17069\Desktop\kaoyan-workbench"
git init
git add .
git commit -m "考研上岸工作台"
git branch -M main
git remote add origin https://github.com/<你的用户名>/kaoyan-workbench.git
git push -u origin main
```

> 记得先在 GitHub 网页上新建一个同名空仓库（不要勾选 README，避免冲突）。

## 第 2 步 · 开启 GitHub Pages

1. 打开仓库 → **Settings** → **Pages**
2. Source 选 **Deploy from a branch** → 分支选 `main`，目录选 `/ (root)`
3. Save。等 1~2 分钟，页面顶部会出现你的网址：
   `https://<用户名>.github.io/kaoyan-workbench/`

> 手机 **首次打开这个网址** 即可使用（纯本地模式）。

## 第 3 步 · 手机安装到主屏（PWA）

| 平台 | 操作 |
|---|---|
| iPhone (Safari) | 打开网址 → 点底部「分享」→ **添加到主屏幕** |
| Android (Chrome) | 打开网址 → 右上角菜单 **⋮** → **安装应用** / 添加到主屏幕 |

安装后从主屏图标进入，就是全屏 App，支持离线打开。

---

## （可选）第 4 步 · Supabase 云同步：手机 / 电脑数据互通

> 纯本地模式数据只存在当前设备。要同步，加一张免费表即可。

1. 打开 [supabase.com](https://supabase.com) → 注册 → **New project**
   - 名字随意（如 `ky-workbench`），设一个你有印象的数据库密码
   - **Region 选 Singapore**（或离你近的）→ Create
2. 项目创建后，左侧 **SQL Editor** → 新建查询 → 粘贴下面 SQL → **Run**：

```sql
create table if not exists snapshot (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
insert into snapshot (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;
```

3. 左侧 **Settings → API** 里复制两份信息：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` 的 key
4. 编辑 `src/supabase-config.js`：

```js
export const url = '你的 Project URL'
export const anonKey = '你的 anon key'
```

5. 重新构建并推送：

```bash
npm run deploy
```

推送后等 Pages 更新约 1 分钟，手机重新打开就会开始同步。

> 说明：同步采用「全量快照，后写覆盖」，适合单人单账号使用。多账号数据会互相覆盖，不建议多人共用。

---

## 故障排查

- **部署后看不到最新版本**：GitHub Pages 有缓存，强制刷新几次，或等 1~2 分钟。
- **换手机数据没同步**：确认两边都是最新部署（第 4 步完成），打开时左上角有同步提示。
- **图标不显示**：删除主屏图标重新添加一次（iOS 首装画布问题）。
- **GitHub 访问慢**：手机可用系统代理或改用 Gitee Pages 部署同一份 `dist/`。