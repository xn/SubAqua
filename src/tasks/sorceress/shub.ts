import {
  abort,
  adv1,
  cliExecute,
  itemAmount,
  myBuffedstat,
  myMaxhp,
  use,
  useSkill,
} from "kolmafia";
import { $effect, $item, $location, $skill, $stat, get, have } from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { shubPrepShort } from "../../lib/shub";
import { currentPolicy } from "../../resources/policy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

import { shubFilter } from "./fights";

export function shubQuest(): Quest {
  return {
    name: "Shub",
    tasks: [
      {
        // Delevel stock check (ash UTS:2878-2903): the null-day exploit's
        // Null Afternoon substitutes for the whole stock. The golem-summon
        // shortfall lane is dropped — shavings arrive via the Phase 3
        // grandpa golem lane + the standing 9-shaving pull reservation.
        // shubPrepShort(0), not (2): Yog-Urt is dead by the time this runs, so
        // nothing else is going to throw shavings. Only the pulls.ts
        // reservation, which is evaluated all day long, sets two aside (ash
        // globals.ash:226 vs UTS:2973).
        name: "Shub Prep",
        ready: () => get("isMerkinGladiatorChampion", false) && !get("shubJigguwattDefeated"),
        completed: () => !shubPrepShort(0),
        do: (): void => {
          if (
            !pulledToday($item`null-day exploit`) &&
            pullBudgetAllows($item`null-day exploit`) &&
            pullSequence($item`null-day exploit`)
          ) {
            use($item`null-day exploit`);
          }
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
        // The fight (UTS:2905-2955 + CCS:1251-1256): DA/mus outfit over the
        // gladiator set, the "exp" non-attacking familiar (an attacking one
        // deals damage and triggers his doubling retaliation, UTS:3002-3010),
        // insurance consumables, Ruthless Efficiency BEFORE the MP dump
        // ("emptying the pool blunts the pre-fight bolt", UTS:2946-2954), full
        // HP, then physical-only swings behind the multiplicative delevel. A
        // loss is a sanctioned retry (engine post()'s Shub carve-out): rerun
        // re-preps and re-enters.
        name: "Shub-Jigguwatt",
        ready: () => get("isMerkinGladiatorChampion", false) && !shubPrepShort(0),
        completed: () => get("shubJigguwattDefeated", false),
        prepare: (): void => {
          if (have($effect`Scarysauce`)) cliExecute("uneffect Scarysauce");
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
        // A function, not the brief's static literal: expFamiliar() has to be
        // read when the task runs, not when the quest list is built.
        outfit: () => ({
          modifier: "damage absorption, mus",
          equip: [$item`Mer-kin gladiator mask`, $item`Mer-kin gladiator tailpiece`],
          familiar: expFamiliar(),
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
