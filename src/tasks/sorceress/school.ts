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
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { isKnucklebonesAndSushiEnough } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
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

/** "A cheatsheet is obtainable by pull" — a live check, never
 * `pullsRemaining() > 0`. The cheatsheet pull is once per day
 * (`pullSequence` refuses a repeat, pulls.ts:32) and every wordquiz use
 * consumes the sheet (UseItemRequest.java:4731-4733), so the stale proxy
 * deadlocks the long route: Use Wordquiz stays ready and no-ops while Farm
 * School believes a sheet is still coming. The ash falls back to farming
 * (UTS:2552-2560). Budget-gated so this pull can never eat a slot a live
 * reservation is holding (pulls.ts:148-151). */
function cheatsheetPullable(): boolean {
  return !pulledToday(cheatsheet) && pullBudgetAllows(cheatsheet);
}

/** The ash uneffects the sonata before the +item loop (UTS:2605). A 10-turn
 * -combat song carried out of School Unlocks would suppress the very monitor
 * and teacher combats the +item tasks farm. Only the sonata: the rest of
 * `sneakEffects` (Smooth Movements, Feeling Lonely) is what the ash leaves
 * alone. */
function dropSneakEffects(): void {
  if (have($effect`The Sonata of Sneakiness`)) uneffect($effect`The Sonata of Sneakiness`);
}

function vocabularyDone(): boolean {
  return get("merkinVocabularyMastery", 0) >= 90 || isKnucklebonesAndSushiEnough();
}

export function schoolQuest(): Quest {
  return {
    name: "School",
    // The ash wraps the whole school block in `if (isMerkinHighPriest ==
    // false)` (UTS:2501). Without it, gym.ts:82-87 selling the scholar gear
    // back after Yog-Urt flips cowlAndRope() false and re-opens "Cowl and
    // Rope" for another soft:20 turns of a job already done.
    completed: () => get("isMerkinHighPriest", false),
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
          restoreHp(1000);
          useSkill($skill`Deep Dark Visions`);
        },
        // The spooky-res/HP shell is the task's outfit, not a hand-rolled
        // maximize in do() (audit item 8): grimoire dresses a `freeaction` task
        // too, and dress() runs before do().
        outfit: { modifier: "50 spooky res, hp" },
        freeaction: true,
        limit: { tries: 12, message: "Deep Dark Visions is not yielding dreadscroll clue 3." },
      },
      {
        // Teacher's lounge unlock via -combat NCs (ash UTS:2508-2528 /
        // 2582-2598). Choice handlers 396-398 take every unlock. The short
        // route escapes as soon as the cowl+rope pair lands.
        name: "School Unlocks",
        // The cowl+rope escape belongs to the SHORT route only: the ash's
        // long branch loops `while (teacherUnlock == false && !libraryReady())`
        // with no break (UTS:2509), and the break exists solely in the short
        // branch (UTS:2596-2597). Escaping early on a long-route run whose
        // drops land first would leave all three unlock prefs unset
        // (ChoiceControl.java:5084-5103), putting NC 401 (wordquiz), NC 399
        // (monitor/cheatsheet) and the Mer-kin teacher — the only bunwig
        // source, monsters.txt:444 — out of reach while Farm School burns
        // soft:30 chasing an unobtainable hat.
        completed: () =>
          get("merkinElementaryTeacherUnlock", false) ||
          (isKnucklebonesAndSushiEnough() && cowlAndRope()),
        prepare: (): void => {
          putCloset(itemAmount(hallpass), hallpass);
          recover();
        },
        do: school,
        backup: { targets: "free" }, // ash CCS:969-971
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
        // Long route: farm monitors (cheatsheets), the bunwig, and quizzes.
        // Peridot pins the monitor (engine choice-1557 write); the ash used
        // mimic eggs (choiceAdventure1589 victim=852, UTS:1015) — Peridot is
        // our already-built equivalent. Duplicate doubles the drop table
        // (1/day, once per combat; openerOnce() keeps a macro re-run from
        // re-issuing it — `hasskill` only asks whether the skill is on the
        // page, not whether its use is spent).
        name: "Farm School",
        ready: () => !isKnucklebonesAndSushiEnough(),
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
        backup: { targets: "free" }, // ash CCS:969-971, camera worn UTS:1039
        peridot: monitor,
        combat: new CombatStrategy()
          .macro(() => openerOnce(Macro.trySkill($skill`Duplicate`)), monitor)
          .kill(),
        outfit: () => ({
          modifier: availableAmount(bunwig) > 0 ? "item" : "item, hat drop",
          equip: crappyPieces,
        }),
        effects: itemDropEffects,
        limit: { soft: 30, message: "School farming is not producing cheatsheets/wordquizzes." },
      },
      {
        // Both routes: the facecowl/waistrope pair for scholar gear (ash
        // UTS:2600-2614 incl. the hallpass top-up pull).
        //
        // The pair is NOT a combat drop — no school monster drops either
        // piece (monsters.txt:435-444). Each piece rides a teacher's-lounge
        // NC result ("On your way out..."): Raising Cane option 2, or, with
        // a hallpass in inventory, Halls Passing in the Night option 4 —
        // both already the choice script's picks. Halls Passing is a
        // SUPERLIKELY (wiki, live 2026-08-30): it fires through any ±combat
        // and consumes the pass, which is why the ash's +combat cowl loop
        // (UTS:2694-2703) works only while hallpasses are stocked — its
        // -combat unlock grinds usually deliver the pair before that loop
        // runs at all. Porting the loop's "+combat, NCs are pure delay"
        // moods as the PRIMARY source stalled live 2026-08-30: zero
        // hallpasses, 20 straight combats, zero NCs, zero pieces. So hunt
        // -combat like Unlock Teacher (hallpasses, when held, are consumed
        // by the superlikely regardless; +item converts the residual fights'
        // 5% hallpass drops into more 705s), and keep sneak effects up
        // instead of shrugging them.
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
        outfit: () => ({
          modifier: "-combat, item",
          equip: crappyPieces,
          familiar: sneakFamiliar(),
        }),
        effects: sneakEffects,
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
          // Coinmaster-token requirement, not an outfit preference:
          // CoinmasterData.availableTokens counts INVENTORY only, so the pieces
          // being traded have to come off first — which is why no `avoid` field
          // replaces these two lines.
          equip($slot`hat`, $item.none);
          equip($slot`pants`, $item.none);
          // Deliberately NO breathing pass here (audit item 3, as re-ruled).
          // GrandmaRequest.java gates the shop on the Sea Monkee quest step
          // alone — no breathing requirement — and the next task's dress()
          // re-establishes breathing anyway. Re-dressing here would be actively
          // harmful: ROW129 is paid in `crappy Mer-kin mask`
          // (coinmasters.txt:689), itself a waterBreathingEquipment member, so
          // a breathing pick could put the token back on the hat we just
          // blanked and the buy() below would no-op against availableTokens.
          // The old unconditional trunks equip is gone for the same reason it
          // always should have been: it ignored Driving Waterproofly and the
          // lasso-pinned sea chaps.
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
