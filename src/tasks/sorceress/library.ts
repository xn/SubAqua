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

/**
 * The Mer-kin Library is outfit-gated ("Mer-kin Scholar's Vestments",
 * outfits.txt:65 / adventures.txt:304): without the two scholar pieces mafia
 * refuses the zone and the adventure costs nothing, so a farm task that ran
 * anyway would no-op its way to the soft limit and abort with a misleading
 * message. Upstream buys the gear immediately before the loop (UTS:2711);
 * here Task 10's school regime supplies it and this gate waits for it.
 */
function scholarGearReady(): boolean {
  return scholarPieces.every((piece) => have(piece));
}

/**
 * Upstream researcherForce (G:1019-1024 @89982f5) declines the Force once BOTH
 * combat scrolls are in hand — one charge lands the pair, and Library Farm
 * keeps running afterwards for the dreadscroll and the catalog NC. Selects
 * between the two farm lanes below.
 */
function researcherForceWanted(): boolean {
  return itemAmount(killscroll) === 0 || itemAmount(healscroll) === 0;
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

/**
 * Combat clue throws (CCS:1155-1163; every library monster is mer-kin phylum,
 * so no phylum guard needed here).
 *
 * The researcher is cut out of the throws while its Force is wanted. grimoire
 * compiles starting macro -> monster macros -> DEFAULT MACRO -> monster
 * actions (combat.js compile(), :242-266), so an unguarded throw fires ahead
 * of the `forceItems` action and the killscroll ("Deals tremendous Physical
 * Damage to Mer-kin", modifiers.txt:14101) would end the fight before `Use the
 * Force` ever ran. Upstream dispatches researcherForce at CCS:464, some 700
 * lines ahead of the throws.
 */
function clueThrows(): Macro {
  const needHeal = get("dreadScroll2", 0) === 0;
  const needKill = get("dreadScroll5", 0) === 0;
  const throws = new Macro();
  if (needHeal) throws.tryItem(healscroll);
  if (needKill) throws.tryItem(killscroll);
  // Never emit a bodyless `if ... endif` once both clues are known.
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

/**
 * Outfit flips like the ash (merkinLib G:726-760): +item while the scroll is
 * missing (researcher scrolls, worktea, knucklebone are the 10% slots),
 * -combat once it drops (the remaining need is the catalog NC). The researcher
 * saber Force lands both combat scrolls in one charge — the monodent stays OUT
 * of the weapon slot while a spare charge exists (G:733-748); Phase 3's engine
 * handles the equip.
 */
function farmOutfit(): OutfitSpec {
  const scrollsMissing =
    itemAmount(killscroll) === 0 ||
    itemAmount(healscroll) === 0 ||
    itemAmount(worktea) === 0 ||
    itemAmount(knucklebone) === 0;
  const saberForResearcher =
    scrollsMissing && forceGranted("researcher") && have($item`Fourth of May Cosplay Saber`);
  const weapon = !saberForResearcher && scrollsMissing && have(monodent) ? [monodent] : [];
  // Unowned entries in `equip`/`avoid` are filtered by the engine before
  // Outfit.from (engine.ts:302-303), so no have() gate is needed here; `avoid`
  // is what hands the accessory slot back to the maximizer once the drops are
  // in (upstream simply stops emitting its if_equip in the same branch).
  const accessory = bczWanted() ? [zirconia] : [];
  const avoid = bczWanted() ? [] : [zirconia];
  if (availableAmount(dreadscroll) === 0) {
    // Kramco when the goblin is due: gold's library farm was carried by the
    // sausage goblin + Back-Up chain (G:7414-7582, C F3).
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

/**
 * Farm the dreadscroll + catalog clues 1/6/8 (choice 704, handled in the
 * bundle; mafia tracks merkinCatalogChoices).
 *
 * Two lanes rather than one, because grimoire freezes a task's combat strategy:
 * getTasks() shallow-copies every task at build time (route.js:25) and the run
 * plan is built once (runplans.ts buildRunplan / main.ts:63), so `combat` and
 * `saberPurpose` cannot be recomputed per turn. `ready` picks the lane instead:
 * the Force lane while a combat scroll is missing, the plain-kill lane once
 * both are in hand (upstream researcherForce, G:1019-1024).
 */
function libraryFarmTask(force: boolean): Task {
  return {
    name: force ? "Library Force" : "Library Farm",
    ready: () => scholarGearReady() && researcherForceWanted() === force,
    completed: farmCompleted,
    prepare: farmPrepare,
    do: library,
    backup: { targets: "free" }, // ash CCS:1041-1044, camera worn UTS:761
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
    // The ash wraps school + library + scroll in `if (isMerkinHighPriest ==
    // false)` (UTS ab1105e:2497), and schoolQuest carries the same guard.
    // Without it the farm lanes re-open the instant the High Priest lands:
    // ChoiceControl.java:1332 consumes the dreadscroll on success
    // (processItem(DREADSCROLL, -1)), so farmCompleted()'s
    // `availableAmount(dreadscroll) > 0` flips back to false while the scholar
    // gear still makes a lane `ready` — and the engine would farm +item to the
    // soft:30 abort. grimoire ORs quest completion into every task
    // (route.js:31-35).
    completed: () => get("isMerkinHighPriest", false),
    tasks: [
      libraryFarmTask(true),
      libraryFarmTask(false),
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
