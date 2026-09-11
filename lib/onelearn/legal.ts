// Legal documents for ONEAI LABS SDN. BHD. (Malaysia). Have them reviewed by
// qualified counsel before relying on them commercially.

export type LegalDocId = "terms" | "privacy" | "refund";
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

const UPDATED = "2026-09-12";

export const LEGAL_DOCS: Record<LegalDocId, { zh: LegalDoc; en: LegalDoc }> = {
  terms: {
    zh: {
      title: "OneLearn 用户协议",
      updated: UPDATED,
      sections: [
        { heading: "1. 协议主体", body: ["本协议由你与 ONEAI LABS SDN. BHD.（公司注册号 202601020394 (1682491-W)，依据马来西亚法律设立的私人有限公司，以下简称“我们”）就使用 OneLearn（以下简称“本服务”）订立。注册、登录或使用本服务，即表示你已阅读并同意本协议、《隐私政策》与《退款规则》。"] },
        { heading: "2. 服务内容", body: ["本服务利用人工智能生成课程、课节、练习与导师反馈，并提供学习记录、复习安排与能力证明。", "AI 生成内容可能存在错误、遗漏或过时信息，仅供学习参考，不构成专业、法律、医疗、财务或考试结果承诺。涉及重要决策时，请核实权威来源。"] },
        { heading: "3. 账号", body: ["你应提供真实有效的邮箱并妥善保管账号。因你未妥善保管账号导致的损失由你自行承担。", "未登录时，学习数据仅与当前设备关联，且受匿名用量限制。"] },
        { heading: "4. 付费订阅与 AI 点数", body: ["付费套餐按月或按年自动续费，价格以购买页面展示为准。支付由 Stripe 等第三方支付机构处理，我们不存储你的完整银行卡信息。", "AI 点数按自然月发放与重置，不可转让、不可提现、不结转至下月。", "你可随时在“管理订阅”中取消，取消后当前计费周期结束前仍可使用。退款按《退款规则》执行。"] },
        { heading: "5. 你的内容", body: ["你上传的资料与输入的内容归你或原权利人所有。你授予我们为向你提供本服务所必需的处理权限（包括存储、索引与发送给 AI 模型服务商进行处理）。", "你应确保对上传内容拥有合法权利，不得上传侵犯他人权利或违法的内容。"] },
        { heading: "6. 禁止行为", body: ["不得利用本服务从事违法活动；不得绕过用量限制、批量注册或以自动化方式滥用 AI 能力；不得对本服务进行攻击、逆向或干扰。违反者我们有权限制或终止服务。"] },
        { heading: "7. 服务变更与终止", body: ["我们可能因产品调整、法律要求或安全原因变更或终止部分功能，并会以合理方式提前通知。你可随时停止使用并申请删除账号。"] },
        { heading: "8. 责任限制", body: ["在法律允许的最大范围内，我们对因使用 AI 生成内容产生的间接损失不承担责任；我们的累计赔偿责任以你在过去 12 个月内实际支付的服务费用为限。法律另有强制规定的除外。"] },
        { heading: "9. 法律适用与争议解决", body: ["本协议适用马来西亚法律；如你所在地的法律为消费者提供更强的保护，该等保护不受影响。争议应先友好协商，协商不成的，提交马来西亚有管辖权的法院解决。"] },
        { heading: "10. 联系我们", body: ["运营主体：ONEAI LABS SDN. BHD.。邮箱：info@weareoneconnection.com。我们将在 7 个工作日内答复。"] },
      ],
    },
    en: {
      title: "OneLearn Terms of Service",
      updated: UPDATED,
      sections: [
        { heading: "1. Parties", body: ["These terms are an agreement between you and ONEAI LABS SDN. BHD. (company registration no. 202601020394 (1682491-W), a private company limited by shares incorporated in Malaysia; “we”) for the use of OneLearn (the “Service”). By signing up, signing in, or using the Service you accept these terms, the Privacy Policy, and the Refund Policy."] },
        { heading: "2. The Service", body: ["The Service uses AI to generate courses, lessons, practice, and tutor feedback, and keeps learning records, review schedules, and mastery evidence.", "AI-generated content may be inaccurate, incomplete, or outdated. It is for learning purposes only and is not professional, legal, medical, financial, or exam-outcome advice. Verify authoritative sources for important decisions."] },
        { heading: "3. Accounts", body: ["Provide a valid email address and keep your account secure. You are responsible for losses caused by failing to do so.", "Without signing in, learning data is tied to the current device and subject to anonymous usage limits."] },
        { heading: "4. Subscriptions and AI credits", body: ["Paid plans renew automatically monthly or annually at the price shown at purchase. Payments are processed by third parties such as Stripe; we never store your full card details.", "AI credits are granted and reset each calendar month. They are non-transferable, have no cash value, and do not roll over.", "You can cancel at any time under “Manage subscription”; access continues until the end of the current billing period. Refunds follow the Refund Policy."] },
        { heading: "5. Your content", body: ["Material you upload and text you enter remains yours or the rights holder's. You grant us the rights needed to provide the Service, including storing, indexing, and sending it to AI model providers for processing.", "You must have the right to upload the content and must not upload unlawful or infringing material."] },
        { heading: "6. Prohibited use", body: ["Do not use the Service unlawfully, circumvent usage limits, register accounts in bulk, abuse AI capacity through automation, or attack, reverse engineer, or disrupt the Service. We may restrict or terminate access for violations."] },
        { heading: "7. Changes and termination", body: ["We may change or discontinue features for product, legal, or security reasons and will give reasonable notice. You may stop using the Service and request account deletion at any time."] },
        { heading: "8. Limitation of liability", body: ["To the maximum extent permitted by law, we are not liable for indirect losses arising from AI-generated content, and our total liability is limited to the fees you paid in the preceding 12 months, except where mandatory law provides otherwise."] },
        { heading: "9. Governing law", body: ["These terms are governed by the laws of Malaysia, without limiting any stronger consumer protections of your place of residence. Disputes not resolved amicably are submitted to the competent courts of Malaysia."] },
        { heading: "10. Contact", body: ["Operator: ONEAI LABS SDN. BHD. Email: info@weareoneconnection.com. We respond within 7 business days."] },
      ],
    },
  },
  privacy: {
    zh: {
      title: "OneLearn 隐私政策",
      updated: UPDATED,
      sections: [
        { heading: "1. 我们收集的信息", body: ["账号信息：邮箱、显示名称（通过 Clerk 或 ChatGPT 登录获得）。", "学习数据：生成的课程、学习事件、练习作答、导师对话、掌握度与复习记录。", "你上传的资料：文件、正文与来源网址。", "技术与用量信息：AI 调用次数与 Token 用量、错误日志；为防止滥用，我们对未登录访问的 IP 地址做不可逆哈希后计数，不保存原始 IP。", "支付信息：由 Stripe 处理；我们仅保存订阅状态、账单金额与 Stripe 客户编号，不保存银行卡号。"] },
        { heading: "2. 使用目的", body: ["提供与改进学习服务、生成个性化课程与复习安排、计费与防止滥用、保障安全与履行法律义务。我们不会出售你的个人信息，也不会用你的内容训练我们自己的模型。"] },
        { heading: "3. 委托处理与第三方", body: ["为提供服务，我们会将必要数据交由以下服务商处理：OpenAI（AI 生成与资料检索）、Clerk（登录认证）、Stripe（支付）、Turso / Cloudflare（数据存储）、Vercel（网站托管）、Resend（复习提醒邮件发送）、PostHog（产品使用分析，仅使用经哈希处理的标识，不记录邮箱）、Sentry（错误监控，如启用）。", "上述服务商可能位于中国境外。使用本服务即表示你知悉并同意为提供服务所必需的个人信息出境；我们将按照适用法律（包括马来西亚《2010 年个人数据保护法》以及你所在地的个人信息保护法律）履行相应义务，并与服务商约定数据保护要求。"] },
        { heading: "4. 保存期限", body: ["账号存续期间保存你的学习数据；注销账号后 30 天内删除或匿名化，法律法规要求保存的（如账单记录）除外。"] },
        { heading: "5. 你的权利", body: ["你可以查阅、复制、更正、删除你的个人信息，撤回同意或注销账号。请通过 info@weareoneconnection.com 联系我们，我们将在 15 个工作日内处理。"] },
        { heading: "6. 未成年人", body: ["本服务面向 18 周岁以上用户。未成年人应在监护人同意与指导下使用。"] },
        { heading: "7. 安全", body: ["我们采用传输加密、访问控制、最小权限与密钥隔离等措施保护数据。如发生安全事件，我们将依法通知你与监管部门。"] },
        { heading: "8. 联系我们", body: ["个人信息控制者：ONEAI LABS SDN. BHD.（公司注册号 202601020394 (1682491-W)，马来西亚）。个人信息保护联系邮箱：info@weareoneconnection.com。"] },
      ],
    },
    en: {
      title: "OneLearn Privacy Policy",
      updated: UPDATED,
      sections: [
        { heading: "1. Information we collect", body: ["Account: email and display name (from Clerk or ChatGPT sign-in).", "Learning data: generated courses, learning events, practice answers, tutor conversations, mastery and review records.", "Material you upload: files, text, and source URLs.", "Technical and usage data: AI request counts, token usage, and error logs. To prevent abuse we count anonymous requests by an irreversible hash of the IP address and never store the raw IP.", "Payments: processed by Stripe; we store only subscription status, invoice amounts, and the Stripe customer ID, never card numbers."] },
        { heading: "2. How we use it", body: ["To provide and improve the Service, generate personalized courses and review schedules, bill and prevent abuse, keep the Service secure, and meet legal obligations. We do not sell personal information and do not train our own models on your content."] },
        { heading: "3. Processors", body: ["We share the data needed to run the Service with: OpenAI (AI generation and retrieval), Clerk (authentication), Stripe (payments), Turso / Cloudflare (storage), Vercel (hosting), Resend (review reminder emails), PostHog (product analytics using hashed identifiers, never email addresses), and Sentry (error monitoring, when enabled).", "These providers may be located outside your country. We transfer personal information across borders only as needed to provide the Service and in line with applicable law, including Malaysia's Personal Data Protection Act 2010, and with data protection obligations agreed with each provider."] },
        { heading: "4. Retention", body: ["We keep learning data while your account exists and delete or anonymize it within 30 days after account deletion, except records we must retain by law (such as invoices)."] },
        { heading: "5. Your rights", body: ["You may access, copy, correct, or delete your personal information, withdraw consent, or delete your account by contacting info@weareoneconnection.com. We respond within 15 business days."] },
        { heading: "6. Children", body: ["The Service is intended for users aged 18 or older. Minors should use it only with guardian consent and supervision."] },
        { heading: "7. Security", body: ["We use encryption in transit, access control, least privilege, and secret isolation. We will notify you and regulators of security incidents as required by law."] },
        { heading: "8. Contact", body: ["Data controller: ONEAI LABS SDN. BHD. (company registration no. 202601020394 (1682491-W), Malaysia). Privacy contact: info@weareoneconnection.com."] },
      ],
    },
  },
  refund: {
    zh: {
      title: "OneLearn 退款规则",
      updated: UPDATED,
      sections: [
        { heading: "1. 首次订阅冷静期", body: ["首次付费扣款（免费试用期结束后）起 7 天内，且当期已使用 AI 点数不超过 20% 的，可申请全额退款。免费试用期内取消订阅不会产生任何费用。"] },
        { heading: "2. 取消订阅", body: ["你可随时取消自动续费。取消后不再扣费，当前计费周期结束前仍可使用付费权益；已开始的计费周期原则上不按比例退款。"] },
        { heading: "3. 年付套餐", body: ["年付套餐超过冷静期后申请退款的，原则上不予退款，你可以继续使用付费权益直到当期结束；如有特殊情况，请联系我们协商处理。"] },
        { heading: "4. 服务故障", body: ["因我们的原因导致服务连续不可用超过 72 小时的，可申请按受影响天数退款或延长服务期。"] },
        { heading: "5. 不予退款的情形", body: ["违反《用户协议》被限制或终止服务的；已用尽或大部分使用 AI 点数的；通过应用商店等第三方渠道购买的，按该渠道规则处理。"] },
        { heading: "6. 申请方式", body: ["请发送邮件至 info@weareoneconnection.com，注明账号邮箱与账单编号。审核通过后原路退回，到账时间以支付机构为准（通常 5–10 个工作日）。"] },
      ],
    },
    en: {
      title: "OneLearn Refund Policy",
      updated: UPDATED,
      sections: [
        { heading: "1. First-subscription cooling-off period", body: ["Within 7 days of your first charge (after any free trial), and if you have used no more than 20% of that period's AI credits, you may request a full refund. Cancelling during a free trial costs nothing."] },
        { heading: "2. Cancelling", body: ["You can cancel auto-renewal at any time. You will not be charged again and keep paid benefits until the end of the current period; started periods are generally not prorated."] },
        { heading: "3. Annual plans", body: ["Refund requests for annual plans after the cooling-off period are generally not refundable; you keep paid benefits until the end of the period. Contact us for exceptional cases."] },
        { heading: "4. Service outages", body: ["If the Service is unavailable for more than 72 consecutive hours due to our fault, you may request a prorated refund or an extension."] },
        { heading: "5. Exclusions", body: ["Accounts restricted or terminated for violating the Terms; plans whose AI credits are used up or mostly used; purchases through third-party stores, which follow that store's rules."] },
        { heading: "6. How to request", body: ["Email info@weareoneconnection.com with your account email and invoice number. Approved refunds go back to the original payment method, usually within 5–10 business days depending on the payment provider."] },
      ],
    },
  },
};
