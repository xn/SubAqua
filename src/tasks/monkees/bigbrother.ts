import { visitUrl } from "kolmafia";
import { $location, get } from "libram";

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
        // Forced-NC lane (ash UTS:1852-1858): the Wreck's only live NC at
        // step1 is Down at the Hatch (299 -> option 1 -> step2 +
        // bigBrotherRescued, ChoiceControl.java:5019-5032), so an NC forcer
        // lands the rescue in exactly one turn, wearing +item instead of
        // -combat. Estimate >= 4 is the ash's reserve threshold.
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
        // Fallback -combat walk (ash UTS:1859-1862).
        name: "Wreck Rescue (sneak)",
        ready: () => monkeesStep() === 1,
        completed: () => monkeesStep() >= 2,
        do: wreck,
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({ modifier: "-combat", familiar: sneakFamiliar() }),
        effects: sneakEffects,
        choices: { 299: 1 },
        prepare: () => recover(),
        limit: { soft: 12, message: "Down at the Hatch is hiding; check -combat sources." },
      },
      {
        // step2 -> who=2 (bubblin' stone -> step3, ResultProcessor.java:1854)
        // -> who=1 ("Wanna help me find Grandpa?" -> step4,
        // QuestManager.java:1441-1442). Ash UTS:1865-1868.
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
