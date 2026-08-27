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
/** The ash's own dump floor (UTS:2985-2995): 10 pennies left is "done". */
const pennyFloor = 10;

function bothGodsDead(): boolean {
  return get("shubJigguwattDefeated", false) && get("yogUrtDefeated", false);
}

/** Mafia sets questL13Final to "finished" the moment she falls
 * (FightRequest.java:4382-4383, the "Nautical Seaceress" case). */
function seaceressDefeated(): boolean {
  return questStepOf("questL13Final") >= 999;
}

/**
 * The route's terminal condition: the Seaceress is down and the pennies are
 * dumped. main.ts fires `postloopCommand` on THIS, not on "every task reports
 * complete" — several tasks are legitimately never-complete-but-not-applicable
 * on a given account (no PYEC, no Source Terminal, no Skate Park map, a prep
 * whose stock the boss fight consumed), so an all-complete trigger can never
 * fire.
 */
export function routeComplete(): boolean {
  return seaceressDefeated() && itemAmount(penny) <= pennyFloor;
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
        completed: seaceressDefeated,
        prepare: (): void => {
          // init.ts's Pearl Guard only fires at turnsPlayed() === 0, so a
          // mid-run start can reach the door short. Mafia would just wall the
          // zone silently (spec §9 wants an abort that says why) — and the pry
          // above has already run, so this counts what the quest will see.
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
          // experience (UTS:3040-3047); when the ladder actually fields one,
          // the engine adds its breather (none is fielded, none is needed).
          familiar: expFamiliar(),
        }),
        underwater: true,
        limit: { tries: 5, message: "The Seaceress is not falling; check spell damage and MP." },
      },
      {
        // Post-quest penny dump + council (ash UTS:2985-2995). This task is
        // the second half of routeComplete(), which is what main.ts's
        // postloopCommand hook fires on. Only the two cheap shelves the ash
        // buys (pill 30, healing scroll 10) — never the 1000-penny stat
        // scrolls.
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
