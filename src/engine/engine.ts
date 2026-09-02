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

function fallbackMacro(options: { fish?: boolean } = {}): Macro {
  return options.fish ? fishMacro().step(killMacro(false)) : killMacro(false);
}

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
  constructor(tasks: Task[], options: EngineOptions<CombatActions, void, Task> = {}) {
    if (!options.combat_defaults) options.combat_defaults = new MyActionDefaults();
    super(tasks, options);
  }

  private preTaskCombatLost = false;
  private preTaskTurncount = 0;
  private preTaskLastEncounter = "";
  private preTaskCombatStarted = "";

  override destruct(): void {
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

    if (!undelay(task.freeaction) && isTrainingLasso() && isUnderwaterTask(task)) {
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

    if (
      !undelay(task.freeaction) &&
      !combat.can("forceItems") &&
      !combat.can("killFree") &&
      !combat.can("yellowRay") &&
      unidentifiedBangPotions().length > 0
    ) {
      combat.startingMacro(Macro.ifNot(bangPotionNever, bangPotionMacro()));
    }

    if (
      outfit.familiar === undefined &&
      !undelay(task.freeaction) &&
      outfit.modifier.some((mod) => mod.includes("item"))
    ) {
      const itemFam = chooseItemFamiliar();
      if (itemFam !== $familiar.none) outfit.equip(itemFam);
    }

    super.customize(task, outfit, combat, resources);

    if (!task.batWings && have($item`bat wings`)) outfit.equip({ avoid: [$item`bat wings`] });

    const location = task.do instanceof Location ? task.do : undefined;
    if (combat.can("banish")) {
      const banisher = firstEquippable(outfit, (exclude) => pickBanishSource(location, exclude));
      if (banisher) {
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
      if (source && (source.equip === undefined || equipResource(outfit, source.equip))) {
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
      const banish = undelay(task.freeRunBanishes) === true;
      const source = firstEquippable(outfit, (exclude) =>
        selectFreeRun({ banish, location, exclude }),
      );
      if (source) {
        resources.provide("freeRun", {
          prepare: source.prepare,
          do: () =>
            Macro.ifNot(freeMonsters, Macro.step(source.do)).step(fallbackMacro({ fish: true })),
        });
      }
    }
    if (combat.can("yellowRay") || combat.can("forceItems")) {
      const action = combat.can("yellowRay") ? "yellowRay" : "forceItems";
      const purpose = task.saberPurpose ?? "free";
      const saberFirst = purpose === "diver" || purpose === "healer";
      const provideSaber = (): boolean => {
        if (action !== "forceItems") return false;
        if (!forceGranted(purpose, location)) return false;
        if (!outfit.equip($item`Fourth of May Cosplay Saber`)) return false;
        this.propertyManager.setChoice(1387, 3);
        resources.provide("forceItems", {
          do: () => Macro.trySkill($skill`Use the Force`).step(fallbackMacro()),
        });
        return true;
      };
      const provideRay = (): boolean => {
        const ray = selectYellowRay();
        if (!ray) return false;
        if (ray.equip !== undefined && !equipResource(outfit, ray.equip)) return false;
        resources.provide(action, { do: () => Macro.step(ray.do).step(fallbackMacro()) });
        return true;
      };
      if (saberFirst) {
        if (!provideSaber()) provideRay();
      } else {
        if (!provideRay()) provideSaber();
      }
    }

    {
      const reserved = [
        ...new Set([
          ...combatActions
            .filter((action) => action !== "kill")
            .flatMap((action) => combat.where(action)),
          ...freeKillNever,
          ...freeMonsters,
        ]),
      ];
      const upgradeKill = (monster?: Monster): void => {
        const dropsMatter = freeKillTargetDropsMatter(location, monster);
        if (dropsMatter === undefined) return;
        const source = selectFreeKill({ location, target: monster, dropsMatter });
        if (!source) return;
        if (source.equip !== undefined && !equipResource(outfit, source.equip)) return;
        const step =
          monster === undefined && reserved.length > 0
            ? Macro.ifNot(reserved.length === 1 ? reserved[0] : reserved, source.do)
            : source.do;
        if (step.components.length === 0) return;
        combat.macro(step, monster);
      };
      if (combat.getDefaultAction() === "kill") {
        upgradeKill();
      } else {
        for (const monster of combat.where("kill")) upgradeKill(monster);
      }
    }

    if (isUnderwaterTask(task) && !hasBreathingEffect()) {
      const hasBreathingGearInOutfit = Array.from(outfit.equips.values()).some((it) =>
        waterBreathingEquipment.includes(it),
      );
      if (!hasBreathingGearInOutfit) {
        const owned = preferredBreathingGear().filter((item) => have(item));
        if (owned.length === 0) throw `Unable to provide player water breathing for ${task.name}`;
        const pinned = new Set(outfit.equips.keys());
        if (owned.every((item) => pinned.has(toSlot(item)))) {
          if (outfit.equips.get($slot`hat`) === $item`sea cowboy hat`) {
            outfit.equips.delete($slot`hat`);
          }
        }
        const fieldedFamiliar = outfit.familiar ?? myFamiliar();
        if (fieldedFamiliar !== $familiar.none) {
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
    this.preTaskCombatLost = get("_lastCombatLost");
    this.preTaskTurncount = myTurncount();
    this.preTaskLastEncounter = get("lastEncounter");
    this.preTaskCombatStarted = get("_lastCombatStarted");

    if (isUnderwaterTask(task) && !undelay(task.freeaction)) {
      maintainWaterproofly();
      maintainFishy();
    }
    super.prepare(task);
  }

  override acquireEffects(task: Task): void {
    const effects = undelay(task.effects, this.getContext(task)) ?? [];
    reserveMpFor(effects);

    const { wanted, skipLines } = resolveWantedEffects(effects);
    if (effects.length > 0) {
      print(
        `Effects for ${task.name}: ${wanted.length > 0 ? wanted.map((effect) => `${effect}`).join(", ") : "(none)"}`,
        "blue",
      );
      for (const line of skipLines) print(line, "yellow");
    }

    shrugForSongs(wanted);
    for (const effect of wanted) {
      const skill = toSkill(effect);
      if (!have(effect) && skill !== $skill.none && myMp() < mpCost(skill)) {
        print(`skipped ${effect}: needs ${mpCost(skill)} MP, have ${myMp()}`, "yellow");
        continue;
      }
      try {
        ensureEffect(effect);
      } catch (e) {
        if (!isEnsureError(e)) throw e;
        print(`failed ${effect}: ${e} (${effectFailureContext(effect)})`, "yellow");
      }
    }
  }

  override createOutfit(task: Task): Outfit {
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
    if (isUnderwaterTask(task) && !booleanModifier("Adventure Underwater")) {
      const breather = preferredBreathingGear().find((item) => have(item) && canEquip(item));
      if (!breather) throw `Unable to equip player water breathing for ${task.name}`;
      equip(breather);
      if (!booleanModifier("Adventure Underwater")) {
        throw `Failed to establish underwater breathing for ${task.name}`;
      }
    }
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
    if (handlingChoice() && lastChoice() === 1557) {
      throw `Stuck in the Peridot of Peril's monster menu (choice 1557) after ${task.name}; the target isn't in the pull-down. Pick a listed monster in the relay browser, then rerun.`;
    }
  }

  override post(task: Task): void {
    super.post(task);
    const turnsSpent = myTurncount() - this.preTaskTurncount;
    recordTask(task.name, turnsSpent, fightHappened(this.preTaskCombatStarted));
    if (have($effect`Beaten Up`)) {
      uneffect($effect`Beaten Up`);

      const shubLoss = get("lastEncounter").includes(
        "Sssshhsssblllrrggghsssssggggrrgglsssshhssslblgl",
      );

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
    if (have($effect`Really Quite Poisoned`)) uneffect($effect`Really Quite Poisoned`);

    for (const stuck of shrugBadEffects(...routeDamageEffects)) {
      print(`Bad effect ${stuck} needs an item cure; leaving it (only shrugs are free).`, "red");
    }

    if (myMeat() < 300) {
      autosell(itemAmount($item`dull fish scale`), $item`dull fish scale`);
      autosell(itemAmount($item`rough fish scale`), $item`rough fish scale`);
    }

    const stolen = get("dolphinItem", $item.none);
    const alwaysWhistle = [
      ...$items`sea lasso, sea leather, sea cowbell, Mer-kin knucklebone, Mer-kin killscroll, Mer-kin healscroll, Mer-kin worktea`,
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

    emergencyDiet();

    if (get("seahorseName") !== "" && !get("isMerkinHighPriest")) {
      dreadSeedCheck();
    }

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
    manager.setChoices({ 1387: 3, 1566: 1 });
    const bannedRestorers = [
      "sleep on your clan sofa",
      "rest in your campaway tent",
      "rest at the chateau",
      "rest at your campground",
      "free rest",
    ];
    const keepRestorer = (allowedSkills: ReadonlySet<string>) => (s: string) => {
      if (bannedRestorers.includes(s)) return false;
      return $skill.get(s) === null || allowedSkills.has(s.toLowerCase());
    };
    const allowedHpSkills = new Set(["cannelloni cocoon", "tongue of the walrus"]);
    const hpItems = get("hpAutoRecoveryItems")
      .split(";")
      .filter(keepRestorer(allowedHpSkills))
      .join(";");
    const mpItems = Array.from(
      new Set([...get("mpAutoRecoveryItems").split(";"), "doc galaktik's invigorating tonic"]),
    )
      .filter(keepRestorer(new Set()))
      .join(";");
    manager.set({
      autoSatisfyWithCloset: false,
      hpAutoRecovery: -0.05,
      mpAutoRecovery: -0.05,
      maximizerCombinationLimit: 0,
      hpAutoRecoveryItems: hpItems,
      mpAutoRecoveryItems: mpItems,
      choiceAdventureScript: "subaqua_choice.js",
      currentMood: "apathetic",
    });
  }
}
