import { visitUrl } from "kolmafia";
import { $items, $location, get } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { sneakEffects } from "../../lib/moods";
import { forceNextNoncombat, ncForceEstimate } from "../../resources/ncforce";

const wreck = $location`The Wreck of the Edgar Fitzsimmons`;

export function bigBrotherQuest(): Quest {
  return {
    name: "Big Brother",
    tasks: [
      {
        name: "Wreck Rescue (forced)",
        ready: () =>
          monkeesStep() === 1 && (get("noncombatForcerActive") || ncForceEstimate() >= 4),
        completed: () => monkeesStep() >= 2,
        prepare: (): void => {
          recover();
          forceNextNoncombat();
        },
        do: wreck,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        choices: { 299: 1 },
        limit: { soft: 10 },
      },
      {
        name: "Wreck Rescue (sneak)",
        ready: () => monkeesStep() === 1,
        completed: () => monkeesStep() >= 2,
        do: wreck,
        freeRunBanishes: true,
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
        }),
        effects: sneakEffects,
        choices: { 299: 1 },
        prepare: () => recover(),
        limit: { soft: 12, message: "Down at the Hatch is hiding; check -combat sources." },
      },
      {
        name: "Bubblin' Stone",
        ready: () => monkeesStep() >= 2,
        completed: () => monkeesStep() >= 4,
        do: (): void => {
          visitUrl("monkeycastle.php?who=2");
          visitUrl("monkeycastle.php?who=1");
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
    ],
  };
}
