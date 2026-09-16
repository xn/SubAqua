// Yog-Urt takes each specific item once per fight (wiki), so her two deleveling rounds need two
// item types. The ladder, cheapest first:
//   1. in-run drops: crayon shavings (Golem Recall, every run) and Mer-kin mouthsoap (a ~1/3 drop
//      from School punishers/teachers, missing in 3 of the 8 runs 09-08..09-15);
//   2. reusable delevelers that live in Hagnk's between runs (untradeable, so the pull is free of
//      mall meat and the item comes back next run): the train whistle (-25%), then the HOA
//      citation pad (-30% on dudes/hippies/orcs, less elsewhere);
//   3. the mall pull: a null-day exploit (Null Afternoon zeroes attack for 30 adventures).
// Each rung costs one pull slot, which comes out of the late-pull ladder (ink bladder, pinkslip:
// used 0 times in gold and in 6 of the last 8 runs).
export type YogDelevelState = {
  /** isMerkinHighPriest: the School lane, the last mouthsoap source, is over. */
  highPriest: boolean;
  yogDefeated: boolean;
  /** Deleveler item types in inventory (yogDelevelStock in lib/yog). */
  typesHeld: number;
  nullAfternoon: boolean;
  /** Reusable delevelers sitting in Hagnk's, by name. */
  stored: readonly string[];
  /** Items already pulled today, by name. */
  pulledToday: readonly string[];
};

export const storedDelevelerOrder = ["train whistle", "HOA citation pad"] as const;
export const exploitName = "null-day exploit";

export function yogDelevelersShort(state: YogDelevelState): boolean {
  return state.highPriest && !state.yogDefeated && !state.nullAfternoon && state.typesHeld < 2;
}

/** The stored deleveler to pull, or undefined when none is short-listed or none is stored. */
export function yogDelevelerPull(state: YogDelevelState): string | undefined {
  if (!yogDelevelersShort(state)) return undefined;
  return storedDelevelerOrder.find(
    (name) => state.stored.includes(name) && !state.pulledToday.includes(name),
  );
}

/** The exploit is the last rung: only when nothing reusable is left in Hagnk's. */
export function yogExploitWanted(state: YogDelevelState): boolean {
  return (
    yogDelevelersShort(state) &&
    yogDelevelerPull(state) === undefined &&
    !state.pulledToday.includes(exploitName)
  );
}
