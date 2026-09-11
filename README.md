# OneLearn — Mastery OS

OneLearn 是一个独立的 AI 原生学习系统原型。它把学习目标、知识图谱、AI 教学、练习、复习和能力证据放进同一个闭环。

系统支持中英文即时切换，并会在浏览器中记住语言选择。界面、课程目录、搜索结果、学习流程和 AI 导师响应均随语言联动；中文课程原名在英文模式下仍会保留，便于核对来源。

## 直接运行

环境要求：Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可。课程目录无需密钥即可浏览；生成课程、生成课节和 AI 导师需要 OpenAI API 密钥。

## 接入 OpenAI 课程引擎

在项目根目录创建只保存在本机的 `.env.local`：

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
```

系统通过服务端调用 OpenAI Responses API，密钥不会发送到浏览器。课程、课节和导师响应使用 Structured Outputs 按 JSON Schema 返回。没有密钥时系统会明确显示配置提示，不会把固定 Demo 冒充为模型结果。

请勿把真实密钥写入源码、示例文件或浏览器变量；本地只写入 `.env.local`，在线站点使用加密环境变量。

## 已实现能力（Beta）

- Today：今日任务、掌握度、学习连续性和证据流
- 课程宇宙：32 个学院、936 门标准课程、1,328 条可选学习路径
- 动态课程：任意目录课程或用户目标都可调用 OpenAI 按需生成
- Knowledge map：按模块列出每一节课的状态与掌握度，推荐下一节；上一模块各节练习通过后解锁
- Learning room：任意课节按需生成并保存（只生成一次），附可交互 OpenAI Tutor
- Practice：服务器按已保存课程评分，更新掌握度与复习计划
- Review：按遗忘曲线安排的复习队列；已掌握需独立答对 + 至少 20 小时后的复习复测
- Placement diagnostic：每个模块一题的入门诊断，已掌握模块直接解锁
- Engagement：连续学习天数、本周正确率、每日复习提醒邮件（Resend + Vercel Cron，可一键退订）
- Sources：上传 PDF、Office 文档、Markdown 或网页正文，进入 OpenAI 向量检索知识库
- Mastery proof：能力证明，可生成可撤销的公开链接 `/p/<token>`（不含邮箱）
- Growth：7 天免费试用、邀请好友双方各得 50 AI 点数、可选 PostHog 行为分析
- Support：帮助与反馈入口，运营中心反馈收件箱
- Operations：受管理员白名单保护的用户、课程质量、资料、Token 与失败率看板
- Plans & billing：免费/个人/专业/团队套餐、月付年付、AI 点数、Stripe 托管收银台、订阅门户与账单记录
- New learning goal：学习目标创建流程
- Global search：全局命令入口
- Bilingual system：中英文界面、课程名称、搜索索引和 AI 导师响应统一切换
- Responsive UI：桌面、平板和手机适配

## 工程能力

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 与 Shadcn UI primitives
- Cloudflare Worker 兼容构建
- ChatGPT 登录身份（Sites）与匿名设备身份安全降级
- Cloudflare D1 持久化学习档案、课程版本、质量报告、事件、AI 调用与每日配额
- R2 保存原始资料，OpenAI Vector Stores 提供语义与关键词检索
- OpenAI Responses API + Structured Outputs
- 独立课程质量评测；严重安全或事实问题会阻止课程上线并进入复核队列
- OpenAI 请求超时、指数退避重试、请求 ID、Token/延迟/失败日志与每用户每日预算
- 套餐权益、月度 AI 点数、资料容量、订阅状态、支付事件幂等和运营收入指标
- 按需生成、服务端课程版本化与设备端缓存，避免重复调用
- 课程目录零配置可浏览，生成能力缺少密钥时安全降级
- localStorage 保存当前工作区
- WebMCP 学习导航与状态读取工具
- 完整生产构建脚本

## 关键目录

```text
app/
  api/curriculum/route.ts  生成完整课程、知识模块、首课和练习
  api/lesson/route.ts      根据课程位置和检索资料继续生成后续课节
  api/tutor/route.ts       基于当前课程上下文生成导师追问与反馈
  api/sources/route.ts     资料上传、OpenAI 向量索引与来源清单
  api/workspace/route.ts   身份、跨设备工作区与偏好同步
  api/progress/route.ts    学习行为与评估证据事件
  api/admin/metrics/       受保护的运营与质量指标
  api/billing/             套餐状态、Stripe Checkout、订阅门户与安全 Webhook
  onelearn-app.tsx         完整产品工作台与交互
  globals.css              OneLearn 视觉系统
db/
  schema.ts                用户、课程版本、来源、质量、用量、学习与证据模型
drizzle/                   可部署的 D1 数据库迁移
lib/onelearn/
  catalog.ts               完整课程宇宙、语言/考试展开路径与动态课程模式
  generated-course.ts      课程、课节与练习的共享类型和 JSON Schema
  i18n.ts                  中英文界面辅助、学院/课程译名与双语检索映射
  mastery.ts               掌握度、遗忘与复习计算
  openai.ts                Responses、Files 与 Vector Stores API 网关
  persistence.ts           D1/R2 数据访问、身份、配额与运营聚合
  billing.ts               套餐权益、AI 点数、订阅、账单与收入聚合
  stripe.ts                Stripe REST 网关与 Webhook 签名验证
  quality.ts               独立课程质量闸门
components/ui/             可访问的基础 UI 组件
docs/
  ARCHITECTURE.md          产品及工程架构说明
```

## 构建生产版本

Sites / Cloudflare Worker：

```bash
npm run build
npm run start
```

`npm run start` 会先把 `drizzle/` 中尚未执行的迁移应用到本地 D1，再启动 Worker 生产预览。

Vercel 使用仓库中的 `vercel.json` 自动执行原生 Next.js 构建：

```bash
npm run build:vercel
```

Vercel 项目无需手动填写 Output Directory。请将 Framework Preset 保持为 Next.js，并在项目环境变量中配置 `OPENAI_API_KEY`；可选配置 `OPENAI_MODEL`。

Sites / Cloudflare 部署由 `.openai/hosting.json` 绑定 D1 `DB` 与 R2 `SOURCES`。Vercel 部署使用 Turso（`TURSO_DATABASE_URL`）作为数据库、Clerk 作为登录；两者都未配置时进入设备模式，数据只保存在进程内存中。新增迁移后先执行 `npm run db:migrate:turso`，再推送代码。

生产环境变量：

```env
OPENAI_API_KEY=encrypted_secret
OPENAI_MODEL=gpt-5.4-mini
ONELEARN_ADMIN_EMAILS=admin@example.com,ops@example.com
ONELEARN_DAILY_AI_REQUESTS=40
ONELEARN_DAILY_TOKEN_BUDGET=250000
STRIPE_SECRET_KEY=encrypted_secret
STRIPE_WEBHOOK_SECRET=encrypted_secret
STRIPE_PRICE_PERSONAL_MONTHLY=price_xxx
STRIPE_PRICE_PERSONAL_ANNUAL=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
ONELEARN_SITE_URL=https://www.onelearn.ltd
# Vercel：登录与数据库
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=encrypted_secret
TURSO_DATABASE_URL=libsql://xxx.turso.io
TURSO_AUTH_TOKEN=encrypted_secret
# 复习提醒邮件与每日定时任务
RESEND_API_KEY=encrypted_secret
ONELEARN_EMAIL_FROM=OneLearn <reminders@onelearn.ltd>
CRON_SECRET=encrypted_secret
# 可选
ONELEARN_TRIAL_DAYS=7
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
```

完整清单与说明见 `.env.example`。

`ONELEARN_ADMIN_EMAILS` 为空时，运营中心默认拒绝所有访问。Stripe Webhook 地址是 `/api/billing/webhook`，至少订阅 `checkout.session.completed`、`customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.paid` 和 `invoice.payment_failed`。所有 API 与 Webhook 密钥必须使用部署平台的加密 Secret，不能以明文提交到仓库。

## 测试与运维

```bash
npm test               # 单元与数据库测试（内存 SQLite，使用与线上相同的迁移）
npm run build:vercel
npm run test:e2e       # Playwright 端到端测试（桌面 + 手机尺寸）
npm run db:backup:turso  # 只读导出 Turso 全部数据到 backups/（不会提交到仓库）
```

- 端到端测试通过 `scripts/e2e-server.mjs` 从不含 `.env.local` 的独立目录启动构建产物，并移除数据库、登录、支付相关变量，因此永远不会访问线上数据或服务。
- `.github/workflows/ci.yml` 在每次推送和 Pull Request 时依次运行 lint、类型检查、单元测试、生产构建与端到端测试。要做到"不通过就不上线"，请在 GitHub 为 `main` 开启分支保护并要求 `CI / verify` 通过，同时在 Vercel 项目设置中开启 Deployment Checks，等待该检查后再发布到正式域名。
- 所有 API 错误返回结构化错误码；配置 `SENTRY_DSN` 后自动上报。
- Turso 另有平台自带的时间点恢复能力；本地备份文件含个人数据，请加密保存并定期清理。

## 从原型进入生产

当前版本已完成身份、持久化、整门课程学习、掌握度与复习、入门诊断、复习提醒、Stripe 订阅与试用、邀请增长、运营看板和自动化测试。走向正式商业生产仍需补充团队与组织权限、税务处理、用户数据导出与删除自助流程、来源冲突检测、人工复核操作台和压力测试。
