import { cliExecute, use, visitUrl } from "kolmafia";
import { $item, get, have } from "libram";

import { Quest } from "../../engine/task";

export function currentsQuest(): Quest {
  return {
    name: "Currents",
    tasks: [
      {
        name: "Open Corral",
        ready: () => have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`),
        completed: () => get("corralUnlocked"),
        do: (): void => {
          if (have($item`Mer-kin stashbox`)) use($item`Mer-kin stashbox`);
          if (have($item`Mer-kin trailmap`)) use($item`Mer-kin trailmap`);
          cliExecute("grandpa currents");
          visitUrl("seafloor.php");
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
