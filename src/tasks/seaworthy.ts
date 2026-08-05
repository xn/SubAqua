import {
  availableAmount,
  booleanModifier,
  buy,
  canEquip,
  getWorkshed,
  Item,
  haveEffect,
  print,
  retrieveItem,
  use,
} from "kolmafia";
import { clamp, $effect, $item, $items, $location, AsdonMartin, get, have, set } from "libram";

import { Quest } from "../engine/task";
import { asdonFualable, fuelUp } from "../lib";

/** Log Fishy / underwater state (call from main or when debugging seaworthy). */
export function printSeaworthyDebug(where: string): void {
  const fishyTurns = haveEffect($effect`Fishy`);
  print(
    `[subaqua/seaworthy ${where}] Fishy turns=${fishyTurns} | adventure underwater modifier=${booleanModifier("Adventure Underwater")} | _subAquaEquipBreathing=${get("_subAquaEquipBreathing", false)} | canBreathUnderwater=${canBreathUnderwater()} | isFishy=${isFishy()} | isSeaworthy=${isSeaworthy()}`,
  );
}

export const SeaworthyQuest: Quest = {
  name: "Seaworthy",
  tasks: [
    {
      name: "Breathe Underwater",
      completed: () => canBreathUnderwater(),
      do: () => {
        print('[subaqua/seaworthy] task "Breathe Underwater": picking a breathing strategy…');
        const tryAcquireAndUse = (item: Item, label: string): boolean => {
          print(`[subaqua/seaworthy] → ${label}`);
          if (availableAmount(item) <= 0) retrieveItem(item);
          if (availableAmount(item) <= 0) {
            print(`[subaqua/seaworthy] ${label} unavailable; trying next breathing strategy`);
            return false;
          }
          if (!use(item)) {
            print(`[subaqua/seaworthy] ${label} failed to use; trying next breathing strategy`);
            return false;
          }
          return true;
        };

        let strategySucceeded = false;

        if (have($item`ballast turtle`) && !get("_ballastTurtleUsed")) {
          print("[subaqua/seaworthy] → using ballast turtle");
          strategySucceeded = use($item`ballast turtle`);
        }
        if (strategySucceeded) {
          printSeaworthyDebug("after Breathe Underwater do()");
          return;
        }

        if (
          have($item`hyperinflated seal lung`) &&
          !get("_hyperinflatedSealLungUsed", false)
        ) {
          print("[subaqua/seaworthy] → using hyperinflated seal lung");
          strategySucceeded = use($item`hyperinflated seal lung`);
        }
        if (strategySucceeded) {
          printSeaworthyDebug("after Breathe Underwater do()");
          return;
        }

        if (!get("_pneumaticityPotionUsed", false)) {
          strategySucceeded = tryAcquireAndUse(
            $item`pressurized potion of pneumaticity`,
            "pressurized potion of pneumaticity",
          );
        }
        if (strategySucceeded) {
          printSeaworthyDebug("after Breathe Underwater do()");
          return;
        }

        if (!get("_tempuraAirUsed", false)) {
          strategySucceeded = tryAcquireAndUse($item`tempura air`, "tempura air");
        }
        if (strategySucceeded) {
          printSeaworthyDebug("after Breathe Underwater do()");
          return;
        }

        if (getWorkshed() === $item`Asdon Martin keyfob (on ring)` && asdonFualable(37)) {
          print("[subaqua/seaworthy] → Asdon Waterproofly");
          fuelUp();
          strategySucceeded = AsdonMartin.drive(AsdonMartin.Driving.Waterproofly);
        }

        if (!strategySucceeded) {
          print(
            "[subaqua/seaworthy] → no consumable/Asdon path succeeded; setting _subAquaEquipBreathing (equip breathing gear)",
          );
          set("_subAquaEquipBreathing", true);
        }

        printSeaworthyDebug("after Breathe Underwater do()");
      },
      limit: { soft: 1000 },
    },
    {
      name: "Ensure Lassos",
      completed: () =>
        have($item`sea lasso`, 2) ||
        (get("lassoTraining") === "expertly" && have($item`sea lasso`)),
      do: () => {
        buy($item`sea lasso`, clamp(2 - availableAmount($item`sea lasso`), 0, 2));
      },
      limit: { soft: 1000 },
    },
    {
      name: "Ensure cowbells",
      completed: () => have($item`sea cowbell`, 3) || get("seahorseName", "").length > 0,
      do: () => {
        buy($item`sea cowbell`, clamp(3 - availableAmount($item`sea cowbell`), 0, 3));
      },
      limit: { soft: 1000 },
    },
    {
      name: "Ensure Hidepaint",
      completed: () => have($item`Mer-kin hidepaint`),
      do: () => {
        buy($item`Mer-kin hidepaint`, 1);
      },
      limit: { soft: 1000 },
    },
    {
      name: "Ensure Sneakmask",
      completed: () => have($item`Mer-kin sneakmask`),
      do: () => {
        buy($item`Mer-kin sneakmask`, 1);
      },
      limit: { soft: 1000 },
    },
    {
      name: "Fishy Pipe",
      ready: () =>
        have($item`fishy pipe`) && !get("_fishyPipeUsed", false) && canBreathUnderwater(),
      completed: () => get("_fishyPipeUsed", false),
      do: () => use($item`fishy pipe`),
      limit: { tries: 1 },
    },
    {
      name: "Get Fishy",
      ready: () => haveEffect($effect`Fishy`) <= 1 && canBreathUnderwater(),
      completed: () => haveEffect($effect`Fishy`) > 1,
      prepare: () => use($item`11-leaf clover`),
      do: $location`The Brinier Deepers`,
      limit: { soft: 1000 },
    },
  ],
};

export function isSeaworthy(): boolean {
  return isFishy() && canBreathUnderwater();
}

export function isFishy(): boolean {
  return have($effect`Fishy`);
}

export function canBreathUnderwater(): boolean {
  return (
    booleanModifier("Adventure Underwater") ||
    (get("_subAquaEquipBreathing", false) &&
      waterBreathingEquipment.some((item) => have(item) && canEquip(item)))
  );
}

export const waterBreathingEquipment = $items`The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;
