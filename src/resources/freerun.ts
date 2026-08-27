import { appearanceRates, itemAmount, Location, Monster } from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $locations,
  $phylum,
  $skill,
  get,
  have,
  Macro,
  totalFamiliarWeight,
} from "libram";

import { familiarWaterBreathingEquipment, hasBreathingEffect } from "../engine/outfit";

import { banishedBy, banishSources } from "./banish";
import { FreeKillSource, selectFreeKill } from "./freekill";
import { CombatResource } from "./resource";

export type FreeRunSource = CombatResource & {
  do: Macro;
  /** True = this source banishes; reserved for call sites that opt in
   * (ash free_run()'s `banish` flag, UnderTheSeaCCS.ash:74-107). */
  banishes: boolean;
};

/** The ash zone-excludes snokebomb at three surface farm zones
 * (UnderTheSeaCCS.ash:86-89). */
const snokebombExcludedZones = $locations`The Outskirts of Cobb's Knob, The Sleazy Back Alley, The Haunted Pantry`;

const boots = $familiar`Pair of Stomping Boots`;
const navelSources = ["GAP runaway", "navel ring runaway"];

function bootsRunawaysLeft(): number {
  if (!have(boots)) return 0;
  return Math.max(0, Math.floor(totalFamiliarWeight(boots) / 5) - get("_banderRunaways"));
}

/** Ordered per ash freeRun() (UnderTheSea.ash:255-265) with the CCS spenders
 * folded in. Spring shoes appear twice on purpose: banish mode upgrades
 * Spring Away to Spring Kick (CCS:98); both share the Everything Looks Green
 * cooldown. */
export const freeRunSources: FreeRunSource[] = [
  {
    name: "Spring Kick",
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    remaining: () => (have($item`spring shoes`) && !have($effect`Everything Looks Green`) ? 1 : 0),
    equip: $item`spring shoes`,
    do: Macro.trySkill($skill`Spring Kick`),
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
    // Underwater the GAP runaway only works while Driving Waterproofly
    // (ash freeRun():257) — the selector enforces that by zone; on the
    // surface (guild tests, UTS:1121-1128 at 89982f5) it is unconditional.
    name: "GAP runaway",
    available: () => have($item`Greatest American Pants`) && get("_navelRunaways") < 3,
    remaining: () =>
      have($item`Greatest American Pants`) ? Math.max(0, 3 - get("_navelRunaways")) : 0,
    equip: $item`Greatest American Pants`,
    do: Macro.runaway(),
    banishes: false,
  },
  {
    // Same three-a-day counter as the GAP (FightRequest.java:11866-11868).
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
    // Creepy Grin does banish, but the ash spends it as a generic run
    // (it's absent from CCS free_run()'s non-banish skip list, CCS:84) —
    // ash parity over conserving the once-daily banish.
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
    // One free runaway per five full pounds, on the Bandersnatch counter
    // (FightRequest.java:11861-11865: modifiedWeight / 5 > _banderRunaways).
    // Ash freeRun() G:487-494 + CCS free_run() ladder at 89982f5. Takes the
    // familiar slot, so it only lands on tasks that set no familiar of
    // their own (equip-gated provide in engine.customize()).
    name: "Release the Boots",
    available: () => bootsRunawaysLeft() > 0,
    remaining: bootsRunawaysLeft,
    equip: $familiar`Pair of Stomping Boots`,
    do: Macro.trySkill($skill`Release the Boots`),
    banishes: false,
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
  // The thrown runs below (glob of Blank-Out through ink bladder) are all
  // surface items used in an all-underwater route; kept because the ash throws
  // this same set underwater in production (CCS:95-105). See engine/combat.ts's
  // sea-legality audit for why mafia offers nothing to test against.
  {
    name: "glob of Blank-Out",
    available: () => itemAmount($item`glob of Blank-Out`) > 0,
    remaining: () => itemAmount($item`glob of Blank-Out`),
    do: Macro.tryItem($item`glob of Blank-Out`),
    banishes: false,
  },
  {
    name: "peppermint parasol",
    available: () => itemAmount($item`peppermint parasol`) > 0 && get("parasolUsed") < 3,
    remaining: () =>
      itemAmount($item`peppermint parasol`) > 0 ? Math.max(0, 3 - get("parasolUsed")) : 0,
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
    // Mer-kin phylum only; the selector enforces it when a target is known.
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

/**
 * First run source the mode, zone, and fight context allow. `banish: true`
 * additionally admits the banishing sources (and prefers Spring Kick over
 * Spring Away by list order). Falls through to the free-kill ladder like the
 * ash's freeRun() (UnderTheSea.ash:264): a free kill substitutes when no run
 * source is left. Curveball guard as in free-kill.
 *
 * `exclude` names sources the caller has already rejected, so it can ask for
 * the NEXT candidate. The engine needs this because availability is only half
 * the test: the winning source's gear also has to land in the task's outfit,
 * and a source whose slot is already taken (Release the Boots against a task
 * that fields its own familiar — the live 2026-08-27 case) used to sink the
 * whole provide and drop the task onto its combat default. Passing the
 * rejected names back lets the ladder walk on instead.
 */
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
    // The navel runaways need Driving Waterproofly underwater (ash
    // freeRun():257); an unknown zone is treated as underwater — every
    // caller that omits the location is a sea task.
    if (
      navelSources.includes(source.name) &&
      (!location || location.environment === "underwater") &&
      !have($effect`Driving Waterproofly`)
    ) {
      return false;
    }
    // The boots cannot breathe: underwater they need a familiar breather
    // (else engine.customize()'s familiar check would throw on a familiar
    // the task never asked for).
    if (
      source.name === "Release the Boots" &&
      (!location || location.environment === "underwater") &&
      !hasBreathingEffect() &&
      !familiarWaterBreathingEquipment.some((it) => have(it))
    ) {
      return false;
    }
    if (source.name === "Snokebomb") {
      if (location && snokebombExcludedZones.includes(location)) return false;
      // Skip when snokebomb's existing banish already covers this zone
      // (ash banishUsedAtYourLocation(), iotm.ash:1102-1109).
      const current = snokebomb ? banishedBy(snokebomb) : undefined;
      if (location && current && (appearanceRates(location)[current.name] ?? 0) > 0) return false;
    }
    if (source.name === "Mer-kin pinkslip" && target && target.phylum !== $phylum`mer-kin`) {
      return false;
    }
    return source.available();
  });
  // selectFreeKill takes no exclusion list of its own, so the fallback is
  // filtered here: an already-rejected free kill ends the walk rather than
  // being handed back forever.
  const selected = run ?? selectFreeKill({ location, target });
  if (selected && exclude?.has(selected.name)) return undefined;
  return selected;
}
