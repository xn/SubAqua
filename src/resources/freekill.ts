import {
  availableAmount,
  Familiar,
  haveEquipped,
  Item,
  itemAmount,
  Location,
  Monster,
  myFamiliar,
  Skill,
} from "kolmafia";
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
  colosseumSafe: boolean;
  colosseumOnly?: boolean;
  dropSafe: boolean;
  onceDaily?: boolean;
  avoidAt?: Location[];
};

export function bczAffordable(skill: Skill, mainstatFloor: number): boolean {
  return BloodCubicZirconia.availableCasts(skill, mainstatFloor) > 0;
}

function bczSweatBulletsAffordable(): boolean {
  return bczAffordable($skill`BCZ: Sweat Bullets`, 150);
}

const sheriffZones = $locations`An Octopus's Garden, Mer-kin Gymnasium, The Caliginous Abyss`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const colosseum = $location`Mer-kin Colosseum`;

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
    onceDaily: true,
  },
  {
    name: "Assert your Authority",
    available: () => get("_assertYourAuthorityCast") < 3 && sheriffOutfit.every((it) => have(it)),
    remaining: () =>
      sheriffOutfit.every((it) => have(it)) ? Math.max(0, 3 - get("_assertYourAuthorityCast")) : 0,
    equip: { equip: [...sheriffOutfit] },
    do: Macro.trySkill($skill`Assert your Authority`),
    colosseumSafe: false,
    dropSafe: false,
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
    dropSafe: false,
  },
];

const dartsOnlyNames = ["Darts: Bullseye", "Spit jurassic acid"];

export const freeKillReservations: ChargeReservation[] = [
  {
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
    name: "school hallpass chain",
    count: 1,
    sites: [$location`Mer-kin Elementary School`],
    needed: () =>
      !get("isMerkinHighPriest", false) &&
      (availableAmount($item`sea leather`) > 0 ||
        have($item`sea cowboy hat`) ||
        have($item`sea chaps`) ||
        get("seahorseName") !== ""),
  },
];

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

export function selectFreeKill(
  options: {
    location?: Location;
    target?: Monster;
    dropsMatter?: boolean;
    onceDaily?: boolean;
    exclude?: ReadonlySet<string>;
  } = {},
): FreeKillSource | undefined {
  const { location, target, dropsMatter = false, onceDaily = true, exclude } = options;
  if (target && get("_curveballMonster") === target && Number(get("_curveballFightsLeft")) > 0) {
    return undefined;
  }
  return freeKillSources.find(
    (source) =>
      !exclude?.has(source.name) &&
      usableFreeKill(source, { location, dropsMatter, onceDaily }) &&
      freeKillBudgetAllows(source, location),
  );
}

function gearWorn(equip: FreeKillSource["equip"]): boolean {
  if (equip === undefined) return true;
  if (equip instanceof Item) return haveEquipped(equip);
  if (equip instanceof Familiar) return myFamiliar() === equip;
  const specs = Array.isArray(equip) ? equip : [equip];
  return specs.every((spec) => (spec.equip ?? []).every((item) => haveEquipped(item)));
}

export function freeKillChain(
  options: { location?: Location; dropsMatter?: boolean; onceDaily?: boolean } = {},
): FreeKillSource[] {
  const { location } = options;
  return freeKillSources.filter(
    (source) =>
      gearWorn(source.equip) &&
      usableFreeKill(source, options) &&
      freeKillBudgetAllows(source, location),
  );
}

const freeKillZones = new Map<Location, boolean>([
  [$location`Madness Bakery`, false],
  [$location`An Octopus's Garden`, true],
  [$location`The Wreck of the Edgar Fitzsimmons`, true],
  [$location`The Marinara Trench`, true],
  [$location`The Dive Bar`, true],
  [$location`Anemone Mine`, true],
  [$location`The Mer-Kin Outpost`, false],
  [$location`The Coral Corral`, true],
  [$location`The Caliginous Abyss`, false],
  [$location`Mer-kin Elementary School`, true],
  [$location`Mer-kin Library`, true],
  [$location`Mer-kin Gymnasium`, false],
  [$location`Mer-kin Colosseum`, false],
]);

const freeKillMonsters = new Map<Monster, boolean>([
  [$monster`unholy diver`, true],
  [$monster`sea cowboy`, true],
  [$monster`Mer-kin healer`, true],
  [$monster`Neptune flytrap`, true],
  [$monster`giant squid`, true],
  [$monster`Mer-kin miner`, true],
  [$monster`Mer-kin tippler`, true],
]);

export const freeKillNever: Monster[] = [$monster`wild seahorse`, $monster`Peanut`];

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

export function selectYellowRay(): FreeKillSource | undefined {
  const parka = freeKillSources.find((source) => source.name === "Spit jurassic acid");
  return parka?.available() ? parka : undefined;
}
