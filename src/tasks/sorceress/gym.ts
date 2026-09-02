import {
  abort,
  adv1,
  availableAmount,
  buy,
  cliExecute,
  equip,
  itemAmount,
  maximize,
  useFamiliar,
  visitUrl,
} from "kolmafia";
import { $coinmaster, $item, $items, $location, $slot, get, have } from "libram";

import {
  ensureHelperBreathing,
  isTrainingLasso,
  requiredFamiliarBreather,
  seaKeyword,
} from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { applyEffects, combatEffects, combineMoods, survivalEffects } from "../../lib/moods";

import { gladiatorFilter, gymFreeRunGear } from "./fights";
import { skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const gladMask = $item`Mer-kin gladiator mask`;
const gladTail = $item`Mer-kin gladiator tailpiece`;

export function gymnasiumTurn(): void {
  if (get("noncombatForcerActive")) {
    abort(
      "An NC forcer is pending while headed to the Mer-kin Gymnasium — it would be wasted on the zone NC (ash UTS:663-664). Spend it (e.g. at the Skate Park) and rerun.",
    );
  }
  applyEffects(combineMoods(combatEffects(), survivalEffects()), "Guard Grind");
  const warOpen = skateWarOpen();
  const pieces: string[] = [];
  if (warOpen) {
    if (have($item`McHugeLarge left ski`) && get("_mcHugeLargeAvalancheUses", 0) < 3) {
      pieces.push("+equip McHugeLarge left ski");
    } else if (have($item`Jurassic Parka`) && get("_spikolodonSpikeUses", 0) < 5) {
      cliExecute("parka spikolodon");
      pieces.push("+equip Jurassic Parka");
    }
  }
  const runGear = gymFreeRunGear();
  if (runGear.familiar) useFamiliar(runGear.familiar);
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) pieces.push(`+equip ${famBreather.name}`);
  for (const it of runGear.items) pieces.push(`+equip ${it.name}`);
  const sheriffSet = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
  if (get("_assertYourAuthorityCast", 0) < 3 && sheriffSet.every((it) => have(it))) {
    for (const it of sheriffSet) pieces.push(`+equip ${it.name}`);
  }
  if (isTrainingLasso()) {
    if (have($item`sea cowboy hat`)) pieces.push("+equip sea cowboy hat");
    if (have($item`sea chaps`)) pieces.push("+equip sea chaps");
  }
  const terms = ["combat rate", "-equip bat wings", ...pieces];
  const sea = seaKeyword();
  if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
    maximize(terms.join(", "), false);
  }
  ensureHelperBreathing("the Mer-kin Gymnasium");
  recover(800);
  adv1($location`Mer-kin Gymnasium`, -1, gladiatorFilter({ gym: true, warOpen }));
}

export function gladiatorGearStep(): void {
  gymnasiumTurn();
  if (itemAmount(thighguard) === 0 || itemAmount(headguard) === 0) return;
  if (!get("yogUrtDefeated")) return;
  equip($slot`hat`, $item.none);
  equip($slot`pants`, $item.none);
  if (itemAmount($item`Mer-kin scholar mask`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=131");
  }
  if (itemAmount($item`Mer-kin scholar tailpiece`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=1619");
  }
  for (const it of [gladMask, gladTail]) {
    if (availableAmount(it) === 0) buy($coinmaster`Grandma Sea Monkey`, 1, it);
  }
}

export function gearQuest(): Quest {
  return {
    name: "Gladiator Gear",
    tasks: [
      {
        name: "Guard Grind",
        ready: () => get("yogUrtDefeated") && (!get("noncombatForcerActive") || !skateWarOpen()),
        completed: () => availableAmount(gladMask) > 0 && availableAmount(gladTail) > 0,
        do: gladiatorGearStep,
        underwater: true,
        limit: {
          soft: 40,
          message: "Gladiator guards are not dropping; check the gymnasium grind.",
        },
      },
    ],
  };
}
