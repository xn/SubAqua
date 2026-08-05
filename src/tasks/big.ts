import { step } from "grimoire-kolmafia";
import { visitUrl } from "kolmafia";
import { $item, $location } from "libram";

import { CombatStrategy } from "../engine/combat";
import { Quest } from "../engine/task";
import { isSeaworthy, forceNC } from "../lib";

export const BigQuest: Quest = {
  name: "Big Brother",
  ready: () => isSeaworthy() && step("questS02Monkees") === 1,
  completed: () => step("questS02Monkees") >= 2,
  tasks: [
    {
      name: "Run to the Hatch",
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") > 1,
      prepare: () => forceNC(),
      do: $location`The Wreck of the Edgar Fitzsimmons`,
      choices: {
        299: 1,
      },
      combat: new CombatStrategy().freeRun(),
      limit: { soft: 10 },
      outfit: {
        modifier: "-combat",
        avoid: [$item`Peridot of Peril`],
      },
    },
    {
      name: "Unlock Big Brother",
      ready: () => isSeaworthy(),
      completed: () => step("questS02Monkees") >= 4,
      do: () => {
        visitUrl("monkeycastle.php?who=1");
        visitUrl("monkeycastle.php?who=2");
        visitUrl("monkeycastle.php?who=1");
        //retrieveItem($item`bubblin' stone`);
      },
      underwater: true,
      freeaction: true,
      limit: { tries: 11 },
    },
  ],
};
