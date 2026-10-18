// The in-run Fishy ladder, decided from a snapshot of the game. Fishy turns are additive and
// tick only on adventures that cost a turn; an underwater adventure without Fishy costs two.
// Lutz, the Ice Skate grants 30 turns free once a day (`_skateBuff1`) after the skate war ends
// with the ice side (`skateParkStatus` "ice"); the run always fights that war, so while it is
// still on the free 30 is coming and a paid source (fish sauce: 1 spleen plus ~21,000 meat,
// worth ~47,000 to the farm; cuppa Gill tea; pulled meal; sushi) would buy a tail Lutz covers.
// With the pipe spent, the PYEC's +5 on Fishy's last turn bridges to the rift lane's +16; only when
// no free source can bridge does the ladder reach a paid one or, under `fishyWaitForLutz`, accept
// the doubled turns (6,500 each) until Lutz.
export type FishyLadderState = {
  /** Turns of Fishy left; 0 means lapsed. */
  fishyTurns: number;
  /** The fishy pipe is unused today and owned (inventory or Hagnk's). */
  pipe: boolean;
  /** `mapToTheSkateParkPurchased`: the war is on the route. */
  mapPurchased: boolean;
  /** `skateParkStatus`: "war" while the war is on, "ice" once Lutz is claimable. */
  parkStatus: string;
  /** `_skateBuff1`: Lutz's buff is already taken today. */
  lutzClaimed: boolean;
  /** The PYEC is owned anywhere, unused today, and the policy spends it. */
  pyecReady: boolean;
  /** Policy `fishyWaitForLutz`. */
  waitForLutz: boolean;
};

export type FishyStep = "keep" | "pyec" | "pipe" | "lutz" | "wait" | "buy";

function lutzStillComing(state: FishyLadderState): boolean {
  return state.mapPurchased && state.parkStatus === "war" && !state.lutzClaimed;
}

export function fishyStep(state: FishyLadderState): FishyStep {
  if (state.fishyTurns > 1) return "keep";
  if (state.fishyTurns === 1) {
    // The card adds +5 to active effects only, so Fishy's last turn is the last chance for
    // its +5 to land there; the pipe needs no active effect, so it is left to the lapse.
    // Even before Shadow Affinity: the Sorceress Dailies task waits for Affinity so the card's +5
    // also buys five rift fights, but Affinity cannot be banked (it ticks on paid turns too), and a
    // doubled turn is never accepted while the card can bridge the gap. Cost when the Outpost runs
    // past turn 12: up to five rift fights; gain: 1-4 turns at the Outpost tail.
    if (!state.pipe && state.pyecReady && lutzStillComing(state)) return "pyec";
    return "keep";
  }
  if (state.pipe) return "pipe";
  if (state.parkStatus === "ice" && !state.lutzClaimed) return "lutz";
  if (state.waitForLutz && lutzStillComing(state)) return "wait";
  return "buy";
}
