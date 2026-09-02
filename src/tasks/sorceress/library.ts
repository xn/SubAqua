import { OutfitSpec } from "grimoire-kolmafia";
import {
  abort,
  availableAmount,
  Effect,
  fullnessLimit,
  itemAmount,
  myFullness,
  retrieveItem,
  use,
} from "kolmafia";
import { $effect, $item, $location, $monster, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { kramcoIfDue, sneakFamiliar } from "../../engine/outfit";
import { Quest, Task } from "../../engine/task";
import { recover } from "../../lib";
import { godRunGuardCheck } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { eatSushi } from "../../resources/fishy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";
import { forceGranted } from "../../resources/saber";

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

function scholarGearReady(): boolean {
  return scholarPieces.every((piece) => have(piece));
}

function researcherForceWanted(): boolean {
  return itemAmount(killscroll) === 0 || itemAmount(healscroll) === 0;
}

function bczWanted(): boolean {
  return (
    itemAmount(healscroll) < 2 ||
    (itemAmount(worktea) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(knucklebone) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(killscroll) === 0 && get("dreadScroll5", 0) === 0)
  );
}

function clueThrows(): Macro {
  const needHeal = get("dreadScroll2", 0) === 0;
  const needKill = get("dreadScroll5", 0) === 0;
  const throws = new Macro();
  if (needHeal) throws.tryItem(healscroll);
  if (needKill) throws.tryItem(killscroll);
  if (!needHeal && !needKill) return throws;
  return researcherForceWanted() ? Macro.ifNot(researcher, throws) : throws;
}

function farmCompleted(): boolean {
  return availableAmount(dreadscroll) > 0 && catalogCluesKnown();
}

function farmPrepare(): void {
  sourceEnhanceItems();
  recover();
}

function farmOutfit(): OutfitSpec {
  const scrollsMissing =
    itemAmount(killscroll) === 0 ||
    itemAmount(healscroll) === 0 ||
    itemAmount(worktea) === 0 ||
    itemAmount(knucklebone) === 0;
  const saberForResearcher =
    scrollsMissing && forceGranted("researcher") && have($item`Fourth of May Cosplay Saber`);
  const weapon = !saberForResearcher && scrollsMissing && have(monodent) ? [monodent] : [];
  const accessory = bczWanted() ? [zirconia] : [];
  const avoid = bczWanted() ? [] : [zirconia];
  if (availableAmount(dreadscroll) === 0) {
    return {
      modifier: "item",
      equip: [...scholarPieces, ...weapon, ...accessory, ...kramcoIfDue()],
      avoid,
    };
  }
  return {
    modifier: "-combat",
    equip: [...scholarPieces, ...accessory],
    avoid,
    familiar: sneakFamiliar(),
  };
}

function farmEffects(): Effect[] {
  return availableAmount(dreadscroll) === 0 ? itemDropEffects() : sneakEffects();
}

function libraryFarmTask(force: boolean): Task {
  return {
    name: force ? "Library Force" : "Library Farm",
    ready: () => scholarGearReady() && researcherForceWanted() === force,
    completed: farmCompleted,
    prepare: farmPrepare,
    do: library,
    backup: { targets: "free" },
    ...(force ? { saberPurpose: "researcher" as const } : {}),
    combat: force
      ? new CombatStrategy().macro(clueThrows).forceItems(researcher).kill()
      : new CombatStrategy().macro(clueThrows).kill(),
    outfit: farmOutfit,
    effects: farmEffects,
    limit: {
      soft: 30,
      message: `Library is yielding neither the dreadscroll nor catalog clues (${
        force ? "scroll-Force" : "plain"
      } lane).`,
    },
  };
}

export function libraryQuest(): Quest {
  return {
    name: "Library",
    completed: () => get("isMerkinHighPriest", false),
    tasks: [
      libraryFarmTask(true),
      libraryFarmTask(false),
      {
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
        name: "Worktea Sushi",
        ready: () =>
          availableAmount(dreadscroll) > 0 &&
          get("dreadScroll7", 0) === 0 &&
          get("merkinVocabularyMastery", 0) < 90,
        completed: () => get("dreadScroll7", 0) !== 0 || get("merkinVocabularyMastery", 0) >= 90,
        do: (): void => {
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
          use(dreadscroll);
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
