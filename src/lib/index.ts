import {
  Item,
  itemAmount,
  Location,
  mpCost,
  myHp,
  myMaxhp,
  myMaxmp,
  myMp,
  myPrimestat,
  print,
  restoreHp,
  restoreMp,
  Skill,
  Stat,
  storageAmount,
} from "kolmafia";
import { $items, $location, $skills, $stat, get, have } from "libram";

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

/**
 * The stall/runaway HP floor (the garbo fork combat.ts:509-519, :607-610, :676-697,
 * which welds `!hppercentbelow 25` into every stasis predicate: no stall round
 * may be entered below a quarter HP).
 *
 * Deliberately a flat 25% rather than a monsterAttack()-derived floor.
 * monsterAttack() is the to-hit stat, not damage: the colosseum six read
 * Atk 820+ (monsters.txt:427-436) while the ash measures what they actually
 * land as "110-175 a round" against 500 HP (CCS:222-226), and the wild seahorse
 * reads Atk 500 (monsters.txt:797). An attack-derived floor would therefore sit
 * above max HP and fire every single round, which is not a floor.
 */
export const HP_FLOOR_PERCENT = 25;

export function belowHpFloor(): boolean {
  return myHp() * (100 / HP_FLOOR_PERCENT) < myMaxhp();
}

/** In-combat heals that cost only MP — the one resource this run may spend
 * freely (spec §2 recovery model). classskills.txt:396 tags Lasagna Bandages
 * `combat,nc,heal` and :458 tags Saucy Salve `combat,spell`; both are pure
 * heals, so neither hands damage back through a live reflect. Preferred over
 * any thrown heal, since nothing here is rationed against the Yog-Urt kit. */
const combatHeals = $skills`Lasagna Bandages, Saucy Salve`;

export function combatHealSkill(): Skill | undefined {
  // MP is checked here rather than left to `trySkill`: a submission the fight
  // page refuses does not advance the round, and the stall loops abort after
  // three stuck rounds.
  return combatHeals.find((skill) => have(skill) && myMp() >= mpCost(skill));
}

/** Stall stock guard (CCS:288-303): while Yog-Urt is pending, one sea gel and
 * one Pungent Unguent are hers. Lives here rather than in the Yog fight file
 * because the corral's runaway floor needs the same reserve. */
export function stallSpare(it: Item): boolean {
  const reserved = !get("yogUrtDefeated") ? 1 : 0;
  return itemAmount(it) > reserved;
}

/** The throwable heals a stall or runaway round may spend, biggest heal first
 * (sea gel 500 HP, yogurt.ts healingHP), and only ever the copies the Yog-Urt
 * reserve above does not want. Returns undefined rather than breaking the kit. */
export function spareStallHeal(): Item | undefined {
  return $items`sea gel, Doc Galaktik's Pungent Unguent`.find(stallSpare);
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
