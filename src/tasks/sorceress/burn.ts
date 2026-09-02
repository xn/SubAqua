import { availableAmount } from "kolmafia";
import { $item, get } from "libram";

import { colosseumRoundTurn } from "./colosseum";
import { gladiatorGearStep, gymnasiumTurn } from "./gym";
import { claimIceBuff, skateParkTurn, skateWarOpen } from "./skatepark";

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
  if (gearReady && get("lastColosseumRoundWon", 0) < 15) {
    colosseumRoundTurn();
    return true;
  }
  return false;
}
