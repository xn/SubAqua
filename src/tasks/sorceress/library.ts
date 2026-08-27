import {
  abort,
  availableAmount,
  fullnessLimit,
  itemAmount,
  myFullness,
  retrieveItem,
  use,
} from "kolmafia";
import { $effect, $item, $location, $monster, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { godRunGuardCheck } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { eatSushi } from "../../resources/fishy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";
import { saberForcesFree } from "../../resources/saber";

import { burnTurnElsewhere } from "./burn";
import { sourceEnhanceItems } from "./daily";

const library = $location`Mer-kin Library`;
const dreadscroll = $item`Mer-kin dreadscroll`;
const researcher = $monster`Mer-kin researcher`;
const scholarPieces = [$item`Mer-kin scholar mask`, $item`Mer-kin scholar tailpiece`];
const worktea = $item`Mer-kin worktea`;
const knucklebone = $item`Mer-kin knucklebone`;
const healscroll = $item`Mer-kin healscroll`;
const killscroll = $item`Mer-kin killscroll`;
const zirconia = $item`blood cubic zirconia`;
const monodent = $item`Monodent of the Sea`;

function catalogCluesKnown(): boolean {
  return [1, 6, 8].every((n) => get(`dreadScroll${n}`, 0) !== 0);
}

/**
 * Upstream 2026-08-26 (UTS:778-781 @89982f5): the zirconia's gaze only earns
 * the accessory slot while scroll drops are still WANTED — a second healscroll,
 * the worktea/knucklebone that carry clue 7, or the killscroll that carries
 * clue 5. Once those are in hand the slot goes back to the maximizer.
 *
 * Deliberately separate from the outfit's `scrollsMissing`, which answers a
 * different question (saber-vs-monodent for the weapon slot, UTS:769-776).
 */
function bczWanted(): boolean {
  return (
    itemAmount(healscroll) < 2 ||
    (itemAmount(worktea) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(knucklebone) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(killscroll) === 0 && get("dreadScroll5", 0) === 0)
  );
}

export function libraryQuest(): Quest {
  return {
    name: "Library",
    tasks: [
      {
        // Farm the dreadscroll + catalog clues 1/6/8 (choice 704, handled in
        // the bundle; mafia tracks merkinCatalogChoices). Outfit flips like
        // the ash (merkinLib G:726-760): +item while the scroll is missing
        // (researcher scrolls, worktea, knucklebone are the 10% slots),
        // -combat once it drops (the remaining need is the catalog NC). The
        // researcher saber Force lands both combat scrolls in one charge —
        // the monodent stays OUT of the weapon slot while a spare charge
        // exists (G:733-748); Phase 3's engine handles the equip.
        name: "Library Farm",
        completed: () => availableAmount(dreadscroll) > 0 && catalogCluesKnown(),
        prepare: (): void => {
          sourceEnhanceItems();
          recover();
        },
        do: library,
        saberPurpose: "researcher",
        combat: new CombatStrategy()
          .macro(() => {
            // Combat clue throws (CCS:1155-1163; every library monster is
            // mer-kin phylum, so no phylum guard needed here).
            const m = new Macro();
            if (get("dreadScroll2", 0) === 0) m.tryItem(healscroll);
            if (get("dreadScroll5", 0) === 0) m.tryItem(killscroll);
            return m;
          })
          .forceItems(researcher)
          .kill(),
        outfit: () => {
          const scrollsMissing =
            itemAmount(killscroll) === 0 ||
            itemAmount(healscroll) === 0 ||
            itemAmount(worktea) === 0 ||
            itemAmount(knucklebone) === 0;
          const saberForResearcher =
            scrollsMissing && saberForcesFree() > 0 && have($item`Fourth of May Cosplay Saber`);
          const weapon = !saberForResearcher && scrollsMissing && have(monodent) ? [monodent] : [];
          // grimoire throws when asked to equip something unowned
          // (outfit.js:305-309), so the accessory is have()-gated; `avoid`
          // hands the slot back to the maximizer once the drops are in.
          const wantZirconia = bczWanted();
          const accessory = wantZirconia && have(zirconia) ? [zirconia] : [];
          const avoid = wantZirconia ? [] : [zirconia];
          if (availableAmount(dreadscroll) === 0) {
            return {
              modifier: "item",
              equip: [...scholarPieces, ...weapon, ...accessory],
              avoid,
            };
          }
          return {
            modifier: "-combat",
            equip: [...scholarPieces, ...accessory],
            avoid,
            familiar: sneakFamiliar(),
          };
        },
        effects: () => (availableAmount(dreadscroll) === 0 ? itemDropEffects() : sneakEffects()),
        limit: {
          soft: 30,
          message: "Library is yielding neither the dreadscroll nor catalog clues.",
        },
      },
      {
        // Clue 4 (ash UTS:2629-2634): knucklebone bounce.
        name: "Knucklebone",
        ready: () => availableAmount(dreadscroll) > 0 && get("dreadScroll4", 0) === 0,
        completed: () => get("dreadScroll4", 0) !== 0,
        do: (): void => {
          if (
            itemAmount(knucklebone) === 0 &&
            !pulledToday(knucklebone) &&
            pullBudgetAllows(knucklebone)
          ) {
            pullSequence(knucklebone);
          }
          if (itemAmount(knucklebone) === 0) {
            abort(
              "No Mer-kin knucklebone (drop it in the library or load one in Hagnk's); acquire one and rerun.",
            );
          }
          use(knucklebone);
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Clue 7 (ash UTS:2635-2640): any sushi eaten while holding a
        // worktea drinks the tea (SushiRequest.java:542-543). Skipped when
        // vocabulary can read the scroll line (>= 90); the 703 handler
        // brute-forces the single unknown otherwise.
        name: "Worktea Sushi",
        ready: () =>
          availableAmount(dreadscroll) > 0 &&
          get("dreadScroll7", 0) === 0 &&
          get("merkinVocabularyMastery", 0) < 90,
        completed: () => get("dreadScroll7", 0) !== 0 || get("merkinVocabularyMastery", 0) >= 90,
        do: (): void => {
          // The tea must be IN INVENTORY before the nigiri is eaten — eating
          // is what drinks it and writes dreadScroll7, so this ordering is
          // load-bearing, not incidental.
          if (itemAmount(worktea) === 0 && !pulledToday(worktea) && pullBudgetAllows(worktea)) {
            pullSequence(worktea);
          }
          if (itemAmount(worktea) === 0) {
            abort(
              "No Mer-kin worktea for clue 7 (farm the library alphabetizer or load one in Hagnk's), or raise vocabulary to 90; then rerun.",
            );
          }
          if (fullnessLimit() - myFullness() < 2) {
            abort(
              "No room for a 2-fullness nigiri to drink the worktea; free up fullness and rerun.",
            );
          }
          retrieveItem($item`white rice`);
          if (!eatSushi()) {
            abort(
              "Could not roll a nigiri (need fish meat + white rice + the sushi mat); fix supplies and rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Use the scroll; a wrong guess grants Deep-Tainted Mind, burned on
        // the skate/gym ladder (ash High Priest loop UTS:2682-2723).
        name: "High Priest",
        ready: () => availableAmount(dreadscroll) > 0 && catalogCluesKnown(),
        completed: () => get("isMerkinHighPriest", false),
        do: (): void => {
          if (have($effect`Deep-Tainted Mind`)) {
            if (!burnTurnElsewhere()) {
              abort(
                "Hit a 1-in-40 situation — spend 1 non-free turn anywhere and rerun (ash UTS:2719-2721).",
              );
            }
            return;
          }
          godRunGuardCheck();
          use(dreadscroll); // fires choice 703; the bundle submits the answers
        },
        underwater: true,
        limit: {
          soft: 40,
          message: "Not becoming High Priest; check dreadScroll* prefs and the 703 solver.",
        },
      },
    ],
  };
}
