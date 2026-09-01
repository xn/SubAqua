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
  $locations,
  $phylum,
  $skill,
  get,
  have,
  Macro,
  totalFamiliarWeight,
} from "libram";

import { familiarWaterBreathingEquipment, hasBreathingEffect } from "../engine/outfit";

import { banishBudgetAllows, banishedBy, banishSources } from "./banish";
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

/** The boots entry's full gate — banked runaways AND the underwater breathing
 * check below — in one call, so the engine's free-run familiar rule
 * (engine/engine.ts customize(), user decision 2026-08-27) can ask "would the
 * ladder take the boots here?" BEFORE it puts them in the familiar slot.
 * Fielding them on a gate the selector would then fail would strand a
 * non-breathing familiar underwater, which customize()'s familiar-breathing
 * block throws on. selectFreeRun() applies exactly this function, so the two
 * cannot drift. */
export function bootsRunAvailable(location?: Location): boolean {
  if (bootsRunawaysLeft() <= 0) return false;
  // The boots cannot breathe: underwater they need a familiar breather (an
  // unknown zone is treated as underwater — every caller that omits the
  // location is a sea task).
  if (
    (!location || location.environment === "underwater") &&
    !hasBreathingEffect() &&
    !familiarWaterBreathingEquipment.some((it) => have(it))
  ) {
    return false;
  }
  return true;
}

/** Ordered per ash freeRun() (UnderTheSea.ash:255-265) with the CCS spenders
 * folded in. Spring shoes appear twice on purpose: banish mode upgrades
 * Spring Away to Spring Kick (CCS:98); both share the Everything Looks Green
 * cooldown. */
export const freeRunSources: FreeRunSource[] = [
  {
    // Kick THEN away, matching the CCS exactly (UnderTheSeaCCS.ash:90-93:
    // `if (banish && freeskill == spring away) use_skill(spring kick);
    // use_skill(freeskill)`) — the kick BANISHES WITHOUT ENDING THE FIGHT
    // (FightRequest.java:10185-10187 just records the banish), so it is an
    // add-on before the escape, not a replacement for it. Porting it as an
    // upgrade was the live 2026-08-30 gym bleed: kick alone, fight fell to
    // the kill ladder (turn paid every time), and the kick's single banish
    // slot churned across juicer/poseur/trainer, releasing the previous
    // monster each fight for zero net roster effect.
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
    // familiar slot: engine.customize()'s free-run familiar rule (user
    // decision 2026-08-27) decides whether this task's familiar slot is the
    // boots' to have — up front in a +combat context, last-resort in a
    // -combat one — and the provide stays equip-gated either way, so on a
    // task whose familiar is spoken for the ladder simply walks past this.
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

/** Tells an actual run apart from the free-kill fallthrough in a
 * selectFreeRun() result. engine.customize()'s -combat pass uses it to stop at
 * the end of the RUN ladder: that is the point where the Stomping Boots earn
 * the familiar slot — 24 banked runaways are cheaper than any charge the
 * free-kill ladder would spend here — so the fallthrough must not be taken
 * ahead of them. */
export function isFreeRunSource(source: FreeRunSource | FreeKillSource): source is FreeRunSource {
  return "banishes" in source;
}

/**
 * First run source the mode, zone, and fight context allow. `banish: true`
 * additionally admits the banishing sources (and prefers Spring Kick over
 * Spring Away by list order). Curveball guard as in free-kill.
 *
 * THE FREE-KILL FALLTHROUGH, and its one-day limit. The ash's freeRun()
 * (UnderTheSeaGlobals.ash:478-495) ends `return freeKill();` — when no run gear
 * is left it dresses the free-kill gear instead — so substituting a free kill
 * for a run is ash behaviour and stays. But that is a GEAR helper: the spend
 * itself is the CCS's free_run() (UnderTheSeaCCS.ash:74-107), whose two loops
 * are runs and banishes only. It never throws a dart. The ash only ever spends
 * Everything Looks Red from free_kill(), at its own call sites.
 *
 * That distinction matters here because the fallthrough fires often: all five
 * freeRun tasks in this route field a familiar of their own (sneakFamiliar(),
 * engine/outfit.ts — or the goth kid in guild.ts), so Release the Boots — 20+
 * banked runaways on a grown Pair of Stomping Boots — used to fail the equip
 * gate in firstEquippable() every time and the ladder walked past it. The
 * engine's free-run familiar rule (below) fixes that case; what is left is
 * capped to free kills that do not close off a whole ladder for the rest of
 * the day (`onceDaily: false`). Today that excludes exactly one source, the
 * parka's Everything Looks Yellow acid spit, which would take the forced-drop
 * ladder down with it. The dart bullseye is NOT excluded (user correction
 * 2026-08-27): Everything Looks Red is a ~30-turn cooldown that replenishes,
 * so ending a fight we could not run from with a bullseye — or with a Chest
 * X-Ray, a Shattering Punch, a shadow brick — is a fair trade, and the darts
 * are back a handful of turns later.
 *
 * Drops are deliberately not a filter (dropsMatter stays false): the caller
 * asked to LEAVE this monster, so it was never expecting its drops, and a
 * drop-forfeiting kill costs it nothing.
 *
 * DESIGN CALL, SETTLED — Peace Turkey vs. the Boots (user decision
 * 2026-08-27). sneakFamiliar() (Peace Turkey, ash UTS:349-355) buys -combat,
 * which thins the whole zone; the Boots buy ~24 free runs outright, which is
 * what a freeRun task actually asked for, and the two cannot both hold the
 * familiar slot. The resolution lives in engine.customize()'s freeRun branch,
 * not here: in a +combat/non-sneak context the boots take the slot up front
 * (nothing is lost); in a -combat context the sneak familiar keeps it and the
 * boots are the LAST resort, fielded only when no non-familiar run source can
 * equip for that task. This selector is unchanged by that rule — it still
 * returns the first source the mode, zone and fight context allow, and the
 * engine still equip-gates whatever comes back.
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
  // The banishing rungs here (Curveball, Latte, Feel Hatred, Snokebomb,
  // Spring Kick) are the SAME daily charges banish.ts hands out, so they
  // answer to the same budget — otherwise a free run at a cheap zone would
  // quietly spend the three the gymnasium is holding (banishReservations).
  const banishesOverBudget = !banishBudgetAllows(location);
  const run = freeRunSources.find((source) => {
    if (exclude?.has(source.name)) return false;
    if (source.banishes && !banish) return false;
    if (source.banishes && banishesOverBudget) return false;
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
    // the task never asked for). Same gate the engine consults before it
    // fields them — see bootsRunAvailable() above. Routed through
    // source.available() (the entry's own banked-runaways gate, line ~142)
    // rather than past it, so that gate stays live code instead of an
    // unreachable duplicate of bootsRunAvailable()'s own runaway check.
    if (source.name === "Release the Boots") {
      return source.available() && bootsRunAvailable(location);
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
  // being handed back forever. onceDaily: false is the cap documented above.
  const selected = run ?? selectFreeKill({ location, target, onceDaily: false });
  if (selected && exclude?.has(selected.name)) return undefined;
  return selected;
}

/**
 * Every free-run source the ladder would take right now, chained in ladder
 * order (the ash's free_run() walks its whole list, UnderTheSeaCCS.ash:74-107;
 * selectFreeRun() picks one). Sources needing gear count only when that gear
 * is on — this is meant for delayed task macros built after dress(). Each
 * step is hasskill/hascombatitem-guarded, so the first one KoL offers ends the
 * fight and the rest are inert. `banish` opts the banishing rungs in.
 */
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
