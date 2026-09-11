import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getD1 } from "@/db";
import { PoweredBy } from "@/components/legal-page";
import { getPublicProof } from "@/lib/onelearn/proof-share";

export const dynamic = "force-dynamic";

// Shared links are meant for people the learner sends them to, not search engines.
export const metadata: Metadata = { title: "掌握护照 · Mastery passport — OneLearn", robots: { index: false, follow: false } };

export default async function PublicProofPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getD1();
  const proof = db ? await getPublicProof(db, token) : null;
  if (!proof) notFound();
  const name = proof.displayName ?? "OneLearn 学习者";
  return <main className="legal-page">
    <nav className="legal-nav"><Link href="/">← OneLearn</Link></nav>
    <article className="legal-doc">
      <p className="legal-updated">MASTERY PASSPORT · 掌握护照</p>
      <h1>{name}</h1>
      <p>{proof.mastered.length
        ? `已通过 OneLearn 掌握验证的能力：${proof.mastered.length} 项。每一项都包含独立答对的练习，以及至少 20 小时后的复习复测。`
        : "还没有通过掌握验证的能力。"}</p>
      <p className="legal-updated">{proof.mastered.length ? `${proof.mastered.length} verified capabilities — each backed by an unassisted pass and a delayed review at least 20 hours later.` : "No verified capabilities yet."}</p>
      {proof.mastered.map((item, index) => <section key={`${item.title}-${index}`}>
        <h2>{item.title}</h2>
        <p>{[item.course, `掌握度 ${item.score}%`, item.verifiedAt ? `验证于 ${new Date(item.verifiedAt * 1000).toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ")}</p>
      </section>)}
    </article>
    <PoweredBy />
  </main>;
}
