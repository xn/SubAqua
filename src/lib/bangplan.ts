// Bang potion policy, pure for `node --test`. The nine Dungeons of Doom potions (item ids
// 819..827) each carry one of nine effects, shuffled per ascension by the seed the dreadscroll
// scan hunts. Mafia records an identity in lastBangPotion<id> whether the potion is thrown in
// combat (FightRequest) or drunk from inventory (UseItemRequest), and fills the ninth in by
// elimination. Only two identities cost something to learn by drinking: the booze potion adds
// 1-3 drunkenness (never free under the consumption rule) and teleportitis is 10 adventures of
// random zones with no free cure. So the engine throws potions one per fight until those two
// are known, and the rest are drunk: Object Detection (the +5 item potion) lights every
// promising square in Anemone Mine, which is what the teflon dig wants (wiki Mining, 2026-10-17).

/** Effects by item id order 819..827, seedfinder's "scitdembh" letters (wiki: sleep, confusion,
 *  booze, teleportation, object detection, muscle, mysticality, moxie, healing). */
export const BANG_LETTERS = "scitdembh";

/** Letter -> mafia's lastBangPotion value (ItemPool.bangPotionStrings). */
export const BANG_EFFECTS: Record<string, string> = {
  s: "sleepiness",
  c: "confusion",
  i: "inebriety",
  t: "teleportitis",
  d: "detection",
  e: "ettin strength",
  m: "mental acuity",
  b: "blessing",
  h: "healing",
};

export const ALL_EFFECTS = BANG_LETTERS.split("").map((ch) => BANG_EFFECTS[ch]);

/** Identities that cost something to learn by drinking; found by throwing. */
export const COSTLY_EFFECTS = new Set(["inebriety", "teleportitis"]);

export const DETECTION = "detection";

/** Nine lastBangPotion values in item id order, "" when unidentified. */
export type BangKnown = string[];

/** The mafia prefs, plus the elimination mafia itself applies once eight are known. */
export function withElimination(known: BangKnown): BangKnown {
  const unknown = known.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  if (unknown.length !== 1) return known.slice();
  const missing = ALL_EFFECTS.filter((effect) => !known.includes(effect));
  if (missing.length !== 1) return known.slice();
  const filled = known.slice();
  filled[unknown[0]] = missing[0];
  return filled;
}

/** Keep throwing while a costly identity is still unassigned. */
export function throwWanted(known: BangKnown): boolean {
  const filled = withElimination(known);
  return [...COSTLY_EFFECTS].some((effect) => !filled.includes(effect));
}

/**
 * What potion `index` can be, from its pref, else from the seed candidates' potion strings
 * (calculateBangPotions per candidate), else every effect not yet assigned to another potion.
 */
export function possibleEffects(
  index: number,
  known: BangKnown,
  candidateBangs: string[] | undefined,
): Set<string> {
  const filled = withElimination(known);
  if (filled[index] !== "") return new Set([filled[index]]);
  if (candidateBangs !== undefined && candidateBangs.length > 0) {
    const fromSeeds = new Set(candidateBangs.map((bang) => BANG_EFFECTS[bang.charAt(index)]));
    // A candidate contradicting a recorded pref is stale; fall through to the pref view.
    const assigned = new Set(filled.filter((v) => v !== ""));
    const consistent = [...fromSeeds].filter((effect) => !assigned.has(effect));
    if (consistent.length > 0) return new Set(consistent);
  }
  return new Set(ALL_EFFECTS.filter((effect) => !filled.includes(effect)));
}

export function isSafeToDrink(possible: Set<string>): boolean {
  return [...possible].every((effect) => !COSTLY_EFFECTS.has(effect));
}

/**
 * Potions (indices) to drink now, before the teflon dig. A potion is drunk when it is held and
 * cannot be booze or teleportitis. With the seed pinned (one candidate) the identities are all
 * known, so only the detection potion is worth a drink; otherwise every safe unknown is drunk,
 * since each identification is a scan constraint and one of them may be detection.
 */
export function drinkPlan(
  known: BangKnown,
  held: boolean[],
  candidateBangs: string[] | undefined,
): number[] {
  const pinned = candidateBangs !== undefined && candidateBangs.length === 1;
  const plan: number[] = [];
  for (let i = 0; i < known.length; i++) {
    if (!held[i]) continue;
    const possible = possibleEffects(i, known, candidateBangs);
    if (!isSafeToDrink(possible)) continue;
    const identified = possible.size === 1;
    if (identified && !possible.has(DETECTION)) continue;
    if (pinned && !possible.has(DETECTION)) continue;
    plan.push(i);
  }
  return plan;
}

/** The potion known to be detection (pref or seed-agreed), if any. */
export function detectionPotionIndex(
  known: BangKnown,
  candidateBangs: string[] | undefined,
): number | undefined {
  for (let i = 0; i < known.length; i++) {
    const possible = possibleEffects(i, known, candidateBangs);
    if (possible.size === 1 && possible.has(DETECTION)) return i;
  }
  return undefined;
}
