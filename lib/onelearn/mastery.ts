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
