import {
  Item,
  Location,
  myHp,
  myMaxhp,
  myMaxmp,
  myMp,
  myPrimestat,
  print,
  restoreHp,
  restoreMp,
  Stat,
  storageAmount,
} from "kolmafia";
import { $location, $stat, get, have } from "libram";

import { args } from "../args";

export * from "./tier";

export function debug(message: string): void {
  print(`[subaqua] ${message}`, "gray");
}

/** Spec §4: the ash's autoBuyPriceLimit user_confirm becomes an arg with the
 * user's own mafia preference as the default. */
export function buyLimit(): number {
  return args.buyLimit ?? get("autoBuyPriceLimit");
}

/** Ash have_item(): owned anywhere useful — inventory/equipped (libram have)
 * or still in Hagnk's. The resource ladders and sim share this definition. */
export function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}

/** Quest pref -> comparable number: unstarted=-1, started=0, stepN=N, finished=999. */
export function questStepOf(pref: string): number {
  const value = get(pref, "unstarted");
  if (value === "unstarted") return -1;
  if (value === "started") return 0;
  if (value === "finished") return 999;
  if (value.startsWith("step")) return parseInt(value.slice(4));
  return -1;
}

export function monkeesStep(): number {
  return questStepOf("questS02Monkees");
}

/** Spec §2 recovery model: explicit absolute floors in task prepare
 * (570 HP / 250 MP baseline, ash setRecoveryTargets UTS:729-747). */
export function recover(hpFloor = 570, mpFloor = 250): void {
  if (myHp() < Math.min(hpFloor, myMaxhp())) restoreHp(Math.min(hpFloor, myMaxhp()));
  if (myMp() < Math.min(mpFloor, myMaxmp())) restoreMp(Math.min(mpFloor, myMaxmp()));
}

const grandpaZones: Map<Stat, Location> = new Map([
  [$stat`Muscle`, $location`Anemone Mine`],
  [$stat`Mysticality`, $location`The Marinara Trench`],
  [$stat`Moxie`, $location`The Dive Bar`],
]);

/** The whole per-class Grandpa/pearl zone decision (ash pearlLoc UTS:27-31).
 * Evaluated lazily — the old repo's module-level myPrimestat() was a defect. */
export function grandpaZone(): Location {
  return grandpaZones.get(myPrimestat()) ?? $location`Anemone Mine`;
}
