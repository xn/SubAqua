import {
  CombatResources,
  CombatStrategy,
  Engine as BaseEngine,
  EngineOptions,
  Outfit,
  OutfitSpec,
  outfitSlots,
} from "grimoire-kolmafia";
import {
  autosell,
  availableAmount,
  booleanModifier,
  canEquip,
  cliExecute,
  equip,
  equippedAmount,
  Familiar,
  handlingChoice,
  haveEquipped,
  Item,
  itemAmount,
  lastChoice,
  Location,
  Monster,
  mpCost,
  myFamiliar,
  myMeat,
  myMp,
  myTurncount,
  print,
  runCombat,
  toMonster,
  toSkill,
  toSlot,
  use,
  writeCcs,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $monster,
  $skill,
  $slot,
  ensureEffect,
  get,
  have,
  Macro,
  PropertiesManager,
  set,
  undelay,
  uneffect,
} from "libram";

import { dreadSeedCheck } from "../lib/dreadscroll";
import { assertOnGoldPace, fightHappened, recordTask, reportLedger } from "../lib/gold";
import {
  effectFailureContext,
  isEnsureError,
  reserveMpFor,
  resolveWantedEffects,
  routeDamageEffects,
  shrugBadEffects,
  shrugForSongs,
} from "../lib/moods";
import { backupCamera, backupMacro, backupTarget, freeMonsters } from "../resources/backup";
import {
  bangPotionMacro,
  bangPotionNever,
  unidentifiedBangPotions,
} from "../resources/bangpotions";
import { banishChainMacro, pickBanishSource, sourceMacro } from "../resources/banish";
import { emergencyDiet, maintainFishy, maintainWaterproofly } from "../resources/fishy";
import {
  freeKillChain,
  freeKillNever,
  freeKillTargetDropsMatter,
  selectFreeKill,
  selectYellowRay,
} from "../resources/freekill";
import { selectFreeRun } from "../resources/freerun";
import { peridotTargetOffered, setPeridotTargetId } from "../resources/peridot";
import { currentPolicy } from "../resources/policy";
import { forceGranted } from "../resources/saber";

import {
  CombatActions,
  combatActions,
  fishMacro,
  killMacro,
  MyActionDefaults,
  openerOnce,
} from "./combat";
import {
  chooseItemFamiliar,
  familiarWaterBreathingEquipment,
  hasBreathingEffect,
  preferredBreathingGear,
  isTrainingLasso,
  seaKeyword,
  waterBreathingEquipment,
} from "./outfit";
import { Task } from "./task";

function isUnderwaterTask(task: Task): boolean {
  return (
    (task.do instanceof Location && task.do.environment === "underwater") ||
    task.underwater === true
  );
}

// Resource.equip (src/resources/resource.ts) is typed Item | Familiar | OutfitSpec
// | OutfitSpec[] to match grimoire's OutfitSpec.bonuses map key shape, but
// Outfit.equip() only accepts grimoire's narrower Equippable (no bare
// OutfitSpec[]). No ladder source currently populates equip with an array of
// specs, so this narrows for the compiler without changing behavior.
// Returns true only if every outfit.equip() call it makes returns true — a
// slot conflict (e.g. lasso-training already pinned pants) means the gear
// didn't land, so callers must not provide the resource on a false return.
function equipResource(
  outfit: Outfit,
  equipment: Item | Familiar | OutfitSpec | OutfitSpec[],
): boolean {
  if (Array.isArray(equipment)) {
    let ok = true;
    for (const spec of equipment) ok = outfit.equip(spec) && ok;
    return ok;
  }
  return outfit.equip(equipment);
}

/**
 * The kill ladder appended behind every provided resource macro, per the
 * zero-action invariant in customize() below.
 *
 * The PLAIN ladder, bullseye chain included. It briefly passed
 * `{ bullseye: false }`, to keep a banish/run/free kill that failed to fire
 * from claiming Everything Looks Red ahead of the free-kill ladder's own
 * deliberate spends. ELR is a ~30-turn COOLDOWN, not a charge for the day
 * (user correction 2026-08-27), so there is nothing to reserve — ending a
 * fight we could not run from with a replenishing free kill beats fighting it,
 * and the bullseye is back within the hour.
 *
 * Called from inside each provide's delayed `do`, so it sees the dressed
 * outfit — that part is load-bearing and unchanged.
 */
function fallbackMacro(options: { fish?: boolean } = {}): Macro {
  return options.fish ? fishMacro().step(killMacro(false)) : killMacro(false);
}

/**
 * Walk a resource ladder until one candidate's gear actually lands in the
 * outfit, and return it (or undefined when the ladder is exhausted).
 *
 * The equip gate itself is deliberate — a silently stripped equip would sell a
 * gearless macro as a banish/run — but taking the FIRST available source and
 * dropping the whole provide when its slot is occupied throws away every source
 * behind it. That is the live 2026-08-27 abort: Grandpa/Find Grandpa fielded
 * sneakFamiliar() (Peace Turkey), the ladder's first pick wanted the familiar
 * slot, Outfit.equipFamiliar returned false because it was already claimed
 * (grimoire outfit.js:279-283), and the task fell through to its combat default
 * with nine untried run sources still on the ladder.
 *
 * `select` is handed the names rejected so far; a ladder that ignores them
 * still terminates, because a repeat of an already-tried name ends the walk.
 */
function firstEquippable<
  T extends { name: string; equip?: Item | Familiar | OutfitSpec | OutfitSpec[] },
>(outfit: Outfit, select: (exclude: ReadonlySet<string>) => T | undefined): T | undefined {
  const tried = new Set<string>();
  for (;;) {
    const source = select(tried);
    if (!source || tried.has(source.name)) return undefined;
    if (source.equip === undefined || equipResource(outfit, source.equip)) return source;
    tried.add(source.name);
  }
}

// libram exports withProperty/withChoice scoped setters but no withMacro —
// this mirrors grimoire's own combat-resolution mechanism (engine.js
// setCombat(): write a "[default]" macro entry to a CCS file, point
// customCombatScript at it, and cliExecute("ccs ...") to FORCE mafia to
// reparse — the reparse is load-bearing (grimoire.js:250-260 comment), a bare
// property write leaves the previous task's macro active) for the one-off
// dolphin-whistle fight in post(). Restoring the property alone on the way
// out is equally inert, so the restore also reparses back to grimoire's own
// CCS pointer before the next task's setCombat() runs.
const whistleCcsName = "subaqua_whistle";
function withMacro(macro: Macro, action: () => void): void {
  const priorCcs = get("customCombatScript");
  writeCcs(`[default]\n"${macro.toString()}"`, whistleCcsName);
  set("customCombatScript", whistleCcsName);
  cliExecute(`ccs ${whistleCcsName}`);
  try {
    action();
  } finally {
    set("customCombatScript", priorCcs);
    cliExecute(`ccs ${priorCcs}`);
  }
}

export class SubAquaEngine extends BaseEngine<CombatActions, Task> {
  constructor(tasks: Task[], options: EngineOptions<CombatActions, Task> = {}) {
    if (!options.combat_defaults) options.combat_defaults = new MyActionDefaults();
    super(tasks, options);
  }

  // Task-scoped combat-loss detection (post() below): _lastCombatLost is a
  // daily property that mafia flips to true on a lost combat and back to
  // false on the next WON one — it does NOT reset to false on its own, so it
  // can still read true long after the task that actually lost the fight.
  // Snapshotting these three values in prepare(), before this task has done
  // anything, lets post() tell "this task lost a fight" apart from "some
  // earlier task lost a fight and nothing has beaten it since."
  private preTaskCombatLost = false;
  private preTaskTurncount = 0;
  private preTaskLastEncounter = "";
  private preTaskCombatStarted = "";

  // NOTE deliberately no getNextTask() override: grimoire's available() honors
  // `after` dependencies and limit.skip; the old repo's override silently broke both.

  override destruct(): void {
    // Runs from main()'s finally on completion AND on abort, so the per-group
    // accounting table (lib/gold.ts) is the last thing printed either way.
    // Never let the report stand between an abort and super.destruct(): that
    // is what restores the CCS / choice properties the run overrode.
    try {
      reportLedger();
    } catch (e) {
      print(`run accounting failed: ${e}`, "red");
    }
    super.destruct();
  }

  override customize(
    task: Task,
    outfit: Outfit,
    combat: CombatStrategy<CombatActions>,
    resources: CombatResources<CombatActions>,
  ): void {
    // The peridot's menu (choice 1557) only ever offers monsters the zone is
    // CURRENTLY weighting nonzero (live bug: The Wreck of the Edgar
    // Fitzsimmons drops mine crab/unholy diver from the table outside its
    // ~20-turn hatch window, AreaCombatData.java:1950-1961 — a peridot stuck
    // on the diver there re-submits an unlisted choice forever, since KoL
    // just re-offers the same menu). peridotTargetOffered() is the same
    // conditional-weighting check the game applies, forced fresh every call
    // (see its doc comment) — gating the equip on it here means a target the
    // zone cannot currently produce never gets the slot, and `do()` below
    // never writes a `choiceAdventure1557` answer mafia can loop on.
    // Backup camera (resources/backup.ts): wear it and back up on round 1
    // when the last copyable monster is one this task wants. Prepended so it
    // runs ahead of the lasso throw and every task macro — the copy is what
    // the rest of the macro then sees. A peridot force is skipped on a
    // backup turn: the ash unequips the peridot before its backup corral
    // turn (UTS:1657), since the forced fight would only be overwritten.
    const backupSpec = undelay(task.backup);
    const backupTo = backupSpec ? backupTarget(backupSpec) : undefined;
    if (backupTo && outfit.equip(backupCamera)) {
      combat.startingMacro(openerOnce(backupMacro(backupTo), 1), true);
    }

    const peridotTarget = backupTo ? undefined : undelay(task.peridot);
    if (
      peridotTarget &&
      task.do instanceof Location &&
      !get("_perilLocations").split(",").includes(`${task.do.id}`) &&
      peridotTargetOffered(task.do, peridotTarget)
    ) {
      outfit.equip($item`Peridot of Peril`);
      setPeridotTargetId(peridotTarget);
    } else {
      outfit.equip({ avoid: $items`Peridot of Peril` });
      setPeridotTargetId(undefined);
    }

    // Train sea lasso once per fight (round 1 only): macros restart each round, and
    // tryItem only guards hascombatitem — sea lasso is limited per combat.
    // `!pastround 2`, not 1: KoL's `pastround N` is already true on round N
    // (see openerOnce()'s comment, combat.ts) — the old `pastround 1` guard
    // never fired, and lassoTrainingCount sat at 0 for the whole 2026-08-27
    // run. openerOnce(…, 1) is that exact guard.
    // Never at the wild seahorse: Tame Seahorse can now start while training
    // is still short (its reserve-math ready, corral.ts), and a lone lasso
    // thrown ahead of the cowbell protocol is the reserved tame lasso wasted
    // on a boss that shrugs it off.
    if (!undelay(task.freeaction) && isTrainingLasso() && isUnderwaterTask(task)) {
      // DELAYED, so the throw is decided after dress() rather than here: the
      // two pins below are best-effort and isTrainingLasso() only proves the
      // pieces are OWNED. Two things can still strip them — a task that
      // claimed the hat or pants slot itself (outfit.equip() then returns
      // false and says nothing), and the breathing block below (:607, :643),
      // which deliberately releases the pinned hat when every owned breather
      // lives in a pinned slot. Grimoire writes the CCS after dressing, so
      // haveEquipped() here reads the outfit actually worn.
      // Neither piece worn is the +1 rate the 2026-09-01 gear mandate exists
      // to prevent (outfit.ts isTrainingLasso), and a fight is the scarce
      // thing, not the lasso: skip the throw and keep the fight's lasso for a
      // geared one. Hat- or chaps-only (+2) still throws — that is exactly the
      // trade the breathing release makes on purpose.
      combat.startingMacro(() => {
        if (!haveEquipped($item`sea cowboy hat`) && !haveEquipped($item`sea chaps`)) {
          print(
            "Lasso training gear is not worn; skipping the round-1 throw (would be +1).",
            "red",
          );
          return new Macro();
        }
        return openerOnce(Macro.ifNot($monster`wild seahorse`, Macro.tryItem($item`sea lasso`)), 1);
      });
      outfit.equip($item`sea cowboy hat`);
      outfit.equip($item`sea chaps`);
    }

    // Bang-potion identification (ash CCS:485-495): throw the unidentified
    // potions on ordinary fights. AFTER the lasso opener in registration
    // order so the round-1 throw is never pushed out; never on a fight whose
    // whole point is a round-1 Force or free kill (those tasks declare
    // forceItems/killFree/yellowRay), and never on a free-action task.
    if (
      !undelay(task.freeaction) &&
      !combat.can("forceItems") &&
      !combat.can("killFree") &&
      !combat.can("yellowRay") &&
      unidentifiedBangPotions().length > 0
    ) {
      combat.startingMacro(Macro.ifNot(bangPotionNever, bangPotionMacro()));
    }

    // Default item familiar on +item tasks that left the familiar slot open
    // (B F2): without this the PREVIOUS task's familiar rides along — the
    // whole 08-30 B slice fought on the Patriotic Eagle and the rift gave
    // 2/11 pristine scales vs gold's 16/16. Placed before the underwater
    // enforcement below so the breather is fitted to the new familiar.
    // sneakFamiliar()/eagle/sword declarations all still win ($familiar.none
    // included — that is a task asking for NO familiar).
    if (
      outfit.familiar === undefined &&
      !undelay(task.freeaction) &&
      outfit.modifier.some((mod) => mod.includes("item"))
    ) {
      const itemFam = chooseItemFamiliar();
      if (itemFam !== $familiar.none) outfit.equip(itemFam);
    }

    super.customize(task, outfit, combat, resources);

    // Bat wings are banked (task.batWings): live 2026-08-28 an `initiative`
    // maximize wore them at the corral and burned four free fights on
    // tumbleweeds, costing two paid colosseum rounds and a paid Seaceress.
    if (!task.batWings && have($item`bat wings`)) outfit.equip({ avoid: [$item`bat wings`] });

    // Resolve abstract combat actions against the resource ladders (spec §2).
    // Anything unresolved falls through to MyActionDefaults' explicit
    // degradations — killFree still aborts by design when no source exists.
    //
    // THE ZERO-ACTION INVARIANT (combat.ts MyActionDefaults). A resource's `do`
    // REPLACES the action's default macro outright — grimoire compiles the
    // action as `resources.getMacro(action) ?? defaults[action](...)`
    // (combat.js:263-271), never both — and every `do` on these ladders is a
    // CONDITIONAL step (`if hasskill X`, `if hascombatitem Y`). A skill that is
    // not castable or an item that is not held therefore compiles to a macro
    // that takes no action at all, which is what KoL kills the fight over
    // ("N instructions executed without any actions being taken"). So each
    // provided macro carries its own fallback: fallbackMacro() for
    // banish/freeRun/forceItems/yellowRay (matching the degradations those
    // actions already have in MyActionDefaults), and an explicit abort for
    // killFree, whose default is likewise an abort.
    //
    // Every one of those fallbacks is DELAYED — `do: () => …` rather than a
    // built macro. customize() runs before dress() (grimoire engine.js:95-108),
    // but killMacro() reads live gear and effects (haveEquipped(Everfull Dart
    // Holster) picks the dart branch, and the openerOnce() round guard is sized
    // off it), so a macro built here would describe the PREVIOUS task's outfit.
    // grimoire undelays `resource.do` at compile time, after the outfit is on
    // (combat.js:412 getMacro -> undelay), which is the same point
    // MyActionDefaults' functions are evaluated at. The source half of each
    // macro stays eager: it is chosen from the outfit we are building right
    // here. killFree needs no delay either — its fallback is a constant abort.
    const location = task.do instanceof Location ? task.do : undefined;
    if (combat.can("banish")) {
      // Equip-gated ladder walk: provide only over gear that actually landed in
      // the outfit — a silently stripped equip would sell a gearless macro as a
      // banish — but keep walking rather than dropping the action entirely.
      const banisher = firstEquippable(outfit, (exclude) => pickBanishSource(location, exclude));
      if (banisher) {
        // The whole castable ladder, not just `banisher`: one compiled source
        // served every banish target of the task, and a second target in the
        // same fight (a waffle re-roll) or a source already out on another
        // monster left an inert `if hasskill` and a paid kill (gold-trace B
        // F1). banishChainMacro() is evaluated at compile time, after dress(),
        // so it sees exactly the gear that landed; `banisher` is what made
        // that gear land. If nothing is castable after all, fire the single
        // pick so the macro is never a bodyless `if`.
        const fallback = fallbackMacro({ fish: true });
        resources.provide("banish", {
          do: () => {
            const chain = banishChainMacro(location, { paid: true });
            const banish = chain.components.length > 0 ? chain : sourceMacro(banisher);
            return Macro.ifNot(freeMonsters, banish).step(fallback);
          },
        });
      }
    }
    if (combat.can("killFree")) {
      const source = selectFreeKill({ location });
      // Provide only if the gear actually landed in the outfit — a silently
      // stripped equip would sell a gearless macro as a free kill; failing
      // through to MyActionDefaults degrades loudly instead (killFree aborts).
      if (source && (source.equip === undefined || equipResource(outfit, source.equip))) {
        // The whole castable ladder behind the pick, not the pick alone — the
        // banish provide's reasoning above, for a sharper failure: the dart
        // bullseye leads this ladder and only lands ~25% of the time, so one
        // compiled rung meant three fights in four walked into the abort below
        // (live 2026-09-02, Flytrap Imprint). freeKillChain() is evaluated at
        // compile time, after dress(), so it sees exactly the gear that landed;
        // `source` is what made the pick's gear land, and it heads the chain
        // whenever it is still castable.
        //
        // `dropsMatter: true` on the chain: the pick was chosen deliberately,
        // but a rung APPENDED behind it must not quietly change the fight's
        // contract — groveling gravel forfeiting the flytrap pellet or the
        // cowboy's lasso is the fight's whole point thrown away.
        //
        // Macro.step() copies rather than mutating, so the shared ladder
        // entries are never appended to in place. The trailing abort keeps
        // killFree's "a task that requires a free kill must be given one"
        // semantics while making a ladder that fires nothing abort LOUDLY
        // instead of handing KoL an action-free macro.
        resources.provide("killFree", {
          prepare: source.prepare,
          do: () => {
            const chain = freeKillChain({ location, dropsMatter: true });
            const ladder = chain.includes(source) ? chain : [source, ...chain];
            return ladder.reduce((macro, rung) => macro.step(rung.do), new Macro()).abort();
          },
        });
      }
    }
    if (combat.can("freeRun")) {
      // THE FREE-RUN FAMILIAR RULE (user decision 2026-08-27) is GONE: one
      // unrestricted walk, and the Stomping Boots take the familiar slot only
      // when it is already FREE — grimoire's equipFamiliar refuses to
      // overwrite a set familiar (outfit.js:279-283), so a task that declared
      // sneakFamiliar() keeps it and firstEquippable() walks past the boots.
      //
      // That rule existed to EVICT the sneak familiar for the boots, on the
      // premise that they buy ~24 free runaways a day. Two corrections since:
      // the boots' free run is `runaway`, not the turn-taking Release the
      // Boots the ash casts (freerun.ts's note; user correction 2026-09-01),
      // and at this route's weights they are worth 5-6 runs, not 24 — gold
      // fielded 30 lb boots at its gymnasium, 6 runaways. Trading a zone-wide
      // -combat for six runs is not the trade the 2026-08-27 decision priced,
      // so the eviction is not reinstated on its own; the boots now pick up
      // the slot only where nothing else wants it.
      const banish = undelay(task.freeRunBanishes) === true;
      const source = firstEquippable(outfit, (exclude) =>
        selectFreeRun({ banish, location, exclude }),
      );
      if (source) {
        resources.provide("freeRun", {
          prepare: source.prepare,
          // Already-free fight (habitat/backup golem copies, crayon
          // wanderers, Kramco goblins, time cops — freeMonsters) never spends
          // a run source, banishing or not; it falls to the kill ladder and
          // keeps its drops.
          do: () =>
            Macro.ifNot(freeMonsters, Macro.step(source.do)).step(fallbackMacro({ fish: true })),
        });
      }
    }
    if (combat.can("yellowRay") || combat.can("forceItems")) {
      const action = combat.can("yellowRay") ? "yellowRay" : "forceItems";
      const purpose = task.saberPurpose ?? "free";
      // Diver/healer Forces guarantee specific quest drops (4 rivets + porthole
      // + helmet, iotm:185-199; prayerbeads + thingpouch, iotm:247-261), so for
      // those purposes the saber outranks the parka ray; otherwise ray first.
      const saberFirst = purpose === "diver" || purpose === "healer";
      const provideSaber = (): boolean => {
        if (action !== "forceItems") return false;
        if (!forceGranted(purpose, location)) return false;
        // Only provide if the saber actually equipped (equip-gated provides).
        if (!outfit.equip($item`Fourth of May Cosplay Saber`)) return false;
        this.propertyManager.setChoice(1387, 3);
        // Kill ladder behind the Force, per the zero-action invariant above:
        // an unequipped/spent saber would otherwise compile to `if hasskill Use
        // the Force; …; endif` and nothing else. forceItems already degrades to
        // killItem -> kill in MyActionDefaults, so the fallback is the same
        // fight either way.
        resources.provide("forceItems", {
          do: () => Macro.trySkill($skill`Use the Force`).step(fallbackMacro()),
        });
        return true;
      };
      const provideRay = (): boolean => {
        const ray = selectYellowRay();
        if (!ray) return false;
        if (ray.equip !== undefined && !equipResource(outfit, ray.equip)) return false;
        // Same fallback, same reason; Macro.step() copies the shared ladder
        // entry instead of appending to it in place.
        resources.provide(action, { do: () => Macro.step(ray.do).step(fallbackMacro()) });
        return true;
      };
      if (saberFirst) {
        if (!provideSaber()) provideRay();
      } else {
        if (!provideRay()) provideSaber();
      }
    }

    // Opportunistic free kills: upgrade a plain `kill` on a fight the ash would
    // have spent a free kill on. Modelled on loopstar's own upgrade
    // (loopstar engine.ts:512-522 + paths/sea/engine.ts:87-90, which provides
    // killFree and then replaceActions("kill" -> "killFree")); here the trigger
    // is the ash's own free_kill() call sites rather than "free kills are no
    // longer needed", and the free-kill step is APPENDED as a macro instead of
    // replacing the action — macros run ahead of every action, so the kill
    // ladder stays as the fallback when the source fails to end the fight,
    // while the task's own macros keep their place in front of it. The site
    // table and its CCS cites live in freeKillTargetDropsMatter()
    // (resources/freekill.ts).
    //
    // Out of scope by construction: killHard, and the Phase 4 adv1-filter
    // fights (Yog-Urt, Shub, the Center Door, the colosseum and gym rounds),
    // whose tasks declare no CombatStrategy at all — neither branch below can
    // see a monster or a default action for them.
    //
    // Policy rides entirely inside selectFreeKill(): freeKillMode is the real
    // limiter (high shiny is "dartsOnly", which is exactly the ash's own
    // high-shiny free_kill() — it still throws a dart, CCS:7-14), and dropSafe
    // keeps the drop-forfeiting sources off drop-mattering fights. No
    // conserveFreeFights gate: that policy banks the bat-wings/retro-cape free
    // FIGHTS, not the instakill ladder.
    {
      // Monsters this task handles with something OTHER than a plain kill. A
      // general macro runs ahead of every monster-specific ACTION (grimoire
      // combat.js compile order), so an unguarded general step would burn the
      // free kill on the monster we meant to banish, Force or run from.
      // De-duplicated: a monster can sit on an action list AND in
      // freeKillNever, and `!(monsterid 778 || monsterid 778)` is both noise
      // and a needless second predicate.
      const reserved = [
        ...new Set([
          ...combatActions
            .filter((action) => action !== "kill")
            .flatMap((action) => combat.where(action)),
          ...freeKillNever,
          // Fights that are already free — habitat/backup copies of the
          // golem, crayon wanderers, Kramco goblins, time cops (ash
          // free_monster(), G:72-76; backup.ts freeMonsters) — never earn a
          // free-kill charge: live 2026-08-28 five charges went to golems.
          ...freeMonsters,
        ]),
      ];
      const upgradeKill = (monster?: Monster): void => {
        const dropsMatter = freeKillTargetDropsMatter(location, monster);
        if (dropsMatter === undefined) return;
        const source = selectFreeKill({ location, target: monster, dropsMatter });
        // Equip-gated exactly like the killFree/freeRun provides above: gear
        // that didn't land means no free-kill step.
        if (!source) return;
        if (source.equip !== undefined && !equipResource(outfit, source.equip)) return;
        // ONE reserved monster is passed as a bare Monster, not as a
        // one-element array: libram's makeBALLSPredicate parenthesizes arrays
        // (`!(monsterid 778)`) and leaves a lone Monster bare (`!monsterid
        // 778`) (libram combat.js:298-306, 376-378). The parenthesized form is
        // fine — the live 2026-08-27 Outpost macro
        // `if !(monsterid 772 || monsterid 771 || monsterid 778);…` threw its
        // dart against a Mer-kin healer (session log:85117 + the fight at
        // :85161) — but the single-predicate group is a shape nothing in this
        // route has ever exercised, so emit the form KoL certainly parses.
        const step =
          monster === undefined && reserved.length > 0
            ? Macro.ifNot(reserved.length === 1 ? reserved[0] : reserved, source.do)
            : source.do;
        // Never hand grimoire an empty macro: an empty monster macro still
        // compiles to a bodyless `if monsterid …;endif;` block (combat.ts
        // monsterMacro() has the mechanism), and an empty general macro is
        // just dead weight.
        if (step.components.length === 0) return;
        // Appended, never prepended. grimoire compiles startingMacro -> monster macros ->
        // general macros -> monster actions -> general action (combat.js
        // :242-272), so appending still puts the free kill ahead of every
        // ACTION — the kill ladder stays the fallback — while leaving the
        // task's own declared macros in front of it. The ash free_kills LAST,
        // after the fight's real work: the eagle screech that banishes the
        // construct phylum (CCS:524-528), the library's scroll throws
        // (CCS:1026-1052), the sword imprint on the cowboy (CCS:1191-1193).
        // A prepend would end those fights before their macro ever ran.
        combat.macro(step, monster);
      };
      if (combat.getDefaultAction() === "kill") {
        upgradeKill();
      } else {
        for (const monster of combat.where("kill")) upgradeKill(monster);
      }
    }

    // Breathing enforcement (spec §2/§8: mafia REFUSES underwater zones rather than
    // equipping for you — this is where the script does it).
    if (isUnderwaterTask(task) && !hasBreathingEffect()) {
      const hasBreathingGearInOutfit = Array.from(outfit.equips.values()).some((it) =>
        waterBreathingEquipment.includes(it),
      );
      if (!hasBreathingGearInOutfit) {
        // The maximizer picks the breather (ash "sea" keyword, upstream
        // 42e796f): it forces the "Adventure Underwater" boolean
        // (Evaluator.java:396-404), so whichever free slot is cheapest takes
        // the gear instead of the script pinning one. It cannot CONJURE gear,
        // though, so the ownership check stays and throws exactly as before.
        const owned = preferredBreathingGear().filter((item) => have(item));
        if (owned.length === 0) throw `Unable to provide player water breathing for ${task.name}`;
        // Lasso training pins hat AND pants (sea cowboy hat + sea chaps,
        // above), and grimoire hands the maximizer `preventSlot` for every
        // slot it already filled (outfit.js:621-628) — so if every breather on
        // hand lives in a pinned slot the maximize has nowhere to put one and
        // fails outright. Release the pinned hat in that case, as the old
        // hard-equip path did; chaps alone still trains the lasso at +2/toss.
        // (No breathing piece is an accessory, so toSlot() is unambiguous
        // here.)
        const pinned = new Set(outfit.equips.keys());
        if (owned.every((item) => pinned.has(toSlot(item)))) {
          if (outfit.equips.get($slot`hat`) === $item`sea cowboy hat`) {
            outfit.equips.delete($slot`hat`);
          }
        }
        // "sea" masks BOTH Adventure Underwater and Underwater Familiar
        // (Evaluator.java:396-401) and getScore() fails any candidate whose
        // modifier set doesn't satisfy the whole mask (Evaluator.java:980-984).
        // Fielding NO familiar still satisfies the familiar half — modifiers.txt
        // :4832 is `Familiar\t(none)\tUnderwater Familiar`, and
        // lookupFamiliarModifiers adds the FAMILIAR-type modifiers
        // (Modifiers.java:1218) BEFORE its raceData == null early return
        // (:1228-1231) — so the gate below is NOT about an unsatisfiable mask.
        // It is about the switch: with `sea` in the objective the maximizer is
        // free to have emitSlot issue a `familiar X` command (Maximizer.java:
        // 1725-1742), and swapping the familiar out from under a DELIBERATE
        // $familiar.none trips grimoire's post-dress `myFamiliar() !==
        // this.familiar` verification. So the keyword goes in only when a real
        // familiar is coming out; otherwise keep the old hard-equip path.
        const fieldedFamiliar = outfit.familiar ?? myFamiliar();
        if (fieldedFamiliar !== $familiar.none) {
          // A lone `sea` objective scores every candidate 0, and the default
          // tiebreaker (Evaluator.java:133) outranks "prefer worn" in
          // MaximizerSpeculation.compareTo:164-186 — so without `-tie` a
          // bare-outfit task would re-dress every free slot to generic BiS on
          // each dress(). `-tie` zeroes the tiebreaker
          // (Evaluator.getTiebreaker, Evaluator.java:1022-1024), leaving
          // "prefer worn"/simplicity to decide, i.e. a minimal change. When
          // the outfit already carries a real objective, that objective is
          // the ranking and `-tie` would fight it.
          const keyword = seaKeyword();
          const noOtherObjective = outfit.modifier.length === 0;
          outfit.modifier.push(...keyword);
          if (keyword.length > 0 && noOtherObjective) outfit.modifier.push("-tie");
        } else {
          const breather = owned[0];
          if (!outfit.equip(breather)) {
            if (outfit.equips.get($slot`hat`) === $item`sea cowboy hat`) {
              outfit.equips.delete($slot`hat`);
            }
            if (!outfit.equip(breather)) {
              throw `Unable to provide player water breathing for ${task.name}`;
            }
          }
        }
      }

      // $familiar.none is a truthy Familiar whose `underwater` is false, so it
      // has to be excluded explicitly (same special case as outfit.ts's
      // requiredFamiliarBreather): fielding no familiar needs no breather, and
      // a famslot item set for a familiar that never comes out makes dress()
      // fail its post-equip verification.
      //
      // "sea" also forces the "Underwater Familiar" boolean, so this explicit
      // famequip set is belt-and-braces with the keyword above — kept because
      // it also covers the outfits that already carry breathing gear (and so
      // never push the keyword) and because it names the exact item.
      //
      // The FIELDED familiar, not just a declared one (live 2026-08-28, Farm
      // School: the outfit names no familiar and its crappy Mer-kin mask is a
      // breather, so neither this block nor the `sea` keyword ran; once
      // Driving Waterproofly lapsed the Peace Turkey kept its crystal ball
      // and mafia refused the zone 30 times — "Your familiar can't breathe
      // underwater"). With no declared familiar the current one stays out,
      // so a famslot breather set here is exactly what dress() will verify.
      const breathingFamiliar = outfit.familiar ?? myFamiliar();
      if (breathingFamiliar !== $familiar.none && !breathingFamiliar.underwater) {
        const famequip = outfit.equips.get($slot`familiar`) ?? $item.none;
        if (!familiarWaterBreathingEquipment.includes(famequip)) {
          const famBreather = familiarWaterBreathingEquipment.find((item) => have(item));
          if (!famBreather) throw `Unable to provide familiar water breathing for ${task.name}`;
          outfit.equips.set($slot`familiar`, famBreather);
        }
      }
    }
  }

  override prepare(task: Task): void {
    // Snapshot for post()'s task-scoped loss check — see the field comments
    // above. Must happen before anything below can trigger a fight.
    this.preTaskCombatLost = get("_lastCombatLost");
    this.preTaskTurncount = myTurncount();
    this.preTaskLastEncounter = get("lastEncounter");
    this.preTaskCombatStarted = get("_lastCombatStarted");

    // Fishy/Waterproofly upkeep before every underwater adventuring turn
    // (spec §2; ash restores at zero in post_adv UTS:811-843). Never from
    // post() — the ladder may eat, chew, or pull.
    if (isUnderwaterTask(task) && !undelay(task.freeaction)) {
      maintainWaterproofly();
      maintainFishy();
    }
    super.prepare(task);
  }

  override acquireEffects(task: Task): void {
    // MP before the mood (the garbo fork lib.ts:468-474 reserveMp). grimoire acquires a
    // task's effects BEFORE prepare() runs (engine.js:95 vs :108), so the 250
    // MP floor in recover() lands too late to pay for them — and ensureEffect
    // throws on a cast it cannot afford. MP is the one resource this run may
    // spend freely, so top up for exactly this list plus a nuke.
    const effects = undelay(task.effects, this.getContext(task)) ?? [];
    reserveMpFor(effects);

    // resolveWantedEffects (moods.ts) drops two kinds of entry from a task's
    // raw wanted list before anything is cast: (1) anything whose source
    // skill costs more MP than this account's max MP could ever hold (e.g. a
    // level-2 Sauceror against The Ballad of Richie Thingfinder's 50 MP), and
    // (2) anything the song cap can't fit (trimSongs' keep-last rule; every
    // list moods.ts exports is already trimmed, but task.effects can be set
    // to anything — Pellet/Garden Pellet sets it to the bare
    // itemDropEffects() return, no combineMoods() involved). (1) runs before
    // (2) so an unaffordable song can't spend a cap slot an affordable one
    // would otherwise keep. Desk check: level-2 Sauceror, max MP 40, wanted
    // [Polka, Fat Leon's, Donho's, Richie 50] with a 3-song cap — Richie is
    // dropped by (1) first, so (2) sees only 3 songs and drops none; without
    // the ordering, trimSongs would instead evict Polka (oldest of 4) and
    // leave Richie in the list to throw on the cast below.
    const { wanted, skipLines } = resolveWantedEffects(effects);
    if (effects.length > 0) {
      print(
        `Effects for ${task.name}: ${wanted.length > 0 ? wanted.map((effect) => `${effect}`).join(", ") : "(none)"}`,
        "blue",
      );
      for (const line of skipLines) print(line, "yellow");
    }

    // Reproduce grimoire's ContextualEngine.acquireEffects (engine.js:162-182)
    // by hand instead of delegating to super.acquireEffects(): buffs are
    // optional (user rule 2026-08-27), so a failed cast must never abort the
    // task it's decorating. Its "throw outright when the wanted songs alone
    // are over cap" branch is intentionally not reproduced — resolveWantedEffects
    // already guarantees `wanted` fits the cap, so that branch can never fire.
    // shrugForSongs() below IS its "shrug active songs the wanted list
    // doesn't want, down to the cap" loop, reused from moods.ts rather than
    // re-inlined (its own doc comment cites the same engine.js lines). The
    // only behavior actually changed from grimoire's loop is the cast itself:
    // wrapped in try/catch so a cast that still fails here — a song bumped
    // back over cap by the character's own mood, a daily limit raced by
    // something outside resolveWantedEffects' gates, etc. — prints a note and
    // lets the task continue instead of aborting the run.
    shrugForSongs(wanted);
    for (const effect of wanted) {
      const skill = toSkill(effect);
      if (!have(effect) && skill !== $skill.none && myMp() < mpCost(skill)) {
        // Skip rather than cast: ensureEffect would throw. Mirrors
        // applyEffects' own pre-check (moods.ts) — MP can still have drained
        // below the cast's cost between reserveMpFor() above and here (a
        // shrugForSongs shrug, an earlier cast in this same loop, etc.).
        print(`skipped ${effect}: needs ${mpCost(skill)} MP, have ${myMp()}`, "yellow");
        continue;
      }
      try {
        ensureEffect(effect);
      } catch (e) {
        // Fail-soft ONLY on libram's EnsureError: in mafia's JS runtime an
        // abort() is a catchable exception, and a blanket catch here would
        // print `failed <effect>` and carry the run right past it
        // (moods.ts isEnsureError).
        if (!isEnsureError(e)) throw e;
        print(`failed ${effect}: ${e} (${effectFailureContext(effect)})`, "yellow");
      }
    }
  }

  override createOutfit(task: Task): Outfit {
    // Strip gear/familiars the account doesn't own so Outfit.dress() can't throw
    // on aspirational equipment (salvaged from the old engine — its best part).
    const spec = undelay(task.outfit);
    if (spec === undefined) return new Outfit();

    if (spec instanceof Outfit) {
      const clone = spec.clone();
      for (const [slot, item] of Array.from(clone.equips.entries())) {
        if (!have(item) && item !== $item.none) {
          print(`Ignoring slot ${slot}: don't have ${item}`, "red");
          clone.equips.delete(slot);
        }
      }
      if (clone.familiar && !have(clone.familiar)) {
        print(`Ignoring familiar ${clone.familiar}: not in terrarium`, "red");
        clone.familiar = undefined;
      }
      return clone;
    }

    if (spec.familiar && !have(spec.familiar)) {
      print(`Ignoring familiar ${spec.familiar}: not in terrarium`, "red");
      spec.familiar = $familiar.none;
    }
    for (const slotName of outfitSlots) {
      const itemOrItems = spec[slotName];
      if (!itemOrItems) continue;
      if (itemOrItems instanceof Item) {
        if (!have(itemOrItems)) {
          print(`Ignoring slot ${slotName}: don't have ${itemOrItems}`, "red");
          spec[slotName] = undefined;
        }
      } else if (!itemOrItems.some((it) => have(it))) {
        print(
          `Ignoring slot ${slotName}: don't have ${itemOrItems.map((it) => it.name).join(", ")}`,
          "red",
        );
        spec[slotName] = undefined;
      }
    }
    if (spec.equip) spec.equip = spec.equip.filter((it) => have(it));
    if (spec.avoid) spec.avoid = spec.avoid.filter((it) => have(it));

    return Outfit.from(spec, new Error(`Failed to build outfit for ${task.name}`));
  }

  override dress(task: Task, outfit: Outfit): void {
    super.dress(task, outfit);
    // Last-chance: if the maximizer's result still can't breathe, force it and verify.
    if (isUnderwaterTask(task) && !booleanModifier("Adventure Underwater")) {
      const breather = preferredBreathingGear().find((item) => have(item) && canEquip(item));
      if (!breather) throw `Unable to equip player water breathing for ${task.name}`;
      equip(breather);
      if (!booleanModifier("Adventure Underwater")) {
        throw `Failed to establish underwater breathing for ${task.name}`;
      }
    }
    // Same last chance for the familiar half: mafia refuses the zone for a
    // non-aquatic familiar without a famslot breather (KoLAdventure.java:
    // 2867-2884) — nothing after dress() can put one on.
    if (
      isUnderwaterTask(task) &&
      myFamiliar() !== $familiar.none &&
      !booleanModifier("Underwater Familiar") &&
      !myFamiliar().underwater
    ) {
      const famBreather = familiarWaterBreathingEquipment.find((item) => have(item));
      if (!famBreather) throw `Unable to equip familiar water breathing for ${task.name}`;
      equip($slot`familiar`, famBreather);
      if (!booleanModifier("Underwater Familiar")) {
        throw `Failed to establish familiar underwater breathing for ${task.name}`;
      }
    }
  }

  override do(task: Task): void {
    const propertyManager = this.propertyManager;
    super.do({
      ...task,
      do: () => {
        const peridotTarget = undelay(task.peridot);
        // Same gate as customize(): never register a choiceAdventure1557
        // answer mafia can loop on resubmitting for a monster the zone is
        // not currently offering.
        if (
          peridotTarget &&
          haveEquipped($item`Peridot of Peril`) &&
          task.do instanceof Location &&
          peridotTargetOffered(task.do, peridotTarget)
        ) {
          propertyManager.setChoice(1557, `1&bandersnatch=${peridotTarget.id}`);
        }
        if (task.do instanceof Location) return task.do;
        return task.do();
      },
    });
    // Hard stop: if the peridot's menu still lands on 1557 with nothing
    // resolving it — no vetted engine answer above, and the choice.ts
    // fallback (standalone/choice.ts) also found no listed target to match —
    // surface it as a one-shot abort instead of a silent freeze. Live
    // evidence for the bug this guards against: a session log ending in
    // hundreds of repeated "Took choice 1557/1: <monster>" lines with no
    // progress, from mafia's own auto-choice resolver resubmitting a fixed,
    // unlisted answer forever.
    if (handlingChoice() && lastChoice() === 1557) {
      throw `Stuck in the Peridot of Peril's monster menu (choice 1557) after ${task.name}; the target isn't in the pull-down. Pick a listed monster in the relay browser, then rerun.`;
    }
  }

  override post(task: Task): void {
    super.post(task);
    // Per-group run accounting + gold guard (lib/gold.ts). Recorded before
    // any throw below so an aborted task still shows in the table; the pace
    // check itself runs after the Beaten Up cure so an abort never leaves
    // the character beaten up.
    const turnsSpent = myTurncount() - this.preTaskTurncount;
    recordTask(task.name, turnsSpent, fightHappened(this.preTaskCombatStarted));
    if (have($effect`Beaten Up`)) {
      // Cure first, judge second: uneffect unconditionally, before any throw,
      // so an abort below never leaves the character Beaten Up for whatever
      // runs (or doesn't) next.
      uneffect($effect`Beaten Up`);

      // Shub's encounter name — losing to him is a sanctioned retry path (spec §9).
      const shubLoss = get("lastEncounter").includes(
        "Sssshhsssblllrrggghsssssggggrrgglsssshhssslblgl",
      );

      // _lastCombatLost is a daily property (see prepare()'s field comments):
      // it stays true from the losing task all the way until the next WON
      // combat, so on its own it can't tell "this task just lost" apart from
      // "some earlier task lost and nothing has won since." Only throw when
      // the loss can be attributed to THIS task: either the flag was clean
      // when the task started (so this task is the one that dirtied it), or
      // a fight demonstrably happened during the task. "A fight happened"
      // needs its own gate, not just turncount/lastEncounter having moved:
      // lastEncounter is set for combats, choices, AND noncombats alike
      // (AdventureRequest.java:597), and a noncombat can also consume a
      // turn — so either clause can fire on a plain NC/choice with no fight
      // at all. Gate both on toMonster(lastEncounter) resolving to an actual
      // monster: a choice/NC name resolves to $monster.none, while a lost
      // fight always leaves lastEncounter as the monster's name. A free,
      // non-combat task (e.g. Init/Sea Jelly) or a task that only hits an
      // NC/choice trips neither clause, so a stale Beaten Up from an earlier
      // loss gets cured here without aborting the run.
      const currentEncounter = get("lastEncounter");
      const encounterIsMonster = toMonster(currentEncounter) !== $monster.none;
      const fightHappenedThisTask =
        encounterIsMonster &&
        (myTurncount() !== this.preTaskTurncount || currentEncounter !== this.preTaskLastEncounter);
      const combatLostDuringTask = !this.preTaskCombatLost || fightHappenedThisTask;
      if (get("_lastCombatLost") && !shubLoss && combatLostDuringTask) {
        throw `Lost a combat during ${task.name}; stopping.`;
      }
    }
    // Poison cure — the ash handles exactly one tier (UTS:763-764).
    if (have($effect`Really Quite Poisoned`)) uneffect($effect`Really Quite Poisoned`);

    // Bad-effect sweep, shrugs only (the garbo fork mood.ts:345-358 -> moods.ts
    // shrugBadEffects). Beaten Up and Really Quite Poisoned above STAY as they
    // are: both are deliberate ash parity (UTS:763-764) and neither is
    // shruggable. Everything else the sweep touches costs nothing but a
    // charsheet unbuff; the route's own Scarysauce is excluded so this does not
    // undo the next task's res mood. Anything left over is named here — once
    // per task, which is as often as this runs — rather than being cured with
    // an item.
    for (const stuck of shrugBadEffects(...routeDamageEffects)) {
      print(`Bad effect ${stuck} needs an item cure; leaving it (only shrugs are free).`, "red");
    }

    // Junk autosell: emergency meat only (UTS:773-777) — rough scales feed the
    // Madness Reef pristine conversion, so never sell above the meat floor.
    if (myMeat() < 300) {
      autosell(itemAmount($item`dull fish scale`), $item`dull fish scale`);
      autosell(itemAmount($item`rough fish scale`), $item`rough fish scale`);
    }

    // Dolphin whistle: reclaim stolen quest drops (UTS:761-762 + the targeted
    // sites UTS:2265/2282/2290/3010/3017, folded into one list). Corral drops
    // always; outpost drops per policy. Daily uses = seaPoints
    // (dailylimits.txt:361). Spec §2 assigns the whistle fight to post().
    // Only when the stolen item is the LAST one we had: the ash's monkeypaw()
    // whistles inside `while (available_amount(it) == 0)` (UTS:838-842), and
    // live 2026-08-27 the unconditional version spent a paid thief fight to
    // recover a lasso while nine were in stock (session log:94927). mafia
    // clears dolphinItem once the whistle is used (GenericRequest.java:2574),
    // so a later count of 0 cannot re-fire on a stale theft.
    const stolen = get("dolphinItem", $item.none);
    // Library clue items too: live 2026-08-28 a knucklebone and two
    // killscrolls were stolen un-whistled, each re-farmed at a paid turn.
    const alwaysWhistle = [
      ...$items`sea lasso, sea leather, sea cowbell, Mer-kin knucklebone, Mer-kin killscroll, Mer-kin healscroll, Mer-kin worktea`,
      // Hallpasses feed the cowl/rope superlikely while a piece is missing
      // (C F1: two stolen passes went un-whistled with a whistle in hand,
      // Y:8013/9427, each re-farmed the slow way). Scholar pieces satisfy a
      // slot the same way school.ts cowlAndRope() counts them.
      ...((availableAmount($item`Mer-kin facecowl`) === 0 &&
        availableAmount($item`Mer-kin scholar mask`) === 0) ||
      (availableAmount($item`Mer-kin waistrope`) === 0 &&
        availableAmount($item`Mer-kin scholar tailpiece`) === 0)
        ? $items`Mer-kin hallpass`
        : []),
    ];
    const outpostWhistle = $items`Mer-kin prayerbeads, rusty rivet`;
    if (
      have($item`durable dolphin whistle`) &&
      get("_durableDolphinWhistleUsed", 0) < get("seaPoints", 0) &&
      stolen !== $item.none &&
      itemAmount(stolen) === 0 &&
      (alwaysWhistle.includes(stolen) ||
        (currentPolicy().whistleOutpostDrops && outpostWhistle.includes(stolen)))
    ) {
      withMacro(killMacro(false), () => {
        use($item`durable dolphin whistle`);
        runCombat();
      });
    }

    // Zero-adventure pilsner diet (UTS:781-796); aborts with instructions when dry.
    emergencyDiet();

    // Dreadscroll seed narrowing (ash post_adv UTS:253-254): active exactly
    // between the seahorse tame and High Priesthood. Pure pref reads/writes —
    // candidateSeeds() gates its own one-time scan cost (seahorse name)
    // and cache-filters afterwards; no adventuring, per the hooks rule.
    if (get("seahorseName") !== "" && !get("isMerkinHighPriest")) {
      dreadSeedCheck();
    }

    // Gold guard LAST (lib/gold.ts): everything above — cures, shrugs, the
    // whistle, the diet, the seed narrowing — must still run on the turn that
    // trips it, so an abort here leaves nothing half-done for the restart.
    assertOnGoldPace(task.name, turnsSpent);
  }

  override setChoices(task: Task, manager: PropertiesManager): void {
    super.setChoices(task, manager);
    if (equippedAmount($item`June cleaver`) > 0) {
      manager.setChoices({
        1467: 3,
        1468: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1469: !have($effect`Yapping Pal`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1470: 2,
        1471: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1472: !have($item`trampled ticket stub`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1473: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1474: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1475: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
      });
    }
  }

  override initPropertiesManager(manager: PropertiesManager): void {
    super.initPropertiesManager(manager);
    // Choice 1387 (Use the Force) is globally option 3 — "drop your things" —
    // for the whole run, exactly like the ash (UTS:3695). This single value
    // resolves the Phase-2 flagged collision: customize()'s forceItems branch
    // and summon()'s stranded-choice handler re-assert the same value, so no
    // site can fight another. Every saber Force in this route is a drop-force.
    // Choice 1566 (Summon a Wave, opened by casting Sea *dent: Summon a Wave)
    // is globally option 1 — "Do it". Mafia stamps _seadentWaveZone and
    // _seadentWaveUsed only on decision 1 (ChoiceControl.java:6850-6858), and
    // that stamp is the whole point of the cast (shadow.ts riftPost()). The
    // task-scoped `choices` map that used to carry this died when the cast
    // moved into `post` (d10190d); live 2026-08-29: "Unsupported choice
    // adventure #1566" right after the Rufus Labyrinth.
    manager.setChoices({ 1387: 3, 1566: 1 });
    const bannedRestorers = [
      "sleep on your clan sofa",
      "rest in your campaway tent",
      "rest at the chateau",
      "rest at your campground",
      "free rest",
    ];
    // User rule 2026-08-27 — healing SKILLS are limited to Cannelloni Cocoon
    // and Tongue of the Walrus (the garbo fork/UTS use nothing else; UTS relies on
    // mafia's `recover hp` with the default list, which otherwise lets
    // restoreHp()/recover() cast Lasagna Bandages, Saucy Salve, Disco Power
    // Nap, etc.). "Is a skill" is resolved via libram's $skill.get (backed by
    // kolmafia's Skill.get/toSkill), not a hardcoded denylist, so any unusual
    // entry in the user's own pref list is still handled correctly: a pref
    // entry that resolves to a real skill is dropped unless it's on the
    // allow-list; item (non-skill) entries pass through untouched.
    const keepRestorer = (allowedSkills: ReadonlySet<string>) => (s: string) => {
      if (bannedRestorers.includes(s)) return false;
      return $skill.get(s) === null || allowedSkills.has(s.toLowerCase());
    };
    const allowedHpSkills = new Set(["cannelloni cocoon", "tongue of the walrus"]);
    const hpItems = get("hpAutoRecoveryItems")
      .split(";")
      .filter(keepRestorer(allowedHpSkills))
      .join(";");
    // No MP skill is on the allow-list (Cocoon/Walrus are both HP heals), so
    // every skill entry is dropped here; there normally are none in the MP
    // list, so this is a no-op today and only matters if one appears.
    const mpItems = Array.from(
      new Set([...get("mpAutoRecoveryItems").split(";"), "doc galaktik's invigorating tonic"]),
    )
      .filter(keepRestorer(new Set()))
      .join(";");
    manager.set({
      autoSatisfyWithCloset: false,
      // Spec §2: recovery is explicit restoreHp/restoreMp calls; auto-triggers off.
      hpAutoRecovery: -0.05,
      mpAutoRecovery: -0.05,
      maximizerCombinationLimit: 0,
      hpAutoRecoveryItems: hpItems,
      mpAutoRecoveryItems: mpItems,
      choiceAdventureScript: "subaqua_choice.js",
      // Rationale: with the user's own currentMood active, shrugging a song
      // we don't want (grimoire's ContextualEngine.acquireEffects shrug loop,
      // or moods.ts's shrugForSongs() for the applyEffects() path) does not
      // stick — the user's mood re-casts it from its own gain_effect/
      // lose_effect triggers, so the next ensureEffect in the same cast pass
      // can find no song slot and throw. (The live 2026-08-27 "Failed to
      // ensure The Ballad of Richie Thingfinder!" spam was first read as that
      // race; it was not — Richie is a Hobopolis AT song and mafia refuses to
      // cast it for a non-Accordion-Thief, moods.ts hoboSongCastable(). The
      // mood ownership argument below stands on its own.)
      // "apathetic" is mafia's reserved no-op mood
      // name, so this makes our own effects/moods lists (moods.ts) the sole
      // buff owner for the run — the ash's own mood() was always a
      // hand-rolled caster, never mafia moods, so this is parity, not a
      // behavior change. Managed like every other property here: restored
      // on exit.
      currentMood: "apathetic",
    });
  }
}
