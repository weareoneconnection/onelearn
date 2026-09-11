# OneLearn Architecture

## 1. 产品原则

OneLearn 的结果不是“看完课程”，而是形成经过验证、能够保持和迁移的能力。

核心闭环：

```text
Goal → Diagnose → Plan → Teach → Practice → Assess → Evidence → Review
```

核心资产：

1. Knowledge Graph：知识及依赖关系
2. Learner Model：用户的动态能力状态
3. Pedagogy Engine：下一步如何教
4. Evidence Graph：为什么可以认定掌握

## 2. 系统边界

OneLearn 独立拥有身份、数据、AI 教学、内容、计费和部署，不依赖其他 OneAI 产品。当前生成链路通过服务端 OpenAI Responses API 调用，浏览器永远不接触 API 密钥。

## 3. 逻辑模块

| 模块 | 职责 |
| --- | --- |
| Goal Engine | 将结果目标转化为能力定义和约束 |
| Course Catalog | 管理学院、专业方向、标准课程及语言/考试模板展开 |
| Diagnostic Engine | 自适应判断起点、误区和前置知识 |
| Curriculum Engine | 生成有版本的学习路径 |
| Curriculum Factory | 从用户目标、可信资料或现实结果动态反推专属课程 |
| Knowledge Engine | 解析来源并维护知识图谱 |
| Tutor Engine | 按教学状态执行讲解、追问和纠错 |
| Practice Engine | 生成难度可调的训练任务 |
| Assessment Engine | 基于 Rubric 和多证据独立评分 |
| Mastery Engine | 计算理解、回忆、应用、迁移和保持率 |
| Review Engine | 根据遗忘风险生成复习队列 |
| Evidence Engine | 保存项目、考试、答辩和延迟复测证据 |

界面本地化采用 `zh` / `en` 双语状态，语言选择持久化到浏览器。课程以中文原始名称作为稳定数据标识，通过独立翻译层生成英文显示名，并把中英文学院、分组和课程名同时写入搜索索引，避免切换语言后搜索能力缩水。

## 4. 推荐生产拓扑

```text
Web / PWA
   │
API Gateway
   │
Modular Application Core
   ├── Learning domain
   ├── Knowledge domain
   ├── Assessment domain
   ├── Identity & Billing
   └── AI Gateway
   │
PostgreSQL + pgvector ── Object Storage
   │
Queue / Workers ── Document Processing
```

首个生产版本继续使用模块化单体。只有当某个队列或计算负载具有独立扩缩容需求时，才拆为服务。

## 5. 掌握度模型

后台保存六个维度，前台显示可理解的区间：

- Understanding 20%
- Recall 15%
- Application 25%
- Transfer 20%
- Retention 20%
- Confidence 作为总体系数

单次答对不能直接产生 Mastered 状态。Mastered 至少需要应用证据、无提示验证以及延迟复测。

## 6. AI Tutor 响应契约

```json
{
  "reply": "string",
  "pedagogicalAction": "explain | probe | hint | remediate | assess | transfer",
  "evidence": {
    "dimension": "understanding | recall | application | transfer",
    "confidence": 0.0
  }
}
```

AI 只提出证据建议。Mastery Engine 根据历史、多次评估、时间间隔与评估可信度决定状态变化。

课程生成、课节生成和导师响应均使用 Structured Outputs。服务端以 JSON Schema 限制输出结构，再以运行时 Schema 二次校验；模型拒绝、不完整响应、超时、无效结构和未配置密钥都必须显式失败，不能回退成伪装的“AI 结果”。

## 7. 生产数据规则

- 路径、课程、题目、Rubric 和 Prompt 必须版本化。
- 所有能力变更必须能够回溯到 evidence。
- 评估模型与教学模型逻辑隔离。
- AI 调用记录用途、模型、Prompt 版本、延迟、成本与状态。
- 用户资料和公开能力证明分别授权。
- 用户可以导出或删除自己的学习数据。
- 高风险学科必须要求来源、适用地区、有效时间和人工审核状态。
- 医学内容必须标明“知识教育而非诊疗”，法律内容必须保存司法辖区和有效日期。
- 儿童课程必须使用独立的安全、家长控制与内容审核策略。
- 宗教课程必须保留来源透明度并呈现多学术视角。

## 8. 课程宇宙

Demo 目录由 `lib/onelearn/catalog.ts` 提供，完整收录 32 个学院和附件定义的 953 个课程主题/学习模板。语言方向与考试学习体系会进一步展开为 1,328 条可检索学习路径，其中包含 936 门标准课程、144 条语言专属路径与 248 个考试学习模块。所有目录项都有英文显示名；英文模式保留中文原名作为来源对照。

目录只是入口，不保存 1,328 门静态教材。用户选择任意目录课程，或使用目标生成、资料生成和结果反推模式后，Curriculum Engine 会按需生成模块、课节、首课正文、示例、检查问题和练习。后续课节按学习位置继续生成，AI Tutor 使用当前课程目标、参考答案、掌握度和最近对话作为上下文。

生成结果记录模型、响应 ID、生成时间、语言与依据类型，并缓存在当前设备。未提供外部资料时必须明确标记为模型知识生成；重要事实和高风险内容仍需可信来源或人工复核。

## 9. 上线顺序

### Foundation

接入正式身份、PostgreSQL、迁移、对象存储、事件日志和权限。

### Intelligence

把 Goal、Diagnostic、Tutor、Assessment 分别实现为有版本的服务边界；增加模型回退、限流、缓存和成本预算。

### Knowledge

实现 PDF/网页解析、来源片段、pgvector 检索、知识节点审核与冲突检测。

### Trust

加入多评估器、Rubric、人工复核、延迟复测、审计日志和 Mastery Passport 验证链接。

### Scale

加入团队空间、内容 Studio、多语言、支付、分析、Feature Flags 和运营后台。

## 10. 发布门槛

- 关键学习链路端到端完成率 ≥ 99.5%
- 高权重评估器一致率 ≥ 95%
- 所有知识主张可追溯到来源或明确标记为推导
- AI 故障有安全降级，不错误更新掌握度
- Web Core Vitals、键盘操作、200% 字体缩放和移动端检查通过
- 成本、延迟、错误率、留存和 Weekly Verified Mastery Gain 可观测
