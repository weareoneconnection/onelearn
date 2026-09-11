export type View = "dashboard" | "catalog" | "path" | "learn" | "practice" | "review" | "library" | "proof" | "billing" | "operations";

export type WebModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

export type GenerationState = { status: "idle" | "loading" | "error"; message?: string };

export type LearnerIdentity = { displayName: string; email: string; mode: "chatgpt" | "clerk" | "device"; admin: boolean };

export type LearnerStats = { courseVersions: number; learningEvents: number; sources: number; averageQuality: number; dueReviews: number };

export type MasteryRecord = {
  courseVersionId: string; nodeKey: string; nodeTitle: string;
  score: number; retention: number; status: "unseen" | "learning" | "fragile" | "stable" | "mastered"; mastered: boolean; due: boolean;
  attempts: number; unassistedPasses: number; reviewPasses: number; lastEvidenceAt: number | null; nextReviewAt: number | null;
};

export type MasteryOverview = {
  records: MasteryRecord[];
  due: MasteryRecord[];
  summary: { pathMastery: number; mastered: number; tracked: number; due: number; averageRetention: number; unassistedPasses: number; delayedReviews: number };
  weekly: Array<{ day: string; count: number }>;
  recent: Array<{ eventType: string; createdAt: number; lessonTitle: string | null; correct: boolean | null }>;
  streak: { current: number; activeToday: boolean };
  week: { answers: number; correct: number };
  /** Modules marked as known by a completed placement diagnostic, per course version. */
  placements: Record<string, number[]>;
};

export type SourceItem = { id: string; name: string; sourceKind: "file" | "text" | "web"; mimeType: string; sizeBytes: number; sourceUrl: string | null; status: "processing" | "ready" | "failed"; createdAt: number };

export type OperationsSnapshot = {
  metrics: { users: number; courses: number; sources: number; aiRuns7d: number; failedRuns7d: number; tokens7d: number; activeLearners7d: number; averageQuality: number; paidSubscribers: number; mrrCny: number; revenueCny: number; verifiedNodes: number; answers7d: number; openFeedback: number };
  feedback: Array<{ id: string; email: string; category: string; message: string; page: string | null; status: "open" | "resolved"; createdAt: number; resolvedAt: number | null }>;
  qualityQueue: Array<{ id: string; title: string; version: number; locale: string; qualityScore: number | null; qualityStatus: string; createdAt: number; email: string }>;
};

export type BillingPlan = { id: "free" | "personal" | "pro" | "team"; nameZh: string; nameEn: string; monthlyPriceCny: number | null; annualPriceCny: number | null; aiCredits: number; sourceCount: number; sourceBytes: number; courseEquivalent: number; tutorEquivalent: number };

export type BillingPayload = {
  identity: { displayName: string; email: string; mode: "chatgpt" | "clerk" | "device" };
  plans: BillingPlan[];
  billing: {
    configured: boolean;
    plan: BillingPlan;
    subscription: { planId: string; billingInterval: "month" | "year"; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: number | null; canManage: boolean } | null;
    usage: { month: string; aiCreditsUsed: number; aiCreditsRemaining: number; bonusCredits?: number; sources: number; sourceBytes: number };
    /** Free-trial days offered at checkout; 0 when not eligible. */
    trialDays?: number;
    invoices: Array<{ id: string; amountPaid: number; currency: string; status: string; hostedInvoiceUrl: string | null; paidAt: number | null; createdAt: number }>;
  };
};
