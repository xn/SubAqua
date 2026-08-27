import {
  availableAmount,
  buy,
  closetAmount,
  equip,
  itemAmount,
  maximize,
  pullsRemaining,
  putCloset,
  restoreHp,
  takeCloset,
  use,
  useSkill,
} from "kolmafia";
import { $coinmaster, $item, $location, $monster, $skill, $slot, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { isKnucklebonesAndSushiEnough } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

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

function vocabularyDone(): boolean {
  return get("merkinVocabularyMastery", 0) >= 90 || isKnucklebonesAndSushiEnough();
}

export function schoolQuest(): Quest {
  return {
    name: "School",
    tasks: [
      {
        // Clue 3 first — it feeds the seed scan before any school turn is
        // spent (ash casts it at UTS:2486-2492). Deep Dark Visions must be
        // permed (sim.ts warns); without it the clue can still arrive by
        // seed inference.
        name: "Deep Dark Visions",
        ready: () => have($skill`Deep Dark Visions`),
        completed: () => get("dreadScroll3", 0) !== 0,
        do: (): void => {
          maximize("50 spooky res, hp", false);
          restoreHp(1000);
          useSkill($skill`Deep Dark Visions`);
        },
        freeaction: true,
        limit: { tries: 12, message: "Deep Dark Visions is not yielding dreadscroll clue 3." },
      },
      {
        // Teacher's lounge unlock via -combat NCs (ash UTS:2508-2528 /
        // 2582-2598). Choice handlers 396-398 take every unlock. The short
        // route escapes as soon as the cowl+rope pair lands.
        name: "School Unlocks",
        completed: () => get("merkinElementaryTeacherUnlock", false) || cowlAndRope(),
        prepare: (): void => {
          putCloset(itemAmount(hallpass), hallpass);
          recover();
        },
        do: school,
        combat: new CombatStrategy().kill(),
        outfit: () => ({
          modifier: "-combat",
          equip: crappyPieces,
          familiar: sneakFamiliar(),
        }),
        effects: sneakEffects,
        limit: { soft: 15, message: "The teacher's lounge is not unlocking (choices 396-398)." },
      },
      {
        // Long route: spend quizzes whenever a cheatsheet is on hand.
        name: "Use Wordquiz",
        ready: () =>
          !isKnucklebonesAndSushiEnough() &&
          itemAmount(wordquiz) > 0 &&
          (itemAmount(cheatsheet) > 0 || pullsRemaining() > 0),
        completed: vocabularyDone,
        do: (): void => {
          if (itemAmount(cheatsheet) === 0) pullSequence(cheatsheet);
          if (itemAmount(cheatsheet) > 0) use(wordquiz);
        },
        freeaction: true,
        limit: { tries: 15, message: "Wordquiz uses are not raising merkinVocabularyMastery." },
      },
      {
        // Long route: farm monitors (cheatsheets), the bunwig, and quizzes.
        // Peridot pins the monitor (engine choice-1557 write); the ash used
        // mimic eggs (choiceAdventure1589 victim=852, UTS:1015) — Peridot is
        // our already-built equivalent. Duplicate doubles the drop table
        // (1/day; trySkill self-gates once spent).
        name: "Farm School",
        ready: () => !isKnucklebonesAndSushiEnough(),
        completed: () =>
          vocabularyDone() ||
          (itemAmount(wordquiz) > 0 && (itemAmount(cheatsheet) > 0 || pullsRemaining() > 0)),
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          recover();
        },
        do: school,
        peridot: monitor,
        combat: new CombatStrategy().macro(() => Macro.trySkill($skill`Duplicate`), monitor).kill(),
        outfit: () => ({
          modifier: availableAmount(bunwig) > 0 ? "item" : "item, hat drop",
          equip: crappyPieces,
        }),
        effects: itemDropEffects,
        limit: { soft: 30, message: "School farming is not producing cheatsheets/wordquizzes." },
      },
      {
        // Both routes: the facecowl/waistrope pair for scholar gear
        // (+item; ash UTS:2600-2614 incl. the hallpass top-up pull).
        name: "Cowl and Rope",
        completed: cowlAndRope,
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          if (
            (availableAmount(facecowl) > 0 || availableAmount(waistrope) > 0) &&
            availableAmount(hallpass) === 0 &&
            pullBudgetAllows(hallpass)
          ) {
            pullSequence(hallpass);
          }
          recover();
        },
        do: school,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item", equip: crappyPieces },
        effects: itemDropEffects,
        limit: { soft: 20, message: "The facecowl/waistrope pair is not dropping." },
      },
      {
        // Grandma trade (ash buyScholarGear G:419-432): hat/pants must be
        // bare — the pieces being traded may be worn.
        name: "Buy Scholar Gear",
        ready: cowlAndRope,
        completed: () =>
          availableAmount($item`Mer-kin scholar mask`) > 0 &&
          availableAmount($item`Mer-kin scholar tailpiece`) > 0,
        do: (): void => {
          equip($slot`hat`, $item.none);
          equip($slot`pants`, $item.none);
          equip($item`really, really nice swimming trunks`);
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
