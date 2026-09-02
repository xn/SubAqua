import {
  Item,
  itemAmount,
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
import { $item, $location, $stat, get, have } from "libram";

import { args } from "../args";

export * from "./tier";

export function debug(message: string): void {
  print(`[subaqua] ${message}`, "gray");
}

export function buyLimit(): number {
  return args.buyLimit ?? get("autoBuyPriceLimit");
}

export function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}

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

export function recover(hpFloor = 570, mpFloor = 250): void {
  if (myHp() < Math.min(hpFloor, myMaxhp())) restoreHp(Math.min(hpFloor, myMaxhp()));
  if (myMp() < Math.min(mpFloor, myMaxmp())) restoreMp(Math.min(mpFloor, myMaxmp()));
}

export const HP_FLOOR_PERCENT = 25;

export function belowHpFloor(): boolean {
  return myHp() * (100 / HP_FLOOR_PERCENT) < myMaxhp();
}

export function stallSpare(it: Item): boolean {
  const reserved = !get("yogUrtDefeated") ? 1 : 0;
  return itemAmount(it) > reserved;
}

const throwableHeals: [Item, number][] = [
  [$item`soggy used band-aid`, 1000],
  [$item`sea gel`, 500],
  [$item`New Age healing crystal`, 500],
  [$item`Mer-kin healscroll`, 300],
  [$item`waterlogged scroll of healing`, 250],
  [$item`Doc Galaktik's Pungent Unguent`, 30],
];

export function floorClearingHeal(): Item | undefined {
  const deficit = (myMaxhp() * HP_FLOOR_PERCENT) / 100 - myHp();
  return throwableHeals.find(([it, hp]) => hp >= deficit && stallSpare(it))?.[0];
}

export function runawayHeal(): Item | undefined {
  const unguent = $item`Doc Galaktik's Pungent Unguent`;
  return stallSpare(unguent) ? unguent : undefined;
}

const grandpaZones: Map<Stat, Location> = new Map([
  [$stat`Muscle`, $location`Anemone Mine`],
  [$stat`Mysticality`, $location`The Marinara Trench`],
  [$stat`Moxie`, $location`The Dive Bar`],
]);

export function grandpaZone(): Location {
  return grandpaZones.get(myPrimestat()) ?? $location`Anemone Mine`;
}
