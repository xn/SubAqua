import { cliExecute, use, visitUrl } from "kolmafia";
import { $item, get, have } from "libram";

import { Quest } from "../../engine/task";

export function currentsQuest(): Quest {
  return {
    name: "Currents",
    tasks: [
      {
        // Stashbox -> trailmap -> tell Grandpa about the currents. The
        // corral unlock comes from the grandpastory response ("Gonna need
        // one of them seahorses", QuestManager.java:1459-1461); seafloor
        // re-syncs corralUnlocked/intenseCurrents (QuestManager.java:1510-1516).
        // Ash UTS:2007-2012.
        name: "Open Corral",
        ready: () => have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`),
        completed: () => get("corralUnlocked"),
        do: (): void => {
          if (have($item`Mer-kin stashbox`)) use($item`Mer-kin stashbox`);
          if (have($item`Mer-kin trailmap`)) use($item`Mer-kin trailmap`);
          cliExecute("grandpa currents");
          // Mafia only sets intenseCurrents/map prefs from a seafloor.php page
          // load (QuestManager.handleSeaChange); a single visitUrl("seafloor.php")
          // re-syncs the map/zone prefs cheaply (spec §8).
          visitUrl("seafloor.php");
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
