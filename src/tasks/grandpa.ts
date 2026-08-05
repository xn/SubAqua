import { step, OutfitSpec } from "grimoire-kolmafia";
import {
  cliExecute,
  haveSkill,
  itemAmount,
  Location,
  toSkill,
  visitUrl,
  myPrimestat,
} from "kolmafia";
import { $effect, $familiar, $item, $items, $location, $monsters, get, have } from "libram";

import { CombatStrategy } from "../engine/combat";
import { baseOutfit } from "../engine/outfit";
import { Quest } from "../engine/task";
import { isSeaworthy } from "../lib";

const mainStatStr = myPrimestat().toString();
const grandpaLocation: Location = {
  Muscle: $location`Anemone Mine`,
  Mysticality: $location`The Marinara Trench`,
  Moxie: $location`The Dive Bar`,
}[mainStatStr];

let learnedClassSkill = false;

function pastLastGrandpaEncounter(): boolean {
  if (learnedClassSkill) {
    return true; // Already learned the class skill
  }
  switch (mainStatStr) {
    case "Muscle":
      learnedClassSkill = get("lastEncounter") === "Not a Micro Fish";
      break;
    case "Mysticality":
      learnedClassSkill = get("lastEncounter") === "You've Hit Bottom";
      break;
    case "Moxie":
      learnedClassSkill =
        get("lastEncounter") === "Boxing the Juke" || get("lastEncounter") === "Ode to the Sea";
      break;
    default:
      throw new Error(`Unknown main stat: ${mainStatStr}`);
  }
  return learnedClassSkill;
}

export const GrandpaQuest: Quest = {
  name: "Grandpa",
  ready: () => isSeaworthy() && step("questS02Monkees") >= 2,
  completed: () => get("corralUnlocked"),
  tasks: [
    {
      name: "Talk to little brother about Grandpa",
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") >= 4,
      do: () => {
        // This conversation chain is required to advance the quest state.
        visitUrl("monkeycastle.php?who=1");
        visitUrl("monkeycastle.php?who=2");
        visitUrl("monkeycastle.php?who=1");
      },
      limit: { soft: 11 },
    },
    {
      name: "Find Grandpa",
      ready: () => isSeaworthy() && step("questS02Monkees") === 4,
      completed: () => pastLastGrandpaEncounter(),
      effects: () =>
        [$effect`Donho's Bubbly Ballad`, $effect`Blood Bubble`].filter((e) =>
          haveSkill(toSkill(e)),
        ),
      do: grandpaLocation,
      combat: new CombatStrategy().kill(),
      limit: { soft: 1000 },
      outfit: () => ({
        ...baseOutfit(),
        modifier: "-combat",
        equip: $items`Apriling band tuba, Everfull Dart Holster, McHugeLarge left ski, Möbius ring, shark jumper, bat wings, little bitty bathysphere`,
        avoid: [$item`Peridot of Peril`, $item`Mer-kin digpick`],
        familiar: $familiar`Peace Turkey`,
      }),
      choices: {},
    },

    {
      name: "Open Outpost",
      after: ["Find Grandpa"],
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") >= 6,
      do: () => {
        cliExecute("grandpa wife");
      },
      underwater: true,
      freeaction: true,
      limit: { tries: 1 },
    },
    {
      name: "Outpost Grandma",
      after: ["Open Outpost"],
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") >= 9,
      do: $location`The Mer-Kin Outpost`,
      combat: new CombatStrategy().banish($monsters`Mer-kin burglar, Mer-kin raider`).kill(),
      outfit: () => {
        const result: OutfitSpec = {
          familiar: $familiar`Peace Turkey`,
        };
        if (itemAmount($item`Mer-kin prayerbeads`) < 3) {
          result.modifier = "item, -combat";
        } else {
          result.modifier = "-combat";
        }
        return result;
      },
      limit: { soft: 24 },
    },
    {
      name: "Grandma Note",
      after: ["Open Outpost"],
      ready: () =>
        isSeaworthy() &&
        have($item`Grandma's Note`) &&
        have($item`Grandma's Fuchsia Yarn`) &&
        have($item`Grandma's Chartreuse Yarn`),
      completed: () => have($item`Grandma's Map`) || step("questS02Monkees") >= 9,
      do: () => {
        cliExecute("grandpa note");
      },
      underwater: true,
      freeaction: true,
      limit: { tries: 1 },
    },
  ],
};
