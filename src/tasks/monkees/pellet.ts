import { use, visitUrl } from "kolmafia";
import { $item, $location, $monster, have } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";

const pellet = $item`wriggling flytrap pellet`;
const flytrap = $monster`Neptune flytrap`;

export function pelletQuest(): Quest {
  return {
    name: "Pellet",
    tasks: [
      {
        // The pellet is a 50% drop from the Neptune flytrap (monsters.txt:470).
        // Peridot forces the flytrap (ash zoneTarget 740, IOTM:72) and
        // forceItems guarantees the drop (parka ray or saber drop-force) —
        // replacing the ash's three escalating loops (UTS:1783-1843) with
        // one guaranteed-drop fight per day-of-resource.
        name: "Garden Pellet",
        completed: () => monkeesStep() >= 0 || have(pellet),
        do: $location`An Octopus's Garden`,
        peridot: flytrap,
        combat: new CombatStrategy().forceItems(flytrap).banish(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        choices: { 298: 2 },
        prepare: () => recover(),
        limit: {
          soft: 15,
          message: "The flytrap would not die with its pellet; check drops and rerun.",
        },
      },
      {
        name: "Use Pellet",
        ready: () => have(pellet),
        completed: () => monkeesStep() >= 0,
        do: () => void use(pellet),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Little Brother",
        completed: () => monkeesStep() >= 1,
        do: () => void visitUrl("monkeycastle.php?who=1"),
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
    ],
  };
}
