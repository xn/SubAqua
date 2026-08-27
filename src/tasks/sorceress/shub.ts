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
import { $item, $location, $skill, $stat, get, have, uneffect } from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { dealsPassiveDamage, shrugBadEffects, survivalEffects } from "../../lib/moods";
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
        // `|| shubJigguwattDefeated`: the fight spends the delevel stock (and
        // Null Afternoon lapses), so shubPrepShort(0) goes true again right
        // after the prep has done its job — without the OR this task reports
        // incomplete-but-unavailable for the rest of the run.
        completed: () => get("shubJigguwattDefeated", false) || !shubPrepShort(0),
        do: (): void => {
          // Two statements, like the ash (UTS ab1105e:2895-2897): pull only
          // when the pack is empty — collapsing them into one chain both
          // buys a duplicate over an exploit already on hand and leaves that
          // exploit unused, aborting at a user who did exactly what the abort
          // told them to do.
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
        // Damage mitigation, damage-free: the whole point of his filter is
        // that we deal no damage until the swings, so anything with Thorns /
        // Damage Aura is filtered out by survivalEffects({ damageFree: true })
        // (see also the bad-effect sweep in prepare, which is that same rule
        // applied to whatever an earlier task's mood left up). What
        // survives is pure Damage Absorption / resistance, which pairs with
        // this task's own "damage absorption, mus" maximize.
        effects: () => survivalEffects({ damageFree: true }),
        prepare: (): void => {
          // Scarysauce (Thorns 1) was the ash's one named case; the sweep
          // generalizes it to every passive-damage / teleportitis / fumble
          // effect, with NO exclusion list here — this is the fight where a
          // thorns tick doubles his retaliation (fights.ts:392-397), so even
          // the route's own res-mood casts go.
          const stuck = shrugBadEffects().filter((effect) => dealsPassiveDamage(effect));
          for (const effect of stuck) {
            // The targeted exception: an item cure is spending, so it is
            // allowed only out of what is already in the pack. mafia's own
            // fallback order is the cure-all, then the antidote
            // (UneffectRequest:836-841); with one of them in inventory
            // retrieveItem() cannot reach the mall.
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
