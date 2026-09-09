import { adv1, availableAmount, equip, maximize, useFamiliar } from "kolmafia";
import { $item, $location, $slot, get, have } from "libram";

import { args } from "../../args";
import { killMacro } from "../../engine/combat";
import {
  ensureHelperBreathing,
  requiredFamiliarBreather,
  seaKeyword,
  sneakFamiliar,
} from "../../engine/outfit";
import { recover } from "../../lib";
import { applyEffects, sneakEffects } from "../../lib/moods";
import { momFinishPending } from "../monkees/mom";

import { gladiatorGearStep, gymnasiumTurn } from "./gym";
import { claimIceBuff, skateParkTurn, skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const library = $location`Mer-kin Library`;
const scholarPieces = [$item`Mer-kin scholar mask`, $item`Mer-kin scholar tailpiece`];

function guardsMissing(): boolean {
  return availableAmount(headguard) === 0 || availableAmount(thighguard) === 0;
}

export function burnCapacity(): number {
  let turns = 0;
  if (guardsMissing()) turns += 5;
  if (skateWarOpen()) turns += 2;
  if (args.burnMomFinish && momFinishPending()) turns += 2;
  return turns;
}

export function libraryBurnTurn(): void {
  applyEffects(sneakEffects(), "Library burn");
  const familiar = sneakFamiliar();
  if (familiar) useFamiliar(familiar);
  const terms = [
    "-combat",
    "-equip Peridot of Peril",
    "-equip bat wings",
    ...scholarPieces.filter((it) => have(it)).map((it) => `+equip ${it.name}`),
  ];
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) terms.push(`+equip ${famBreather.name}`);
  const sea = seaKeyword();
  if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
    maximize(terms.join(", "), false);
  }
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
  ensureHelperBreathing("the Mer-kin Library");
  recover();
  adv1(library, -1, () => killMacro(false).toString());
}

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
  if (!get("isMerkinHighPriest", false)) {
    libraryBurnTurn();
    return true;
  }
  return false;
}
