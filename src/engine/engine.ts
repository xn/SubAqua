import {
  Engine as BaseEngine,
  CombatResources,
  CombatStrategy,
  EngineOptions,
  Outfit,
  outfitSlots,
} from "grimoire-kolmafia";
import {
  canEquip,
  booleanModifier,
  equippedAmount,
  equip,
  haveEquipped,
  Item,
  itemAmount,
  Location,
  myFullness,
  myHp,
  myInebriety,
  myMaxhp,
  mySpleenUse,
  print,
  toInt,
  toItem,
  totalFreeRests,
  useSkill,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
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

import { familiarWaterBreathingEquipment, waterBreathingEquipment } from "../tasks/seaworthy";

import { CombatActions, MyActionDefaults } from "./combat";
import { Task } from "./task";

export class trackedResource {
  resource: string | Item;
  name: string;
  maxUses?: number;

  constructor(resource: string | Item, name: string, maxUses?: number) {
    this.resource = resource;
    this.name = name;
    if (maxUses) this.maxUses = maxUses;
  }
}

export const freeBanishResources: trackedResource[] = [
  new trackedResource("_feelHatredUsed", "Feel Hatred", 3),
  new trackedResource("_reflexHammerUsed", "Reflex Hammer", 3),
  new trackedResource("_latteRefillsUsed", "Latte Refills", 3),
  new trackedResource("_kgbTranquilizerDartUses", "KGB Tranquilizers", 3),
  new trackedResource("_snokebombUsed", "Snokebomb", 3),
];

export const freeKillResources: trackedResource[] = [
  new trackedResource("_chestXRayUsed", "Chest X-Ray", 3),
  new trackedResource("_shatteringPunchUsed", "Shattering Punch", 3),
  new trackedResource("_gingerbreadMobHitUsed", "Gingerbread Mob Hit", 1),
  new trackedResource("_missileLauncherUsed", "Missile Launcher", 1),
  new trackedResource("_CSParkaYRUsed", "Parka YR"),
];

export const notableSkillResources: trackedResource[] = [
  new trackedResource("_saberForceUses", "Saber Forces", 5),
  new trackedResource("_monstersMapped", "Monsters Mapped", 3),
  new trackedResource("_feelEnvyUsed", "Feel Envy", 3),
  new trackedResource("_sourceTerminalDigitizeUses", "Digitize", 3),
  new trackedResource("_sourceTerminalPortscanUses", "Portscan", 3),
  new trackedResource("_sourceTerminalEnhanceUses", "Source Terminal Enhances", 3),
  new trackedResource("_sourceTerminalDuplicateUses", "Duplicate", 1),
];

export const freeFightResources: trackedResource[] = [
  new trackedResource("_shadowAffinityToday", "Shadow Rift", 11),
  new trackedResource("_snojoFreeFights", "Snojo", 10),
  new trackedResource("_neverendingPartyFreeTurns", "NEP", 10),
  new trackedResource("_witchessFights", "Witchess", 5),
  new trackedResource("_machineTunnelsAdv", "DMT", 5),
  new trackedResource("_loveTunnelUsed", "LOV Tunnel", 3),
  new trackedResource("_voteFreeFights", "Voters", 3),
  new trackedResource("_godLobsterFights", "God Lobster", 3),
  new trackedResource("_speakeasyFreeFights", "Oliver's Place", 3),
  new trackedResource("_eldritchHorrorEvoked", "Eldritch Tentacle", 1),
  new trackedResource("_cyberZone1Turns", "Cyber Zone 1", 10),
  new trackedResource("_sausageFights", "Sausage Goblins"),
];

export const potentiallyFreeFightResources: trackedResource[] = [
  new trackedResource("_backUpUses", "Backup Camera", 11),
  new trackedResource("_locketMonstersFought", "Locket Reminisces", 3),
  new trackedResource("_photocopyUsed", "Fax Machine", 1),
  new trackedResource("_chateauMonsterFought", "Chateau Painting", 1),
];

export const farmingResourceResources: trackedResource[] = [
  new trackedResource("_powerfulGloveBatteryPowerUsed", "Powerful Glove Charges", 100),
  new trackedResource("_cinchUsed", "Cinch", 100),
  new trackedResource("_kgbClicksUsed", "KGB Clicks", 22),
  new trackedResource("_deckCardsDrawn", "Deck Draws", 15),
  new trackedResource("_macrometeoriteUses", "Macrometeorites", 10),
  new trackedResource("_AAABatteriesUsed", "Batteries (AAA)", 7),
  new trackedResource("_augSkillsCasts", "August Scepter Charges", 5),
  new trackedResource("_monkeyPawWishesUsed", "Monkey Paw Wishes", 5),
  new trackedResource("tomeSummons", "Tome Summons", 3),
  new trackedResource($item`pocket wish`, "Genie Wishes", 3),
  new trackedResource("_pottedTeaTreeUsed", "Tea Tree", 3),
  new trackedResource($item`peppermint sprout`, "Peppermint Sprout", 3),
  new trackedResource("_monsterHabitatsRecalled", "Monster Habitats", 3),
  new trackedResource("_favoriteBirdVisited", "Favorite Bird", 1),
  new trackedResource("_clanFortuneBuffUsed", "Zatara Consult", 1),
  new trackedResource("_floundryItemCreated", "Clan Floundry", 1),
  new trackedResource("_gingerbreadCityNoonCompleted", "GingerbreadCity Noon", 1),
  new trackedResource("_gingerbreadCityMidnightCompleted", "GingerbreadCity Midnight", 1),
  new trackedResource("_pantogramModifier", "Pantogram", 1),
  new trackedResource("_cargoPocketEmptied", "Cargo Shorts", 1),
  new trackedResource("_freePillKeeperUsed", "Pillkeeper", 1),
  new trackedResource("timesRested", "Free Rests", totalFreeRests()),
  new trackedResource($item`11-leaf clover`, "Clover", itemAmount($item`11-leaf clover`)),
];

export const trackedResources: trackedResource[] = [
  ...freeBanishResources,
  ...freeKillResources,
  ...notableSkillResources,
  ...freeFightResources,
  ...potentiallyFreeFightResources,
  ...farmingResourceResources,
];

function   isUnderwaterTask(task: Task): boolean {
  return (task.do instanceof Location && task.do.environment === "underwater") || task.underwater == true;
}

export class Engine extends BaseEngine<CombatActions, Task> {
  constructor(tasks: Task[], options: EngineOptions<CombatActions, Task> = {}) {
    if (!options.combat_defaults) options.combat_defaults = new MyActionDefaults();
    super(tasks, options);
  }
  public getNextTask(): Task | undefined {
    return this.tasks.find((task) => !task.completed() && (task.ready ? task.ready() : true));
  }

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

    // Train sea lasso once per fight (round 1 only): macros restart each round, and tryItem
    // only guards hascombatitem — a failed use still aborts (sea lasso is limited per combat).
    if (!task.freeaction && get("lassoTrainingCount") < 20 && have($item`sea lasso`)) {
      combat.startingMacro(Macro.ifNot("pastround 1", Macro.tryItem($item`sea lasso`)));
      outfit.equip($item`sea cowboy hat`);
      outfit.equip($item`sea chaps`);
    }

    // Let the base engine do its thing
    super.customize(task, outfit, combat, resources);

    // If gear breathing is enabled, force a player breathing item into the outfit.
    // Some The Sea locations can still fail without explicit equip in task outfits.
    const hasUnderwaterBreathingEffect =
      have($effect`Driving Waterproofly`) ||
      have($effect`Wet Willied`) ||
      booleanModifier("Adventure Underwater");
    const trainingLasso =
      get("lassoTraining") !== "expertly" &&
      get("lassoTrainingCount") < 20 &&
      have($item`sea lasso`);
    if (!hasUnderwaterBreathingEffect && get("_subAquaEquipBreathing", false)) {
      const hasBreathingGearInOutfit = Array.from(outfit.equips.values()).some((it) =>
        waterBreathingEquipment.includes(it),
      );
      if (!hasBreathingGearInOutfit) {
        const preferredBreathingGear = trainingLasso
          ? [...$items`old SCUBA tank, Elf Guard SCUBA tank`, ...waterBreathingEquipment]
          : [...waterBreathingEquipment];
        const firstWaterBreathingItem = preferredBreathingGear.find(
          (e, idx, arr) => have(e) && arr.indexOf(e) === idx,
        );
        if (!firstWaterBreathingItem) {
          throw `Unable to provide player water breathing for ${task.name}`;
        }
        outfit.equip(firstWaterBreathingItem);
      }
    }

    // If we added a generic familiar that cannot breathe water and we do not
    // have an active underwater-breathing effect, ensure familiar breathing gear.
    if (outfit.familiar && !outfit.familiar.underwater) {
      if (!hasUnderwaterBreathingEffect) {
        const famequip = outfit.equips.get($slot`familiar`) ?? $item`none`;
        if (!familiarWaterBreathingEquipment.includes(famequip)) {
          const firstFamiliarWaterBreath = familiarWaterBreathingEquipment.find((e) => have(e));
          if (!firstFamiliarWaterBreath) {
            throw `Unable to provide familiar water breathing for ${task.name}`;
          }
          outfit.equips.set($slot`familiar`, firstFamiliarWaterBreath);
        }
      }
    }
  }

  public execute(task: Task): void {
    const originalValues = trackedResources.map(({ resource }) =>
      typeof resource === "string"
        ? [resource, get(resource).toString()]
        : [resource.name, `${itemAmount(resource)}`],
    );
    const organUsage = () => [myFullness(), myInebriety(), mySpleenUse()];
    const originalOrgans = organUsage();
    this.checkLimits(task, undefined);

    super.execute(task);

    if (get("lastChoice", 0) === 315) {
      set("_loopstar_outpost_choices", get("_loopstar_outpost_choices", 0) + 1);
    }

    if (have($effect`Beaten Up`)) {
      if (
        get("_lastCombatLost") &&
        !get("lastEncounter").includes("Sssshhsssblllrrggghsssssggggrrgglsssshhssslblgl")
      )
        throw "Fight was lost; stop.";
      else uneffect($effect`Beaten Up`);
    }

    originalValues.forEach(([resource, val]) => {
      if (
        get(resource, "").toString().length > 0
          ? val !== get(resource).toString()
          : itemAmount(toItem(resource)) < toInt(val)
      ) {
        const s = `_instant${resource}`;
        const arr = get(s, "").split(",");
        arr.push(task.name);
        set(s, arr.filter((v, i, a) => v.length > 0 && a.indexOf(v) === i).join(","));
      }
    });
    organUsage().forEach((organUse, idx) => {
      if (organUse !== originalOrgans[idx]) {
        const s = `_instant_${["fullness", "inebriety", "spleenUse"][idx]}`;
        const arr = get(s, "").split(",");
        arr.push(task.name);
        set(s, arr.filter((v, i, a) => v.length > 0 && a.indexOf(v) === i).join(","));
      }
    });
    if (task.completed()) {
      print(`${task.name} completed!`, "blue");
    } else {
      print(`${task.name} not completed!`, "blue");
    }
  }

  createOutfit(task: Task): Outfit {
    // Handle unequippables in outfit here
    const spec = undelay(task.outfit);
    if (spec === undefined) {
      return new Outfit();
    }

    if (spec.familiar && !have(spec.familiar)) {
      print(`Ignoring using a familiar because we don't have ${spec.familiar}`, "red");
      spec.familiar = $familiar.none;
    }

    if (spec instanceof Outfit) {
      const badSlots = Array.from(spec.equips.entries())
        .filter(([, it]) => !have(it) && it !== $item.none)
        .map(([s]) => s);
      badSlots.forEach((s) => {
        print(`Ignoring slot ${s} because we don't have ${spec.equips.get(s) ?? ""}`, "red");
        spec.equips.delete(s);
      });
      return spec.clone();
    }

    // spec is an OutfitSpec
    for (const slotName of outfitSlots) {
      const itemOrItems = spec[slotName];
      if (itemOrItems) {
        if (itemOrItems instanceof Item) {
          if (!have(itemOrItems) && itemOrItems !== null) {
            print(`Ignoring slot ${slotName} because we don't have ${itemOrItems}`, "red");
            spec[slotName] = undefined;
          }
        } else {
          if (!itemOrItems.some((it) => have(it) && it !== null)) {
            print(
              `Ignoring slot ${slotName} because we don't have ${itemOrItems
                .map((it) => it.name)
                .join(", ")}`,
              "red",
            );
            spec[slotName] = undefined;
          }
        }
      }
    }

    if (spec.equip) {
      const missingEquipItems = spec.equip.filter((it) => !have(it));
      if (missingEquipItems.length > 0) {
        print(
          `Ignoring equip items because we don't have ${missingEquipItems
            .map((it) => it.name)
            .join(", ")}`,
          "red",
        );
        spec.equip = spec.equip.filter((it) => have(it));
      }
    }

    if (spec.avoid) {
      spec.avoid = spec.avoid.filter((it) => have(it));
    }

    return Outfit.from(spec, new Error("Failed to equip outfit"));
  }

  dress(task: Task, outfit: Outfit): void {
    super.dress(task, outfit);
    if (isUnderwaterTask(task) && !booleanModifier("Adventure Underwater")) {
      const trainingLasso =
        get("lassoTraining") !== "expertly" &&
        get("lassoTrainingCount") < 20 &&
        have($item`sea lasso`);
      const preferredBreathingGear = trainingLasso
        ? [...$items`old SCUBA tank, Elf Guard SCUBA tank`, ...waterBreathingEquipment]
        : [...waterBreathingEquipment];
      const firstWaterBreathingItem = preferredBreathingGear.find(
        (item, idx, arr) => have(item) && canEquip(item) && arr.indexOf(item) === idx,
      );
      if (!firstWaterBreathingItem) {
        throw `Unable to equip player water breathing for ${task.name}`;
      }
      equip(firstWaterBreathingItem);
      if (!booleanModifier("Adventure Underwater")) {
        throw `Failed to establish underwater breathing for ${task.name}`;
      }
    }
  }



  prepare(task: Task): void {
    super.prepare(task);
    if (task.combat !== undefined && myHp() < myMaxhp() * 0.9) useSkill($skill`Cannelloni Cocoon`);
  }

  setChoices(task: Task, manager: PropertiesManager): void {
    super.setChoices(task, manager);
    const outpostChoice = (get("_loopstar_outpost_choices", 0) % 3) + 1;
    this.propertyManager.setChoices({
      // Mer-kin Outpost defaults for engine-run tasks.
      312: 3,
      315: outpostChoice,
    });
    if (equippedAmount($item`June cleaver`) > 0) {
      this.propertyManager.setChoices({
        // June cleaver noncombats
        1467: 3, // +adv
        1468: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1469: !have($effect`Yapping Pal`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1470: 2, // teacher's pen
        1471: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1472: !have($item`trampled ticket stub`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1473: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1474: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1475: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
      });
    }
  }

  override do(task: Task): void {
    const propertyManager = this.propertyManager;
    super.do({
      ...task,
      do: () => {
        // Consider peridot of peril
        const peridotTarget = undelay(task.peridot);
        if (peridotTarget && haveEquipped($item`Peridot of Peril`)) {
          propertyManager.setChoice(1557, `1&bandersnatch=${peridotTarget.id}`);
        }

        if (task.do instanceof Location) return task.do;
        return task.do();
      },
    });
  }

  initPropertiesManager(manager: PropertiesManager): void {
    super.initPropertiesManager(manager);
    const bannedAutoRestorers = [
      "sleep on your clan sofa",
      "rest in your campaway tent",
      "rest at the chateau",
      "rest at your campground",
      "free rest",
    ]; /*add a comment for lulz*/
    const bannedAutoHpRestorers = [...bannedAutoRestorers];
    const bannedAutoMpRestorers = [...bannedAutoRestorers];
    const hpItems = get("hpAutoRecoveryItems")
      .split(";")
      .filter((s) => !bannedAutoHpRestorers.includes(s))
      .join(";");
    const mpItems = Array.from(
      new Set([...get("mpAutoRecoveryItems").split(";"), "doc galaktik's invigorating tonic"]),
    )
      .filter((s) => !bannedAutoMpRestorers.includes(s))
      .join(";");
    manager.set({
      autoSatisfyWithCloset: false,
      hpAutoRecovery: -0.05,
      mpAutoRecovery: -0.05,
      maximizerCombinationLimit: 0,
      hpAutoRecoveryItems: hpItems,
      mpAutoRecoveryItems: mpItems,
      choiceAdventureScript: "subaqua_choice.js",
      shadowLabyrinthGoal: "effects",
    });
  }
}
