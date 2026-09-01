import { availableAmount, itemAmount, Location, Monster, Skill } from "kolmafia";
import {
  $effect,
  $item,
  $items,
  $location,
  $locations,
  $monster,
  $skill,
  BloodCubicZirconia,
  get,
  have,
  Macro,
} from "libram";

import { currentPolicy } from "./policy";
import { activeHolders, ChargeReservation } from "./reservation";
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
  /**
   * Spending it closes off a whole ladder for effectively the rest of the day:
   * Everything Looks Yellow blocks every yellow ray (the forced-drop ladder,
   * selectYellowRay() below), so the parka's acid spit is the one entry that
   * carries the flag today.
   *
   * The dart bullseye is deliberately NOT flagged (user correction
   * 2026-08-27): Everything Looks Red is a ~30-turn COOLDOWN, not a daily
   * charge, so the bullseye replenishes several times over a run and a
   * substituted spend costs the route a handful of turns of dart access, not
   * the day's. Same for the merely limited sources — Chest X-Ray and
   * Shattering Punch at 3/day, shadow bricks at 13.
   *
   * Callers that are only substituting a free kill for something else, rather
   * than choosing to spend one here, pass `onceDaily: false` to skip these.
   */
  onceDaily?: boolean;
  /** Zones this source must never be spent in — the shadow bricks are banked
   * for the School/Abyss (gold spent zero before the School, F ledger #1;
   * the 08-30 run threw all three at corral tumbleweeds). */
  avoidAt?: Location[];
};

/**
 * Can the next cast of a BCZ skill be paid for while keeping `mainstatFloor`
 * base mainstat? Delegates to libram's BloodCubicZirconia (user directive
 * 2026-08-31: stop reinventing libram) — its `availableCasts` knows each
 * skill's substat and cast-count pref and squares the mainstat floor.
 *
 * The ash floors, in mainstat points: Sweat Bullets over 150 moxie
 * (150² = 22500 substats, G freeKill():473 and CCS:41), Refracted Gaze over
 * 200 mysticality (40000, CCS:113). libram's cost table matches the ash
 * BCZcost sequence (11, 23, 37, 110, … / 420k at cast 12) everywhere a run
 * can reach; they diverge only from cast 13 on, past the 420k wall.
 */
export function bczAffordable(skill: Skill, mainstatFloor: number): boolean {
  return BloodCubicZirconia.availableCasts(skill, mainstatFloor) > 0;
}

function bczSweatBulletsAffordable(): boolean {
  return bczAffordable($skill`BCZ: Sweat Bullets`, 150);
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
    // NOT onceDaily: Everything Looks Red is a ~30-turn cooldown that
    // replenishes (user correction 2026-08-27), so a run that ends in a
    // bullseye instead is a fair trade — see the flag's doc above.
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
    onceDaily: true, // Everything Looks Yellow
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
  // Both thrown free kills are surface items thrown underwater; kept because
  // the ash throws exactly this pair underwater in production (CCS:47-56). See
  // engine/combat.ts's sea-legality audit.
  {
    name: "shadow brick",
    available: () => itemAmount($item`shadow brick`) > 0 && get("_shadowBricksUsed") < 13,
    remaining: () => Math.min(itemAmount($item`shadow brick`), 13 - get("_shadowBricksUsed")),
    do: Macro.tryItem($item`shadow brick`),
    colosseumSafe: false,
    dropSafe: true,
    avoidAt: [$location`The Coral Corral`],
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

/**
 * Charges the ladder holds back for the two fights gold spends its LAST two
 * free kills on (resources/reservation.ts has the measurement).
 */
export const freeKillReservations: ChargeReservation[] = [
  {
    // The corral opener is ONE free fight in gold (G:4584-4646): back up into
    // an Abyss monster, Refracted Gaze + McTwist for the doubled bundle, then
    // BCZ Sweat Bullets #10 of 11 to end it — 2 cowbells, 2 leathers and 2
    // lassos for zero turns. Without a charge in hand that copy falls to the
    // kill ladder, the bundle never lands, and the corral grinds: 25 turns on
    // 2026-08-31. Keyed on the bundle rather than on `corralUnlocked`, which
    // only flips around turn 17 — long after the Outpost has drained the
    // ladder (live: all 11 Sweat Bullets gone by turn 13).
    name: "corral opener",
    count: 1,
    sites: [$location`The Coral Corral`],
    needed: () =>
      availableAmount($item`sea leather`) === 0 &&
      !have($item`sea cowboy hat`) &&
      !have($item`sea chaps`) &&
      get("seahorseName") === "",
  },
  {
    // Gold's last charge (G:6626, Sweat Bullets #11) opens the school's
    // Sea *dent -> Refracted Gaze -> free kill chain, which yoinks ~5 Mer-kin
    // items including the hallpasses the cowl/rope hunt spends. The shadow
    // bricks carry the rest of that zone (gold threw 8 there); they hold
    // themselves back with `avoidAt` rather than a reservation because they
    // do not exist until the rift has run.
    name: "school hallpass chain",
    count: 1,
    sites: [$location`Mer-kin Elementary School`],
    // Only once the corral opener above has had its charge. The route reaches
    // the corral first, and two live reservations against a ladder down to one
    // charge would let the LATER site starve the earlier one — the corral would
    // refuse its own opener because the school was holding the last charge.
    needed: () =>
      !get("isMerkinHighPriest", false) &&
      (availableAmount($item`sea leather`) > 0 ||
        have($item`sea cowboy hat`) ||
        have($item`sea chaps`) ||
        get("seahorseName") !== ""),
  },
];

/**
 * The mode/zone/fight filters selectFreeKill() applies, factored out so the
 * budget below can count the pool a HOLDER could actually spend rather than
 * every charge on the ladder. Counting the whole ladder would let a pile of
 * charges the reserving site can never use (Assert your Authority outside the
 * Sheriff zones, shadow bricks the corral refuses, the drop-forfeiting pair)
 * satisfy the budget and the reservation would never bite.
 */
function usableFreeKill(
  source: FreeKillSource,
  options: { location?: Location; dropsMatter?: boolean; onceDaily?: boolean },
): boolean {
  const { location, dropsMatter = false, onceDaily = true } = options;
  const policy = currentPolicy();
  const atColosseum = location === colosseum;
  if (policy.freeKillMode === "dartsOnly" && !dartsOnlyNames.includes(source.name)) return false;
  if (atColosseum && !source.colosseumSafe) return false;
  if (!atColosseum && source.colosseumOnly) return false;
  if (source.name === "Assert your Authority" && (!location || !sheriffZones.includes(location))) {
    return false;
  }
  if (dropsMatter && !source.dropSafe) return false;
  if (!onceDaily && source.onceDaily) return false;
  if (location && source.avoidAt?.includes(location)) return false;
  return source.available();
}

/**
 * Whether spending THIS source at `location` would eat a charge another site
 * is holding. Same shape as pulls.ts's pullBudgetAllows: a site never blocks
 * itself.
 *
 * Per-source, not per-location: a source no holder could ever spend cannot
 * deplete the reservation, so refusing it buys the holder nothing and costs
 * the caller a turn. Assert your Authority is not usable at the school (not a
 * sheriffZone), the shadow bricks are not usable at the corral (`avoidAt`),
 * and Club 'Em Back in Time is colosseum-only — none of them may be held back
 * on those sites' behalf.
 *
 * The pool is counted with `dropsMatter` on: both reserved fights are drop
 * hunts (the corral bundle, the school's hallpasses), so a source that
 * forfeits drops is no use to either.
 */
function freeKillBudgetAllows(source: FreeKillSource, location?: Location): boolean {
  const holders = activeHolders(freeKillReservations, location);
  if (holders.length === 0) return true;
  const heldSites = [...new Set(holders.flatMap((reservation) => reservation.sites))];
  const inPool = (candidate: FreeKillSource): boolean =>
    heldSites.some((site) => usableFreeKill(candidate, { location: site, dropsMatter: true }));
  if (!inPool(source)) return true;
  const pool = freeKillSources
    .filter(inPool)
    .reduce((total, candidate) => total + candidate.remaining(), 0);
  return pool > holders.reduce((total, reservation) => total + reservation.count, 0);
}

/**
 * First free kill the policy, zone, and fight context allow. A pending
 * curveball already banks the target's free win (CCS free_kill():14-15).
 *
 * `onceDaily: false` drops the sources whose spend closes off a whole ladder
 * for the rest of the day (see the flag — today that is the parka's yellow
 * ray alone; the dart bullseye is on a ~30-turn cooldown and is NOT dropped).
 * Only selectFreeRun's fallthrough passes it: a free kill standing in for a
 * run was never a decision to spend the forced-drop ladder.
 */
export function selectFreeKill(
  options: {
    location?: Location;
    target?: Monster;
    dropsMatter?: boolean;
    onceDaily?: boolean;
  } = {},
): FreeKillSource | undefined {
  const { location, target, dropsMatter = false, onceDaily = true } = options;
  if (target && get("_curveballMonster") === target && Number(get("_curveballFightsLeft")) > 0) {
    return undefined;
  }
  // Budget alongside the ladder filters: an opportunistic upgrade at a zone
  // that is cheap anyway must not take the charge the corral opener or the
  // school is holding (freeKillReservations).
  return freeKillSources.find(
    (source) =>
      usableFreeKill(source, { location, dropsMatter, onceDaily }) &&
      freeKillBudgetAllows(source, location),
  );
}

/**
 * Where the ash spends a free kill on an ORDINARY fight, and whether that
 * spend has to be drop-safe (the `drop` argument of CCS free_kill(), which
 * skips the sources that forfeit the fight's drops).
 *
 * Transcribed from the free_kill() call sites in UnderTheSeaCCS.ash main() at
 * HEAD. Boss handling (the temple doors, Dad Sea Monkee) never reaches
 * free_kill() and is absent by construction.
 */
const freeKillZones = new Map<Location, boolean>([
  [$location`Madness Bakery`, false], // CCS:528
  [$location`An Octopus's Garden`, true], // CCS:571 (the Neptune flytrap branch)
  [$location`The Wreck of the Edgar Fitzsimmons`, true], // CCS:611
  [$location`The Marinara Trench`, true], // CCS:655
  [$location`The Dive Bar`, true], // CCS:655
  [$location`Anemone Mine`, true], // CCS:655
  [$location`The Mer-Kin Outpost`, false], // CCS:718, 724
  [$location`The Coral Corral`, true], // CCS:766, 789
  [$location`The Caliginous Abyss`, false], // CCS:943
  [$location`Mer-kin Elementary School`, true], // CCS:1004
  [$location`Mer-kin Library`, true], // CCS:1037, 1051
  [$location`Mer-kin Gymnasium`, false], // CCS:1076
  [$location`Mer-kin Colosseum`, false], // CCS:1086
]);

/**
 * Per-monster entries. Two kinds: the ash's own monster-keyed cases (which run
 * after its location switch), and the drop hunts whose SubAqua task has a
 * function `do` — grimoire hands customize() no location for those, so the
 * monster is the only key available.
 */
const freeKillMonsters = new Map<Monster, boolean>([
  [$monster`unholy diver`, true], // CCS:1188
  [$monster`sea cowboy`, true], // CCS:1193
  [$monster`Mer-kin healer`, true], // CCS:704, 724 (prayerbeads still short)
  [$monster`Neptune flytrap`, true], // CCS:571
  // Grandpa's rescue hunt walks Trench / Dive Bar / Anemone Mine behind a
  // `do: () => grandpaZone()`, so these carry CCS:655's drop flag themselves.
  [$monster`giant squid`, true],
  [$monster`Mer-kin miner`, true],
  [$monster`Mer-kin tippler`, true],
]);

/**
 * Fights inside a free-kill zone that must never take the opportunistic step,
 * even under a task's general `kill`. The wild seahorse is a BOSS behind
 * resistances that cap every hit at 1 (monsters.txt Phys+Elem 100): an
 * instakill only glances, and a glanced dart still spends Everything Looks Red
 * for the day. The ash never reaches free_kill() with one in front of it — its
 * corral case tames or runs first (CCS:746-760, 838-851).
 * Peanut (Caliginous Abyss) shrugs off instakills: live 2026-08-28 Assert Your Authority
 * landed and the fight ran ten more rounds (session log:84421); UTS 08-21's shadow brick on it
 * was a paid fight too (:114296).
 */
export const freeKillNever: Monster[] = [$monster`wild seahorse`, $monster`Peanut`];

/**
 * Whether the ash free-kills this fight, and with what drop discipline.
 * Returns undefined when the fight is not one of its free-kill sites.
 * A `true` on either the monster or the zone wins: the ash's monster switch
 * runs AFTER its location switch, so a monster the ash treated as drop-mattering
 * keeps that discipline inside a zone whose generic call was drop-free. Never
 * the other way round — no drop-forfeiting source on a fight some site wanted
 * drop-safe.
 */
export function freeKillTargetDropsMatter(
  location?: Location,
  monster?: Monster,
): boolean | undefined {
  if (monster && freeKillNever.includes(monster)) return undefined;
  const byMonster = monster ? freeKillMonsters.get(monster) : undefined;
  const byZone = location ? freeKillZones.get(location) : undefined;
  if (byMonster === undefined && byZone === undefined) return undefined;
  return (byMonster ?? false) || (byZone ?? false);
}

/** The parka dilophosaur ray, when Everything Looks Yellow is down. */
export function selectYellowRay(): FreeKillSource | undefined {
  const parka = freeKillSources.find((source) => source.name === "Spit jurassic acid");
  return parka?.available() ? parka : undefined;
}
