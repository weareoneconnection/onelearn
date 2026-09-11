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

## 已实现界面

- Today：今日任务、掌握度、学习连续性和证据流
- 课程宇宙：32 个学院、936 门标准课程、1,328 条可选学习路径
- 动态课程：任意目录课程或用户目标都可调用 OpenAI 按需生成
- Knowledge map：展示模型生成的模块、课节数量和解锁状态
- Learning room：展示模型生成的首课正文、示例与可交互 OpenAI Tutor
- Practice：使用当前生成课程中的题目、答案和解析
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
- OpenAI Responses API + Structured Outputs
- 按需生成与设备端课程缓存，避免重复调用
- 课程目录零配置可浏览，生成能力缺少密钥时安全降级
- localStorage 保存当前工作区
- WebMCP 学习导航与状态读取工具
- 完整生产构建脚本

## 关键目录

```text
app/
  api/curriculum/route.ts  生成完整课程、知识模块、首课和练习
  api/lesson/route.ts      根据课程位置继续生成后续课节
  api/tutor/route.ts       基于当前课程上下文生成导师追问与反馈
  onelearn-app.tsx         完整产品工作台与交互
  globals.css              OneLearn 视觉系统
db/
  schema.ts                用户、目标、知识图谱、学习、评估与证据模型
lib/onelearn/
  catalog.ts               完整课程宇宙、语言/考试展开路径与动态课程模式
  generated-course.ts      课程、课节与练习的共享类型和 JSON Schema
  i18n.ts                  中英文界面辅助、学院/课程译名与双语检索映射
  mastery.ts               掌握度、遗忘与复习计算
  openai.ts                Responses API 服务端调用与安全错误处理
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
