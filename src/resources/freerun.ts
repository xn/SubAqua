import {
  appearanceRates,
  Familiar,
  haveEquipped,
  Item,
  itemAmount,
  Location,
  Monster,
  myFamiliar,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $location,
  $locations,
  $phylum,
  $skill,
  get,
  have,
  Macro,
  StompingBoots,
} from "libram";

import { familiarWaterBreathingEquipment, hasBreathingEffect } from "../engine/outfit";

import { banishedBy, banishSources } from "./banish";
import { FreeKillSource, selectFreeKill } from "./freekill";
import { CombatResource } from "./resource";

export type FreeRunSource = CombatResource & {
  do: Macro;
  banishes: boolean;
};

const snokebombExcludedZones = $locations`The Outskirts of Cobb's Knob, The Sleazy Back Alley, The Haunted Pantry`;

const navelSources = ["GAP runaway", "navel ring runaway"];
const corral = $location`The Coral Corral`;
const inkBladder = $item`ink bladder`;

function inkBladderReserved(location?: Location): boolean {
  return location !== corral && get("seahorseName") === "" && itemAmount(inkBladder) <= 2;
}

function bootsRunawaysLeft(): number {
  return StompingBoots.have() ? StompingBoots.getRemainingRunaways() : 0;
}

export function bootsRunAvailable(location?: Location): boolean {
  if (bootsRunawaysLeft() <= 0) return false;
  if (
    (!location || location.environment === "underwater") &&
    !hasBreathingEffect() &&
    !familiarWaterBreathingEquipment.some((it) => have(it))
  ) {
    return false;
  }
  return true;
}

export const freeRunSources: FreeRunSource[] = [
  {
    name: "Spring Kick",
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    remaining: () => (have($item`spring shoes`) && !have($effect`Everything Looks Green`) ? 1 : 0),
    equip: $item`spring shoes`,
    do: Macro.trySkill($skill`Spring Kick`).trySkill($skill`Spring Away`),
    banishes: true,
  },
  {
    name: "Spring Away",
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    remaining: () => (have($item`spring shoes`) && !have($effect`Everything Looks Green`) ? 1 : 0),
    equip: $item`spring shoes`,
    do: Macro.trySkill($skill`Spring Away`),
    banishes: false,
  },
  {
    name: "GAP runaway",
    available: () => have($item`Greatest American Pants`) && get("_navelRunaways") < 3,
    remaining: () =>
      have($item`Greatest American Pants`) ? Math.max(0, 3 - get("_navelRunaways")) : 0,
    equip: $item`Greatest American Pants`,
    do: Macro.runaway(),
    banishes: false,
  },
  {
    name: "navel ring runaway",
    available: () => have($item`navel ring of navel gazing`) && get("_navelRunaways") < 3,
    remaining: () =>
      have($item`navel ring of navel gazing`) ? Math.max(0, 3 - get("_navelRunaways")) : 0,
    equip: $item`navel ring of navel gazing`,
    do: Macro.runaway(),
    banishes: false,
  },
  {
    name: "Bowl a Curveball",
    available: () => itemAmount($item`cosmic bowling ball`) > 0,
    remaining: () => (itemAmount($item`cosmic bowling ball`) > 0 ? 1 : 0),
    do: Macro.trySkill($skill`Bowl a Curveball`),
    banishes: true,
  },
  {
    name: "Creepy Grin",
    available: () => have($item`V for Vivala mask`) && !get("_vmaskBanisherUsed"),
    remaining: () => (have($item`V for Vivala mask`) && !get("_vmaskBanisherUsed") ? 1 : 0),
    equip: $item`V for Vivala mask`,
    do: Macro.trySkill($skill`Creepy Grin`),
    banishes: false,
  },
  {
    name: "Throw Latte on Opponent",
    available: () => have($item`latte lovers member's mug`) && !get("_latteBanishUsed"),
    remaining: () => (have($item`latte lovers member's mug`) && !get("_latteBanishUsed") ? 1 : 0),
    equip: $item`latte lovers member's mug`,
    do: Macro.trySkill($skill`Throw Latte on Opponent`),
    banishes: true,
  },
  {
    name: "Feel Hatred",
    available: () => have($skill`Feel Hatred`) && get("_feelHatredUsed") < 3,
    remaining: () => (have($skill`Feel Hatred`) ? Math.max(0, 3 - get("_feelHatredUsed")) : 0),
    do: Macro.trySkill($skill`Feel Hatred`),
    banishes: true,
  },
  {
    name: "Snokebomb",
    available: () => have($skill`Snokebomb`) && get("_snokebombUsed") < 3,
    remaining: () => (have($skill`Snokebomb`) ? Math.max(0, 3 - get("_snokebombUsed")) : 0),
    do: Macro.trySkill($skill`Snokebomb`),
    banishes: true,
  },
  {
    name: "Stomping Boots runaway",
    available: () => bootsRunawaysLeft() > 0,
    remaining: bootsRunawaysLeft,
    equip: $familiar`Pair of Stomping Boots`,
    do: new Macro().runaway(),
    banishes: false,
  },
  {
    name: "glob of Blank-Out",
    available: () => itemAmount($item`glob of Blank-Out`) > 0,
    remaining: () => itemAmount($item`glob of Blank-Out`),
    do: Macro.tryItem($item`glob of Blank-Out`),
    banishes: false,
  },
  {
    name: "peppermint parasol",
    available: () => itemAmount($item`peppermint parasol`) > 0 && get("_navelRunaways") < 3,
    remaining: () =>
      itemAmount($item`peppermint parasol`) > 0 ? Math.max(0, 3 - get("_navelRunaways")) : 0,
    do: Macro.tryItem($item`peppermint parasol`),
    banishes: false,
  },
  {
    name: "anchor bomb",
    available: () => itemAmount($item`anchor bomb`) > 0,
    remaining: () => itemAmount($item`anchor bomb`),
    do: Macro.tryItem($item`anchor bomb`),
    banishes: true,
  },
  {
    name: "stuffed yam stinkbomb",
    available: () => itemAmount($item`stuffed yam stinkbomb`) > 0,
    remaining: () => itemAmount($item`stuffed yam stinkbomb`),
    do: Macro.tryItem($item`stuffed yam stinkbomb`),
    banishes: true,
  },
  {
    name: "handful of split pea soup",
    available: () => itemAmount($item`handful of split pea soup`) > 0,
    remaining: () => itemAmount($item`handful of split pea soup`),
    do: Macro.tryItem($item`handful of split pea soup`),
    banishes: true,
  },
  {
    name: "Mer-kin pinkslip",
    available: () => itemAmount($item`Mer-kin pinkslip`) > 0,
    remaining: () => itemAmount($item`Mer-kin pinkslip`),
    do: Macro.tryItem($item`Mer-kin pinkslip`),
    banishes: false,
  },
  {
    name: "ink bladder",
    available: () => itemAmount($item`ink bladder`) > 0,
    remaining: () => itemAmount($item`ink bladder`),
    do: Macro.tryItem($item`ink bladder`),
    banishes: false,
  },
];

export function isFreeRunSource(source: FreeRunSource | FreeKillSource): source is FreeRunSource {
  return "banishes" in source;
}

export function selectFreeRun(
  options: {
    banish?: boolean;
    location?: Location;
    target?: Monster;
    exclude?: ReadonlySet<string>;
  } = {},
): FreeRunSource | FreeKillSource | undefined {
  const { banish = false, location, target, exclude } = options;
  if (target && get("_curveballMonster") === target && Number(get("_curveballFightsLeft")) > 0) {
    return undefined;
  }
  const snokebomb = banishSources.find((source) => source.name === "snokebomb");
  const run = freeRunSources.find((source) => {
    if (exclude?.has(source.name)) return false;
    if (source.banishes && !banish) return false;
    if (
      navelSources.includes(source.name) &&
      (!location || location.environment === "underwater") &&
      !have($effect`Driving Waterproofly`)
    ) {
      return false;
    }
    if (source.name === "Stomping Boots runaway") {
      return source.available() && bootsRunAvailable(location);
    }
    if (source.name === "Snokebomb") {
      if (location && snokebombExcludedZones.includes(location)) return false;
      const current = snokebomb ? banishedBy(snokebomb) : undefined;
      if (location && current && (appearanceRates(location)[current.name] ?? 0) > 0) return false;
    }
    if (source.name === "Mer-kin pinkslip" && target && target.phylum !== $phylum`mer-kin`) {
      return false;
    }
    if (source.name === "ink bladder" && inkBladderReserved(location)) return false;
    return source.available();
  });
  const selected = run ?? selectFreeKill({ location, target, onceDaily: false });
  if (selected && exclude?.has(selected.name)) return undefined;
  return selected;
}

export function freeRunChainMacro(
  options: { banish?: boolean; location?: Location; target?: Monster } = {},
): Macro {
  const macro = new Macro();
  const exclude = new Set<string>();
  for (;;) {
    const source = selectFreeRun({ ...options, exclude });
    if (!source) break;
    exclude.add(source.name);
    const equip = source.equip;
    if (equip instanceof Item && !haveEquipped(equip)) continue;
    if (equip instanceof Familiar && myFamiliar() !== equip) continue;
    if (equip !== undefined && !(equip instanceof Item) && !(equip instanceof Familiar)) continue;
    macro.step(source.do);
  }
  return macro;
}
