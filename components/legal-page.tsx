import Link from "next/link";
import { LEGAL_DOCS, type LegalDocId } from "@/lib/onelearn/legal";

export function PoweredBy() {
  return <footer className="legal-footer"><a href="https://www.oneailabs.ai/" target="_blank" rel="noopener">Powered by OneAI Labs</a></footer>;
}

const links: Array<[LegalDocId, string]> =[["terms", "用户协议 Terms"], ["privacy", "隐私政策 Privacy"], ["refund", "退款规则 Refunds"]];

export function LegalPage({ doc }: { doc: LegalDocId }) {
  const { zh, en } = LEGAL_DOCS[doc];
  return <main className="legal-page">
    <nav className="legal-nav"><Link href="/">← OneLearn</Link>{links.map(([id, label]) => <Link key={id} href={`/${id}`} aria-current={id === doc ? "page" : undefined}>{label}</Link>)}</nav>
    {[zh, en].map((version, index) => <article key={index} lang={index === 0 ? "zh-CN" : "en"} className="legal-doc">
      <h1>{version.title}</h1>
      <p className="legal-updated">{index === 0 ? "更新日期" : "Last updated"}：{version.updated}</p>
      {version.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
    </article>)}
    <PoweredBy />
  </main>;
}
