import { NextRequest, NextResponse } from "next/server";

type TutorRequest = { message?: string; node?: string; mastery?: number; locale?: string };

export async function POST(request: NextRequest) {
  const body = await request.json() as TutorRequest;
  const locale = body.locale?.toLowerCase().startsWith("zh") ? "zh" : "en";
  const localized = {
    required: locale === "zh" ? "请输入学习问题" : "A learner message is required",
    unavailable: locale === "zh" ? "AI 导师服务暂时不可用" : "The AI tutor is temporarily unavailable",
    empty: locale === "zh" ? "AI 导师未返回内容" : "The AI tutor returned no content",
    demoReply: locale === "zh"
      ? "你的解释方向是对的。现在换一个新情境检验迁移能力：如果所有字段都存在，但其中一个枚举值超出允许范围，会发生什么？"
      : "Your explanation is moving in the right direction. Now test it against a new case: what if every field exists, but one enum value is outside the allowed set?",
  };
  if (!body.message?.trim()) return NextResponse.json({ error: localized.required }, { status: 400 });
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL ?? "gpt-5.1-mini";
  if (!apiKey) return NextResponse.json({ mode: "demo", reply: localized.demoReply, pedagogicalAction: "probe_transfer", evidence: { dimension: "understanding", confidence: .62 } });
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: .35, messages: [
      { role: "system", content: `You are OneLearn Tutor. Teach with concise Socratic guidance. Never claim mastery from one answer. Reply in ${locale === "zh" ? "Simplified Chinese" : "English"}. Return JSON with reply, pedagogicalAction, and evidence containing dimension and confidence.` },
      { role: "user", content: JSON.stringify({ learningNode: body.node ?? "unknown", currentMastery: body.mastery ?? 0, locale, learnerMessage: body.message }) },
    ], response_format: { type: "json_object" } }),
  });
  if (!response.ok) return NextResponse.json({ error: localized.unavailable }, { status: 502 });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: localized.empty }, { status: 502 });
  try { return NextResponse.json({ mode: "live", ...JSON.parse(content) }); }
  catch { return NextResponse.json({ mode: "live", reply: content, pedagogicalAction: "explain", evidence: null }); }
}
