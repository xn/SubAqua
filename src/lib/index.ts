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

/**
 * NO SKILL HEALS live behind this floor, deliberately. The two in-combat heal
 * skills a Sea run could have restore a flat 20 HP (Lasagna Bandages,
 * HPRestoreItemList.java:123) and nothing mafia models at all (Saucy Salve is
 * absent from that table) — neither can clear a ~142 HP floor on the route's
 * ~570 max-HP baseline, so returning one below the floor leaves the floor
 * breached and returns the same trickle on the next round, forever. Rounds
 * advance, so no stuck-round guard fires: it is a lost fight, not an abort.
 * Only a heal big enough to CLEAR the floor may answer it.
 */

/** Stall stock guard (CCS:288-303): while Yog-Urt is pending, one sea gel and
 * one Pungent Unguent are hers. Applied per item, so it equally reserves one
 * copy of every other Yog heal TYPE (yogurt.ts yogHealingsOwned() counts
 * distinct types with availableAmount > 0, so the last copy of a type is the
 * kit). Lives here rather than in the Yog fight file because the corral's
 * runaway floor needs the same reserve. */
export function stallSpare(it: Item): boolean {
  const reserved = !get("yogUrtDefeated") ? 1 : 0;
  return itemAmount(it) > reserved;
}

/** Throwable combat heals by HP restored, biggest first. The five sea-side
 * values are the ash's own table (yogurt.ts healingHP <- ash HealingHP,
 * G:695-701); the unguent's 30 is mafia's (HPRestoreItemList.java:64), which is
 * exactly why the ash uses it as a stall FILLER rather than a rescue. */
const throwableHeals: [Item, number][] = [
  [$item`soggy used band-aid`, 1000],
  [$item`sea gel`, 500],
  [$item`New Age healing crystal`, 500],
  [$item`Mer-kin healscroll`, 300],
  [$item`waterlogged scroll of healing`, 250],
  [$item`Doc Galaktik's Pungent Unguent`, 30],
];

/**
 * The biggest spare throwable heal that actually CLEARS the floor. Two
 * properties matter and both are load-bearing:
 *  - it clears the floor, so `belowHpFloor()` is false on the next round and
 *    the caller cannot return the same heal forever;
 *  - it is spare past the Yog-Urt reserve, so a floor can never eat that kit.
 * Undefined when nothing qualifies — the caller then falls through to its own
 * ladder rather than burning a round on a heal that changes nothing.
 */
export function floorClearingHeal(): Item | undefined {
  const deficit = (myMaxhp() * HP_FLOOR_PERCENT) / 100 - myHp();
  return throwableHeals.find(([it, hp]) => hp >= deficit && stallSpare(it))?.[0];
}

/** The one heal the corral's runaway loop may throw. NOT sea gel and not the
 * rest of the Yog kit: the loop's guard is BALLS `hascombatitem`, which only
 * asks whether a copy is in inventory, so a build-time reserve check cannot
 * hold across the `repeat` — successive passes would drain straight through
 * the reserved copy. The unguent is the ash's own stall filler and the only
 * heal here that is not a distinct Yog heal TYPE (yogurt.ts healingHP), so
 * spending a spare copy costs the kit nothing. */
export function runawayHeal(): Item | undefined {
  const unguent = $item`Doc Galaktik's Pungent Unguent`;
  return stallSpare(unguent) ? unguent : undefined;
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
