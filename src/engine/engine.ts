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
  booleanModifier,
  canEquip,
  equip,
  equippedAmount,
  Familiar,
  haveEquipped,
  Item,
  Location,
  print,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $skill,
  $slot,
  get,
  have,
  Macro,
  PropertiesManager,
  undelay,
  uneffect,
} from "libram";

import { pickBanishSource } from "../resources/banish";
import { selectFreeKill, selectYellowRay } from "../resources/freekill";
import { selectFreeRun } from "../resources/freerun";
import { forceGranted, saberAllowedAt } from "../resources/saber";

import { CombatActions, MyActionDefaults } from "./combat";
import {
  familiarWaterBreathingEquipment,
  hasBreathingEffect,
  preferredBreathingGear,
  isTrainingLasso,
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

export class SubAquaEngine extends BaseEngine<CombatActions, Task> {
  constructor(tasks: Task[], options: EngineOptions<CombatActions, Task> = {}) {
    if (!options.combat_defaults) options.combat_defaults = new MyActionDefaults();
    super(tasks, options);
  }

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
          resources.provide("banish", { do: Macro.trySkill(banisher.skill) });
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
      const ray = selectYellowRay();
      if (ray) {
        if (ray.equip === undefined || equipResource(outfit, ray.equip)) {
          resources.provide(action, { do: ray.do });
        }
      } else if (
        action === "forceItems" &&
        (!location || saberAllowedAt(location)) &&
        forceGranted("free", location)
      ) {
        // Saber force-drop: choice 1387 option 3 drops the yellow-ray items.
        // Only set the choice and provide if the saber actually equipped.
        if (outfit.equip($item`Fourth of May Cosplay Saber`)) {
          this.propertyManager.setChoice(1387, 3);
          resources.provide("forceItems", { do: Macro.trySkill($skill`Use the Force`) });
        }
      }
    }

    // Breathing enforcement (spec §2/§8: mafia REFUSES underwater zones rather than
    // equipping for you — this is where the script does it).
    if (isUnderwaterTask(task) && !hasBreathingEffect()) {
      const hasBreathingGearInOutfit = Array.from(outfit.equips.values()).some((it) =>
        waterBreathingEquipment.includes(it),
      );
      if (!hasBreathingGearInOutfit) {
        const breather = preferredBreathingGear().find((item) => have(item));
        if (!breather) throw `Unable to provide player water breathing for ${task.name}`;
        outfit.equip(breather);
      }

      if (outfit.familiar && !outfit.familiar.underwater) {
        const famequip = outfit.equips.get($slot`familiar`) ?? $item.none;
        if (!familiarWaterBreathingEquipment.includes(famequip)) {
          const famBreather = familiarWaterBreathingEquipment.find((item) => have(item));
          if (!famBreather) throw `Unable to provide familiar water breathing for ${task.name}`;
          outfit.equips.set($slot`familiar`, famBreather);
        }
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
      // Shub's encounter name — losing to him is a sanctioned retry path (spec §9).
      const shubLoss = get("lastEncounter").includes(
        "Sssshhsssblllrrggghsssssggggrrgglsssshhssslblgl",
      );
      if (get("_lastCombatLost") && !shubLoss) throw `Lost a combat during ${task.name}; stopping.`;
      uneffect($effect`Beaten Up`);
    }
  }

  override setChoices(task: Task, manager: PropertiesManager): void {
    super.setChoices(task, manager);
    // Outpost stashbox rotation: bounded, one pref, owned by the script (spec §8:
    // mafia tracks nothing for 313-315). Choice 312 is NOT set here — mafia
    // auto-writes choiceAdventure312 from the lockkey drop; the choice script
    // falls back if it's unset.
    manager.setChoices({ 315: (get("_subaqua_outpost_choices", 0) % 3) + 1 });
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
    const bannedRestorers = [
      "sleep on your clan sofa",
      "rest in your campaway tent",
      "rest at the chateau",
      "rest at your campground",
      "free rest",
    ];
    const hpItems = get("hpAutoRecoveryItems")
      .split(";")
      .filter((s) => !bannedRestorers.includes(s))
      .join(";");
    const mpItems = Array.from(
      new Set([...get("mpAutoRecoveryItems").split(";"), "doc galaktik's invigorating tonic"]),
    )
      .filter((s) => !bannedRestorers.includes(s))
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
    });
  }
}
