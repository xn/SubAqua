import { OutfitSpec, step } from "grimoire-kolmafia";
import { use, visitUrl } from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../engine/combat";
import { Quest } from "../engine/task";
import { isSeaworthy } from "../lib";

export const LittleQuest: Quest = {
  name: "Little Brother",
  ready: () => isSeaworthy(),
  completed: () => step("questS02Monkees") > 1,
  tasks: [
    {
      name: "Octopus Garden",
      completed: () => step("questS02Monkees") >= 0 || have($item`wriggling flytrap pellet`),
      do: $location`An Octopus's Garden`,
      peridot: $monster`Neptune flytrap`,
      combat: new CombatStrategy()
        .macro(
          Macro.trySkill($skill`%fn, fire a Red, White and Blue Blast`).trySkill(
            $skill`%fn, let's pledge allegiance to a Zone`,
          ),
          $monster`Neptune flytrap`,
        )
        .macro(
          Macro.trySkill($skill`Sea *dent: Talk to Some Fish`).trySkill(
            $skill`BCZ: Refracted Gaze`,
          ),
          $monsters`octopus gardener, sponge, stranglin' algae`,
        )
        .kill(),
      outfit: () => {
        const result: OutfitSpec = {
          equip: $items`Everfull Dart Holster, spring shoes, April Shower Thoughts shield`,
        };

        if (get("rwbMonsterCount") > 0 && get("rwbMonster") === $monster`Neptune flytrap`) {
          result.familiar = $familiar`Peace Turkey`;
        } else {
          if (
            have($familiar`Patriotic Eagle`) &&
            !have($effect`Everything Looks Red, White and Blue`)
          ) {
            result.familiar = $familiar`Patriotic Eagle`;
          } else {
            result.equip?.push($item`blood cubic zirconia`);
            result.familiar = $familiar`Peace Turkey`;
          }
        }
        return result;
      },
      limit: { soft: 20 },
    },
    {
      name: "Use Wriggling Pellet",
      after: ["Octopus Garden"],
      completed: () => step("questS02Monkees") >= 0,
      do: () => use($item`wriggling flytrap pellet`),
      freeaction: true,
      limit: { tries: 1 },
    },
    {
      name: "Open Wreck",
      after: ["Use Wriggling Pellet"],
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") > 0,
      do: () => visitUrl("monkeycastle.php?who=1"),
      underwater: true,
      freeaction: true,
      limit: { tries: 1 },
    },
  ],
};
