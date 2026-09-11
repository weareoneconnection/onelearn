import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/db";
import { getAdminSnapshot, isAdmin, resolveLearner } from "@/lib/onelearn/persistence";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  if (!isAdmin(learner)) return NextResponse.json({ error: locale === "zh" ? "没有运营后台权限" : "Operations access is not configured", code: "forbidden" }, { status: 403 });
  const db = await getD1();
  if (!db) return NextResponse.json({ error: locale === "zh" ? "当前部署尚未连接持久化数据库" : "This deployment is not connected to durable storage", code: "storage_unavailable" }, { status: 503 });
  return NextResponse.json(await getAdminSnapshot(db));
}
