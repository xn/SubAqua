import {
  adv1,
  buy,
  itemAmount,
  pullsRemaining,
  retrieveItem,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $location,
  $monster,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { monkeesStep, questStepOf, recover } from "../../lib";
import {
  applyEffects,
  combineMoods,
  itemDropEffects,
  squintEffects,
  superItemDropEffects,
} from "../../lib/moods";
import { pawWish, pawWishesLeft } from "../../resources/paw";
import { pulledToday, pullSequence } from "../../resources/pulls";
import { diverHuntActive, forceGranted } from "../../resources/saber";
import { summon, summonsAvailable } from "../../resources/summon";

const outpost = $location`The Mer-Kin Outpost`;
const wreck = $location`The Wreck of the Edgar Fitzsimmons`;
const diver = $monster`unholy diver`;
const mimic = $familiar`Chest Mimic`;

function rivetsDone(): boolean {
  return (
    itemAmount($item`rusty rivet`) >= 8 &&
    have($item`rusty porthole`) &&
    have($item`rusty broken diving helmet`)
  );
}

function helmetDone(): boolean {
  return !diverHuntActive() || rivetsDone();
}

const rivet = $item`rusty rivet`;

/** A 6-7/8 rivet gap with the porthole and broken helmet already in hand:
 * cheaper to close with a wish or a pull than with another diver. */
function rivetGapOpen(): boolean {
  return (
    have($item`rusty porthole`) &&
    have($item`rusty broken diving helmet`) &&
    itemAmount(rivet) > 5 &&
    itemAmount(rivet) < 8
  );
}

/** Ash getSandDollar ladder (UTS:1379-1390): thingpouches -> the sand-penny
 * shop's 100-penny sand dollar row (coinmasters.txt:1743) -> the damp old
 * wallet pull -> a Lucky! outpost adventure (the Lucky NC pays sand dollars).
 * Bounded by the caller's limit. */
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
    // The empty filter is deliberate, unlike every other adv1 in this repo:
    // "" makes mafia fall through to grimoire's compiled CCS, i.e. this task's
    // own `combat: new CombatStrategy().kill()` below. A dynamic filter here
    // would silently discard customize()'s combat work.
    if (have($effect`Lucky!`)) adv1(outpost, -1, "");
  }
}

export function helmetQuest(opts: { summonLane: boolean }): Quest {
  return {
    name: "Helmet",
    tasks: [
      {
        // Old Guy: 63 sand dollars covers black glass (13) + damp old boot
        // (50, coinmasters.txt:156-171). The old SCUBA tank is NOT in Big
        // Brother's modeled store — the ash always takes reward 6313, the
        // damp old wallet (UTS:1392-1401); breathing comes from the trunks/
        // masks/Waterproofly instead (research fact #1).
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
        // Sits ahead of both hunt lanes so a near-complete rivet set never
        // spends another summon or Wreck turn: monkey paw wishes first
        // (upstream rivetHunt(), UTS:1457-1463 at 89982f5 — a wish is
        // cheaper than a pull), then the ash's one-rivet pull backstop
        // (UTS:2103-2105 at ab1105e). The old Craft Helmet prepare carried
        // the pull behind a `ready: rivetsDone` gate and could never fire.
        // ready() drops out once both budgets are spent, so the hunt resumes.
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
              // Plan A (ash UTS:2027-2105): summon unholy divers; each
              // saber-Forced diver guarantees 4 rivets + porthole + broken
              // helmet (iotm:117-118, 185-199). The mimic lays an insurance
              // egg first so diver #2 is free. diverTries < 4 in the ash;
              // tries 5 covers the first summon.
              name: "Diver Summon",
              ready: () => summonsAvailable() >= 1 && diverHuntActive(),
              completed: helmetDone,
              do: () => summon(diver),
              saberPurpose: "diver" as const,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`%fn, lay an egg`), diver)
                .forceItems(diver),
              outfit: () => ({
                modifier: "item",
                familiar: have(mimic) && mimic.experience >= 100 ? mimic : undefined,
              }),
              // Ash mood("superitdrop") on the summon lane (UTS:1402, 1433):
              // the once-a-day squint only earns its keep on a probabilistic
              // roll, and the ash's switch case falls through into "itdrop".
              effects: () => combineMoods(superItemDropEffects(), itemDropEffects()),
              // The squint doubles whatever +item is ON at cast time, so it
              // waits for prepare() — the only hook that runs after dress()
              // (grimoire engine.js:101 vs :108), matching the ash's order
              // after tempEquipment at UTS:1402.
              //
              // And only when no Force covers this fight: "Forced and
              // yellow-rayed drops ignore item bonuses, so the once-a-day
              // squint only fires when neither covers this fight"
              // (UTS:1395-1402, `if (!diverForceReady())`). forceGranted() is
              // the same predicate the engine's provideSaber() uses to decide
              // whether this task gets a Force at all (engine.ts:196-204);
              // this task's `do` is a function, so it has no location, exactly
              // as the engine sees it.
              prepare: (): void => {
                recover();
                if (!forceGranted("diver")) applyEffects(squintEffects());
              },
              limit: { tries: 5 },
            },
          ]
        : []),
      {
        // Plan B (ash UTS:2106-2147): grind the Wreck for divers. Peridot
        // forces the diver; forceItems (ray or saber) forces the drops.
        name: "Wreck Rivets",
        ready: () => diverHuntActive(),
        completed: helmetDone,
        do: wreck,
        peridot: diver,
        saberPurpose: "diver" as const,
        combat: new CombatStrategy().forceItems(diver).banish(),
        outfit: { modifier: "item" },
        // Same diver table as the summon lane above, same ash mood.
        effects: () => combineMoods(superItemDropEffects(), itemDropEffects()),
        choices: { 299: 1 },
        // Squint after dress() and only behind a Force-less fight, as above
        // (ash UTS:1430-1434). This lane DOES have a location, so it is passed
        // — the engine's provideSaber() reads forceGranted(purpose, location)
        // the same way (engine.ts:198).
        prepare: (): void => {
          recover();
          if (!forceGranted("diver", wreck)) applyEffects(squintEffects());
        },
        limit: { soft: 30, message: "Diver parts are not dropping; check item-drop gear." },
      },
      {
        name: "Craft Helmet",
        ready: rivetsDone,
        completed: () => !diverHuntActive(),
        do: () => void retrieveItem($item`aerated diving helmet`),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
