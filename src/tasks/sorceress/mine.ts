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
import {
  $effect,
  $item,
  $items,
  $location,
  $skill,
  $slot,
  get,
  have,
  unequip,
  withProperty,
} from "libram";

import { CombatStrategy, killMacro } from "../../engine/combat";
import { requiredFamiliarBreather } from "../../engine/outfit";
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
const fins = $item`teflon swim fins`;
const masks = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask`;
const tailpieces = $items`Mer-kin gladiator tailpiece, Mer-kin scholar tailpiece, crappy Mer-kin tailpiece`;

function maskOwned(): boolean {
  return masks.some((it) => availableAmount(it) > 0);
}

/** Disguise-complete signal for the pants slot: a real Mer-kin tailpiece in
 * hand. Deliberately excludes teflon swim fins — fins are an intermediate
 * ore->fins smith product, not a wearable Mer-kin tailpiece, so a
 * smith-succeeded/ROW125-trade-failed state must not read as "done" here
 * (review finding #2 / minor #3: teflon swim fins is an accessory,
 * items.txt:3741, not pants). */
function tailpieceOwned(): boolean {
  return tailpieces.some((it) => availableAmount(it) > 0);
}

/** Ore-farming-done signal: the ore is in hand, already smithed into fins,
 * or the disguise is already complete. Fins count here (unlike
 * tailpieceOwned() above) because they mean the dug ore has already been
 * converted — no more digging is needed even if the Grandma trade hasn't
 * happened yet. Gates Digpick/Mine Teflon, which only care about the ore
 * supply, not the trade outcome. */
function haveOreOrFins(): boolean {
  return itemAmount(ore) > 0 || availableAmount(fins) > 0;
}
function oreSecured(): boolean {
  return haveOreOrFins() || tailpieceOwned();
}

/**
 * Familiar breathing for the two Caliginous Abyss trips below. Those tasks
 * dress themselves (function-`do`, no `outfit`), so the engine's enforcement
 * (engine.ts:240-246, which reads outfit.familiar) never runs — and the
 * Digpick task's `item` outfit declares no familiar either, so
 * the maximizer is free to swap a das boot out for item-drop famequip; mafia
 * then refuses the zone outright (KoLAdventure.java:2880) and the soft:8 abort
 * blames scale drops instead. Same shape as skatepark.ts:82-83.
 */
function equipFamiliarBreather(): void {
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
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

/** User feedback 2026-08-27 (net-turn rule: no paid digs): Mine Teflon
 * aborts on this once the free pick period ends without ore, rather than
 * spending a real turn per square. */
const NO_FREE_DIG_MESSAGE =
  "Free mining (5 Unaccompanied Miner picks + lodestone Loded) ended without teflon ore. Options: pull a minin' dynamite for one more free blast (ash hint UTS:2348-2350), or mine manually (ores show in adjacent veins of 5), then rerun.";

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
  // The hermit's clover sale is a coinmaster path (InventoryManager.java:
  // 1568-1570 canUseCoinmasters()); autoSatisfyWithCoinmasters defaults false
  // (defaults.txt:241) and nothing else in this repo sets it, so a bare
  // retrieveItem would silently no-op instead of buying the clover.
  withProperty("autoSatisfyWithCoinmasters", true, () => retrieveItem($item`11-leaf clover`));
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
  // No breathing gear here: `Mine Teflon` is `underwater: true`, so the
  // engine already owns player breathing (engine.ts customize()'s `sea`
  // keyword + dress()'s last-chance verification) and nothing between dress
  // and this loop changes gear. The ash's teflon() equips trunks via
  // equipSwimTrunks(), which SKIPS under Driving Waterproofly; the
  // unconditional equip here did not, and it overrode the maximizer's pick.
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
        ready: () => !oreSecured(),
        completed: () => availableAmount(digpick) > 0 || oreSecured(),
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
        // Free picks (5/day Unaccompanied Miner) -> lodestone Loded picks.
        // Amendment (upstream 6b7cd80, UTS:640-641 at 89982f5): the ash's
        // liftBeatenUp() clears Beaten Up only once teflon ore is in hand,
        // leaving cave-in Beaten Up standing across the Unaccompanied Miner
        // trips. This engine's post() unconditionally clears Beaten Up after
        // every do() returns, so do() mines the whole currently-available
        // free/Loded allotment in one call — the cleanup then fires once,
        // after the dig batch, not per cave-in.
        // User feedback 2026-08-27 (net-turn rule: no paid digs): once the
        // free budget is spent without ore, do() aborts with instructions
        // instead of falling back to real-turn squares -- Anemone Mine is
        // only worth digging on free picks/Loded, never on paid turns.
        name: "Mine Teflon",
        ready: () => availableAmount(digpick) > 0 && !oreSecured(),
        completed: oreSecured,
        prepare: (): void => {
          recover();
          if (!freeDigAvailable() && !pulledToday($item`lodestone`)) {
            if (pullSequence($item`lodestone`)) use($item`lodestone`);
          }
        },
        do: (): void => {
          if (!freeDigAvailable()) abort(NO_FREE_DIG_MESSAGE);
          do {
            mineSquare();
          } while (itemAmount(ore) === 0 && freeDigAvailable());
          if (itemAmount(ore) === 0 && !freeDigAvailable()) abort(NO_FREE_DIG_MESSAGE);
        },
        freeaction: freeDigAvailable,
        underwater: true,
        limit: {
          tries: 3,
          message: NO_FREE_DIG_MESSAGE,
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
            // Both barter rows spend a WEARABLE (helmet on ROW124, chaps on
            // ROW125) and CoinmasterData.availableTokens counts inventory only,
            // so an equipped cost item fails the trade and lands in the
            // "Grandma may be unreachable" branch below. Upstream unequips both
            // before either barter (UTS ab1105e:2455).
            unequip($item`aerated diving helmet`);
            unequip($item`sea chaps`);
            // Grandma's Sea Shop is a coinmaster (coinmasters.txt ROW124:
            // crappy Mer-kin mask <- aerated diving helmet + 3 pristine fish
            // scale); autoSatisfyWithCoinmasters defaults false
            // (defaults.txt:241, InventoryManager.java:1568-1570
            // canUseCoinmasters()), so scope it on for just this trade.
            const traded = withProperty("autoSatisfyWithCoinmasters", true, () =>
              retrieveItem(crappyMask),
            );
            if (!traded) {
              const helmet = $item`aerated diving helmet`;
              const missing: string[] = [];
              if (availableAmount(helmet) === 0) missing.push("aerated diving helmet");
              if (availableAmount(scale) < 3) {
                missing.push(`pristine fish scale (have ${availableAmount(scale)}, need 3)`);
              }
              abort(
                missing.length > 0
                  ? `Grandma's ROW124 trade for the crappy Mer-kin mask failed; missing: ${missing.join(", ")}. Get them (retrieveItem the helmet, farm/pull scales), then rerun.`
                  : "Grandma's ROW124 trade for the crappy Mer-kin mask failed despite having an aerated diving helmet and 3 pristine fish scales; Grandma (Mer-Kin Outpost) may be unreachable. Check access, then rerun.",
              );
            }
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales (Lucky! caliginous abyss, or Madness Reef choice 310 conversions), then rerun.`,
            );
          }
          equip(blackGlass); // accessory; required for the Abyss (KoLAdventure CALIGINOUS_ABYSS gate)
          equipFamiliarBreather();
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
        ready: () => !tailpieceOwned() && haveOreOrFins(),
        completed: tailpieceOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            // Same pre-barter unequips as the mask row above (UTS
            // ab1105e:2455): the sea chaps are ROW125's own cost item.
            unequip($item`aerated diving helmet`);
            unequip($item`sea chaps`);
            // Chain: teflon ore -> smith teflon swim fins -> ROW125 trade
            // (coinmasters.txt: crappy Mer-kin tailpiece <- sea chaps +
            // teflon swim fins + 3 pristine fish scale); mafia's
            // retrieveItem walks the smith step. Grandma's Sea Shop is a
            // coinmaster, so scope autoSatisfyWithCoinmasters on for the
            // trade (defaults.txt:241, InventoryManager.java:1568-1570).
            const traded = withProperty("autoSatisfyWithCoinmasters", true, () =>
              retrieveItem(crappyTailpiece),
            );
            if (!traded) {
              const chaps = $item`sea chaps`;
              const missing: string[] = [];
              if (availableAmount(chaps) === 0) missing.push("sea chaps");
              if (!haveOreOrFins()) missing.push("teflon ore/teflon swim fins");
              if (availableAmount(scale) < 3) {
                missing.push(`pristine fish scale (have ${availableAmount(scale)}, need 3)`);
              }
              abort(
                missing.length > 0
                  ? `Grandma's ROW125 trade for the crappy Mer-kin tailpiece failed; missing: ${missing.join(", ")}. Get them (Phase 3 sea chaps, smith/pull fins, farm/pull scales), then rerun.`
                  : "Grandma's ROW125 trade for the crappy Mer-kin tailpiece failed despite having sea chaps, teflon ore/fins, and 3 pristine fish scales; Grandma (Mer-Kin Outpost) may be unreachable, or the fins need smithing first -- try retrieveItem($item`teflon swim fins`) manually, then rerun.",
              );
            }
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales, then rerun.`,
            );
          }
          equip(blackGlass);
          equipFamiliarBreather();
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
