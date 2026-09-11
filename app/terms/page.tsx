import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "用户协议 · Terms — OneLearn" };

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
