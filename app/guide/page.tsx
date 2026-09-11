import type { Metadata } from "next";
import { GuidePage } from "@/components/guide-page";

export const metadata: Metadata = {
  title: "使用手册 · User guide — OneLearn",
  description: "OneLearn 使用手册：课程、知识地图、入门诊断、学习空间、练习、复习、掌握证明、资料库、套餐与 AI 点数。",
};

export default async function Guide({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return <GuidePage locale={lang === "en" ? "en" : "zh"} />;
}
