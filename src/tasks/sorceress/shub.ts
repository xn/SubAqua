import {
  abort,
  adv1,
  cliExecute,
  itemAmount,
  myBuffedstat,
  myMaxhp,
  print,
  use,
  useSkill,
} from "kolmafia";
import { $familiar, $item, $location, $skill, $stat, get, have, uneffect } from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import {
  dealsPassiveDamage,
  moodWouldSpend,
  shrugBadEffects,
  survivalEffects,
} from "../../lib/moods";
import { shubPrepShort } from "../../lib/shub";
import { currentPolicy } from "../../resources/policy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

import { shubFilter } from "./fights";

export function shubQuest(): Quest {
  return {
    name: "Shub",
    tasks: [
      {
        name: "Shub Prep",
        ready: () => get("isMerkinGladiatorChampion", false) && !get("shubJigguwattDefeated"),
        completed: () => get("shubJigguwattDefeated", false) || !shubPrepShort(0),
        do: (): void => {
          if (
            itemAmount($item`null-day exploit`) === 0 &&
            !pulledToday($item`null-day exploit`) &&
            pullBudgetAllows($item`null-day exploit`)
          ) {
            pullSequence($item`null-day exploit`);
          }
          if (itemAmount($item`null-day exploit`) > 0) use($item`null-day exploit`);
          if (shubPrepShort(0)) {
            abort(
              "Shub prep is short: need delevelers that floor his attack (two jam band bootlegs, four crayon shavings, or a mix — bootlegs count double, rattler rattle / electronics kit slightly less than a shaving) or Null Afternoon. Paw wishes, golem fights and rollover pulls all work; acquire and rerun (ash UTS:2896-2903).",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Shub-Jigguwatt",
        ready: () => get("isMerkinGladiatorChampion", false) && !shubPrepShort(0),
        completed: () => get("shubJigguwattDefeated", false),
        effects: () => survivalEffects({ damageFree: true }),
        prepare: (): void => {
          const stuck = shrugBadEffects().filter((effect) => dealsPassiveDamage(effect));
          for (const effect of stuck) {
            if (moodWouldSpend(effect)) {
              print(
                `${effect} deals passive damage and your mood would spend an item to remove it; leaving it. Shub's retaliation will double on it.`,
                "red",
              );
              continue;
            }
            if (
              itemAmount($item`ancient cure-all`) > 0 ||
              itemAmount($item`soft green echo eyedrop antidote`) > 0
            ) {
              uneffect(effect);
            }
            if (have(effect)) {
              print(
                `${effect} deals passive damage and cannot be shrugged; Shub's retaliation will double on it. Cure it (antidote/cure-all) and rerun, or accept the risk.`,
                "red",
              );
            }
          }
          if (currentPolicy().shubInsurancePulls || myBuffedstat($stat`Muscle`) < 1250) {
            if (
              itemAmount($item`gremlin juice`) === 0 &&
              !pulledToday($item`gremlin juice`) &&
              pullBudgetAllows($item`gremlin juice`)
            ) {
              pullSequence($item`gremlin juice`);
            }
            if (
              itemAmount($item`handful of hand chalk`) === 0 &&
              !pulledToday($item`handful of hand chalk`) &&
              pullBudgetAllows($item`handful of hand chalk`)
            ) {
              pullSequence($item`handful of hand chalk`);
            }
          }
          if (itemAmount($item`gremlin juice`) > 0) use($item`gremlin juice`);
          if (itemAmount($item`handful of hand chalk`) > 0) use($item`handful of hand chalk`);
          recover(myMaxhp(), 0);
          if (have($skill`Ruthless Efficiency`)) useSkill($skill`Ruthless Efficiency`);
          if (have($skill`Empathy of the Newt`)) cliExecute("cast * empathy of the newt");
        },
        do: () => void adv1($location`Mer-kin Temple (Left Door)`, -1, shubFilter()),
        outfit: () => ({
          modifier: "damage absorption, mus",
          equip: [$item`Mer-kin gladiator mask`, $item`Mer-kin gladiator tailpiece`],
          familiar: have($familiar`Peace Turkey`) ? $familiar`Peace Turkey` : expFamiliar(),
        }),
        underwater: true,
        limit: {
          tries: 4,
          message:
            "Shub keeps winning; stock more delevelers (each loss also weakens him) and rerun.",
        },
      },
    ],
  };
}
