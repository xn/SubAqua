import { availableAmount } from "kolmafia";
import { $item, get } from "libram";

import { colosseumRoundTurn } from "./colosseum";
import { gladiatorGearStep, gymnasiumTurn } from "./gym";
import { claimIceBuff, skateParkTurn, skateWarOpen } from "./skatepark";

/**
 * The productive turn-sink ladder (ash burnTurnElsewhere(), UTS:2236-2267),
 * used by the Deep-Tainted Mind and Gummiheart waits: skate war first, then
 * gymnasium (guard farming; the gear TRADE stays post-Yog — see gym.ts's
 * scholar-strand guard), then colosseum rounds. The ash's caliginous rung
 * (questS02Monkees step12) is dropped: with the kit, Phase 3's "Mom Finish"
 * task (mom.ts) grinds that quest to completion right before Shub, so it is
 * already finished before the sorceress phase begins.
 *
 * A pending NC forcer skips the gymnasium rung entirely: gymnasiumTurn()
 * hard-aborts on one (it would be wasted on the zone NC), and this ladder
 * runs from inside the High Priest / Gummiheart wait loops, where an abort
 * would strand the run. The colosseum rung takes the turn instead.
 *
 * Returns false when nothing useful remains — callers abort with the ash's
 * 1-in-40 essay (UTS:2719-2721).
 */
export function burnTurnElsewhere(): boolean {
  if (skateWarOpen()) {
    skateParkTurn();
    return true;
  }
  const gearReady =
    availableAmount($item`Mer-kin gladiator mask`) > 0 &&
    availableAmount($item`Mer-kin gladiator tailpiece`) > 0;
  if (!gearReady && !get("noncombatForcerActive")) {
    if (get("yogUrtDefeated")) gladiatorGearStep();
    else gymnasiumTurn();
    claimIceBuff();
    return true;
  }
  // The colosseum is an outfit-required zone: without the gladiator set
  // hasRequiredOutfit() refuses the turn ("you've gotta be especially
  // gladitorial", KoLAdventure.java:4392) — reporting `true` for a turn that
  // never happened would spin the Deep-Tainted / Gummiheart wait loops forever.
  if (gearReady && get("lastColosseumRoundWon", 0) < 15) {
    colosseumRoundTurn();
    return true;
  }
  return false;
}
