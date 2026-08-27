import {
  abort,
  adv1,
  availableAmount,
  equip,
  itemAmount,
  retrieveItem,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import { $effect, $item, $items, $location, $skill, get, have } from "libram";

import { CombatStrategy, killMacro } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { discretionaryPull, pulledToday, pullSequence } from "../../resources/pulls";

const digpick = $item`Mer-kin digpick`;
const ore = $item`teflon ore`;
const crappyMask = $item`crappy Mer-kin mask`;
const crappyTailpiece = $item`crappy Mer-kin tailpiece`;
const scale = $item`pristine fish scale`;
const blackGlass = $item`black glass`;
const masks = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask`;
const tailpieces = $items`Mer-kin gladiator tailpiece, Mer-kin scholar tailpiece, crappy Mer-kin tailpiece, teflon swim fins`;

function maskOwned(): boolean {
  return masks.some((it) => availableAmount(it) > 0);
}
function tailpieceOwned(): boolean {
  return tailpieces.some((it) => availableAmount(it) > 0);
}

/** Free-pick budget: 5/day Unaccompanied Miner or an active Loded effect
 * (from the lodestone). Shared by prepare/do/freeaction below so the three
 * checks can't drift apart. */
function freeDigAvailable(): boolean {
  return (
    (have($skill`Unaccompanied Miner`) && get("_unaccompaniedMinerUsed", 0) < 5) ||
    have($effect`Loded`)
  );
}

/** Lucky! ladder (ash getLucky, G:259-275; the heartstone %luck rung is
 * skipped — %fn-family naming, add only if a live account needs it). The
 * 3/day hermit clover cap is the caller's abort condition. */
function getLucky(): void {
  if (have($effect`Lucky!`)) return;
  if (
    have($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`) &&
    !get("_aug2Cast", false) &&
    get("_augSkillsCast", 0) < 5
  ) {
    useSkill($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`);
    if (have($effect`Lucky!`)) return;
  }
  retrieveItem($item`11-leaf clover`);
  if (itemAmount($item`11-leaf clover`) > 0) use($item`11-leaf clover`);
}

// ── mining square selection (ash mineNum G:585-632, on mafia's mineState3:
// 36-char row-major 6x6, index (row-1)*6+(col-1), '*' = promising chunk,
// 'o' = open cavern (MineDecorator.java:76-103); dig URL which = row*8+col
// (MineDecorator.java:57-65)) ──
const SHAFT: [number, number][] = [
  [3, 6],
  [3, 5],
  [3, 4],
  [3, 3],
  [3, 2],
  [2, 2],
  [4, 2],
  [5, 2],
];

function stateAt(state: string, col: number, row: number): string {
  return state.charAt((row - 1) * 6 + (col - 1));
}

/** Bad-ore adjacency via mineLayout3's found-ore fragments "#N<img .../x.gif"
 * (ash adjacentCaverns G:566-583). */
function adjacentBadOre(col: number, row: number): boolean {
  const layout = get("mineLayout3", "");
  return [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ].some(([c, r]) => {
    const m = new RegExp(`#${r * 8 + c}<img src="[^"]*/([^"]+)\\.gif"`).exec(layout);
    return m !== null && (m[1].includes("velcroore") || m[1].includes("vinylore"));
  });
}

function pickSquare(state: string): [number, number] {
  // 1. The fixed column-3 shaft, in ash order (G:592-601).
  const shaft = SHAFT.find(([c, r]) => stateAt(state, c, r) !== "o");
  if (shaft) return shaft;
  // 2. Promising chunks at row < 4 not adjacent to velcro/vinyl ore (G:604-618).
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 36; i++) {
      if (state.charAt(i) !== "*") continue;
      const col = (i % 6) + 1;
      const row = Math.floor(i / 6) + 1;
      if (row >= 4) continue;
      if (pass === 0 && adjacentBadOre(col, row)) continue;
      return [col, row];
    }
  }
  abort(
    "Generic mining did not find teflon ore; mine Anemone Mine (mine 3) manually. TIP: the ores show up in adjacent veins of 5 (ash G:629-631).",
  );
}

/** One dig (ash teflon(), UTS:603-615). Beaten Up from cave-ins is cleared by
 * engine post(). */
function mineSquare(): void {
  equip(digpick);
  equip($item`really, really nice swimming trunks`);
  visitUrl("mining.php?mine=3"); // refresh mineState3
  const state = get("mineState3", "");
  if (state.length !== 36) {
    abort(
      "mineState3 did not parse (expected 36 chars); visit mining.php?mine=3 manually and rerun.",
    );
  }
  const [col, row] = pickSquare(state);
  visitUrl(`mining.php?mine=3&which=${row * 8 + col}`);
}

export function mineQuest(): Quest {
  return {
    name: "Teflon",
    tasks: [
      {
        // Digpick first (ash UTS:2299-2318): pull it when policy allows,
        // else farm Anemone Mine with +item until it drops.
        name: "Digpick",
        ready: () => !tailpieceOwned() && itemAmount(ore) === 0,
        completed: () => availableAmount(digpick) > 0 || tailpieceOwned() || itemAmount(ore) > 0,
        prepare: (): void => {
          recover();
          if (availableAmount(digpick) === 0) discretionaryPull(digpick);
        },
        do: $location`Anemone Mine`,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        limit: {
          soft: 8,
          message: "No Mer-kin digpick after 8 turns; pull one manually and rerun.",
        },
      },
      {
        // Free picks (5/day Unaccompanied Miner) -> lodestone Loded picks ->
        // real-turn digs. Amendment (upstream 6b7cd80, UTS:640-641 at
        // 89982f5): the ash's liftBeatenUp() clears Beaten Up only once
        // teflon ore is in hand, leaving cave-in Beaten Up standing across
        // the Unaccompanied Miner trips. This engine's post() unconditionally
        // clears Beaten Up after every do() returns, so do() mines the whole
        // currently-available free/Loded allotment in one call — the
        // cleanup then fires once, after the dig batch, not per cave-in.
        // Once the free budget is spent, do() falls back to one real-turn
        // square per call, same as before, tracked by the soft limit below.
        name: "Mine Teflon",
        ready: () => availableAmount(digpick) > 0 && !tailpieceOwned(),
        completed: () => itemAmount(ore) > 0 || tailpieceOwned(),
        prepare: (): void => {
          recover();
          if (!freeDigAvailable() && !pulledToday($item`lodestone`)) {
            if (pullSequence($item`lodestone`)) use($item`lodestone`);
          }
        },
        do: (): void => {
          do {
            mineSquare();
          } while (itemAmount(ore) === 0 && freeDigAvailable());
        },
        freeaction: freeDigAvailable,
        underwater: true,
        limit: {
          soft: 20,
          message:
            "Teflon ore is not appearing. A minin' dynamite pull gives one more free blast (ash hint UTS:2348-2350), or mine manually — ores show in adjacent veins of 5.",
        },
      },
      {
        // Crappy mask: 3 pristine fish scales via Lucky! caliginous abyss
        // trips (ash UTS:2455-2466), then Grandma ROW124 via retrieveItem.
        name: "Crappy Mask",
        ready: () => !maskOwned(),
        completed: maskOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            retrieveItem(crappyMask);
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales (Lucky! caliginous abyss, or Madness Reef choice 310 conversions), then rerun.`,
            );
          }
          equip(blackGlass); // accessory; required for the Abyss (KoLAdventure CALIGINOUS_ABYSS gate)
          recover();
          adv1($location`The Caliginous Abyss`, -1, () => killMacro(false).toString());
        },
        underwater: true,
        limit: {
          soft: 8,
          message: "Pristine fish scales are not accumulating for the crappy mask.",
        },
      },
      {
        name: "Crappy Tailpiece",
        ready: () => !tailpieceOwned() && itemAmount(ore) > 0,
        completed: tailpieceOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            // Chain: teflon ore -> smith teflon swim fins -> ROW125 trade;
            // mafia's retrieveItem walks it.
            retrieveItem(crappyTailpiece);
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales, then rerun.`,
            );
          }
          equip(blackGlass);
          recover();
          adv1($location`The Caliginous Abyss`, -1, () => killMacro(false).toString());
        },
        underwater: true,
        limit: {
          soft: 8,
          message: "Pristine fish scales are not accumulating for the crappy tailpiece.",
        },
      },
    ],
  };
}
