import Link from "next/link";
import { USER_GUIDE, type GuideBlock } from "@/lib/onelearn/guide";

function Block({ block }: { block: GuideBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("steps" in block) return <ol className="guide-steps">{block.steps.map((step) => <li key={step}>{step}</li>)}</ol>;
  if ("list" in block) return <ul className="guide-list">{block.list.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <p className="guide-tip">{block.tip}</p>;
}

export function GuidePage({ locale }: { locale: "zh" | "en" }) {
  const guide = USER_GUIDE[locale];
  const zh = locale === "zh";
  return <main className="legal-page">
    <nav className="legal-nav">
      <Link href="/">← OneLearn</Link>
      <Link href={zh ? "/guide?lang=en" : "/guide"}>{zh ? "English" : "中文"}</Link>
      <Link href="/terms">{zh ? "用户协议" : "Terms"}</Link>
      <Link href="/privacy">{zh ? "隐私政策" : "Privacy"}</Link>
    </nav>
    <article lang={zh ? "zh-CN" : "en"} className="legal-doc guide-doc">
      <h1>{guide.title}</h1>
      <p>{guide.intro}</p>
      <nav className="guide-toc" aria-label={guide.tocLabel}>
        <p>{guide.tocLabel}</p>
        <ol>{guide.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.heading.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
      </nav>
      {guide.sections.map((section) => <section key={section.id} id={section.id}>
        <h2>{section.heading}</h2>
        {section.body.map((block, index) => <Block key={index} block={block} />)}
      </section>)}
      <p className="guide-back"><Link href="/">{zh ? "返回 OneLearn 开始学习 →" : "Back to OneLearn →"}</Link></p>
    </article>
  </main>;
}
