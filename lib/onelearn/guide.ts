// User guide content. Keep it in sync with product behavior: credit costs come from
// billing.ts (ACTION_CREDITS, PLAN_CATALOG) and mastery rules from mastery.ts.

export type GuideBlock = string | { list: string[] } | { steps: string[] } | { tip: string };
export type GuideSection = { id: string; heading: string; body: GuideBlock[] };
export type Guide = { title: string; intro: string; tocLabel: string; sections: GuideSection[] };

export const USER_GUIDE: Record<"zh" | "en", Guide> = {
  zh: {
    title: "OneLearn 使用手册",
    intro: "OneLearn 帮你把任何想学的内容变成一门完整的课程，并用练习和复习确认你真正掌握。下面按使用顺序介绍每项功能。",
    tocLabel: "目录",
    sections: [
      {
        id: "quick-start",
        heading: "1. 3 分钟快速上手",
        body: [
          { steps: [
            "打开 www.onelearn.ltd。不登录也可以先体验，但学习记录只保存在当前设备。",
            "点击左下角头像（手机上点底部「更多」），选择「登录并跨设备同步」，用邮箱验证码或 Google 账号登录。",
            "在「课程宇宙」选一门课，或点击左下角「新建学习目标」输入你想掌握的内容，然后点击「用 OpenAI 生成」。",
            "课程生成后会进入「知识地图」。建议先做 3 分钟「入门诊断」，已经会的模块会直接解锁。",
            "点击推荐的课节开始学习：读课文 → 用自己的话回答导师 → 练习本节 → 按提醒回来复习。",
          ] },
          { tip: "OneLearn 的学习方法：学完用自己的话讲一遍，独立答对练习，隔天复习时再答对一次，才算真正掌握。" },
        ],
      },
      {
        id: "account",
        heading: "2. 登录与账号",
        body: [
          "未登录时是「设备模式」：可以浏览课程、体验演示内容，但记录只保存在当前浏览器，换设备或清理浏览器数据后会丢失；同一网络下的未登录用户每天共享少量 AI 使用次数。",
          "登录后是「云端学习档案」：课程、进度、掌握度和会员在手机和电脑之间自动同步。支持邮箱验证码和 Google 账号登录。",
          "点击左下角头像（手机在底部「更多」里）打开账号菜单：",
          { list: [
            "登录 / 退出登录",
            "套餐与账单：查看 AI 点数、开通或管理订阅",
            "邀请好友：复制专属邀请链接，双方各得 50 个 AI 点数",
            "复习提醒邮件：开启或关闭每日复习提醒",
            "帮助与反馈、使用手册、用户协议与隐私",
          ] },
        ],
      },
      {
        id: "courses",
        heading: "3. 找到或创建课程",
        body: [
          "「课程宇宙」收录 32 个学院、上千条学习路径。可以按学院筛选，或在搜索框输入课程、技能或证书名称。",
          "在任意页面按 ⌘K（Windows 按 Ctrl+K），或点击顶部的搜索图标，可以全局搜索课程。",
          "找不到想学的课？可以让 AI 按需生成专属课程：",
          { list: [
            "目标生成：描述你想达到的能力和时间，例如「30 天学会独立开发 AI SaaS」。",
            "资料生成：先在「资料库」上传书籍、论文或公司文档，再生成基于这些资料的课程。",
            "结果反推：从一个现实结果出发，例如「通过 PMP 考试」「用英语完成客户演示」。",
          ] },
          "也可以直接点击左下角「新建学习目标」输入目标。生成一门课约需 30–60 秒，消耗 30 个 AI 点数。",
          { tip: "AI 生成的内容仅供学习参考。涉及医疗、法律、财务等重要决定时，请以权威来源为准。" },
        ],
      },
      {
        id: "map",
        heading: "4. 知识地图：看清整门课",
        body: [
          "每门课由 5–7 个模块组成，每个模块包含若干课节。课节右侧的百分比是你在这一节的掌握度。",
          { list: [
            "空心圆：可以开始学习",
            "蓝色勾：已通过练习（独立答对过一次）",
            "绿色勾：已掌握（隔天复习时再次答对）",
            "锁：暂未解锁",
          ] },
          "解锁规则：上一个模块的每一节都通过练习后，下一个模块自动解锁；入门诊断显示你已经会的模块也会直接解锁。",
          "标着「下一节」的高亮课节是系统推荐你接下来学的内容，点击「继续学习」可以直接打开。",
          "「生成新版本」会重新生成整门课（消耗 30 个 AI 点数），新版本的学习进度从零开始，请谨慎使用。",
        ],
      },
      {
        id: "diagnostic",
        heading: "5. 入门诊断：跳过已经会的内容",
        body: [
          "新课程第一次打开知识地图时，会提示「先做 3 分钟入门诊断」。系统为每个模块出一道题，生成约需 10–20 秒，消耗 4 个 AI 点数。",
          "答对的模块会标记为「已掌握，可以跳过」，后面的模块随之解锁，推荐学习时也会跳过它们。答不出来很正常，选最接近的答案即可。",
          "每门课只能做一次诊断。提交后可以查看每道题的解析。",
        ],
      },
      {
        id: "learning",
        heading: "6. 学习空间：读课文、问导师",
        body: [
          "左侧是课文，包括学习目标、分节讲解、关键要点和示例。每门课的第一节随课程一起生成；其他课节在你第一次打开时生成（约 20–40 秒，消耗 6 个 AI 点数），之后再打开不再消耗点数。",
          "右侧是 AI 导师 Sora。它会先问你一个检查问题，请用自己的话回答，不要照抄课文。导师会追问、给提示或纠正误解，帮你真正理解。每次向导师发送消息消耗 1 个 AI 点数。",
          "课文底部有两个按钮：「练习本节」进入这一节的练习；「下一节」打开下一节课。如果下一节在未解锁的模块里，按钮会变灰，需要先通过本模块每一节的练习。",
          { tip: "导师给的是提示而不是标准答案。和它多来回几轮，理解会更扎实。" },
        ],
      },
      {
        id: "practice",
        heading: "7. 练习",
        body: [
          "每节课有 3–4 道单选题。选好答案后点击「检查答案」，系统会在服务器端评分，显示解析和你最新的掌握度，然后点击「下一题」继续。",
          "独立答对一次，这节课就算「通过练习」，系统会同时安排复习时间。答错时复习会提前，大约 12 小时后再次出现。",
          "练习不消耗 AI 点数。",
        ],
      },
      {
        id: "review",
        heading: "8. 复习：按遗忘曲线巩固",
        body: [
          "系统按遗忘曲线为每节课安排复习：答对越稳定，下次复习的间隔越长。到期的课节会出现在「复习」页和首页的复习队列里，手机底部的「复习」标签上也会显示数量。",
          "点击「开始复习」或「现在复习」即可作答。复习只使用已经生成过的内容，不消耗 AI 点数。",
          "登录后可以在账号菜单开启「复习提醒邮件」：有内容到期时，每天最多收到一封提醒，邮件底部可以一键退订。",
        ],
      },
      {
        id: "proof",
        heading: "9. 掌握证明",
        body: [
          "OneLearn 不会因为你答对一次就认定你掌握了。一节课要同时满足三个条件，才会出现在「掌握证明」里：有应用证据、独立答对过练习，并且在至少 20 小时后的复习中再次答对。",
          "登录后可以点击「生成公开链接」，把你的掌握护照发给别人或放进简历。公开页只显示你的名字和已验证的能力，不显示邮箱。你可以随时撤销，撤销后旧链接立即失效。",
        ],
      },
      {
        id: "sources",
        heading: "10. 资料库：用你自己的资料学习",
        body: [
          "在「资料库」可以上传 PDF、Word、PPT、Markdown、网页等文件（单个最大 15 MB），也可以直接粘贴文章正文并附上来源网址。",
          "上传后系统会为资料建立检索索引（消耗 4 个 AI 点数）。之后生成课程、课节和导师回答时，会优先引用你的资料。",
          "可上传的资料数量取决于套餐：免费版 3 份、个人版 20 份、专业版 100 份。",
        ],
      },
      {
        id: "dashboard",
        heading: "11. 今日学习（首页）",
        body: [
          { list: [
            "今日任务：你当前最需要加强的一节课，以及「学习 → 练习 → 复习」三步的进度",
            "复习队列：已经到期、需要复习的内容",
            "连续学习天数和本周答题正确率",
            "最近 7 天的学习证据图表和最近的学习记录",
          ] },
        ],
      },
      {
        id: "billing",
        heading: "12. 套餐与 AI 点数",
        body: [
          "AI 点数每个自然月重置，不结转到下月。各项操作消耗的点数如下：",
          { list: [
            "生成一门课程：30 点",
            "生成一节新课节：6 点",
            "入门诊断：4 点",
            "资料索引：4 点",
            "导师问答：每次 1 点",
            "练习、复习、再次打开已生成的内容：免费",
          ] },
          "每月点数：免费版 100 点、个人版 800 点、专业版 3,000 点。另外，每人每天的 AI 使用次数有上限，以防滥用。如果 AI 生成失败，已扣的点数会自动退回。",
          "第一次开通付费套餐可免费试用 7 天。试用期内在「管理订阅与付款方式」里取消，不会扣费。",
          "邀请好友：打开账号菜单 →「邀请好友」，复制专属链接。好友通过你的链接注册并登录后，你们各得 50 个 AI 点数，当月有效。邀请人每月最多获得 10 次奖励；奖励仅限注册不满 7 天的新账号领取。",
          "开通、升级、取消订阅和查看账单都在「套餐与账单」页完成。",
        ],
      },
      {
        id: "mobile",
        heading: "13. 在手机上使用",
        body: [
          "用手机浏览器打开网站即可使用。屏幕底部的标签栏包括：今日、课程、学习、复习、更多（「更多」里有全部页面和账号菜单）。",
          "添加到主屏幕，像 App 一样打开：",
          { list: [
            "iPhone：用 Safari 打开网站 → 点击底部分享按钮 → 选择「添加到主屏幕」。",
            "安卓：用 Chrome 打开网站 → 点击右上角菜单 → 选择「添加到主屏幕」或「安装应用」。",
          ] },
        ],
      },
      {
        id: "faq",
        heading: "14. 常见问题",
        body: [
          { list: [
            "提示「本月 AI 点数已用完」怎么办？可以升级套餐、邀请好友获得奖励点数，或等下个月 1 日自动重置。",
            "提示「今日用量已达上限」怎么办？每天的 AI 使用次数有上限，第二天自动恢复。未登录时同一网络的用户共享更少的次数，登录后额度更多。",
            "换了设备，学习记录不见了？请确认两台设备登录的是同一个账号。未登录时的记录只保存在原来的设备上。",
            "课节一直显示「正在准备」？第一次生成需要 20–40 秒。超过 1 分钟或提示失败时，点击「重试」即可，失败不会扣点数。",
            "「下一节」按钮为什么是灰的？下一节在还没解锁的模块里，先通过本模块每一节的练习即可解锁。",
            "如何取消订阅或申请退款？在「套餐与账单」→「管理订阅与付款方式」里可以随时取消；退款条件请参见《退款规则》。",
            "我上传的资料安全吗？资料只用于为你生成课程和检索引用，不会用于训练我们自己的模型。详见《隐私政策》。",
          ] },
        ],
      },
      {
        id: "support",
        heading: "15. 帮助与反馈",
        body: [
          "点击页面顶部的「?」按钮，打开「帮助与反馈」，选择问题类型并描述情况，我们会逐条处理。涉及付款的问题，请附上账单编号。",
        ],
      },
    ],
  },
  en: {
    title: "OneLearn User Guide",
    intro: "OneLearn turns anything you want to learn into a complete course, then uses practice and spaced review to confirm you've truly mastered it. This guide walks through each feature in the order you'll use it.",
    tocLabel: "Contents",
    sections: [
      {
        id: "quick-start",
        heading: "1. Get started in 3 minutes",
        body: [
          { steps: [
            "Open www.onelearn.ltd. You can try it without signing in, but your progress is saved on this device only.",
            "Click the avatar at the bottom left (on phones, tap \"More\" in the bottom bar) and choose \"Sign in and sync\". Sign in with an email code or Google.",
            "Pick a course in the Course universe, or click \"New learning goal\" and describe what you want to master, then click \"Generate with OpenAI\".",
            "You'll land on the Knowledge map. Take the 3-minute placement diagnostic first — modules you already know unlock right away.",
            "Open the recommended lesson: read it → explain it to the tutor in your own words → practice → come back for reviews.",
          ] },
          { tip: "The OneLearn method: explain it in your own words, pass the practice on your own, and answer correctly again in a review a day later. Only then is it mastered." },
        ],
      },
      {
        id: "account",
        heading: "2. Signing in and your account",
        body: [
          "Signed out, you're in device mode: you can browse and try the demo, but progress lives only in this browser and is lost if you switch devices or clear browser data. Signed-out visitors on the same network share a small daily AI allowance.",
          "Signed in, you get a cloud learning profile: courses, progress, mastery, and membership sync across phone and computer. Sign in with an email code or Google.",
          "Click the avatar at the bottom left (under \"More\" on phones) to open the account menu:",
          { list: [
            "Sign in / Sign out",
            "Plans & billing: AI credits, subscribe or manage your plan",
            "Invite friends: copy your invite link — you each get 50 AI credits",
            "Review reminder emails: turn daily reminders on or off",
            "Help & feedback, User guide, Terms & privacy",
          ] },
        ],
      },
      {
        id: "courses",
        heading: "3. Find or create a course",
        body: [
          "The Course universe has 32 academies and over a thousand learning paths. Filter by academy or search for a course, skill, or certification.",
          "Press ⌘K (Ctrl+K on Windows) anywhere, or click the search icon at the top, to search all courses.",
          "Can't find it? Let AI create a course for you:",
          { list: [
            "From a goal: describe the ability and timeframe, e.g. \"Build an AI SaaS on my own in 30 days\".",
            "From your material: upload books, papers, or company documents in Sources, then generate a course grounded in them.",
            "Backward from an outcome: e.g. \"Pass the PMP exam\" or \"Give a client presentation in English\".",
          ] },
          "You can also click \"New learning goal\" at the bottom left. Generating a course takes about 30–60 seconds and uses 30 AI credits.",
          { tip: "AI-generated content is for learning only. For medical, legal, or financial decisions, rely on authoritative sources." },
        ],
      },
      {
        id: "map",
        heading: "4. Knowledge map: the whole course at a glance",
        body: [
          "Each course has 5–7 modules with several lessons each. The percentage next to a lesson is your mastery of it.",
          { list: [
            "Empty circle: ready to start",
            "Blue check: practice passed (answered correctly on your own once)",
            "Green check: mastered (answered correctly again in a delayed review)",
            "Lock: not unlocked yet",
          ] },
          "Unlocking: when every lesson in a module has passed practice, the next module unlocks. Modules the diagnostic says you already know unlock too.",
          "The highlighted lesson marked \"Up next\" is what we recommend next; \"Continue\" opens it directly.",
          "\"Generate new version\" rebuilds the whole course (30 AI credits) and starts progress over in the new version, so use it sparingly.",
        ],
      },
      {
        id: "diagnostic",
        heading: "5. Placement diagnostic: skip what you already know",
        body: [
          "The first time you open a new course's map, you'll be offered a 3-minute diagnostic: one question per module (about 10–20 seconds to create, 4 AI credits).",
          "Modules you answer correctly are marked \"known — feel free to skip\"; later modules unlock and recommendations skip them. Not knowing an answer is fine — pick the closest one.",
          "You can take the diagnostic once per course. After submitting, you'll see an explanation for each question.",
        ],
      },
      {
        id: "learning",
        heading: "6. Learning room: read and talk to your tutor",
        body: [
          "On the left is the lesson: objective, sections, key points, and a worked example. The first lesson is created with the course; other lessons are written the first time you open them (about 20–40 seconds, 6 AI credits) and are free to open again afterwards.",
          "On the right is Sora, your AI tutor. It starts with a checkpoint question — answer in your own words rather than copying the lesson. The tutor probes, hints, and corrects to build real understanding. Each message to the tutor uses 1 AI credit.",
          "At the bottom of the lesson: \"Practice\" opens this lesson's questions; \"Next lesson\" opens the next one. If the next lesson is in a locked module, the button is greyed out until every lesson in this module has passed practice.",
          { tip: "The tutor gives hints, not answers. A few back-and-forth turns make the understanding stick." },
        ],
      },
      {
        id: "practice",
        heading: "7. Practice",
        body: [
          "Each lesson has 3–4 multiple-choice questions. Choose an answer and click \"Check answer\" — it's graded on the server and shows the explanation and your updated mastery. Then click \"Next question\".",
          "One unassisted correct answer means the lesson has passed practice, and a review is scheduled. A wrong answer brings the review forward to about 12 hours later.",
          "Practice doesn't use AI credits.",
        ],
      },
      {
        id: "review",
        heading: "8. Review: strengthen along your forgetting curve",
        body: [
          "Every lesson gets a review schedule based on your forgetting curve: the more consistently you answer correctly, the longer the gap. Due lessons appear on the Review page and the home review queue, and the Review tab on phones shows a count.",
          "Click \"Start review\" or \"Review now\" to answer. Reviews use content that already exists and don't use AI credits.",
          "Signed in, you can turn on review reminder emails in the account menu: at most one email a day when something is due, with a one-click unsubscribe link.",
        ],
      },
      {
        id: "proof",
        heading: "9. Mastery proof",
        body: [
          "One correct answer is never counted as mastery. A lesson appears in Mastery proof only when it has application evidence, an unassisted practice pass, and a correct answer again in a review at least 20 hours later.",
          "Signed in, you can \"Create public link\" to share your mastery passport or add it to your résumé. It shows only your name and verified capabilities, never your email. Revoke it anytime — the old link stops working immediately.",
        ],
      },
      {
        id: "sources",
        heading: "10. Sources: learn from your own material",
        body: [
          "In Sources, upload PDF, Word, PowerPoint, Markdown, or HTML files (up to 15 MB each), or paste article text with its source URL.",
          "Each upload is indexed for retrieval (4 AI credits). New courses, lessons, and tutor answers then prefer your material.",
          "How many sources you can keep depends on your plan: 3 on Free, 20 on Personal, 100 on Pro.",
        ],
      },
      {
        id: "dashboard",
        heading: "11. Today (home)",
        body: [
          { list: [
            "Today's mission: the lesson you most need to strengthen, with learn → practice → review progress",
            "Review queue: what's due now",
            "Your streak and this week's accuracy",
            "Learning evidence for the last 7 days and recent activity",
          ] },
        ],
      },
      {
        id: "billing",
        heading: "12. Plans and AI credits",
        body: [
          "AI credits reset each calendar month and don't roll over. Credits per action:",
          { list: [
            "Generate a course: 30",
            "Generate a new lesson: 6",
            "Placement diagnostic: 4",
            "Index a source: 4",
            "Tutor message: 1 each",
            "Practice, review, and reopening existing content: free",
          ] },
          "Monthly credits: 100 on Free, 800 on Personal, 3,000 on Pro. There's also a daily usage limit per person to prevent abuse. If an AI generation fails, its credits are refunded automatically.",
          "Your first paid plan comes with a 7-day free trial. Cancel under \"Manage subscription & payment\" during the trial and you won't be charged.",
          "Invite friends: open the account menu → \"Invite friends\" and copy your link. When a friend signs up and signs in through it, you each get 50 AI credits for the month. Referrers earn up to 10 rewards a month; only accounts created in the last 7 days can claim.",
          "Subscribe, upgrade, cancel, and view invoices on the Plans & billing page.",
        ],
      },
      {
        id: "mobile",
        heading: "13. Using OneLearn on your phone",
        body: [
          "Just open the site in your phone's browser. The bottom bar has Today, Courses, Learn, Review, and More (every page plus the account menu).",
          "Add it to your home screen to open it like an app:",
          { list: [
            "iPhone: open the site in Safari → tap Share → \"Add to Home Screen\".",
            "Android: open the site in Chrome → tap the menu → \"Add to Home screen\" or \"Install app\".",
          ] },
        ],
      },
      {
        id: "faq",
        heading: "14. FAQ",
        body: [
          { list: [
            "\"Monthly AI credits used up\"? Upgrade your plan, earn credits by inviting friends, or wait for the reset on the 1st.",
            "\"Today's limit has been reached\"? There's a daily AI usage cap that resets the next day. Signed-out visitors on one network share a smaller allowance; signing in gives you more.",
            "Progress missing on a new device? Make sure both devices use the same account. Signed-out progress stays on the original device.",
            "A lesson keeps saying \"Preparing\"? First generation takes 20–40 seconds. If it takes over a minute or fails, click \"Retry\" — failures are never charged.",
            "Why is \"Next lesson\" greyed out? It's in a locked module; pass practice for every lesson in the current module to unlock it.",
            "How do I cancel or get a refund? Cancel anytime under Plans & billing → \"Manage subscription & payment\". See the Refund Policy for refunds.",
            "Is my uploaded material safe? It's used only to generate your courses and cite sources, never to train our own models. See the Privacy Policy.",
          ] },
        ],
      },
      {
        id: "support",
        heading: "15. Help and feedback",
        body: [
          "Click the \"?\" button at the top to open Help & feedback, choose a category, and describe what happened. Every message is handled by the team. For billing issues, include your invoice number.",
        ],
      },
    ],
  },
};
