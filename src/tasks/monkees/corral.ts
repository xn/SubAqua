import { availableAmount, retrieveItem } from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { recover } from "../../lib";
import {
  applyEffects,
  combineMoods,
  itemDropEffects,
  squintEffects,
  superItemDropEffects,
} from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const corral = $location`The Coral Corral`;
const rustler = $monster`Mer-kin rustler`;
const cowboy = $monster`sea cowboy`;
const cow = $monster`sea cow`;
const seahorse = $monster`wild seahorse`;
const cowbell = $item`sea cowbell`;
const lasso = $item`sea lasso`;
// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const sword = $familiar`Sword of S Words`;

/** Ash doneWithSeaCow (G:652-660 at c84c28b). */
function leatherDone(): boolean {
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) >=
      2 && availableAmount(cowbell) >= 3
  );
}

/** Ash doneWithCowboy (G:638-650 at c84c28b): banked lassos finish the
 * training. Threshold 23, not 21 (upstream 611a915): each lasso is 3 training
 * points, but the tame itself consumes a lasso beyond the 20 points, so one
 * must stay in reserve — 21 scores 7 lassos from scratch as "done" even though
 * training to 20 eats all 7, stranding the seahorse as a fight with no ending. */
function lassosDone(): boolean {
  return get("lassoTrainingCount", 0) + 3 * availableAmount(lasso) >= 23;
}

function tamed(): boolean {
  return get("seahorseName") !== "";
}

/** Cowbell,cowbell then cowbell,lasso (funkslinging); singles otherwise.
 * Ash CCS:738-744 + the old salvage's singles fallback. Ends with abort:
 * if the fight is still open the tame failed (ash's exact protocol). */
function tamingMacro(): Macro {
  return have($skill`Ambidextrous Funkslinging`)
    ? Macro.item([cowbell, cowbell]).item([cowbell, lasso]).abort()
    : Macro.item(cowbell).item(cowbell).item(cowbell).item(lasso).abort();
}

/** The wild seahorse is a BOSS (upstream UnderTheSea cf01d4d, 2026-08-12):
 * free-run skills, banishes and copies all fail against it and every hit
 * lands for 1, so an unready encounter can only end on the round limit —
 * a lost combat and a hard post() abort. The ash CCS runs its tamer ahead
 * of all zone logic and answers unready seahorses with the plain Run Away
 * button, the one exit a boss allows. Mirror both: tame on the spot when
 * training and supplies are ready, otherwise spam runaway. */
function seahorseMacro(): Macro {
  const ready =
    get("lassoTrainingCount", 0) >= 20 &&
    availableAmount(cowbell) >= 3 &&
    availableAmount(lasso) >= 1;
  return ready ? tamingMacro() : Macro.runaway().repeat();
}

export function corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest {
  // Ash doSWord() (G:773-780 at 89982f5): the imprinted sword rides only
  // while lassos are still short — seven banked (upstream bumped 6 → 7 to
  // match the 23-point lassosDone reserve); past that an item familiar earns
  // more on the leather/cowbell fights.
  const swordOut = () =>
    opts.swordLane &&
    have(sword) &&
    get("swordOfSWordsMonster") !== null &&
    availableAmount(lasso) < 7;
  return {
    name: "Corral",
    tasks: [
      ...((opts.opener
        ? [
            {
              // One-turn opener (ash UTS:2229-2261): first corral fight with
              // the pro skateboard — Do an epic McTwist! forces every drop
              // off the sea cow (leather + cowbell in one turn).
              name: "Corral Opener",
              ready: () => get("corralUnlocked"),
              completed: () =>
                corral.turnsSpent > 0 ||
                availableAmount($item`sea leather`) > 0 ||
                have($item`sea cowboy hat`) ||
                tamed(),
              do: corral,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`Do an epic McTwist!`), cow)
                .kill($monsters`sea cow, sea cowboy`)
                .banish(rustler)
                .macro(seahorseMacro, seahorse)
                .kill(),
              outfit: { modifier: "item", equip: $items`pro skateboard` },
              // Ash UTS:1650-1651 spends the once-a-day squint on this
              // one-turn corral opener when it is still unused.
              effects: () => combineMoods(superItemDropEffects(), itemDropEffects()),
              // The squint doubles the +item that is ON when it is cast, so it
              // goes in prepare() — the only hook after dress() (grimoire
              // engine.js:101 vs :108).
              prepare: (): void => {
                recover();
                applyEffects(squintEffects());
              },
              limit: { tries: 3 },
            },
          ]
        : []) as Task[]),
      {
        // Sea-cow farm: leather (chaps + hat) and three cowbells. The
        // seaCow saber reservation backs forceItems; the parka ray serves
        // first when charged (both force all drops). Ash getMissingCorralItems
        // UTS:1455-1495, CCS tier-3 regime CCS:823-876.
        name: "Corral Leather",
        ready: () => get("corralUnlocked"),
        completed: () => leatherDone() || tamed(),
        do: corral,
        saberPurpose: "seaCow" as const,
        combat: new CombatStrategy()
          .macro(Macro.trySkill($skill`Do an epic McTwist!`), cow)
          .forceItems(cow)
          .kill(cowboy)
          .banish(rustler)
          .macro(seahorseMacro, seahorse),
        outfit: () => ({
          modifier: "item",
          equip: $items`pro skateboard`,
          familiar: swordOut() ? sword : undefined,
        }),
        effects: itemDropEffects,
        prepare: (): void => {
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        limit: { soft: 15, message: "Sea leather/cowbells are not accumulating." },
      },
      {
        name: "Craft Chaps",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea chaps`),
        completed: () => have($item`sea chaps`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea chaps`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Craft Hat",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea cowboy hat`),
        completed: () => have($item`sea cowboy hat`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea cowboy hat`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // Lasso stock + training. Sea cowboys drop lassos (doubled under
        // the imprinted Sword); the engine's round-1 lasso injection
        // (customize(), Phase 1) trains on every underwater fight while
        // hat + chaps are worn, +3 per throw.
        name: "Corral Lassos",
        ready: () => get("corralUnlocked"),
        completed: () => (lassosDone() && availableAmount(lasso) >= 1) || tamed(),
        do: corral,
        combat: new CombatStrategy()
          .macro(
            () =>
              swordOut()
                ? // eslint-disable-next-line libram/verify-constants -- Sword of S Words skill, plugin data lags (classskills.txt:1170)
                  Macro.trySkill($skill`%fn, kill a lot of these guys`)
                : new Macro(),
            cowboy,
          )
          .kill($monsters`sea cowboy, sea cow`)
          .banish(rustler)
          .macro(seahorseMacro, seahorse),
        outfit: () => ({ modifier: "item", familiar: swordOut() ? sword : undefined }),
        effects: itemDropEffects,
        prepare: () => recover(),
        limit: { soft: 15, message: "Sea lassos are not accumulating." },
      },
      {
        // Taming (ash sorceress() UTS:3024-3074 + CCS:738-744): banish the
        // other draws so the seahorse spawns, then throw cowbell/cowbell,
        // cowbell/lasso at exactly lassoTrainingCount 20. Initiative
        // maximized so the throws land before the 1M-HP seahorse acts
        // (monsters.txt: Phys+Elem 100 — the lasso is the only win).
        name: "Tame Seahorse",
        ready: () =>
          get("lassoTrainingCount", 0) >= 20 &&
          availableAmount(cowbell) >= 3 &&
          availableAmount(lasso) >= 1,
        completed: tamed,
        do: corral,
        // Upstream 611a915's guard — never banish the cowboy/cow while its
        // drop is still needed — is satisfied structurally here: this task
        // sits after Corral Leather and Corral Lassos, so the engine only
        // reaches it once leatherDone() and lassosDone() hold, and the
        // farming tasks above kill (never banish) both sources.
        combat: new CombatStrategy()
          .macro(tamingMacro, seahorse)
          .banish($monsters`Mer-kin rustler, sea cowboy, sea cow`)
          .kill(),
        outfit: { modifier: "initiative" },
        prepare: (): void => {
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        limit: { soft: 12, message: "The wild seahorse is not spawning; check banishes." },
      },
    ],
  };
}
