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
  /** True = this source banishes; reserved for call sites that opt in
   * (ash free_run()'s `banish` flag, UnderTheSeaCCS.ash:74-107). */
  banishes: boolean;
};

/** The ash zone-excludes snokebomb at three surface farm zones
 * (UnderTheSeaCCS.ash:86-89). */
const snokebombExcludedZones = $locations`The Outskirts of Cobb's Knob, The Sleazy Back Alley, The Haunted Pantry`;

const navelSources = ["GAP runaway", "navel ring runaway"];
const corral = $location`The Coral Corral`;
const inkBladder = $item`ink bladder`;

/**
 * The ink bladders belong to the corral until the seahorse is tamed.
 *
 * The taming regime's whole economy is that a corral fight which does NOT
 * produce the wild seahorse should cost nothing: corral.ts appends
 * freeRunChainMacro() behind the waffle re-roll for exactly that. Gold spends
 * BOTH of its bladders there (G:5776, :5925) and every one of those visits
 * ends "This combat did not cost a turn" — including the one where the waffle
 * was consumed without re-rolling the monster.
 *
 * Live 2026-09-01 we spent our only bladder at the Marinara Trench (run log
 * :1968) during the Grandpa hunt. NOT, as first written here, "where the
 * ladder had banishes to spare": `Find Grandpa` sets `freeRunBanishes` on the
 * cosmic bowling ball, the ball was already out (:1941), so the walk ran in
 * NON-banish mode with every banishing rung filtered out before availability
 * was consulted — the bladder was the last rung standing and the run it bought
 * was genuinely free (:1972). By the corral the chain was empty and three sea
 * cows were killed for full turns ([15], [16], [17]).
 *
 * So this reservation is a TRADE, not a free win: with the bladder withheld,
 * that Grandpa call falls through to selectFreeKill({onceDaily: false}) and
 * spends a free-kill charge instead, or pays the turn if the kill ladder is
 * dry too. It is taken because a corral run is worth a whole paid turn while
 * the Grandpa fight had a free-kill substitute, but it is worth revisiting if
 * the free-kill ladder turns out to be the tighter resource. The real answer
 * is probably supply: gold ran THREE bladders (two corral, one gym) where we
 * pull at most one.
 *
 * Keyed on `seahorseName`, not `corralUnlocked`: the corral only unlocks
 * around turn 11 and the bladder was already gone by then.
 *
 * SIZE OF THE PRIZE: ONE turn, not three. The tail is reached at most once per
 * fight and the bladder is consumed, so one held bladder frees one of the three
 * paid cow turns. The `<= 2` ceiling is nominally gold's corral count but the
 * route never reaches it — 09-01 acquired exactly one (:1884), gold two
 * (G:1974, G:2011), and pulls.ts only tops up from ZERO — so "a third and
 * beyond is free for anyone" describes a state we never see and the predicate
 * is effectively unconditional while untamed. Getting the other two turns
 * needs more bladders, not tighter rationing.
 *
 * CAVEAT, inherited: `seahorseName` stays "" after a tame that came out of a
 * WAFFLED monster — mafia sets it from the opening monster only — which
 * corral.ts documents and papers over with resyncSeahorse(). If that resync
 * ever misses, this reservation holds the bladders for the rest of the day and
 * denies them to the gymnasium, where a run is also worth a whole turn. The
 * corral's own completion depends on the same predicate, so this adds no NEW
 * failure mode, but it does widen the blast radius of that one.
 */
function inkBladderReserved(location?: Location): boolean {
  return location !== corral && get("seahorseName") === "" && itemAmount(inkBladder) <= 2;
}

/**
 * THE STOMPING BOOTS, and the skill that is NOT their free run.
 *
 * `Release the Boots` is a NO-PORT (user correction 2026-09-01, "it is a turn
 * taking insta-kill"). The ash casts it — `free_run()`'s skill loop
 * (UnderTheSeaCCS.ash:82) — and that is the ash's bug, not a mechanic we were
 * missing. Live 2026-08-31 the Gymnasium released the boots twice, turn 58
 * (Mer-kin poseur) and turn 67 (Mer-kin juicer): both times Curby "leaps
 * up... stomps your opponent into paste", both times the turncount advanced
 * (58 -> 59, 67 -> 68), and `_banderRunaways` stayed at 0. libram's own free-run
 * ladder (actions/FreeRun.ts) does not list the skill anywhere.
 *
 * The boots' actual free run is the plain `runaway` combat action while they
 * are FIELDED with banked runaways — libram's StompingBoots entry in that
 * ladder is `Macro.step("runaway")`, gated on
 * `couldRunaway()`/`getRemainingRunaways()` — and unlike the Bandersnatch it
 * needs no Ode to Booze (Bandersnatch.canRunaway() checks the effect,
 * StompingBoots.canRunaway() does not). The counting is libram's (user rule
 * 2026-08-31: check libram before hand-rolling), which also fixes an old
 * hand-rolled bug — astro's version divided only the weight ADJUSTMENT by 5.
 *
 * Neither log shows a boots RUNAWAY being spent — but note `_banderRunaways`
 * is never printed in either, so that is an absence of evidence, not a
 * measurement. What IS measured: gold fielded 30 lb boots at its gymnasium
 * (G:8365 22 lb, :8402/:8415 30 lb) and cast `Release the Boots` zero times in
 * 41 turns, because the ash only casts it when the fight page offers it and
 * they never went restless. So the ~6 runaways that fielding bought were not
 * converted into runs at the one zone where a run is worth a whole turn.
 *
 * NOT PORTED (opportunity, not a bug): loopstar plans the familiar's WEIGHT
 * before running, `goalWeight = 5 * (1 + _banderRunaways)` in
 * planRunawayFamiliar() — it gears up to the next 5 lb threshold, so a
 * runaway is available whenever the gear can reach one. bootsRunawaysLeft()
 * below only reads the weight we happen to be wearing, so a run that could
 * have been bought with familiar-weight gear is not seen.
 */
function bootsRunawaysLeft(): number {
  return StompingBoots.have() ? StompingBoots.getRemainingRunaways() : 0;
}

/** The boots entry's full gate — banked runaways AND the underwater breathing
 * check — in one call, so the engine can ask "would the ladder take the boots
 * here?" BEFORE it puts them in the familiar slot. Fielding them on a gate the
 * selector would then fail would strand a non-breathing familiar underwater,
 * which customize()'s familiar-breathing block throws on. selectFreeRun()
 * applies exactly this function, so the two cannot drift. */
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
    // `runaway`, never `Release the Boots` — see the note above. Placed AFTER
    // the geared banish rungs rather than at the ash's position (which is
    // ahead of Feel Hatred and Snokebomb): the boots cost the familiar slot
    // and are capped by weight, while a banish also thins the zone's roster,
    // so the banishes go first and the boots pick up what is left. That
    // ordering is also what keeps banish.ts's gymnasium reservation
    // meaningful — the held charges are spent at the gym, not walked past.
    name: "Stomping Boots runaway",
    available: () => bootsRunawaysLeft() > 0,
    remaining: bootsRunawaysLeft,
    equip: $familiar`Pair of Stomping Boots`,
    // `new Macro().runaway()` — the shape loopstar uses for both familiar
    // runaways (loopstar resources/runaway.ts:139, Stomping Boots entry:
    // `new Macro().step(runawayFamiliarPlan.macro).runaway()`; user pointer
    // 2026-09-01). Its `plan.macro` prefix is the familiar-WEIGHT step from
    // planFamiliarGear(), which gears the familiar up to the next 5 lb
    // threshold (`goalWeight = 5 * (1 + _banderRunaways)`); this route has no
    // such planner, so bootsRunawaysLeft() just reads the weight we happen to
    // be wearing — see the note above for the gear-up opportunity that leaves.
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
    // The parasol shares ONE daily runaway counter with the GAP and the navel
    // ring above — "The runaway counter is shared with that of the Greatest
    // American Pants and the peppermint parasol" (wiki, Navel ring of navel
    // gazing) — and only the day's first three runs are a sure thing: 100%,
    // then 80% (4th-6th), 50% (7th-9th), 20% beyond. A failed roll does NOT
    // end the fight, so it falls through to the kill ladder and costs the turn.
    //
    // Gated on `parasolUsed` until 2026-09-02, which is the WRONG counter
    // twice over: it carries no leading underscore, so it is not a daily
    // preference at all (it is the cumulative per-ascension count toward the
    // parasol breaking on its 10th use), and it counts only the parasol's own
    // uses. With three GAP/navel runs already spent it still read "available"
    // and fired at 80% or worse. `_navelRunaways` is the shared counter mafia
    // keeps — the parasol emits the same "getting kinda queasy" breakpoint
    // messages the navel ring does, which is what mafia parses.
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
 * selectFreeRun() result. */
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
 * The fallthrough fires often — the geared rungs run dry — so it is capped to
 * free kills that do not close off a whole ladder for the rest of
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
 * Peace Turkey vs. the Boots: the boots take the familiar slot only when it is
 * FREE (engine.customize()). A task that declares sneakFamiliar() keeps it —
 * the 2026-08-27 matrix that would evict the turkey in a -combat context is
 * gone, because the boots are worth 5-6 runs at this route's weights, not the
 * 24 that decision assumed.
 *
 * `exclude` names sources the caller has already rejected, so it can ask for
 * the NEXT candidate. The engine needs this because availability is only half
 * the test: the winning source's gear also has to land in the task's outfit,
 * and a source whose slot is already taken used to sink the whole provide and
 * drop the task onto its combat default. Passing the rejected names back lets
 * the ladder walk on instead.
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
    // (else engine.customize()'s familiar check would throw on a familiar the
    // task never asked for). Same gate the engine consults before it fields
    // them — bootsRunAvailable() above. Routed through source.available() so
    // the entry's own banked-runaways gate stays live code.
    if (source.name === "Stomping Boots runaway") {
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
    if (source.name === "ink bladder" && inkBladderReserved(location)) return false;
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
