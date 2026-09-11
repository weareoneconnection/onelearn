import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "隐私政策 · Privacy — OneLearn" };

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
