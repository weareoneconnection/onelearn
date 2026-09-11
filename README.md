# OneLearn — Mastery OS

OneLearn 是一个独立的 AI 原生学习系统原型。它把学习目标、知识图谱、AI 教学、练习、复习和能力证据放进同一个闭环。

系统支持中英文即时切换，并会在浏览器中记住语言选择。界面、课程目录、搜索结果、学习流程和 AI 导师响应均随语言联动；中文课程原名在英文模式下仍会保留，便于核对来源。

## 直接运行

环境要求：Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可。首次启动不需要数据库、账号或模型密钥，系统会使用完整 Demo 数据。

## 接入真实 AI 导师

复制环境变量示例：

```bash
cp .env.example .env.local
```

然后填写：

```env
AI_API_KEY=your_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-5.1-mini
```

接口兼容 OpenAI 风格的 `/chat/completions`。如果不填写，`POST /api/tutor` 会返回可测试的 Demo 教学响应。

## 已实现界面

- Today：今日任务、掌握度、学习连续性和证据流
- 课程宇宙：32 个学院、936 门标准课程、1,328 条可选学习路径
- 动态课程：支持从用户目标、上传资料和现实结果即时生成专属课程
- Knowledge map：知识节点、前置关系和解锁状态
- Learning room：课程内容、Focus Mode 和可交互 AI Tutor
- Practice：自适应练习、判题和纠错反馈
- Review：基于保持率的复习队列
- Sources：资料导入与来源可信度界面
- Mastery proof：能力证明和证据档案
- New learning goal：学习目标创建流程
- Global search：全局命令入口
- Bilingual system：中英文界面、课程名称、搜索索引和 AI 导师响应统一切换
- Responsive UI：桌面、平板和手机适配

## 工程能力

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 与 Shadcn UI primitives
- Cloudflare Worker 兼容构建
- Drizzle ORM 核心领域模型
- 可选 AI Provider，无 SDK 锁定
- Demo-first：零配置即可运行
- localStorage 保存当前工作区
- WebMCP 学习导航与状态读取工具
- 完整生产构建脚本

## 关键目录

```text
app/
  api/tutor/route.ts       AI Tutor API，支持 Demo / Live 双模式
  onelearn-app.tsx         完整产品工作台与交互
  globals.css              OneLearn 视觉系统
db/
  schema.ts                用户、目标、知识图谱、学习、评估与证据模型
lib/onelearn/
  catalog.ts               完整课程宇宙、语言/考试展开路径与动态课程模式
  i18n.ts                  中英文界面辅助、学院/课程译名与双语检索映射
  mastery.ts               掌握度、遗忘与复习计算
components/ui/             可访问的基础 UI 组件
docs/
  ARCHITECTURE.md          产品及工程架构说明
```

## 构建生产版本

```bash
npm run build
npm run start
```

## 从原型进入生产

当前包可直接演示完整产品体验。正式上线时按 `docs/ARCHITECTURE.md` 的顺序接入身份认证、数据库、对象存储、文档解析、支付和可观测性；这些能力已经在领域模型和接口边界中预留，不需要推翻前端产品结构。
