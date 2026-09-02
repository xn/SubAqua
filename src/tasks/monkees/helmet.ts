import {
  abort,
  adv1,
  buy,
  itemAmount,
  pullsRemaining,
  retrieveItem,
  turnsPlayed,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, questStepOf, recover } from "../../lib";
import {
  applyEffects,
  combineMoods,
  itemDropEffects,
  sneakEffects,
  squintEffects,
  superItemDropEffects,
} from "../../lib/moods";
import { pawWish, pawWishesLeft } from "../../resources/paw";
import { pulledToday, pullSequence } from "../../resources/pulls";
import { forceGranted, hatBreatherOwned, rivetHuntActive } from "../../resources/saber";
import { summon, summonsAvailable } from "../../resources/summon";

const outpost = $location`The Mer-Kin Outpost`;
const wreck = $location`The Wreck of the Edgar Fitzsimmons`;
const diver = $monster`unholy diver`;
const mimic = $familiar`Chest Mimic`;

function hatchOpen(): boolean {
  const hatchTurn = get("_lastFitzsimmonsHatch", -1);
  return hatchTurn >= 0 && turnsPlayed() - hatchTurn < 20;
}

function rivetsDone(): boolean {
  return (
    itemAmount($item`rusty rivet`) >= 8 &&
    have($item`rusty porthole`) &&
    have($item`rusty broken diving helmet`)
  );
}

function helmetDone(): boolean {
  return !rivetHuntActive() || rivetsDone();
}

const rivet = $item`rusty rivet`;

function rivetGapOpen(): boolean {
  return (
    have($item`rusty porthole`) &&
    have($item`rusty broken diving helmet`) &&
    itemAmount(rivet) > 5 &&
    itemAmount(rivet) < 8
  );
}

function gainSandDollars(): void {
  while (itemAmount($item`Mer-kin thingpouch`) > 0) use($item`Mer-kin thingpouch`);
  while (itemAmount($item`sand dollar`) < 63 && itemAmount($item`sand penny`) >= 100) {
    buy($coinmaster`Wet Crap For Sale`, 1, $item`sand dollar`);
  }
  if (itemAmount($item`sand dollar`) < 63 && pullSequence($item`damp old wallet`)) {
    use($item`damp old wallet`);
  }
  if (itemAmount($item`sand dollar`) < 63) {
    if (
      have($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`) &&
      !get("_aug2Cast", false) &&
      get("_augSkillsCast", 0) < 5
    ) {
      useSkill($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`);
    } else if (have($item`11-leaf clover`) || pullSequence($item`11-leaf clover`)) {
      use($item`11-leaf clover`);
    }
    if (have($effect`Lucky!`)) adv1(outpost, -1, "");
  }
}

export function helmetQuest(opts: { summonLane: boolean }): Quest {
  return {
    name: "Helmet",
    tasks: [
      {
        name: "Sand Dollars",
        ready: () => get("bigBrotherRescued") && get("questS01OldGuy") === "started",
        completed: () =>
          itemAmount($item`sand dollar`) >= 63 ||
          get("dampOldBootPurchased") ||
          questStepOf("questS01OldGuy") === 999,
        do: gainSandDollars,
        underwater: true,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        prepare: () => recover(),
        limit: { soft: 8, message: "Sand dollars are short; farm Mer-kin thingpouches and rerun." },
      },
      {
        name: "Old Guy Boot",
        ready: () =>
          get("bigBrotherRescued") &&
          (itemAmount($item`sand dollar`) >= 63 || get("dampOldBootPurchased")),
        completed: () => questStepOf("questS01OldGuy") === 999,
        do: (): void => {
          if (!have($item`black glass`) && monkeesStep() < 12) {
            buy($coinmaster`Big Brother`, 1, $item`black glass`);
          }
          if (!get("dampOldBootPurchased")) buy($coinmaster`Big Brother`, 1, $item`damp old boot`);
          visitUrl(
            "place.php?whichplace=sea_oldman&action=oldman_oldman&preaction=pickreward&whichreward=6313",
          );
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Rivet Gap",
        ready: () =>
          rivetGapOpen() && (pawWishesLeft() > 0 || (!pulledToday(rivet) && pullsRemaining() > 0)),
        completed: () => !rivetGapOpen(),
        do: (): void => {
          while (rivetGapOpen() && pawWish(rivet));
          if (itemAmount(rivet) === 7) pullSequence(rivet);
        },
        freeaction: true,
        limit: {
          tries: 3,
          message: "Rivet wishes/pull are not landing; check the paw and Hagnk's.",
        },
      },
      ...(opts.summonLane
        ? [
            {
              name: "Diver Summon",
              ready: () => summonsAvailable() >= 1 && rivetHuntActive(),
              completed: helmetDone,
              do: () => summon(diver),
              saberPurpose: "diver" as const,
              combat: new CombatStrategy()
                .macro(() => openerOnce(Macro.trySkill($skill`%fn, lay an egg`)), diver)
                .forceItems(diver),
              outfit: () => ({
                modifier: "item",
                familiar: have(mimic) && mimic.experience >= 100 ? mimic : undefined,
              }),
              effects: () => combineMoods(superItemDropEffects(), itemDropEffects()),
              prepare: (): void => {
                recover();
                if (!forceGranted("diver")) applyEffects(squintEffects(), "Diver Summon");
              },
              limit: { tries: 5 },
            },
          ]
        : []),
      {
        name: "Wreck Rivets (hatch closed)",
        ready: () => rivetHuntActive() && !hatchOpen(),
        completed: helmetDone,
        do: wreck,
        freeRunBanishes: true,
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
        }),
        effects: sneakEffects,
        choices: { 299: 1 },
        prepare: () => recover(),
        limit: {
          soft: 20,
          message:
            "Down at the Hatch is hiding, so the hatch never reopens (it stays open ~20 turns once it does); check -combat sources.",
        },
      },
      {
        name: "Wreck Rivets",
        ready: () => rivetHuntActive() && hatchOpen(),
        completed: helmetDone,
        do: wreck,
        peridot: diver,
        saberPurpose: "diver" as const,
        combat: new CombatStrategy().forceItems(diver).banish(),
        outfit: { modifier: "item" },
        effects: () => combineMoods(superItemDropEffects(), itemDropEffects()),
        choices: { 299: 1 },
        prepare: (): void => {
          recover();
          if (!forceGranted("diver", wreck)) applyEffects(squintEffects(), "Wreck Rivets");
        },
        limit: { soft: 30, message: "Diver parts are not dropping; check item-drop gear." },
      },
      {
        name: "Craft Helmet",
        ready: rivetsDone,
        completed: hatBreatherOwned,
        do: (): void => {
          if (!retrieveItem($item`aerated diving helmet`)) {
            abort(
              "Rivet hunt parts are in hand but crafting the aerated diving helmet failed; check the bubblin' stone (and any other COMBINE/SUSE input), then rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
