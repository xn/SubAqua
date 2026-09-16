// Lucky! sources in the order SubAqua spends them: a clover already held, then hermit clovers
// (3/day, gum + worthless item), then the August scepter's single Aug. 2nd cast, and a pulled
// clover last and only where the caller lets a pull slot go. Pure so the order is testable;
// the mafia driver lives in ./lucky.ts. Mirrors autoscend's cloversAvailable, reordered.
export type LuckySource = "clover" | "hermit" | "scepter" | "pull";

export type LuckyState = {
  clovers: number;
  cloversPurchased: number;
  scepterReady: boolean;
  pull: boolean;
};

export function luckySources(state: LuckyState): LuckySource[] {
  const sources: LuckySource[] = [];
  if (state.clovers > 0) sources.push("clover");
  if (state.cloversPurchased < 3) sources.push("hermit");
  if (state.scepterReady) sources.push("scepter");
  if (state.pull) sources.push("pull");
  return sources;
}
