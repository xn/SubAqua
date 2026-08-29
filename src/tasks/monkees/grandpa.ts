import { availableAmount, cliExecute } from "kolmafia";
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
        // step4: hunt the class-keyed rescue NC (302/303 Trench, 306 Mine,
        // 307/308 Dive Bar -> step5, ChoiceControl.java:5034-5042). The ash
        // walks -combat rather than forcing: these zones carry junk NCs
        // (Vent Horizon 304, Deep Sauce 305, Barback 309) that a forced NC
        // could land on, so forcers are wasted here (UTS:1872-1905).
        // Kill only the wanted droppers (comb jelly / digpick / tippler);
        // run from the rest (CCS:636-648).
        name: "Find Grandpa",
        ready: () => monkeesStep() === 4,
        completed: () => monkeesStep() >= 5,
        do: () => grandpaZone(),
        underwater: true,
        // ash free_run(page_text, true) here, CCS:646-654
        freeRunBanishes: true,
        combat: new CombatStrategy()
          .kill($monsters`giant squid, Mer-kin miner, Mer-kin tippler`)
          .freeRun(),
        // "item, -100 combat" like the ash (UTS:1262 `item drop, -100 combat`):
        // at equal weight the maximizer traded -combat slots for +item gear —
        // live 2026-08-27 it left the latte mug / McHugeLarge ski off and the
        // NC hunt ran 3 combats in 6 turns (UTS 08-26: 3 NCs in 3 turns).
        outfit: () => ({
          modifier: "item, -100 combat",
          familiar: sneakFamiliar(),
          equip: $items`Mer-kin sneakmask, Monodent of the Sea`,
        }),
        effects: () => combineMoods(sneakEffects(), resEffects()),
        choices: { 302: 1, 303: 1, 304: 2, 305: 2, 306: 1, 307: 1, 308: 1, 309: 2 },
        prepare: (): void => {
          recover();
          // Hidepaint's Colorfully Concealed is -combat-cap-exempt (spec §9);
          // pull is discretionary — low shiny farms without it (UTS:1873-1876).
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
        // step5 -> step6: any grandpastory topic (GrandpaRequest.java:75-77).
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
              // Habitat the Black Crayon Golem: its wanderer copies drop the
              // crayon shavings Shub prep needs (>= 9; pulls.ts reserves the
              // top-up pull). Ash UTS:1911-1921 + CCS:1123-1137. Club 'Em
              // Into Next Week banks one more copy (redeemed by the
              // wanderer task, Task 10).
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
