import { adv1, buy, cliExecute, equippedItem, itemAmount } from "kolmafia";
import { $coinmaster, $item, $location, EternityCodpiece, get, have, unequip } from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";

import { centerDoorFilter } from "./fights";

const pearl = $item`unblemished pearl`;

function bothGodsDead(): boolean {
  return get("shubJigguwattDefeated", false) && get("yogUrtDefeated", false);
}

/** No pearl is still riding in a codpiece slot — the check the Center Door
 * waits on, since a socketed pearl is not a pearl the quest can see. */
function pearlsPried(): boolean {
  return (
    !EternityCodpiece.have() || EternityCodpiece.SLOTS.every((slot) => equippedItem(slot) !== pearl)
  );
}

export function finaleQuest(): Quest {
  return {
    name: "Finale",
    tasks: [
      {
        // The five pearls came in codpiece-smuggled (init Pearl Guard);
        // they have to come back OUT for the quest (loop repo
        // thesea.ts:38-46 pryPearls — unequip(slot) works; equip() on
        // codpiece slots does not).
        name: "Pry Pearls",
        ready: bothGodsDead,
        completed: pearlsPried,
        do: (): void => {
          for (const slot of EternityCodpiece.SLOTS) {
            if (equippedItem(slot) === pearl) unequip(slot);
          }
          cliExecute("refresh inv");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Two center-door advs (ash UTS:2959-2974); the CCS-side fight is
        // centerDoorFilter. Plain high-stats fight — no gimmicks
        // (monsters.txt:1457: Atk 2000 Def 2500 HP 4000).
        name: "Nautical Seaceress",
        ready: () => bothGodsDead() && pearlsPried(),
        completed: () => questStepOf("questL13Final") >= 999,
        prepare: () => recover(),
        do: () => void adv1($location`Mer-kin Temple (Center Door)`, -1, centerDoorFilter()),
        outfit: () => ({
          modifier: "spell damage percent, mys",
          equip: [
            $item`Mer-kin gladiator mask`,
            $item`Mer-kin gladiator tailpiece`,
            // Both extras are the ash's if_equip() — owned-only, or the
            // maximizer refuses the whole outfit (colosseum.ts:83).
            ...(have($item`Congressional Medal of Insanity`)
              ? [$item`Congressional Medal of Insanity`]
              : []),
            ...(!currentPolicy().conserveFreeFights &&
            get("_batWingsFreeFights", 0) < 5 &&
            have($item`bat wings`)
              ? [$item`bat wings`]
              : []),
          ],
          // The "exp" non-attacking familiar rides along for the free
          // experience (UTS:3040-3047); the engine adds its breather.
          familiar: expFamiliar(),
        }),
        underwater: true,
        limit: { tries: 5, message: "The Seaceress is not falling; check spell damage and MP." },
      },
      {
        // Post-quest penny dump + council (ash UTS:2985-2995). main.ts's
        // postloopCommand hook fires once every task completes. Only the two
        // cheap shelves the ash buys (pill 30, healing scroll 10) — never the
        // 1000-penny stat scrolls.
        name: "Penny Dump",
        ready: () => questStepOf("questL13Final") >= 999,
        completed: () => itemAmount($item`sand penny`) <= 10,
        do: (): void => {
          while (itemAmount($item`sand penny`) > 30) {
            if (!buy($coinmaster`Wet Crap For Sale`, 1, $item`water-logged pill`)) break;
          }
          while (itemAmount($item`sand penny`) > 10) {
            if (!buy($coinmaster`Wet Crap For Sale`, 1, $item`waterlogged scroll of healing`))
              break;
          }
          cliExecute("council");
          cliExecute("council");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
