import { adv1, haveEffect, itemAmount, use, useSkill } from "kolmafia";
import { $effect, $item, $items, $location, $skill, get, have, Macro } from "libram";

import { CombatStrategy, fishMacro, openerOnce } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pawWish } from "../../resources/paw";

const rift = $location`Shadow Rift (The Misspelled Cemetary)`;
const phone = $item`closed-circuit pay phone`;
const lodestone = $item`Rufus's shadow lodestone`;
const lasso = $item`sea lasso`;
const affinity = $effect`Shadow Affinity`;
const waters = $effect`Shadow Waters`;
const monodent = $item`Monodent of the Sea`;

/** Free rift fights remain today: the affinity is up, or not yet claimed
 * (ash shadowRift() gate UTS:849-850). */
function riftFightsFree(): boolean {
  return haveEffect(affinity) > 0 || !get("_shadowAffinityToday", false);
}

function training(): number {
  return get("lassoTrainingCount", 0);
}

/** The +3/throw training gear (ash pins both while training < 20, UTS:876). */
function trainingGearReady(): boolean {
  return have($item`sea cowboy hat`) && have($item`sea chaps`);
}

/** Rift fight (ash CCS:532-554, mid tier): lasso on round 1 once the wave is
 * up, Talk to Some Fish while scales are short, then the kill ladder (darts
 * included). Septapus charms, bat-wing swoops, Mild Evil and FLUDA dousing
 * are deliberately not ported (no censer/cloake support; bat wings are
 * banked, plan Task 4; the FLUDA pull slot went to the bang potions). */
function riftCombat(): CombatStrategy {
  const strategy = new CombatStrategy();
  strategy.startingMacro(() =>
    get("_seadentWaveUsed", false) && training() < 20 && itemAmount(lasso) > 0
      ? openerOnce(Macro.tryItem(lasso), 1)
      : new Macro(),
  );
  strategy.macro(fishMacro);
  return strategy.kill();
}

function riftOutfit() {
  return {
    modifier: "item",
    equip: [monodent, ...(training() < 20 ? $items`sea cowboy hat, sea chaps` : [])],
  };
}

export function shadowRiftQuest(): Quest {
  return {
    name: "Shadow Rift",
    tasks: [
      {
        // Ash UTS:851-853, 862-869: an artifact quest from Rufus (choice
        // 1497 -> 2, standalone/choice.ts). Twice a day: before Shadow
        // Waters (its lodestone unlocks the waters) and again once the waters
        // are up but the affinity is unclaimed (its lodestone is the forest
        // loot). Never a third: with the affinity spent and the waters up the
        // second disjunct is false.
        name: "Rufus Quest",
        ready: () =>
          have(phone) &&
          trainingGearReady() &&
          get("questRufus") === "unstarted" &&
          !have(lodestone) &&
          get("encountersUntilSRChoice", 11) > 9 &&
          (!have(waters) || riftFightsFree()),
        completed: () => get("questRufus") !== "unstarted" || have(lodestone),
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:853-855: force the Labyrinth NC (mafia picks the artifact's
        // theme, RufusManager.shadowLabyrinthChoiceDecision). The second
        // quest's Labyrinth arrives naturally at encountersUntilSRChoice 0,
        // so the forcer is only armed while fights are still owed. A fight
        // that lands instead is a normal rift fight (same combat/outfit).
        name: "Rufus Labyrinth",
        ready: () =>
          have(phone) && get("questRufus") === "started" && get("rufusQuestType") === "artifact",
        completed: () => get("questRufus") !== "started",
        prepare: (): void => {
          recover();
          if (get("encountersUntilSRChoice", 11) > 0) forceNextNoncombat();
        },
        do: rift,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 12, message: "The Labyrinth of Shadows is not producing the artifact." },
      },
      {
        // Ash UTS:856, 2545: hand the artifact in (choice 1498 -> 1) for the
        // lodestone.
        name: "Rufus Turn-in",
        ready: () => have(phone) && get("questRufus") === "step1",
        completed: () => get("questRufus") !== "step1",
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // The lodestone makes the next rift adventure "Like a Loded Stone"
        // (choice 1500: Shadow Waters first, forest loot second — the
        // choice script decides). Ash UTS:857, 2546. Cast the wave here, right
        // after a rift adventure, the way the ash does (UTS:853-855): the
        // lasso throw in the rift is gated on it (CCS:534).
        name: "Loded Stone",
        ready: () => have(lodestone),
        completed: () => !have(lodestone),
        do: (): void => {
          adv1(rift, -1, "");
          if (!get("_seadentWaveUsed", false) && have($skill`Sea *dent: Summon a Wave`)) {
            useSkill($skill`Sea *dent: Summon a Wave`);
          }
        },
        combat: riftCombat(),
        outfit: riftOutfit,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:858-897 + 2432-2439 + 2536-2547: spend the day's free rift
        // fights — seven lasso throws train to 20, the rest are shadow bricks
        // (13 free kills' worth over the day) and Fishy. Runs only under
        // Shadow Waters like the ash. A lasso is wished for when the stock is
        // dry mid-training (UTS:864-868).
        name: "Rift Fights",
        ready: () => have(phone) && trainingGearReady() && have(waters) && riftFightsFree(),
        completed: () => !riftFightsFree(),
        prepare: (): void => {
          recover();
          if (training() < 20 && itemAmount(lasso) === 0) pawWish(lasso);
        },
        do: rift,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 14, message: "Shadow Affinity is not draining; check the rift fights." },
      },
    ],
  };
}
