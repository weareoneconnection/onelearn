import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "退款规则 · Refunds — OneLearn" };

export default function RefundPage() {
  return <LegalPage doc="refund" />;
}
