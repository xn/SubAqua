import { availableAmount, cliExecute, itemAmount } from "kolmafia";
import { $effect, $item, $items, $monster, $monsters, $skill, get, have, Macro } from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { combineMoods, resEffects, sneakEffects } from "../../lib/moods";
import { discretionaryPull } from "../../resources/pulls";
import { summon } from "../../resources/summon";

const golem = $monster`Black Crayon Golem`;

export function grandpaQuest(opts: { golem: boolean }): Quest {
  return {
    name: "Grandpa",
    tasks: [
      {
        name: "Find Grandpa",
        ready: () => monkeesStep() === 4,
        completed: () => monkeesStep() >= 5,
        do: () => grandpaZone(),
        underwater: true,
        freeRunBanishes: () => itemAmount($item`cosmic bowling ball`) > 0,
        combat: new CombatStrategy()
          .kill($monsters`giant squid, Mer-kin miner, Mer-kin tippler`)
          .freeRun(),
        outfit: () => ({
          modifier: "item, -100 combat",
          familiar: sneakFamiliar(),
          equip: $items`Mer-kin sneakmask, Monodent of the Sea`,
        }),
        effects: () => combineMoods(sneakEffects(), resEffects()),
        choices: { 302: 1, 303: 1, 304: 2, 305: 2, 306: 1, 307: 1, 308: 1, 309: 2 },
        prepare: (): void => {
          recover();
          if (!have($effect`Colorfully Concealed`) && !have($item`Mer-kin hidepaint`)) {
            discretionaryPull($item`Mer-kin hidepaint`);
          }
          if (!have($effect`Colorfully Concealed`) && have($item`Mer-kin hidepaint`)) {
            cliExecute("use 1 Mer-kin hidepaint");
          }
        },
        limit: { soft: 30, message: "Grandpa's rescue NC is hiding; check -combat sources." },
      },
      {
        name: "Grandpa Story",
        ready: () => monkeesStep() === 5,
        completed: () => monkeesStep() >= 6,
        do: () => void cliExecute("grandpa grandma"),
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      ...(opts.golem
        ? [
            {
              name: "Golem Recall",
              ready: () => have($skill`Just the Facts`) && get("_monsterHabitatsMonster") === null,
              completed: () =>
                get("_monsterHabitatsMonster") !== null ||
                availableAmount($item`crayon shavings`) >= 9,
              do: () => summon(golem),
              combat: new CombatStrategy()
                .macro(
                  () =>
                    openerOnce(
                      Macro.trySkill($skill`Recall Facts: Monster Habitats`).trySkill(
                        $skill`Club 'Em Into Next Week`,
                      ),
                    ),
                  golem,
                )
                .kill(),
              outfit: { modifier: "item", equip: $items`legendary seal-clubbing club` },
              prepare: () => recover(),
              limit: { tries: 2 },
            },
          ]
        : []),
    ],
  };
}
