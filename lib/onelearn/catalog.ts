export type CourseGroup = {
  name: string;
  courses: string[];
};

export type Academy = {
  id: string;
  name: string;
  groups: CourseGroup[];
  note?: string;
};

export type CatalogEntry = {
  id: string;
  title: string;
  academyId: string;
  academy: string;
  group: string;
  kind: "standard" | "language_path" | "exam_path";
  level: "入门" | "进阶" | "专业" | "认证";
  description: string;
  searchable: string;
};

const rawAcademies: Academy[] = [
  {
    "id": "01",
    "name": "人工智能与AI Agent学院",
    "groups": [
      {
        "name": "AI基础",
        "courses": [
          "人工智能零基础入门",
          "生成式AI基础",
          "大语言模型工作原理",
          "Transformer基础",
          "Token与上下文窗口",
          "Prompt Engineering",
          "System Prompt设计",
          "结构化输出",
          "JSON Schema",
          "多模态AI",
          "AI幻觉与可靠性",
          "AI安全与伦理",
          "AI模型评估",
          "开源模型基础",
          "本地大模型部署"
        ]
      },
      {
        "name": "AI Agent",
        "courses": [
          "AI Agent零基础入门",
          "Function Calling",
          "Tool Calling",
          "Agent记忆系统",
          "Agent Context管理",
          "Agent任务规划",
          "Agent反思与纠错",
          "单Agent系统",
          "多Agent协作",
          "Agent工作流编排",
          "Human-in-the-loop",
          "Agent权限与审批",
          "Agent执行日志",
          "Agent评估体系",
          "Agent Observability",
          "Agent安全防护",
          "MCP基础",
          "Computer Use Agent",
          "Browser Agent",
          "Coding Agent",
          "Voice Agent",
          "Research Agent",
          "Customer Service Agent",
          "Sales Agent",
          "Construction Agent",
          "企业级Agent OS",
          "生产级Agent部署"
        ]
      },
      {
        "name": "模型训练",
        "courses": [
          "机器学习入门",
          "深度学习入门",
          "神经网络基础",
          "PyTorch入门",
          "模型微调基础",
          "LoRA与QLoRA",
          "数据集制作",
          "指令微调",
          "分布式训练",
          "GPU基础",
          "CUDA基础",
          "NCCL通信",
          "模型评测",
          "模型版本管理",
          "模型部署与推理",
          "模型量化",
          "模型压缩",
          "RLHF基础",
          "DPO训练",
          "合成数据",
          "AI训练安全门禁"
        ]
      }
    ]
  },
  {
    "id": "02",
    "name": "编程与软件工程学院",
    "groups": [
      {
        "name": "编程基础",
        "courses": [
          "计算机科学入门",
          "编程逻辑",
          "数据结构",
          "算法基础",
          "面向对象编程",
          "函数式编程",
          "设计模式",
          "Git与GitHub",
          "命令行与终端",
          "Linux基础",
          "软件调试",
          "软件测试",
          "技术文档写作"
        ]
      },
      {
        "name": "编程语言",
        "courses": [
          "Python零基础",
          "Python进阶",
          "JavaScript零基础",
          "TypeScript",
          "HTML与CSS",
          "React",
          "Next.js",
          "Node.js",
          "Java",
          "C语言",
          "C++",
          "C#",
          "Go",
          "Rust",
          "Swift",
          "Kotlin",
          "PHP",
          "Ruby",
          "SQL",
          "Shell脚本"
        ]
      },
      {
        "name": "软件开发",
        "courses": [
          "Web前端开发",
          "后端开发",
          "全栈开发",
          "REST API设计",
          "GraphQL",
          "WebSocket",
          "微服务架构",
          "模块化单体架构",
          "事件驱动架构",
          "软件系统设计",
          "高并发系统",
          "缓存设计",
          "消息队列",
          "数据库设计",
          "API安全",
          "SaaS产品开发",
          "多租户系统",
          "权限系统",
          "支付系统",
          "审计系统",
          "国际化系统",
          "移动App开发",
          "PWA开发",
          "桌面应用开发"
        ]
      }
    ]
  },
  {
    "id": "03",
    "name": "云计算与基础设施学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "云计算基础",
          "AWS入门",
          "Microsoft Azure",
          "Google Cloud",
          "阿里云",
          "腾讯云",
          "Docker",
          "Kubernetes",
          "EKS",
          "容器编排",
          "Serverless",
          "Cloudflare Workers",
          "Vercel部署",
          "Railway部署",
          "CI/CD",
          "GitHub Actions",
          "Infrastructure as Code",
          "Terraform",
          "DevOps",
          "DevSecOps",
          "Site Reliability Engineering",
          "系统可观测性",
          "日志管理",
          "Prometheus",
          "Grafana",
          "网络基础",
          "DNS与域名",
          "CDN",
          "负载均衡",
          "高可用架构",
          "容灾与备份",
          "GPU云集群",
          "云成本管理"
        ]
      }
    ]
  },
  {
    "id": "04",
    "name": "数据与数据库学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "数据分析入门",
          "SQL数据分析",
          "Excel数据分析",
          "Python数据分析",
          "Pandas",
          "NumPy",
          "数据可视化",
          "Power BI",
          "Tableau",
          "商业智能",
          "统计分析",
          "A/B测试",
          "数据工程",
          "数据仓库",
          "ETL与ELT",
          "PostgreSQL",
          "MySQL",
          "SQLite",
          "MongoDB",
          "Redis",
          "向量数据库",
          "pgvector",
          "数据湖",
          "实时数据处理",
          "数据治理",
          "数据质量",
          "数据隐私",
          "数据产品设计",
          "企业指标体系",
          "AI数据集管理"
        ]
      }
    ]
  },
  {
    "id": "05",
    "name": "网络安全学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "网络安全基础",
          "密码学基础",
          "身份认证",
          "OAuth与OIDC",
          "API安全",
          "Web安全",
          "云安全",
          "容器安全",
          "Kubernetes安全",
          "数据库安全",
          "零信任架构",
          "安全编码",
          "威胁建模",
          "漏洞管理",
          "渗透测试基础",
          "安全运营",
          "日志与事件响应",
          "供应链安全",
          "AI安全",
          "Prompt Injection防御",
          "Agent权限安全",
          "数据泄露防护",
          "企业安全合规"
        ]
      }
    ]
  },
  {
    "id": "06",
    "name": "产品与用户体验学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "产品经理入门",
          "AI产品经理",
          "产品战略",
          "用户研究",
          "用户需求分析",
          "产品定位",
          "市场验证",
          "MVP设计",
          "PRD写作",
          "用户故事",
          "产品路线图",
          "产品数据分析",
          "增长产品",
          "SaaS产品设计",
          "平台型产品设计",
          "API产品设计",
          "AI Agent产品设计",
          "UX设计基础",
          "UI设计基础",
          "交互设计",
          "信息架构",
          "设计系统",
          "Figma",
          "原型设计",
          "可用性测试",
          "无障碍设计",
          "国际化产品设计"
        ]
      }
    ]
  },
  {
    "id": "07",
    "name": "创业与公司经营学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "创业基础",
          "从想法到产品",
          "商业模式设计",
          "市场规模分析",
          "用户痛点验证",
          "创业者销售",
          "冷启动",
          "产品市场匹配",
          "定价策略",
          "SaaS商业模式",
          "平台商业模式",
          "Marketplace商业模式",
          "AI创业",
          "技术创业",
          "公司注册基础",
          "股权设计",
          "联合创始人机制",
          "招聘第一批员工",
          "创业财务",
          "现金流管理",
          "融资基础",
          "Pitch Deck",
          "创业估值",
          "投资人沟通",
          "尽职调查",
          "公司治理",
          "国际化创业",
          "从0到1",
          "从1到10",
          "创业失败复盘"
        ]
      }
    ]
  },
  {
    "id": "08",
    "name": "商业、战略与管理学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "商业基础",
          "管理学基础",
          "企业战略",
          "竞争战略",
          "平台战略",
          "数字化转型",
          "AI转型战略",
          "商业案例分析",
          "商业决策",
          "组织设计",
          "运营管理",
          "流程管理",
          "绩效管理",
          "OKR",
          "KPI设计",
          "成本管理",
          "风险管理",
          "变革管理",
          "创新管理",
          "知识管理",
          "企业危机管理",
          "全球化管理",
          "跨文化管理",
          "董事会与公司治理"
        ]
      }
    ]
  },
  {
    "id": "09",
    "name": "领导力与项目管理学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "领导力基础",
          "团队管理",
          "高效沟通",
          "冲突管理",
          "授权与反馈",
          "高压环境决策",
          "会议管理",
          "时间管理",
          "目标管理",
          "项目管理基础",
          "PMP知识体系",
          "Agile",
          "Scrum",
          "Kanban",
          "瀑布式项目管理",
          "项目范围管理",
          "项目进度管理",
          "项目成本管理",
          "项目质量管理",
          "项目风险管理",
          "项目沟通管理",
          "项目采购管理",
          "项目干系人管理",
          "项目复盘",
          "项目组合管理",
          "项目管理办公室PMO",
          "国际项目管理",
          "EPC项目管理"
        ]
      }
    ]
  },
  {
    "id": "10",
    "name": "市场营销与品牌学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "市场营销基础",
          "市场调研",
          "消费者心理",
          "品牌定位",
          "品牌战略",
          "品牌命名",
          "品牌视觉",
          "内容营销",
          "社交媒体营销",
          "短视频营销",
          "抖音运营",
          "小红书运营",
          "X/Twitter增长",
          "LinkedIn营销",
          "YouTube运营",
          "SEO",
          "SEM",
          "电子邮件营销",
          "社群运营",
          "增长黑客",
          "产品发布",
          "病毒传播机制",
          "广告投放",
          "营销数据分析",
          "B2B营销",
          "SaaS营销",
          "AI产品营销",
          "国际市场营销",
          "公关与媒体关系",
          "危机公关"
        ]
      }
    ]
  },
  {
    "id": "11",
    "name": "销售与客户成功学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "销售基础",
          "顾问式销售",
          "B2B销售",
          "SaaS销售",
          "企业销售",
          "销售漏斗",
          "客户开发",
          "Cold Email",
          "Cold Call",
          "商务谈判",
          "报价策略",
          "合同谈判",
          "销售演示",
          "产品Demo",
          "异议处理",
          "成交技巧",
          "CRM管理",
          "Key Account Management",
          "客户成功",
          "客户续费",
          "客户流失分析",
          "渠道销售",
          "合作伙伴管理",
          "国际销售",
          "AI销售自动化"
        ]
      }
    ]
  },
  {
    "id": "12",
    "name": "财务、会计与投资学院",
    "groups": [
      {
        "name": "财务与会计",
        "courses": [
          "财务基础",
          "会计基础",
          "财务三张表",
          "资产负债表",
          "利润表",
          "现金流量表",
          "成本会计",
          "管理会计",
          "财务分析",
          "财务建模",
          "预算管理",
          "企业估值",
          "创业公司财务",
          "SaaS指标",
          "税务基础",
          "审计基础",
          "内部控制"
        ]
      },
      {
        "name": "投资",
        "courses": [
          "投资基础",
          "股票投资",
          "债券投资",
          "基金投资",
          "ETF",
          "房地产投资",
          "风险投资",
          "私募股权",
          "初创企业估值",
          "投资组合管理",
          "风险与收益",
          "宏观经济分析",
          "行业研究",
          "公司基本面分析",
          "技术分析基础",
          "行为金融",
          "数字资产基础",
          "区块链金融",
          "投资风险管理"
        ]
      }
    ]
  },
  {
    "id": "13",
    "name": "建筑、工程与Construction AI学院",
    "groups": [
      {
        "name": "工程基础",
        "courses": [
          "工程识图",
          "建筑材料",
          "工程测量",
          "工程力学",
          "结构力学",
          "混凝土结构",
          "钢结构",
          "岩土工程",
          "地基基础",
          "道路工程",
          "桥梁工程",
          "隧道工程",
          "铁路工程",
          "建筑机电",
          "给排水",
          "暖通空调",
          "电气工程",
          "幕墙工程",
          "装饰装修",
          "超高层建筑",
          "工业厂房",
          "大型公共建筑"
        ]
      },
      {
        "name": "施工管理",
        "courses": [
          "施工组织设计",
          "施工技术管理",
          "工程进度管理",
          "工程成本管理",
          "工程质量管理",
          "HSE安全管理",
          "分包管理",
          "材料管理",
          "施工现场协调",
          "工程验收",
          "缺陷管理",
          "工程文件管理",
          "变更管理",
          "工程索赔",
          "合同管理",
          "FIDIC合同",
          "EPC总承包",
          "海外工程管理",
          "本地化管理",
          "工程危机处理"
        ]
      },
      {
        "name": "数字建造",
        "courses": [
          "BIM基础",
          "Revit",
          "Navisworks",
          "IFC",
          "BIM协同",
          "4D进度模拟",
          "5D成本管理",
          "数字孪生",
          "GIS",
          "无人机工程应用",
          "计算机视觉质量检查",
          "AI工程风险识别",
          "AI进度预测",
          "AI安全管理",
          "AI合同审查",
          "AI工程知识库",
          "Construction Agent",
          "Construction Intelligence OS"
        ]
      }
    ]
  },
  {
    "id": "14",
    "name": "制造、供应链与工业学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "制造业基础",
          "精益生产",
          "六西格玛",
          "工业工程",
          "生产计划",
          "质量管理",
          "设备管理",
          "预测性维护",
          "工业自动化",
          "PLC基础",
          "机器人基础",
          "工业物联网",
          "智能制造",
          "数字工厂",
          "数字孪生",
          "供应链基础",
          "采购管理",
          "库存管理",
          "仓储管理",
          "物流管理",
          "国际贸易",
          "进出口基础",
          "海关与清关",
          "供应链风险",
          "AI供应链优化"
        ]
      }
    ]
  },
  {
    "id": "15",
    "name": "能源、环境与可持续发展学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "能源基础",
          "石油与天然气基础",
          "电力系统",
          "可再生能源",
          "太阳能",
          "风能",
          "储能系统",
          "氢能源",
          "核能基础",
          "电动汽车",
          "充电基础设施",
          "碳管理",
          "ESG基础",
          "绿色建筑",
          "环境工程",
          "水资源管理",
          "废弃物管理",
          "生命周期评估",
          "气候变化",
          "可持续供应链",
          "智慧能源",
          "AI能源优化"
        ]
      }
    ]
  },
  {
    "id": "16",
    "name": "数学、统计与逻辑学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "基础数学",
          "代数",
          "几何",
          "三角函数",
          "微积分",
          "线性代数",
          "离散数学",
          "概率论",
          "数理统计",
          "贝叶斯统计",
          "优化方法",
          "运筹学",
          "数值分析",
          "时间序列",
          "回归分析",
          "因果推断",
          "博弈论",
          "数学建模",
          "形式逻辑",
          "批判性思维",
          "问题解决",
          "决策理论"
        ]
      }
    ]
  },
  {
    "id": "17",
    "name": "自然科学学院",
    "groups": [
      {
        "name": "物理",
        "courses": [
          "基础物理",
          "力学",
          "热力学",
          "电磁学",
          "光学",
          "量子物理入门",
          "相对论入门",
          "天文学",
          "宇宙学"
        ]
      },
      {
        "name": "化学",
        "courses": [
          "基础化学",
          "无机化学",
          "有机化学",
          "物理化学",
          "分析化学",
          "材料化学",
          "环境化学"
        ]
      },
      {
        "name": "生物",
        "courses": [
          "生物学基础",
          "细胞生物学",
          "遗传学",
          "分子生物学",
          "微生物学",
          "生态学",
          "进化论",
          "神经科学基础",
          "生物信息学",
          "生物技术"
        ]
      }
    ]
  },
  {
    "id": "18",
    "name": "医学、健康与心理学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "人体解剖基础",
          "生理学基础",
          "医学术语",
          "营养学",
          "运动科学",
          "睡眠科学",
          "体重管理",
          "心血管健康知识",
          "血脂管理知识",
          "脂肪肝健康教育",
          "急救基础",
          "公共卫生",
          "流行病学",
          "医学研究阅读",
          "循证医学",
          "药理学基础",
          "心理学基础",
          "认知心理学",
          "社会心理学",
          "积极心理学",
          "压力管理",
          "情绪管理",
          "正念训练",
          "沟通心理学",
          "心理健康常识"
        ]
      }
    ],
    "note": "本学院定位为健康知识教育，不能替代医生诊断和治疗。"
  },
  {
    "id": "19",
    "name": "法律、合规与公共治理学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "法律基础",
          "合同法",
          "公司法",
          "劳动法",
          "知识产权",
          "数据隐私",
          "网络安全法律",
          "AI法律与治理",
          "建筑工程法律",
          "国际工程合同",
          "商业合同审查",
          "争议解决",
          "仲裁基础",
          "合规管理",
          "反腐败合规",
          "反洗钱基础",
          "企业风险合规",
          "公司治理",
          "公共政策",
          "政府治理",
          "国际关系",
          "外交基础"
        ]
      }
    ],
    "note": "法律课程需标明适用国家、地区与内容有效日期。"
  },
  {
    "id": "20",
    "name": "语言学院",
    "groups": [
      {
        "name": "英语",
        "courses": [
          "英语零基础",
          "日常英语",
          "商务英语",
          "职场英语",
          "工程英语",
          "技术英语",
          "学术英语",
          "英语语法",
          "英语词汇",
          "英语听力",
          "英语口语",
          "英语发音",
          "英语阅读",
          "英语写作",
          "英语邮件",
          "英语会议",
          "英语谈判",
          "英语汇报",
          "英语面试",
          "IELTS",
          "TOEFL",
          "TOEIC"
        ]
      },
      {
        "name": "其他语言",
        "courses": [
          "中文",
          "法语",
          "西班牙语",
          "德语",
          "阿拉伯语",
          "马来语",
          "葡萄牙语",
          "日语",
          "韩语",
          "俄语",
          "意大利语",
          "土耳其语",
          "印地语",
          "印尼语",
          "泰语",
          "越南语"
        ]
      },
      {
        "name": "语言学习方向",
        "courses": [
          "零基础",
          "日常交流",
          "商务",
          "旅行",
          "专业词汇",
          "发音",
          "听说读写",
          "考试",
          "文化与礼仪"
        ]
      }
    ],
    "note": "每种语言均可按零基础、日常交流、商务、旅行、专业词汇、发音、听说读写、考试、文化与礼仪生成专属路径。"
  },
  {
    "id": "21",
    "name": "沟通、写作与表达学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "高效沟通",
          "结构化表达",
          "逻辑表达",
          "商务写作",
          "技术写作",
          "报告写作",
          "公文写作",
          "邮件写作",
          "新闻稿写作",
          "学术写作",
          "故事写作",
          "小说写作",
          "剧本创作",
          "广告文案",
          "社交媒体文案",
          "演讲",
          "即兴表达",
          "辩论",
          "谈判",
          "会议主持",
          "客户汇报",
          "PPT表达",
          "镜头表现",
          "播客表达",
          "跨文化沟通",
          "冲突沟通"
        ]
      }
    ]
  },
  {
    "id": "22",
    "name": "设计、艺术与创意学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "设计基础",
          "平面设计",
          "视觉设计",
          "品牌设计",
          "Logo设计",
          "字体设计",
          "色彩理论",
          "排版",
          "摄影",
          "摄像",
          "电影语言",
          "分镜设计",
          "剪辑",
          "调色",
          "音效设计",
          "动画基础",
          "3D设计",
          "建筑设计",
          "室内设计",
          "工业设计",
          "服装设计",
          "游戏设计",
          "音乐基础",
          "乐理",
          "作曲",
          "创意写作",
          "AI绘画",
          "AI视频生成",
          "AI音乐",
          "AI创意工作流",
          "OneVideo内容创作"
        ]
      }
    ]
  },
  {
    "id": "23",
    "name": "内容创作与自媒体学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "自媒体入门",
          "个人IP定位",
          "内容选题",
          "内容策划",
          "短视频脚本",
          "纪录片脚本",
          "科普内容创作",
          "口播视频",
          "视频拍摄",
          "视频剪辑",
          "AI视频制作",
          "封面设计",
          "标题设计",
          "病毒传播文案",
          "抖音起号",
          "小红书起号",
          "YouTube频道运营",
          "X/Twitter内容增长",
          "LinkedIn个人品牌",
          "播客制作",
          "直播基础",
          "内容矩阵",
          "粉丝社区",
          "创作者商业化",
          "品牌合作",
          "数据分析与内容复盘"
        ]
      }
    ]
  },
  {
    "id": "24",
    "name": "人文、历史与社会科学学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "世界历史",
          "中国历史",
          "欧洲历史",
          "伊斯兰文明史",
          "东南亚历史",
          "马来西亚历史",
          "美国历史",
          "艺术史",
          "建筑史",
          "科学史",
          "哲学入门",
          "西方哲学",
          "中国哲学",
          "道家思想",
          "儒家思想",
          "伊斯兰哲学",
          "苏菲思想",
          "伦理学",
          "认识论",
          "政治学",
          "经济学",
          "社会学",
          "人类学",
          "地理学",
          "宗教学",
          "文学",
          "电影研究",
          "文化研究",
          "全球化研究"
        ]
      }
    ],
    "note": "宗教相关课程坚持尊重、来源透明与多学术视角。"
  },
  {
    "id": "25",
    "name": "经济学与社会发展学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "微观经济学",
          "宏观经济学",
          "国际经济学",
          "发展经济学",
          "劳动经济学",
          "产业经济学",
          "行为经济学",
          "数字经济",
          "平台经济",
          "创新经济",
          "城市经济",
          "房地产经济",
          "公共财政",
          "货币与银行",
          "全球贸易",
          "经济指标分析",
          "东南亚经济",
          "中国经济",
          "马来西亚经济",
          "新兴市场研究"
        ]
      }
    ]
  },
  {
    "id": "26",
    "name": "房地产与城市发展学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "房地产基础",
          "房地产开发",
          "土地获取",
          "项目可行性研究",
          "房地产金融",
          "房地产估值",
          "商业地产",
          "住宅地产",
          "工业地产",
          "酒店地产",
          "物业管理",
          "资产管理",
          "城市规划",
          "城市更新",
          "智慧城市",
          "TOD开发",
          "绿色社区",
          "房地产营销",
          "房地产合同",
          "房地产投资",
          "AI房地产分析"
        ]
      }
    ]
  },
  {
    "id": "27",
    "name": "教育与教学学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "学习科学",
          "教育心理学",
          "教学设计",
          "课程设计",
          "知识图谱设计",
          "练习设计",
          "考试设计",
          "Rubric评分",
          "自适应学习",
          "项目式学习",
          "苏格拉底教学",
          "翻转课堂",
          "在线教育",
          "企业培训",
          "教师数字化能力",
          "AI辅助教学",
          "AI Tutor设计",
          "学习数据分析",
          "学习障碍识别",
          "教学质量评估"
        ]
      }
    ]
  },
  {
    "id": "28",
    "name": "职业发展学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "职业规划",
          "职业转型",
          "AI时代职业规划",
          "简历写作",
          "LinkedIn优化",
          "求职策略",
          "面试基础",
          "行为面试",
          "技术面试",
          "管理岗位面试",
          "项目经理面试",
          "AI产品经理面试",
          "英语面试",
          "薪资谈判",
          "Offer比较",
          "海外求职",
          "远程工作",
          "自由职业",
          "个人品牌",
          "职业作品集",
          "管理者晋升",
          "从工程转型AI",
          "创业与全职工作的平衡"
        ]
      }
    ]
  },
  {
    "id": "29",
    "name": "考试与认证学院",
    "groups": [
      {
        "name": "国际考试",
        "courses": [
          "IELTS",
          "TOEFL",
          "TOEIC",
          "GMAT",
          "GRE",
          "SAT",
          "ACT",
          "AP课程"
        ]
      },
      {
        "name": "项目与管理认证",
        "courses": [
          "PMP",
          "PRINCE2",
          "Scrum Master",
          "Product Owner",
          "Lean Six Sigma",
          "MBA入学准备"
        ]
      },
      {
        "name": "云与技术认证",
        "courses": [
          "AWS认证",
          "Microsoft Azure认证",
          "Google Cloud认证",
          "Kubernetes CKA",
          "Kubernetes CKAD",
          "CompTIA",
          "Cisco认证",
          "Linux认证",
          "数据分析认证",
          "网络安全认证"
        ]
      },
      {
        "name": "财务与专业认证",
        "courses": [
          "CFA",
          "ACCA",
          "CPA",
          "FRM",
          "建筑与工程类资格考试",
          "安全管理认证",
          "BIM专业认证"
        ]
      },
      {
        "name": "考试学习体系",
        "courses": [
          "入门诊断",
          "考点地图",
          "每日计划",
          "动态题库",
          "错题模型",
          "模拟考试",
          "冲刺计划",
          "通过概率预测"
        ]
      }
    ],
    "note": "每项考试均可生成诊断、考点地图、每日计划、动态题库、错题模型、模拟考试、冲刺计划和通过概率预测。"
  },
  {
    "id": "30",
    "name": "生活能力学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "时间管理",
          "目标管理",
          "习惯养成",
          "个人知识管理",
          "笔记方法",
          "快速阅读",
          "深度阅读",
          "记忆方法",
          "批判性思维",
          "决策能力",
          "问题解决",
          "情绪管理",
          "压力管理",
          "财务规划",
          "家庭预算",
          "旅行规划",
          "基础烹饪",
          "食品安全",
          "家庭急救",
          "数字安全",
          "反诈骗",
          "网络隐私",
          "亲子沟通",
          "婚姻沟通",
          "跨文化生活",
          "海外生活适应"
        ]
      }
    ]
  },
  {
    "id": "31",
    "name": "儿童与青少年学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "儿童英语",
          "数学思维",
          "科学启蒙",
          "编程启蒙",
          "AI启蒙",
          "阅读理解",
          "写作启蒙",
          "创造力训练",
          "逻辑思维",
          "财商启蒙",
          "沟通能力",
          "情绪识别",
          "网络安全",
          "媒体素养",
          "项目式学习",
          "青少年职业探索"
        ]
      }
    ],
    "note": "本学院需要独立的儿童安全、家长控制与内容审核机制。"
  },
  {
    "id": "32",
    "name": "企业内部学习学院",
    "groups": [
      {
        "name": "全部课程",
        "courses": [
          "公司介绍",
          "企业文化",
          "新员工入职",
          "岗位SOP",
          "产品知识",
          "销售培训",
          "客户服务培训",
          "项目管理规范",
          "安全培训",
          "质量培训",
          "信息安全培训",
          "数据隐私培训",
          "法律合规培训",
          "反腐败培训",
          "管理者培训",
          "企业AI使用规范",
          "AI技能培训",
          "内部软件培训",
          "事故案例学习",
          "项目经验复盘",
          "组织知识传承"
        ]
      }
    ],
    "note": "企业可将内部知识生成仅组织成员可见的私人课程。"
  }
];

const templateGroups = new Set(["语言学习方向", "考试学习体系"]);

function inferLevel(title: string, academyId: string): CatalogEntry["level"] {
  if (academyId === "29" || /认证|考试|IELTS|TOEFL|TOEIC|GMAT|GRE|SAT|ACT|PMP|CFA|ACCA|CPA|FRM|CKA|CKAD/.test(title)) return "认证";
  if (/零基础|入门|基础|启蒙|常识/.test(title)) return "入门";
  if (/进阶|高级|架构|战略|治理|总承包|高并发|分布式|量子|系统/.test(title)) return "进阶";
  return "专业";
}

function makeEntry(
  academy: Academy,
  group: string,
  title: string,
  index: number,
  kind: CatalogEntry["kind"] = "standard",
): CatalogEntry {
  const level = inferLevel(title, academy.id);
  return {
    id: `${academy.id}-${kind}-${group}-${index}`,
    title,
    academyId: academy.id,
    academy: academy.name,
    group,
    kind,
    level,
    description: `围绕「${title}」建立从入门诊断、知识地图、讲解与练习，到项目验证和长期复习的完整掌握路径。`,
    searchable: `${title} ${academy.name} ${group} ${level}`.toLocaleLowerCase("zh-CN"),
  };
}

export const academies = rawAcademies;

export const standardCourses: CatalogEntry[] = academies.flatMap((academy) =>
  academy.groups.flatMap((group) =>
    templateGroups.has(group.name)
      ? []
      : group.courses.map((title, index) => makeEntry(academy, group.name, title, index)),
  ),
);

const languageAcademy = academies.find((academy) => academy.id === "20")!;
const languages = languageAcademy.groups.find((group) => group.name === "其他语言")!.courses;
export const languageDirections = languageAcademy.groups.find((group) => group.name === "语言学习方向")!.courses;
export const languagePaths: CatalogEntry[] = languages.flatMap((language, languageIndex) =>
  languageDirections.map((direction, directionIndex) =>
    makeEntry(
      languageAcademy,
      "语言学习方向",
      `${language} · ${direction}`,
      languageIndex * languageDirections.length + directionIndex,
      "language_path",
    ),
  ),
);

const examAcademy = academies.find((academy) => academy.id === "29")!;
const examGroups = examAcademy.groups.filter((group) => group.name !== "考试学习体系");
const exams = examGroups.flatMap((group) => group.courses);
export const examLearningModes = examAcademy.groups.find((group) => group.name === "考试学习体系")!.courses;
export const examPaths: CatalogEntry[] = exams.flatMap((exam, examIndex) =>
  examLearningModes.map((mode, modeIndex) =>
    makeEntry(
      examAcademy,
      "考试学习体系",
      `${exam} · ${mode}`,
      examIndex * examLearningModes.length + modeIndex,
      "exam_path",
    ),
  ),
);

export const courseCatalog = [...standardCourses, ...languagePaths, ...examPaths];

export const dynamicCourseModes = [
  {
    id: "goal",
    title: "用户生成课程",
    eyebrow: "FROM YOUR GOAL",
    description: "直接描述想掌握的能力和时间范围，系统实时生成专属课程，无需等待课程商城预先收录。",
    example: "我想在 30 天学会独立搭建一个 AI SaaS。",
    outputs: ["能力诊断", "个性化路径", "每日任务", "掌握证明"],
  },
  {
    id: "source",
    title: "资料生成课程",
    eyebrow: "FROM ANY SOURCE",
    description: "上传书籍、论文、规范或公司文件，系统把可信资料转化为完整学习闭环。",
    example: "上传一本书、论文、规范或公司文件。",
    outputs: ["知识地图", "课程", "练习", "错题", "项目", "考试", "复习计划"],
  },
  {
    id: "outcome",
    title: "结果反推课程",
    eyebrow: "FROM AN OUTCOME",
    description: "从现实结果倒推必须掌握的知识、技能和交付任务，形成最短可信路径。",
    example: "通过面试、完成工程项目、开发产品、通过 PMP 或向客户做英文汇报。",
    outputs: ["结果拆解", "差距诊断", "任务路径", "情境演练", "成果验证"],
  },
] as const;

export const catalogScale = [
  { label: "学院", value: "32" },
  { label: "标准课程", value: standardCourses.length.toLocaleString("zh-CN") },
  { label: "可选学习路径", value: courseCatalog.length.toLocaleString("zh-CN") },
  { label: "动态个性化课程", value: "无限" },
] as const;

export const futureCatalogScale = [
  { label: "学院", value: "30+" },
  { label: "一级专业方向", value: "300+" },
  { label: "标准学习路径", value: "1,000+" },
  { label: "独立课程", value: "10,000+" },
  { label: "知识节点", value: "100万+" },
  { label: "动态个性化课程", value: "理论上无限" },
] as const;

export const launchSequence = [
  "AI 与 AI Agent",
  "编程与数字技能",
  "Construction AI 与工程管理",
  "英语与职业沟通",
  "项目管理与认证考试",
  "企业内部知识学习",
  "开放用户上传任何资料",
  "开放专家和机构创建课程",
] as const;

export function academyEntryCount(academyId: string) {
  return courseCatalog.filter((course) => course.academyId === academyId).length;
}

export function searchCatalog(query: string, academyId = "all") {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  return courseCatalog.filter((course) => {
    const academyMatches = academyId === "all" || course.academyId === academyId;
    return academyMatches && (!normalized || course.searchable.includes(normalized));
  });
}
