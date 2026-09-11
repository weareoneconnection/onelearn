export type MasteryDimensions = { understanding: number; recall: number; application: number; transfer: number; retention: number; confidence: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function calculateMastery(state: MasteryDimensions) {
  const weighted = state.understanding * .2 + state.recall * .15 + state.application * .25 + state.transfer * .2 + state.retention * .2;
  return Math.round(clamp(weighted * state.confidence) * 100);
}
export function masteryBand(score: number) {
  if (score >= 85) return "mastered"; if (score >= 65) return "stable"; if (score >= 35) return "fragile"; if (score > 0) return "learning"; return "unseen";
}
export function retentionAfterDays(current: number, days: number, stability: number) { return clamp(current * Math.exp(-days / Math.max(stability, 1))); }
export function nextReviewInterval(score: number, stability: number) {
  if (score < 50) return 1; if (score < 70) return Math.max(2, Math.round(stability * .5)); if (score < 85) return Math.max(4, Math.round(stability)); return Math.max(7, Math.round(stability * 1.8));
}

// ---- Evidence-driven learner state (one record per learner × course version × lesson) ----

export type EvidenceDimension = "understanding" | "recall" | "application" | "transfer";
export type MasteryStatus = "unseen" | "learning" | "fragile" | "stable" | "mastered";

export type MasteryState = {
  understanding: number;
  recall: number;
  application: number;
  transfer: number;
  attempts: number;
  correctAttempts: number;
  /** Correct answers given without tutor hints (practice and review questions). */
  unassistedPasses: number;
  /** Correct review answers given at least DELAYED_REVIEW_SECONDS after the first pass. */
  reviewPasses: number;
  stabilityDays: number;
  firstPassAt: number | null;
  lastEvidenceAt: number | null;
  nextReviewAt: number | null;
};

const DAY = 24 * 60 * 60;
export const DELAYED_REVIEW_SECONDS = 20 * 60 * 60;
const MAX_STABILITY_DAYS = 120;

export function emptyMasteryState(): MasteryState {
  return {
    understanding: 0, recall: 0, application: 0, transfer: 0,
    attempts: 0, correctAttempts: 0, unassistedPasses: 0, reviewPasses: 0,
    stabilityDays: 1, firstPassAt: null, lastEvidenceAt: null, nextReviewAt: null,
  };
}

const blend = (current: number, target: number, weight: number) => clamp(current + (target - current) * weight);

/** Applies one server-graded practice or review answer and reschedules the next review. */
export function applyAnswer(state: MasteryState, answer: { correct: boolean; mode: "practice" | "review"; now: number }): MasteryState {
  const { correct, mode, now } = answer;
  const isReview = mode === "review";
  const next: MasteryState = { ...state, attempts: state.attempts + 1, lastEvidenceAt: now };
  if (correct) {
    const delayed = isReview && state.firstPassAt !== null && now - state.firstPassAt >= DELAYED_REVIEW_SECONDS;
    next.correctAttempts += 1;
    next.unassistedPasses += 1;
    if (delayed) next.reviewPasses += 1;
    next.firstPassAt = state.firstPassAt ?? now;
    next.application = blend(state.application, 1, .35);
    next.recall = blend(state.recall, 1, isReview ? .4 : .25);
    next.understanding = blend(state.understanding, 1, .15);
    next.stabilityDays = state.correctAttempts === 0 ? 1 : Math.min(MAX_STABILITY_DAYS, state.stabilityDays * (delayed ? 2.5 : 1.6));
    next.nextReviewAt = now + Math.round(next.stabilityDays * DAY);
  } else {
    next.application = blend(state.application, 0, .25);
    next.recall = blend(state.recall, 0, .3);
    next.stabilityDays = 1;
    next.nextReviewAt = now + DAY / 2;
  }
  return next;
}

/** Folds a provisional tutor signal into one dimension. Tutor signals never count as unassisted passes. */
export function applyTutorSignal(state: MasteryState, signal: { dimension: EvidenceDimension; confidence: number; now: number }): MasteryState {
  return {
    ...state,
    [signal.dimension]: blend(state[signal.dimension], clamp(signal.confidence), .3),
    lastEvidenceAt: signal.now,
    nextReviewAt: state.nextReviewAt ?? signal.now + DAY,
  };
}

/**
 * Mastered requires application evidence, at least one unassisted pass, and a
 * successful delayed review — a single correct answer never produces "mastered".
 */
export function evaluateMastery(state: MasteryState, now: number) {
  const days = state.lastEvidenceAt === null ? 0 : Math.max(0, now - state.lastEvidenceAt) / DAY;
  const retention = state.lastEvidenceAt === null ? 0 : retentionAfterDays(1, days, state.stabilityDays);
  const confidence = Math.min(1, .4 + .15 * state.attempts);
  const score = calculateMastery({ ...state, retention, confidence });
  const mastered = state.application >= .8 && state.unassistedPasses >= 1 && state.reviewPasses >= 1 && score >= 60;
  const band = masteryBand(score) as MasteryStatus;
  const status: MasteryStatus = mastered ? "mastered" : band === "mastered" ? "stable" : band;
  return {
    score,
    retention: Math.round(retention * 100),
    status,
    mastered,
    due: state.nextReviewAt !== null && state.nextReviewAt <= now,
  };
}
