import {
  availableAmount,
  buy,
  closetAmount,
  equip,
  itemAmount,
  putCloset,
  restoreHp,
  takeCloset,
  use,
  useSkill,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $item,
  $location,
  $monster,
  $skill,
  $slot,
  get,
  have,
  Macro,
  uneffect,
} from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { kramcoIfDue, sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { isKnucklebonesAndSushiEnough } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { freeMonsters } from "../../resources/backup";
import { bczAffordable } from "../../resources/freekill";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

import { sourceEnhanceItems } from "./daily";

const school = $location`Mer-kin Elementary School`;
const hallpass = $item`Mer-kin hallpass`;
const cheatsheet = $item`Mer-kin cheatsheet`;
const wordquiz = $item`Mer-kin wordquiz`;
const facecowl = $item`Mer-kin facecowl`;
const waistrope = $item`Mer-kin waistrope`;
const bunwig = $item`Mer-kin bunwig`;
const monitor = $monster`Mer-kin monitor`;
const crappyPieces = [$item`crappy Mer-kin mask`, $item`crappy Mer-kin tailpiece`];

function cowlAndRope(): boolean {
  return (
    (availableAmount(facecowl) > 0 || availableAmount($item`Mer-kin scholar mask`) > 0) &&
    (availableAmount(waistrope) > 0 || availableAmount($item`Mer-kin scholar tailpiece`) > 0)
  );
}

function cheatsheetPullable(): boolean {
  return !pulledToday(cheatsheet) && pullBudgetAllows(cheatsheet);
}

function dropSneakEffects(): void {
  if (have($effect`The Sonata of Sneakiness`)) uneffect($effect`The Sonata of Sneakiness`);
}

function deepcityOpen(): boolean {
  return get("seahorseName", "") !== "";
}

function vocabularyDone(): boolean {
  return get("merkinVocabularyMastery", 0) >= 90 || isKnucklebonesAndSushiEnough();
}

const monodent = $item`Monodent of the Sea`;

function schoolLootMacro(): Macro {
  const steps = new Macro();
  if (have($skill`Sea *dent: Talk to Some Fish`)) {
    steps.trySkill($skill`Sea *dent: Talk to Some Fish`);
  }
  if (bczAffordable($skill`BCZ: Refracted Gaze`, 200)) {
    steps.trySkill($skill`BCZ: Refracted Gaze`);
  }
  if (steps.components.length === 0) return new Macro();
  return Macro.ifNot([...freeMonsters, monitor], openerOnce(steps, 3));
}

export function schoolQuest(): Quest {
  return {
    name: "School",
    completed: () => get("isMerkinHighPriest", false),
    tasks: [
      {
        name: "Deep Dark Visions",
        ready: () => have($skill`Deep Dark Visions`),
        completed: () => get("dreadScroll3", 0) !== 0,
        do: (): void => {
          restoreHp(1000);
          useSkill($skill`Deep Dark Visions`);
        },
        outfit: { modifier: "50 spooky res, hp" },
        freeaction: true,
        limit: { tries: 12, message: "Deep Dark Visions is not yielding dreadscroll clue 3." },
      },
      {
        name: "School Unlocks",
        ready: deepcityOpen,
        completed: () =>
          get("merkinElementaryTeacherUnlock", false) ||
          (isKnucklebonesAndSushiEnough() && cowlAndRope()),
        prepare: (): void => {
          putCloset(itemAmount(hallpass), hallpass);
          recover();
        },
        do: school,
        backup: { targets: "free" },
        combat: new CombatStrategy().macro(schoolLootMacro).kill(),
        outfit: () => ({
          modifier: "-combat",
          equip: [...crappyPieces, monodent, $item`blood cubic zirconia`],
          familiar: sneakFamiliar(),
        }),
        effects: sneakEffects,
        limit: { soft: 15, message: "The teacher's lounge is not unlocking (choices 396-398)." },
      },
      {
        name: "Use Wordquiz",
        ready: () =>
          !isKnucklebonesAndSushiEnough() &&
          itemAmount(wordquiz) > 0 &&
          (itemAmount(cheatsheet) > 0 || cheatsheetPullable()),
        completed: vocabularyDone,
        do: (): void => {
          if (itemAmount(cheatsheet) === 0 && cheatsheetPullable()) pullSequence(cheatsheet);
          if (itemAmount(cheatsheet) > 0) use(wordquiz);
        },
        freeaction: true,
        limit: { tries: 15, message: "Wordquiz uses are not raising merkinVocabularyMastery." },
      },
      {
        name: "Farm School",
        ready: () => deepcityOpen() && !isKnucklebonesAndSushiEnough(),
        completed: () =>
          vocabularyDone() ||
          (itemAmount(wordquiz) > 0 && (itemAmount(cheatsheet) > 0 || cheatsheetPullable())),
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          dropSneakEffects();
          sourceEnhanceItems();
          recover();
        },
        do: school,
        backup: { targets: "free" },
        peridot: monitor,
        combat: new CombatStrategy()
          .macro(() => openerOnce(Macro.trySkill($skill`Duplicate`)), monitor)
          .macro(schoolLootMacro)
          .kill(),
        outfit: () => ({
          modifier: availableAmount(bunwig) > 0 ? "item" : "item, hat drop",
          equip: [...crappyPieces, monodent, $item`blood cubic zirconia`, ...kramcoIfDue()],
        }),
        effects: itemDropEffects,
        limit: { soft: 30, message: "School farming is not producing cheatsheets/wordquizzes." },
      },
      {
        name: "Cowl and Rope",
        ready: deepcityOpen,
        completed: cowlAndRope,
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          if (availableAmount(hallpass) === 0 && pullBudgetAllows(hallpass)) {
            pullSequence(hallpass);
          }
          recover();
        },
        do: school,
        backup: { targets: "free" },
        combat: new CombatStrategy().macro(schoolLootMacro).kill(),
        outfit: () => ({
          modifier: "-combat",
          equip: [...crappyPieces, monodent, $item`blood cubic zirconia`],
          familiar: sneakFamiliar(),
        }),
        effects: sneakEffects,
        limit: { soft: 20, message: "The facecowl/waistrope pair is not dropping." },
      },
      {
        name: "Buy Scholar Gear",
        ready: cowlAndRope,
        completed: () =>
          availableAmount($item`Mer-kin scholar mask`) > 0 &&
          availableAmount($item`Mer-kin scholar tailpiece`) > 0,
        do: (): void => {
          equip($slot`hat`, $item.none);
          equip($slot`pants`, $item.none);
          if (availableAmount($item`Mer-kin scholar mask`) === 0) {
            buy($coinmaster`Grandma Sea Monkey`, 1, $item`Mer-kin scholar mask`);
          }
          if (availableAmount($item`Mer-kin scholar tailpiece`) === 0) {
            buy($coinmaster`Grandma Sea Monkey`, 1, $item`Mer-kin scholar tailpiece`);
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
