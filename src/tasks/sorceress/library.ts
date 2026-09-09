import { OutfitSpec } from "grimoire-kolmafia";
import {
  availableAmount,
  Effect,
  fullnessLimit,
  itemAmount,
  myAdventures,
  myFullness,
  retrieveItem,
  use,
} from "kolmafia";
import { $effect, $item, $location, $monster, get, have, set } from "libram";

import { args } from "../../args";
import { CombatStrategy } from "../../engine/combat";
import { kramcoIfDue, sneakFamiliar } from "../../engine/outfit";
import { Quest, Task } from "../../engine/task";
import { recover } from "../../lib";
import {
  godRunGuardCheck,
  guessReady,
  purchasableSplits,
  resolverState,
} from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { eatSushi } from "../../resources/fishy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";
import { forceGranted } from "../../resources/saber";
import { momFinishPending } from "../monkees/mom";

import { burnCapacity, burnTurnElsewhere } from "./burn";
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
const tainted = $effect`Deep-Tainted Mind`;

const BURN_PREF = "_subaqua_dreadBurn";

let knuckleboneDeclined = false;
let sushiDeclined = false;

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

function scrollOwned(): boolean {
  return availableAmount(dreadscroll) > 0;
}

function readReady(): boolean {
  return scrollOwned() && (catalogCluesKnown() || guessReady(burnCapacity()));
}

function burnFits(): boolean {
  const state = resolverState();
  return state !== undefined && state.worstBurn <= burnCapacity();
}

function purchaseWanted(clue: number): boolean {
  if (!scrollOwned() || get(`dreadScroll${clue}`, 0) !== 0) return false;
  if (resolverState() === undefined) return true;
  if (!purchasableSplits().includes(clue)) return false;
  return !burnFits() || !readReady();
}

function momFinishBurning(): boolean {
  return args.burnMomFinish && have(tainted) && momFinishPending();
}

function scrollOutfit(): OutfitSpec {
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
  return {
    modifier: "item",
    equip: [...scholarPieces, ...weapon, ...accessory, ...kramcoIfDue()],
    avoid,
  };
}

function catalogOutfit(): OutfitSpec {
  const accessory = bczWanted() ? [zirconia] : [];
  const avoid = bczWanted() ? [] : [zirconia];
  return {
    modifier: "-combat",
    equip: [...scholarPieces, ...accessory],
    avoid,
    familiar: sneakFamiliar(),
  };
}

function farmPrepare(): void {
  sourceEnhanceItems();
  recover();
}

function scrollTask(force: boolean): Task {
  return {
    name: force ? "Library Scroll Force" : "Library Scroll Farm",
    ready: () => scholarGearReady() && researcherForceWanted() === force,
    completed: scrollOwned,
    prepare: farmPrepare,
    do: library,
    backup: { targets: "free" },
    ...(force ? { saberPurpose: "researcher" as const } : {}),
    combat: force
      ? new CombatStrategy().forceItems(researcher).kill()
      : new CombatStrategy().kill(),
    outfit: scrollOutfit,
    effects: (): Effect[] => itemDropEffects(),
    limit: {
      soft: 30,
      message: `Library is not yielding the dreadscroll (${force ? "scroll-Force" : "plain"} lane).`,
    },
  };
}

export function libraryQuest(): Quest {
  return {
    name: "Library",
    completed: () => get("isMerkinHighPriest", false),
    tasks: [
      scrollTask(true),
      scrollTask(false),
      {
        name: "Knucklebone",
        ready: () => !knuckleboneDeclined && purchaseWanted(4),
        completed: () => knuckleboneDeclined || get("dreadScroll4", 0) !== 0,
        do: (): void => {
          if (
            itemAmount(knucklebone) === 0 &&
            !pulledToday(knucklebone) &&
            pullBudgetAllows(knucklebone)
          ) {
            pullSequence(knucklebone);
          }
          if (itemAmount(knucklebone) === 0) {
            knuckleboneDeclined = true;
            return;
          }
          use(knucklebone);
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Worktea Sushi",
        ready: () => !sushiDeclined && purchaseWanted(7) && get("merkinVocabularyMastery", 0) < 90,
        completed: () =>
          sushiDeclined || get("dreadScroll7", 0) !== 0 || get("merkinVocabularyMastery", 0) >= 90,
        do: (): void => {
          if (itemAmount(worktea) === 0 && !pulledToday(worktea) && pullBudgetAllows(worktea)) {
            pullSequence(worktea);
          }
          if (itemAmount(worktea) === 0 || fullnessLimit() - myFullness() < 2) {
            sushiDeclined = true;
            return;
          }
          retrieveItem($item`white rice`);
          if (!eatSushi()) sushiDeclined = true;
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Library Catalog",
        ready: () => scholarGearReady() && scrollOwned() && !readReady(),
        completed: readReady,
        prepare: farmPrepare,
        do: library,
        backup: { targets: "free" },
        combat: new CombatStrategy().kill(),
        outfit: catalogOutfit,
        effects: (): Effect[] => sneakEffects(),
        limit: {
          soft: 30,
          message:
            "Library catalog cards are not yielding clues 1/6/8 and the seed will not guess.",
        },
      },
      {
        name: "High Priest",
        ready: () => readReady() && !momFinishBurning(),
        completed: () => get("isMerkinHighPriest", false),
        do: (): void => {
          if (have(tainted)) {
            const before = myAdventures();
            if (!burnTurnElsewhere()) {
              throw "Deep-Tainted Mind is up and no burn target is left (skate war, gym guards, Mom Finish, Library). Spend 1 non-free turn anywhere and rerun.";
            }
            if (myAdventures() < before) set(BURN_PREF, get(BURN_PREF, 0) + 1);
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
