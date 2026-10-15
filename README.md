# 副本 / INSTANCE

状态机驱动 + LLM 对话流 + 数据库持久化 + 社区社交的暗黑悬疑文字剧本杀。

前端负责炫酷渲染与交互，后端负责 LLM 调度与数据库 CRUD。前端**不计算骰子、不生成剧情**：每一次玩家行动都发给 `/api/game/action`，拿回「带标签的正文 + 三个选项 + 状态补丁」，交给解析器渲染。

**核心设定**：账号层（`User`）与角色层（`Archive`）解耦。角色死亡只物理删除 `Archive`，账号、论坛帖子、好友关系完整保留，重建档案时 `playerNo` 递增 —— 你会失去一切，但别人还记得你。

---

## 一、技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router） |
| 样式 / 动画 | Tailwind CSS 3 + Framer Motion 11 |
| 粒子背景 | 原生 Canvas（130 粒子：彗星拖尾 + 辉光精灵 + 景深视差 + 鼠标漩涡 + 点击冲击波，无连线） |
| 数据库 / ORM | **MySQL 8+ / 9.x + Prisma**（无数据库时自动降级为本地 JSON 存储） |
| 认证 | Auth.js v5（NextAuth）Credentials + bcryptjs + JWT Session |
| 图标 / 字体 | Lucide React · JetBrains Mono（数据）+ Playfair Display（标题） |

---

## 二、目录结构

```
app/
  layout.tsx                     字体运行期加载（离线也能构建）
  page.tsx                       入口 → StageHost
  globals.css                    暗黑主题 / 扫描线 / 噪点 / 故障动画 / 终端光标
  api/
    auth/[...nextauth]/route.ts  Auth.js 凭证登录（档案代号 + 接入密钥）
    auth/register/route.ts       档案接入（代号唯一性 + bcrypt 哈希）
    auth/check/route.ts          代号实时查重
    archive/route.ts             GET 查询 / POST 建档 / PATCH 同步·逐行清空 / DELETE 物理删除
    game/action/route.ts         唯一剧情入口（LLM 调度，注入异能）
    community/posts/route.ts     帖子列表 / 发帖 / 转发
    community/posts/[id]/route.ts 详情 + 评论树 / 删帖
    community/comments/route.ts  评论（楼中楼）
    community/like|favorite/     点赞 / 收藏
    social/friends/route.ts      好友请求 / 接受 / 列表 / 断开
components/
  StageHost.tsx                  状态机宿主（AUTH/LOBBY/CHARACTER/DIFFICULTY/GAMEPLAY/ENDING/COMMUNITY/SOCIAL）
  ui/     ParticleField Typewriter GlitchText StatBar RankBadge AbilityBadge
          RadarChart TerminalButton ScanOverlay
  gameplay/ Hud TokenView(标签渲染) ActionBar
  views/  AuthView LobbyView CharacterView DifficultyView GameplayView EndingView
          CommunityView(暗网终端) SocialView(幸存者频道)
lib/
  db.ts        双模数据层（Prisma/MySQL ⇄ JSON 文件）+ 社区社交 CRUD
  auth.ts      Auth.js v5 配置（username + key）
  abilities.ts 20 个异能池（普通/稀有/史诗/传说）+ 权重抽取
  llm.ts       服务端 LLM 调度（内置脚本 Mock + 真实模型预留，注入异能规则）
  api.ts       客户端剧情接口
  archive.ts   客户端档案 / 论坛 / 好友接口
  parser.ts    【画面】【音效】【肢体】【判定】标签解析器
  mock.ts      剧本卡 / 身份池 / 剧情脚本 / 销毁清单
  rank.ts      评级 F~SSS + 毒舌点评
store/gameStore.ts               Zustand 状态机 + 数据库同步
prisma/schema.prisma             User / Archive / Post / Comment / Like / Favorite / Friendship
```

---

## 二·五、三个核心机制

### 1. 账号层 vs 角色层（死亡不清零社交资产）

```
User（账号层）────────────── 死亡不影响
  ├ username / keyHash       档案代号 + 接入密钥
  ├ playerNo                 全局编号 No.X（重建档案时递增）
  ├ posts / comments / likes / favorites    论坛资产
  └ friendships                             好友关系
        │ 1 : 1
Archive（角色层）──────────── 死亡即物理 DELETE
  ├ str / int / agi / hp / sp / st
  ├ abilityName / abilityDesc / abilityRarity   随机异能
  └ currentClues / scenarioId / currentRole / turn
```

首次建档沿用注册时拿到的编号；**每次死亡后重建，`playerNo` 取全局最大值 +1**，于是同一个人会变成 No.4 → No.6 → No.7。

### 2. 随机异能系统（`lib/abilities.ts`）

- 20 个异能，分四档稀有度，**按权重抽取**：普通 46% / 稀有 30% / 史诗 17% / 传说 7%。
- 建档或死亡重建时随机，终身锁定；死亡后重新随机。
- UI：按稀有度变色发光（普通灰 / 稀有蓝 / 史诗紫 / 传说金），史诗与传说带流光扫过；每个异能有专属 Lucide 图标，展示在建档页与 HUD 上。
- **不是摆设**：异能的判定规则（`bonus`）会被注入 LLM 的 System Prompt，模型在生成判定时必须计入加成，例如「夜视」在暗处 `+2` 会直接写进判定行：`判定：智力 | d20=11 + 7 + 3(夜视) = 21 | DC 16 | 成功`。

### 3. 社区与社交的暗黑化包装

- **论坛 = 暗网加密终端**：终端提示符 `survivor@instance:/var/forum$`、代码块样式输入框、`TRACE :: No.12 · 代号` 的作者行、红色警告条、密文日志流。支持标签（#求助 / #剧透警告 / #玄学…）、点赞、收藏、转发、楼中楼评论。
- **好友 = 幸存者加密频道**：信标卡片展示自己的 `No.X` 并可一键复制；通过编号或代号发送连接请求；列表显示对方状态（存活 / 已死亡 / 未建档）与当前角色评级。
- 两者的数据都挂在 `User` 上，**角色死亡不会切断连接**。

---

## 三、快速开始

```bash
# 1. 安装依赖（Prisma 锁定 6.x，不要用 7.x —— 见下方说明）
npm install

# 2. 环境变量（仓库已带一份可用的 .env，AUTH_SECRET 已生成）
cp .env.example .env    # 仅当 .env 不存在时执行

# 3. 启动 —— 不配数据库也能跑完整流程
npm run dev             # http://localhost:3000

# 生产构建
npm run build:turbo && npm start
```

**最小路径就是这 3 步**：`npm install` → `npm run dev` → 打开 http://localhost:3000。
数据库是**可选**的，没配就自动用 `.data/db.json`，登录 / 建档 / 副本 / 死亡销毁全流程完全一致。

> ⚠️ **Prisma 版本**：锁在 `^6.16.0`。Prisma 7 移除了 schema 里的 `datasource url`（必须改写成 `prisma.config.ts` + driver adapter），本项目不采用那套。若你 `npm install` 后 CLI 变成 7.x/8.x，`prisma generate` 会报 `P1012`，此时执行 `npm i -D prisma@^6.16.0 @prisma/client@^6.16.0` 对齐即可。

### 可选：接入真实 MySQL

```bash
brew services start mysql
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS instance CHARACTER SET utf8mb4;"
npm run db:generate     # prisma generate（无需数据库连通）
npm run db:push         # 按 schema 建表
npm run dev             # 重启后自动切到 MySQL（.env 的 DATABASE_URL 指向它）
```

切换是**运行时自动判定**的：启动时对 `DATABASE_URL` 做一次 250ms TCP 探测，通 → Prisma + MySQL；不通 → JSON 文件。业务代码一行都不用改。

> **没有数据库也能跑。** 数据层会在启动时对 `DATABASE_URL` 做一次 250ms TCP 探测；不通就自动切换到 `.data/db.json` 文件存储，登录、建档、副本、销毁全流程完全一致。等你把 MySQL 起好，填好 `DATABASE_URL` 重启即可自动切回真库，业务代码一行都不用改。

### 本机启动 MySQL（macOS / Homebrew）

```bash
brew services start mysql          # 或 mysql@9.6
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS instance CHARACTER SET utf8mb4;"
npm run db:generate                # prisma generate
npm run db:push                    # 按 schema 建表
```

如果 `brew services` 起不来（launchctl 报错），可以直接跑守护进程：

```bash
/opt/homebrew/opt/mysql@9.6/bin/mysqld \
  --datadir=/opt/homebrew/var/mysql \
  --socket=/tmp/mysql.sock --port=3306 --bind-address=127.0.0.1 &
```

### Sequel Ace 连接参数

Sequel Ace 只支持 MySQL / MariaDB，正好对上本项目的选型。

| 字段 | 值 |
|---|---|
| Name | `INSTANCE` （随意） |
| Host | `127.0.0.1` |
| Username | `root` |
| Password | 留空（Homebrew 默认 root 无密码；设过就填你的） |
| Database | `instance` （可留空，连上后再选） |
| Port | `3306` |

用 **TCP/IP** 方式连接（不要选 Socket）。连上后在左侧选 `instance` 库，能看到 7 张表：`User` / `Archive` / `Post` / `Comment` / `Like` / `Favorite` / `Friendship`。

还没装的话：`brew install --cask sequel-ace`。

> 想验证死亡清零：在 `Archive` 表里挑一行删掉，再回页面刷新 —— 会被踢回建档页，`User` 表和 `Post` 表都毫发无损。

---

## 四、数据库设计（`prisma/schema.prisma`）

7 张表，完整定义见 `prisma/schema.prisma`。要点：

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique            // 档案代号：仅英文数字，全局唯一
  keyHash      String                      // 接入密钥的 bcrypt 哈希
  playerNo     Int      @unique            // 全局编号 No.X，重建档案时递增
  currentArchiveId String?
  archiveGen   Int      @default(0)        // 第几代档案：>1 时才递增 playerNo
  archive      Archive? @relation("CurrentArchive")
  posts        Post[]
  comments     Comment[]
  likes        Like[]
  favorites    Favorite[]
  friendships1 Friendship[] @relation("User1")
  friendships2 Friendship[] @relation("User2")
}

model Archive {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation("CurrentArchive", fields: [userId], references: [id], onDelete: Cascade)
  username String                          // 角色代号（可不同于账号代号）
  str Int
  int Int
  agi Int
  hp Int @default(100)
  sp Int @default(100)
  st Int @default(100)
  rating       String
  growthPoints Int    @default(0)
  abilityName   String                     // 随机异能，终身锁定
  abilityDesc   String
  abilityRarity String                     // common / rare / epic / legendary
  status       String @default("alive")    // alive / dead
  currentClues Json?
  difficulty String?  scenarioId String?  scenarioName String?  currentRole String?  turn Int @default(0)
  updatedAt DateTime @updatedAt
}

// Post(tags Json + repostOfId) / Comment(parentId 楼中楼) / Like / Favorite / Friendship
```

**MySQL 差异**：原生不支持标量数组，`Post.tags` 用 `Json` 存 `string[]`（API 层转数组）。要切 PostgreSQL 的话，改 `provider = "postgresql"` 并把 `tags Json?` 改成 `tags String[]` 即可，其余模型不用动。

---

## 五、API 一览

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/auth/register` | 档案接入：代号正则 + 唯一性校验 + bcrypt 哈希 |
| GET | `/api/auth/check?username=` | 代号实时查重（前端输入时调用） |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js 凭证登录（username + key）/ 登出 / session |
| GET | `/api/archive` | 查询账号 + 档案（无则 `archive: null`） |
| POST | `/api/archive` | 建档：写入三维、评级、异能；重建时递增 `playerNo` |
| PATCH | `/api/archive` | 同步状态；`{wipe: 字段名}` 时清空单个字段（BE 逐行销毁） |
| DELETE | `/api/archive` | 物理删除档案（只删角色层，账号与社交资产保留） |
| POST | `/api/game/action` | 剧情推进：发 `playerState（含异能）+ userInput`，返回 `narrative / options / patch / ending` |
| GET | `/api/community/posts` | 帖子列表（支持 `?tag=&q=`） |
| POST | `/api/community/posts` | 发帖；带 `repostOfId` 时为转发 |
| GET | `/api/community/posts/:id` | 帖子详情 + 评论树（楼中楼） |
| DELETE | `/api/community/posts/:id` | 删帖（仅作者） |
| POST | `/api/community/comments` | 评论 / 回复（`parentId` 实现楼中楼） |
| POST | `/api/community/like` | 点赞切换 |
| POST | `/api/community/favorite` | 收藏切换 |
| GET | `/api/social/friends` | 好友列表 + 待处理请求 |
| POST | `/api/social/friends` | 按 `No.X` 或档案代号发送好友请求 |
| PATCH | `/api/social/friends` | 接受 / 拒绝请求 |
| DELETE | `/api/social/friends?id=` | 断开好友 / 撤回请求 |

---

## 六、状态机

```
AUTH ──接入/新档案──► 查询档案 ─┬─ 无档案 ──► CHARACTER ──POST 建档（掷异能）──► DIFFICULTY
                                └─ 有档案 ──► LOBBY ──────────────────────────► DIFFICULTY
LOBBY ──┬──► COMMUNITY（暗网论坛）
        └──► SOCIAL（幸存者频道）
DIFFICULTY ──选剧本──► GAMEPLAY ──每回合 PATCH 同步（异能计入判定）──► ENDING
ENDING ──BE：逐行 wipe + DELETE──► 回到 CHARACTER（档案真的没了，编号 +1）
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

粒子背景在 BE 期间同步切换为狂暴暗红（速度 ×2.6、拖尾加长、残影更久）。

---

## 八、粒子背景（`components/ui/ParticleField.tsx`）

形态是**悬浮的暗物质余烬**，不是连线的网：

- 130 个粒子，颜色在 `#8b0000` / `#00ff9d` / `#d4af37` 之间随机。**粒子之间不连任何线**。
- **彗星拖尾**：沿速度方向拉出尾迹，长度 ∝ 速度（静态 2.4px，高速可达 19px），越快越亮、核心越偏白。
- **辉光**：预渲染 64px `radial-gradient` 精灵，运行时只 `drawImage`（比逐帧 `shadowBlur` 快一个量级）；亮度做正弦呼吸脉动，相位每个粒子随机。
- **景深视差**：`depth` 0~1 驱动半径 / 速度 / 透明度，远景小而暗慢，近景大而亮快。
- **悬浮感**：缓慢上升气流 + 双频正弦横摆，像飘浮的灰烬；另有 0.06%/帧 概率的随机流星冲刺。
- 鼠标 < 70px 强力斥力推开；70~210px 施加**切向漩涡**，粒子绕鼠标旋转并轻微向心。
- 点击任意位置：340px 半径冲击波（力度按 `falloff²` × 景深加权），粒子高速炸开并瞬间染成炽白；随后阻尼 0.985 + 缓慢回归基础漂移速度，自然回落；同时画双层扩散血色冲击环。
- **BE 结局**：整场转狂暴暗红、速度 ×2.6、拖尾加长到 26px、背景清除 alpha 降到 0.09（残影更长）。
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
