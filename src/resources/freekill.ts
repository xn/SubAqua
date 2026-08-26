import { getProperty, itemAmount, Location, Monster, myBasestat, Stat } from "kolmafia";
import { $effect, $item, $items, $location, $locations, $skill, get, have, Macro } from "libram";

import { currentPolicy } from "./policy";
import { CombatResource } from "./resource";

export type FreeKillSource = CombatResource & {
  do: Macro;
  /** Damage instakills glance off Colosseum gladiators (spec §8 boss facts);
   * only sources flagged true may fire there. */
  colosseumSafe: boolean;
  /** Club 'Em Back in Time is pointless outside the Colosseum. */
  colosseumOnly?: boolean;
  /** Groveling gravel forfeits the fight's drops; skip when drops matter. */
  dropSafe: boolean;
};

/** Ash BCZcost (iotm.ash:1182-1198): substat price of the NEXT cast of a BCZ
 * skill. Sequence 11, 23, 37, 110, 230, 370, …; the 13th cast is a flat 420k.
 * Ported statement-for-statement, including the in-place decrement. */
export function bczCost(counterPref: string): number {
  let cast = Number(getProperty(counterPref) || "0");
  if (cast === 12) return 420000;
  if (cast > 12) cast -= 1;
  const tier = Math.floor(cast / 3);
  const mod = cast % 3;
  const base = [11, 23, 37][mod];
  return base * 10 ** (cast < 12 || (cast > 12 && mod === 0) ? tier : tier + 1);
}

function bczSweatBulletsAffordable(): boolean {
  // Stat.get("submoxie"): mafia's runtime accepts substat names even though
  // the typings' StatType union lists only the three mainstats; MafiaClass.get
  // takes any string. Gate: base moxie substats above the 150-moxie floor
  // (150² = 22500) must exceed the next cast's price (ash freeKill():249).
  return myBasestat(Stat.get("submoxie")) - 22500 > bczCost("_bczSweatBulletsCasts");
}

const sheriffZones = $locations`An Octopus's Garden, Mer-kin Gymnasium, The Caliginous Abyss`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const colosseum = $location`Mer-kin Colosseum`;

/** Ordered per the ash's prep-time freeKill() (UnderTheSea.ash:237-253) with
 * the CCS free_kill() spenders folded in (UnderTheSeaCCS.ash:6-70). The
 * one-free-source-per-fight guard is structural: each `do` macro ends the
 * fight, and grimoire provides exactly one resource per action. */
export const freeKillSources: FreeKillSource[] = [
  {
    name: "Darts: Bullseye",
    available: () => have($item`Everfull Dart Holster`) && !have($effect`Everything Looks Red`),
    remaining: () =>
      have($item`Everfull Dart Holster`) && !have($effect`Everything Looks Red`) ? 1 : 0,
    equip: $item`Everfull Dart Holster`,
    do: Macro.trySkill($skill`Darts: Aim for the Bullseye`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    // Parka yellow-ray double duty: with darts, the only free kill high shiny spends.
    name: "Spit jurassic acid",
    available: () =>
      have($skill`Torso Awareness`) &&
      have($item`Jurassic Parka`) &&
      !have($effect`Everything Looks Yellow`),
    remaining: () =>
      have($item`Jurassic Parka`) && !have($effect`Everything Looks Yellow`) ? 1 : 0,
    equip: { equip: [$item`Jurassic Parka`], modes: { parka: "dilophosaur" } },
    do: Macro.trySkill($skill`Spit jurassic acid`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Assert your Authority",
    available: () => get("_assertYourAuthorityCast") < 3 && sheriffOutfit.every((it) => have(it)),
    remaining: () =>
      sheriffOutfit.every((it) => have(it)) ? Math.max(0, 3 - get("_assertYourAuthorityCast")) : 0,
    equip: { equip: [...sheriffOutfit] },
    do: Macro.trySkill($skill`Assert your Authority`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Chest X-Ray",
    available: () => get("_chestXRayUsed") < 3 && have($item`Lil' Doctor™ bag`),
    remaining: () => (have($item`Lil' Doctor™ bag`) ? Math.max(0, 3 - get("_chestXRayUsed")) : 0),
    equip: $item`Lil' Doctor™ bag`,
    do: Macro.trySkill($skill`Chest X-Ray`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "BCZ: Sweat Bullets",
    available: () => have($item`blood cubic zirconia`) && bczSweatBulletsAffordable(),
    remaining: () => (have($item`blood cubic zirconia`) && bczSweatBulletsAffordable() ? 1 : 0),
    equip: $item`blood cubic zirconia`,
    do: Macro.trySkill($skill`BCZ: Sweat Bullets`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Shattering Punch",
    available: () => have($skill`Shattering Punch`) && get("_shatteringPunchUsed") < 3,
    remaining: () =>
      have($skill`Shattering Punch`) ? Math.max(0, 3 - get("_shatteringPunchUsed")) : 0,
    do: Macro.trySkill($skill`Shattering Punch`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Gingerbread Mob Hit",
    available: () => have($skill`Gingerbread Mob Hit`) && !get("_gingerbreadMobHitUsed"),
    remaining: () => (have($skill`Gingerbread Mob Hit`) && !get("_gingerbreadMobHitUsed") ? 1 : 0),
    do: Macro.trySkill($skill`Gingerbread Mob Hit`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "shadow brick",
    available: () => itemAmount($item`shadow brick`) > 0 && get("_shadowBricksUsed") < 13,
    remaining: () => Math.min(itemAmount($item`shadow brick`), 13 - get("_shadowBricksUsed")),
    do: Macro.tryItem($item`shadow brick`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "groveling gravel",
    available: () => itemAmount($item`groveling gravel`) > 0,
    remaining: () => itemAmount($item`groveling gravel`),
    do: Macro.tryItem($item`groveling gravel`),
    colosseumSafe: false,
    dropSafe: false,
  },
  {
    // Colosseum-only 30% max-HP chip that works on instakill-immune
    // gladiators; ≤5/day, policy-gated (CCS:33-38, UnderTheSea.ash:2829).
    name: "Club 'Em Back in Time",
    available: () =>
      currentPolicy().allowClubEmBackInTime &&
      have($item`legendary seal-clubbing club`) &&
      get("_clubEmTimeUsed") < 5,
    remaining: () =>
      have($item`legendary seal-clubbing club`) ? Math.max(0, 5 - get("_clubEmTimeUsed")) : 0,
    equip: $item`legendary seal-clubbing club`,
    do: Macro.trySkill($skill`Club 'Em Back in Time`),
    colosseumSafe: true,
    colosseumOnly: true,
    // Sends the monster back in time — no drops (upstream CCS free_kill()
    // `|| drop` gate, 9eb5cd7).
    dropSafe: false,
  },
];

const dartsOnlyNames = ["Darts: Bullseye", "Spit jurassic acid"];

/** First free kill the policy, zone, and fight context allow. A pending
 * curveball already banks the target's free win (CCS free_kill():14-15). */
export function selectFreeKill(
  options: { location?: Location; target?: Monster; dropsMatter?: boolean } = {},
): FreeKillSource | undefined {
  const { location, target, dropsMatter = false } = options;
  if (target && get("_curveballMonster") === target && Number(get("_curveballFightsLeft")) > 0) {
    return undefined;
  }
  const policy = currentPolicy();
  const atColosseum = location === colosseum;
  return freeKillSources.find((source) => {
    if (policy.freeKillMode === "dartsOnly" && !dartsOnlyNames.includes(source.name)) return false;
    if (atColosseum && !source.colosseumSafe) return false;
    if (!atColosseum && source.colosseumOnly) return false;
    if (
      source.name === "Assert your Authority" &&
      (!location || !sheriffZones.includes(location))
    ) {
      return false;
    }
    if (dropsMatter && !source.dropSafe) return false;
    return source.available();
  });
}

/** The parka dilophosaur ray, when Everything Looks Yellow is down. */
export function selectYellowRay(): FreeKillSource | undefined {
  const parka = freeKillSources.find((source) => source.name === "Spit jurassic acid");
  return parka?.available() ? parka : undefined;
}
