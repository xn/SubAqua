import {
  abort,
  adv1,
  availableAmount,
  buy,
  cliExecute,
  equip,
  itemAmount,
  maximize,
  visitUrl,
} from "kolmafia";
import { $coinmaster, $item, $location, $slot, get, have } from "libram";

import { requiredFamiliarBreather } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";

import { gladiatorFilter } from "./fights";
import { skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const gladMask = $item`Mer-kin gladiator mask`;
const gladTail = $item`Mer-kin gladiator tailpiece`;

/**
 * One gymnasium turn (ash gymnasium(), UTS:617-641): +combat (the "Ators
 * Gonna Ate" NC guard is combat-rate pressure plus the forcer abort below),
 * skate-war NC-forcer gear banked when the war still needs one, 800 HP floor
 * (setRecoveryTargets UTS:216-225).
 *
 * The war state is computed ONCE per turn and handed to the filter: the gear
 * and the in-combat cast must agree on it, and a filter may never page-load
 * per round (CCS:1067-1070).
 */
export function gymnasiumTurn(): void {
  if (get("noncombatForcerActive")) {
    abort(
      "An NC forcer is pending while headed to the Mer-kin Gymnasium — it would be wasted on the zone NC (ash UTS:638-639). Spend it (e.g. at the Skate Park) and rerun.",
    );
  }
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
  // Familiar breathing: this wrapper task declares no `outfit`, so the engine's
  // enforcement (engine.ts:240-246, which needs outfit.familiar) never runs and
  // whatever non-aquatic familiar an earlier task left up would make mafia
  // refuse the zone (KoLAdventure.java:2867-2884).
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) pieces.push(`+equip ${famBreather.name}`);
  maximize(["combat rate", ...pieces].join(", "), false);
  recover(800);
  adv1($location`Mer-kin Gymnasium`, -1, gladiatorFilter({ gym: true, warOpen }));
}

/**
 * Trade guards for the gladiator set (ash gladiatorGearStep tail,
 * UTS:2139-2157): sell scholar pieces back at Grandma's UNMODELED reverse
 * rows (131/1619 — commented out in mafia's coinmasters.txt:682,684, so raw
 * URLs exactly like the ash), then coinmaster-buy the gladiator set
 * (ROW126/127: crappy piece + guard).
 *
 * Deviation from ash, deliberate: the trade is gated on yogUrtDefeated. The
 * ash lets its burn ladder trade before Yog-Urt, which can strand her — the
 * Right Door requires Scholar's Vestments (KoLAdventure.java:2325-2411) and
 * the sell-back consumes them with the facecowl/waistrope already spent.
 */
export function gladiatorGearStep(): void {
  gymnasiumTurn();
  if (itemAmount(thighguard) === 0 || itemAmount(headguard) === 0) return;
  if (!get("yogUrtDefeated")) return;
  equip($slot`hat`, $item.none);
  equip($slot`pants`, $item.none);
  equip($item`really, really nice swimming trunks`);
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
        // The && is deliberate (ash UTS:2854-2857): the colosseum outfit needs
        // BOTH pieces, so the grind is only complete once the mask AND the
        // tailpiece are in hand — either one alone still leaves work to do.
        // A pending NC forcer must be spent (skate park) before another
        // gymnasium turn: the gym banks forcers in-combat while the war is open
        // (fights.ts gladiatorFilter gym extras) and gymnasiumTurn() then hard-
        // aborts on the pending one, so without this guard the very next
        // selection pass kills the run.
        //
        // ...but only while there is somewhere to spend it. With the war
        // already closed nothing downstream is reachable either (all gear-
        // gated), so hiding here would leave grimoire with no task at all and
        // main.ts would exit on a bare "N tasks remaining" with no instruction
        // (spec §9 wants an abort that says why). Staying ready hands the turn
        // to gymnasiumTurn(), whose abort explains how to clear the forcer.
        ready: () => get("yogUrtDefeated") && (!get("noncombatForcerActive") || !skateWarOpen()),
        completed: () => availableAmount(gladMask) > 0 && availableAmount(gladTail) > 0,
        do: gladiatorGearStep,
        underwater: true,
        limit: {
          soft: 18,
          message: "Gladiator guards are not dropping; check the gymnasium grind.",
        },
      },
    ],
  };
}
