# 副本 / INSTANCE

状态机驱动 + LLM 对话流 + 数据库持久化的暗黑悬疑文字剧本杀。

前端负责炫酷渲染与交互，后端负责 LLM 调度与数据库 CRUD。前端**不计算骰子、不生成剧情**：每一次玩家行动都发给 `/api/game/action`，拿回「带标签的正文 + 三个选项 + 状态补丁」，交给解析器渲染。

---

## 一、技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router） |
| 样式 / 动画 | Tailwind CSS 3 + Framer Motion 11 |
| 粒子背景 | 原生 Canvas（120 粒子：三色随机、连线、鼠标引力斥力、点击冲击波） |
| 数据库 / ORM | **MySQL 8+ / 9.x + Prisma**（无数据库时自动降级为本地 JSON 存储） |
| 认证 | Auth.js v5（NextAuth）Credentials + bcryptjs + JWT Session |
| 图标 / 字体 | Lucide React · JetBrains Mono（数据）+ Playfair Display（标题） |

---

## 二、目录结构

```
app/
  layout.tsx                     字体运行期加载（离线也能构建）
  page.tsx                       入口 → StageHost
  globals.css                    暗黑主题 / 扫描线 / 噪点 / 故障动画
  api/
    auth/[...nextauth]/route.ts  Auth.js 凭证登录
    auth/register/route.ts       注册（邮箱 + 密码，bcrypt 哈希）
    archive/route.ts             GET 查询 / POST 建档 / PATCH 同步·逐行清空 / DELETE 物理删除
    game/action/route.ts         唯一剧情入口（LLM 调度）
components/
  StageHost.tsx                  状态机宿主（AUTH/LOBBY/CHARACTER/DIFFICULTY/GAMEPLAY/ENDING）
  ui/     ParticleField Typewriter GlitchText StatBar RankBadge RadarChart TerminalButton ScanOverlay
  gameplay/ Hud TokenView(标签渲染) ActionBar
  views/  AuthView LobbyView CharacterView DifficultyView GameplayView EndingView
lib/
  db.ts        双模数据层（Prisma/MySQL ⇄ JSON 文件）
  auth.ts      Auth.js v5 配置
  llm.ts       服务端 LLM 调度（内置脚本 Mock + 真实模型预留）
  api.ts       客户端剧情接口
  archive.ts   客户端档案接口
  parser.ts    【画面】【音效】【肢体】【判定】标签解析器
  mock.ts      剧本卡 / 身份池 / 剧情脚本 / 销毁清单
  rank.ts      评级 F~SSS + 毒舌点评
store/gameStore.ts               Zustand 状态机 + 数据库同步
prisma/schema.prisma             User / Archive
```

---

## 三、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
#   填写 DATABASE_URL 与 AUTH_SECRET（openssl rand -base64 32）

# 3. 建表（需要数据库可连通）
npm run db:generate     # prisma generate
npm run db:push         # prisma db push，按 schema 建表

# 4. 启动
npm run dev          # http://localhost:3000
# 生产构建（本仓库脚本已内置 Turbopack）
npm run build:turbo && npm start
```

> **没有数据库也能跑。** 数据层会在启动时对 `DATABASE_URL` 做一次 250ms TCP 探测；不通就自动切换到 `.data/db.json` 文件存储，登录、建档、副本、销毁全流程完全一致。等你把 MySQL 起好，填好 `DATABASE_URL` 重启即可自动切回真库，业务代码一行都不用改。

### 本机启动 MySQL（macOS / Homebrew）

```bash
brew services start mysql          # 或 mysql@9.6
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS instance CHARACTER SET utf8mb4;"
npx prisma db push
```

---

## 四、数据库设计（`prisma/schema.prisma`）

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String                 // bcrypt 哈希，绝不存明文
  archive   Archive?
  createdAt DateTime @default(now())
}

model Archive {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  username String
  str Int
  int Int
  agi Int
  hp Int @default(100)
  sp Int @default(100)
  st Int @default(100)
  rating       String @default("F")
  growthPoints Int    @default(0)
  status       String @default("alive")   // alive / dead
  currentClues Json?                      // 已收集线索 ID 数组
  difficulty String?                      // 当前副本进度（刷新可恢复）
  scenarioId String?
  scenarioName String?
  currentRole String?
  turn Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 五、API 一览

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/auth/register` | 注册：邮箱格式校验 + bcrypt 哈希入库 |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js 凭证登录 / 登出 / session |
| GET | `/api/archive` | 查询当前用户档案（无则 `archive: null`） |
| POST | `/api/archive` | 建档：写入三维、评级、身份 |
| PATCH | `/api/archive` | 同步状态；`{wipe: 字段名}` 时清空单个字段 |
| DELETE | `/api/archive` | 物理删除整条档案（死亡销毁） |
| POST | `/api/game/action` | 剧情推进：发 `playerState + userInput`，返回 `narrative / options / patch / ending` |

---

## 六、状态机

```
AUTH ──登录/注册──► 查询档案 ─┬─ 无档案 ──► CHARACTER ──POST 建档──► DIFFICULTY
                              └─ 有档案 ──► LOBBY ────────────────► DIFFICULTY
DIFFICULTY ──选剧本──► GAMEPLAY ──每回合 PATCH 同步──► ENDING
ENDING ──BE：逐行 wipe + DELETE──► 回到 CHARACTER（档案真的没了）
```

- 无任何路由跳转，全部由 `AnimatePresence` 淡入淡出 + 模糊切换，保持单页沉浸感。
- 刷新页面：`bootstrap()` 读 session → 查库 → 原样恢复到 LOBBY / CHARACTER / 当前副本进度。

---

## 七、两个核心实现

### 1. 标签解析器（`lib/parser.ts`）

一条正则切分 LLM 返回的文本：

| 标签 | 渲染 |
|---|---|
| `【画面】` | 拍立得相框风格描述块 |
| `【音效】` | 声波图标 + 斜体文本 |
| `【肢体】` | 灰色小字旁白 |
| `【判定：观察 \| d20=16 \| 目标 10】` | 骰子系统框，成功绿光 / 失败红光，右侧大字骰值 |

成败优先级：显式「成功/失败」→ `d20 ≥ 目标` → ≥ 11。

### 2. BE 档案销毁（`components/views/EndingView.tsx`）

红光闪烁 1.5s → UI 持续 glitch 错位 → `TypewriterLines` 逐行打印销毁清单。

**每打印完一行**：前端对应字段 `animate-dissolve` 溶解消失，同时 `PATCH /api/archive {wipe}` 把数据库里那个字段清空（姓名 → 空串、三维 → 0、线索 → 空数组、状态 → dead）。

**打印完毕**：`DELETE /api/archive` 物理删除整条记录 → 全黑屏，绿字打字机「欢迎回来。请问，你叫什么名字？」→ 3 秒后回到 CHARACTER。此时数据库里真的查不到这份档案了，下次登录必须重新建档。

粒子背景在 BE 期间同步切换为狂暴暗红（速度 ×2.6、连线加深）。

---

## 八、粒子背景（`components/ui/ParticleField.tsx`）

- 120 个粒子，颜色在 `#8b0000` / `#00ff9d` / `#d4af37` 之间随机，缓慢随机游走。
- 距离 < 132px 的粒子之间连半透明细线，透明度随距离衰减。
- 鼠标 60px 内斥力推开，60~170px 引力吸引，形成流体跟随感。
- 点击任意位置：以点击点为圆心 320px 半径施加冲击波，粒子高速炸开，随后每帧阻尼 0.982 + 缓慢回归基础漂移速度，自然回落；同时画一圈扩散的血色冲击环。
- `dpr` 上限 2，`resize` 自适应，全程一个 `requestAnimationFrame` 循环。

> 用原生 Canvas 而非配置式粒子库的原因：冲击波需要逐粒子施加初速度 + 逐帧阻尼回落 + BE 模式热切换，这些必须拿到粒子实例才能精确控制；顺带也省掉一个依赖。

---

## 九、接入真实 LLM

服务端 `lib/llm.ts`：

```ts
export async function generateTurn(payload) {
  if (process.env.LLM_API_KEY) return realLLM(payload);  // 真实模型
  return mockLLM(payload);                               // 内置脚本
}
```

在 `.env` 里配 `LLM_API_KEY` / `LLM_MODEL` / `LLM_ENDPOINT`（OpenAI 兼容格式）即可切换。解析器、UI、API Route 一行都不用改。

---

## 十、环境备注

- 字体是运行期通过 `<link>` 加载的，构建期不拉网络，离线也能 `next build`。
- 本机 `next build`（webpack）若遇到文件系统 shim 的 `mkdir EEXIST`，用 `npm run build:turbo`。
- 数据落在 `.data/db.json`（降级模式），该文件已在 `.gitignore` 中。
