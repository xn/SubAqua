import { abort, adv1, buy, cliExecute, equippedItem, itemAmount } from "kolmafia";
import { $coinmaster, $item, $location, EternityCodpiece, get, have, unequip } from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";

import { centerDoorFilter } from "./fights";

const pearl = $item`unblemished pearl`;
const pearlsNeeded = 5;

const penny = $item`sand penny`;
const pennyFloor = 10;

function bothGodsDead(): boolean {
  return get("shubJigguwattDefeated", false) && get("yogUrtDefeated", false);
}

function seaceressDefeated(): boolean {
  return questStepOf("questL13Final") >= 999;
}

export function routeComplete(): boolean {
  return seaceressDefeated() && itemAmount(penny) <= pennyFloor;
}

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
        name: "Nautical Seaceress",
        ready: () => bothGodsDead() && pearlsPried(),
        completed: seaceressDefeated,
        prepare: (): void => {
          const owned = itemAmount(pearl);
          if (owned < pearlsNeeded) {
            abort(
              `The Nautical Seaceress needs ${pearlsNeeded} unblemished pearls and only ${owned} ` +
                `are in inventory (${pearlsNeeded - owned} short). Pearls are not obtainable inside ` +
                "the path — they have to arrive smuggled in the Eternity Codpiece's gem slots — so " +
                "this run cannot open the door. Load five pearls into the codpiece before ascending " +
                "(init.ts's Pearl Guard checks this at turn 0; a mid-run start skips it).",
            );
          }
          recover();
        },
        do: () => void adv1($location`Mer-kin Temple (Center Door)`, -1, centerDoorFilter()),
        batWings: true,
        outfit: () => ({
          modifier: "spell damage percent, mys",
          equip: [
            $item`Mer-kin gladiator mask`,
            $item`Mer-kin gladiator tailpiece`,
            ...(have($item`Congressional Medal of Insanity`)
              ? [$item`Congressional Medal of Insanity`]
              : []),
            ...(!currentPolicy().conserveFreeFights &&
            get("_batWingsFreeFights", 0) < 5 &&
            have($item`bat wings`)
              ? [$item`bat wings`]
              : []),
          ],
          familiar: expFamiliar(),
        }),
        underwater: true,
        limit: { tries: 5, message: "The Seaceress is not falling; check spell damage and MP." },
      },
      {
        name: "Penny Dump",
        ready: seaceressDefeated,
        completed: () => itemAmount(penny) <= pennyFloor,
        do: (): void => {
          while (itemAmount(penny) > 30) {
            if (!buy($coinmaster`Wet Crap For Sale`, 1, $item`water-logged pill`)) break;
          }
          while (itemAmount(penny) > pennyFloor) {
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
