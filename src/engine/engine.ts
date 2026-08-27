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
  booleanModifier,
  canEquip,
  cliExecute,
  equip,
  equippedAmount,
  Familiar,
  haveEquipped,
  Item,
  itemAmount,
  Location,
  Monster,
  myFamiliar,
  myMeat,
  myTurncount,
  print,
  runCombat,
  Skill,
  toMonster,
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
  get,
  have,
  Macro,
  PropertiesManager,
  set,
  undelay,
  uneffect,
} from "libram";

import { dreadSeedCheck } from "../lib/dreadscroll";
import { reserveMpFor, routeDamageEffects, shrugBadEffects, trimSongs } from "../lib/moods";
import { pickBanishSource } from "../resources/banish";
import { emergencyDiet, maintainFishy, maintainWaterproofly } from "../resources/fishy";
import {
  freeKillNever,
  freeKillTargetDropsMatter,
  selectFreeKill,
  selectYellowRay,
} from "../resources/freekill";
import { selectFreeRun } from "../resources/freerun";
import { currentPolicy } from "../resources/policy";
import { forceGranted } from "../resources/saber";

import { CombatActions, combatActions, killMacro, MyActionDefaults } from "./combat";
import {
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

  // NOTE deliberately no getNextTask() override: grimoire's available() honors
  // `after` dependencies and limit.skip; the old repo's override silently broke both.

  override customize(
    task: Task,
    outfit: Outfit,
    combat: CombatStrategy<CombatActions>,
    resources: CombatResources<CombatActions>,
  ): void {
    const peridotTarget = undelay(task.peridot);
    if (
      peridotTarget &&
      task.do instanceof Location &&
      !get("_perilLocations").split(",").includes(`${task.do.id}`)
    ) {
      outfit.equip($item`Peridot of Peril`);
    } else {
      outfit.equip({ avoid: $items`Peridot of Peril` });
    }

    // Train sea lasso once per fight (round 1 only): macros restart each round, and
    // tryItem only guards hascombatitem — sea lasso is limited per combat.
    if (!undelay(task.freeaction) && isTrainingLasso() && isUnderwaterTask(task)) {
      combat.startingMacro(Macro.ifNot("pastround 1", Macro.tryItem($item`sea lasso`)));
      outfit.equip($item`sea cowboy hat`);
      outfit.equip($item`sea chaps`);
    }

    super.customize(task, outfit, combat, resources);

    // Resolve abstract combat actions against the resource ladders (spec §2).
    // Anything unresolved falls through to MyActionDefaults' explicit
    // degradations — killFree still aborts by design when no source exists.
    const location = task.do instanceof Location ? task.do : undefined;
    if (combat.can("banish")) {
      const banisher = pickBanishSource(location);
      if (banisher) {
        // Provide only if the gear actually landed in the outfit — a silently
        // stripped equip would sell a gearless macro as a banish; failing
        // through to MyActionDefaults degrades loudly instead.
        const equipped = banisher.equip ? outfit.equip(banisher.equip) : true;
        if (equipped) {
          if (banisher.skill instanceof Skill) {
            resources.provide("banish", { do: Macro.trySkill(banisher.skill) });
          } else {
            resources.provide("banish", { do: Macro.tryItem(banisher.skill) });
          }
        }
      }
    }
    if (combat.can("killFree")) {
      const source = selectFreeKill({ location });
      // Provide only if the gear actually landed in the outfit — a silently
      // stripped equip would sell a gearless macro as a free kill; failing
      // through to MyActionDefaults degrades loudly instead (killFree aborts).
      if (source && (source.equip === undefined || equipResource(outfit, source.equip))) {
        resources.provide("killFree", { prepare: source.prepare, do: source.do });
      }
    }
    if (combat.can("freeRun")) {
      const source = selectFreeRun({ location });
      // Same gating as killFree: don't provide a run macro over gear that
      // didn't equip.
      if (source && (source.equip === undefined || equipResource(outfit, source.equip))) {
        resources.provide("freeRun", { prepare: source.prepare, do: source.do });
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
        resources.provide("forceItems", { do: Macro.trySkill($skill`Use the Force`) });
        return true;
      };
      const provideRay = (): boolean => {
        const ray = selectYellowRay();
        if (!ray) return false;
        if (ray.equip !== undefined && !equipResource(outfit, ray.equip)) return false;
        resources.provide(action, { do: ray.do });
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
      const reserved = [
        ...combatActions
          .filter((action) => action !== "kill")
          .flatMap((action) => combat.where(action)),
        ...freeKillNever,
      ];
      const upgradeKill = (monster?: Monster): void => {
        const dropsMatter = freeKillTargetDropsMatter(location, monster);
        if (dropsMatter === undefined) return;
        const source = selectFreeKill({ location, target: monster, dropsMatter });
        // Equip-gated exactly like the killFree/freeRun provides above: gear
        // that didn't land means no free-kill step.
        if (!source) return;
        if (source.equip !== undefined && !equipResource(outfit, source.equip)) return;
        const step =
          monster === undefined && reserved.length > 0
            ? Macro.ifNot(reserved, source.do)
            : source.do;
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
      if (outfit.familiar && outfit.familiar !== $familiar.none && !outfit.familiar.underwater) {
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
    // Single choke point for the song cap. Every list moods.ts exports is
    // already trimmed, but task.effects can be set to anything — Pellet/
    // Garden Pellet sets it to the bare itemDropEffects() return, no
    // combineMoods() involved — so trim again here regardless of what built
    // the list. Without this, grimoire's own acquireEffects (engine.js:162-
    // 181) either throws "Too many AT songs" outright (songs.length over cap)
    // or, as it did live, casts every wanted song up to the cap and then
    // throws an Ensure Error on the one that doesn't fit (it only shrugs
    // ALREADY-ACTIVE songs the list doesn't want; it never trims the wanted
    // list itself). Passing the trimmed list via a wrapped task rather than
    // reimplementing the ensure loop, since super.acquireEffects(task) only
    // reads task.effects and the context.
    super.acquireEffects({ ...task, effects: trimSongs(effects) });
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
  }

  override do(task: Task): void {
    const propertyManager = this.propertyManager;
    super.do({
      ...task,
      do: () => {
        const peridotTarget = undelay(task.peridot);
        if (peridotTarget && haveEquipped($item`Peridot of Peril`)) {
          propertyManager.setChoice(1557, `1&bandersnatch=${peridotTarget.id}`);
        }
        if (task.do instanceof Location) return task.do;
        return task.do();
      },
    });
  }

  override post(task: Task): void {
    super.post(task);
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
    const stolen = get("dolphinItem", $item.none);
    const alwaysWhistle = $items`sea lasso, sea leather, sea cowbell`;
    const outpostWhistle = $items`Mer-kin prayerbeads, rusty rivet`;
    if (
      have($item`durable dolphin whistle`) &&
      get("_durableDolphinWhistleUsed", 0) < get("seaPoints", 0) &&
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
    // candidateSeeds() gates its own one-time scan cost (>= 2 clues + name)
    // and cache-filters afterwards; no adventuring, per the hooks rule.
    if (get("seahorseName") !== "" && !get("isMerkinHighPriest")) {
      dreadSeedCheck();
    }
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
    manager.setChoices({ 1387: 3 });
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
      // Live case: with the user's own currentMood active, shrugging a song
      // we don't want (grimoire's ContextualEngine.acquireEffects shrug loop,
      // or moods.ts's shrugForSongs() for the applyEffects() path) didn't
      // stick — the user's mood immediately re-cast it via its own
      // gain_effect/lose_effect triggers, so the next ensureEffect in the
      // same cast pass had no song slot and threw ("Failed to ensure The
      // Ballad of Richie Thingfinder!" with Polka/Fat Leon's/Donho's already
      // up at the 3-song cap). "apathetic" is mafia's reserved no-op mood
      // name, so this makes our own effects/moods lists (moods.ts) the sole
      // buff owner for the run — the ash's own mood() was always a
      // hand-rolled caster, never mafia moods, so this is parity, not a
      // behavior change. Managed like every other property here: restored
      // on exit.
      currentMood: "apathetic",
    });
  }
}
