import { adv1, haveEffect, itemAmount, print, use, useSkill } from "kolmafia";
import { $effect, $item, $items, $location, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy, fishMacro, openerOnce } from "../../engine/combat";
import { kramcoIfDue } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pawWish } from "../../resources/paw";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const rift = $location`Shadow Rift (The Misspelled Cemetary)`;
const phone = $item`closed-circuit pay phone`;
const lodestone = $item`Rufus's shadow lodestone`;
const lasso = $item`sea lasso`;
const affinity = $effect`Shadow Affinity`;
const waters = $effect`Shadow Waters`;
const monodent = $item`Monodent of the Sea`;

function riftFightsFree(): boolean {
  return haveEffect(affinity) > 0 || !get("_shadowAffinityToday", false);
}

function training(): number {
  return get("lassoTrainingCount", 0);
}

function trainingGearReady(): boolean {
  return have($item`sea cowboy hat`) && have($item`sea chaps`);
}

const slab = $monster`shadow slab`;

function slabMacro(): Macro {
  const macro = new Macro();
  if (itemAmount($item`Septapus summoning charm`) > 0) {
    macro.tryItem($item`Septapus summoning charm`);
  }
  macro.trySkill($skill`Swoop like a Bat`);
  macro.trySkill($skill`Perpetrate Mild Evil`);
  if (!get("_douseFoeSuccess", false)) {
    const douses = Math.max(0, 3 - get("_douseFoeUses", 0));
    for (let i = 0; i < douses; i++) macro.trySkill($skill`Douse Foe`);
  }
  return macro;
}

function riftCombat(): CombatStrategy {
  const strategy = new CombatStrategy();
  strategy.startingMacro(() =>
    get("_seadentWaveUsed", false) &&
    trainingGearReady() &&
    training() < 20 &&
    itemAmount(lasso) > 0
      ? openerOnce(Macro.tryItem(lasso), 1)
      : new Macro(),
  );
  strategy.macro(slabMacro, slab);
  strategy.macro(fishMacro);
  return strategy.kill();
}

function riftOutfit() {
  return {
    modifier: "item",
    equip: [
      monodent,
      ...$items`Flash Liquidizer Ultra Dousing Accessory, bat wings`,
      ...kramcoIfDue(),
      ...(training() < 20 ? $items`sea cowboy hat, sea chaps` : []),
    ],
  };
}

function riftPrepare(): void {
  recover();
  if (trainingGearReady() && training() < 20 && itemAmount(lasso) === 0 && !pawWish(lasso)) {
    print(
      "Paw wish for a sea lasso produced nothing (wishes spent pre-run?); pulling instead.",
      "red",
    );
    if (pullBudgetAllows(lasso)) pullSequence(lasso);
  }
}

function riftPost(): void {
  if (!get("_seadentWaveUsed", false) && have($skill`Sea *dent: Summon a Wave`)) {
    useSkill($skill`Sea *dent: Summon a Wave`);
  }
}

export function shadowRiftQuest(): Quest {
  return {
    name: "Shadow Rift",
    tasks: [
      {
        name: "Rufus Quest",
        ready: () =>
          have(phone) &&
          get("questRufus") === "unstarted" &&
          !have(lodestone) &&
          get("encountersUntilSRChoice", 11) > 9 &&
          (!have(waters) || !get("_shadowForestLooted", false)),
        completed: () => get("questRufus") !== "unstarted" || have(lodestone),
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Rufus Labyrinth",
        ready: () =>
          have(phone) &&
          get("questRufus") === "started" &&
          get("rufusQuestType") === "artifact" &&
          (!have(waters) || trainingGearReady()) &&
          (riftFightsFree() ||
            get("encountersUntilSRChoice", 11) === 0 ||
            get("noncombatForcerActive")),
        completed: () => get("questRufus") !== "started",
        prepare: (): void => {
          riftPrepare();
          if (!have(waters) && get("encountersUntilSRChoice", 11) > 0) forceNextNoncombat();
        },
        do: rift,
        post: riftPost,
        batWings: true,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 16, message: "The Labyrinth of Shadows is not producing the artifact." },
      },
      {
        name: "Rufus Turn-in",
        ready: () => have(phone) && get("questRufus") === "step1",
        completed: () => get("questRufus") !== "step1",
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Loded Stone",
        ready: () => have(lodestone),
        completed: () => !have(lodestone),
        prepare: riftPrepare,
        do: () => void adv1(rift, -1, ""),
        post: riftPost,
        batWings: true,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { tries: 2 },
      },
      {
        name: "Rift Fights",
        ready: () => have(phone) && trainingGearReady() && have(waters) && riftFightsFree(),
        completed: () => !riftFightsFree(),
        prepare: riftPrepare,
        do: rift,
        post: riftPost,
        batWings: true,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 14, message: "Shadow Affinity is not draining; check the rift fights." },
      },
    ],
  };
}
