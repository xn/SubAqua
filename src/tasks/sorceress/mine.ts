import {
  abort,
  adv1,
  availableAmount,
  equip,
  haveEffect,
  haveEquipped,
  itemAmount,
  mpCost,
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
import { discretionaryPull, pullSequence } from "../../resources/pulls";

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

const lodestone = $item`lodestone`;

/** Free-pick budget: 5/day Unaccompanied Miner or an active Loded effect
 * (from the lodestone). Shared by prepare/do/freeaction below so the three
 * checks can't drift apart. */
function freeDigAvailable(): boolean {
  return (
    (have($skill`Unaccompanied Miner`) && get("_unaccompaniedMinerUsed", 0) < 5) ||
    have($effect`Loded`)
  );
}

/** Unaccompanied Miner picks not yet spent today (0 without the skill). */
function remainingFreePicks(): number {
  return have($skill`Unaccompanied Miner`) ? Math.max(0, 5 - get("_unaccompaniedMinerUsed", 0)) : 0;
}

type LodestoneAttempt = "ok" | "used-today" | "unavailable";

/** Live bug fix (2026-08-27): the lodestone's Loded effect is itself a free
 * dig source (countFreeMines(), libram mining.ts) and must be tried before
 * Mine Teflon gives up -- not just pulled speculatively in `prepare()` while
 * Unaccompanied Miner picks were still available (which meant the lodestone
 * was never reached: do() would spend the 5 picks and abort before any later
 * `prepare` ran). Called only when `freeDigAvailable()` is already false, so
 * it never double-uses a still-active Loded. Returns "ok" once Loded is
 * confirmed up (whether it was already up or just got triggered here), so a
 * caller can safely treat "ok" as "go ahead and dig". */
function tryLodestone(): LodestoneAttempt {
  if (freeDigAvailable()) return "ok";
  if (get("_lodestoneUsed", false)) return "used-today";
  if (!have(lodestone) && !pullSequence(lodestone)) return "unavailable";
  use(lodestone);
  return have($effect`Loded`) ? "ok" : "unavailable";
}

function lodestoneDetail(result: LodestoneAttempt): string {
  switch (result) {
    case "used-today":
      return " (lodestone already used today)";
    case "unavailable":
      return " (no lodestone available: pull budget exhausted or none in storage/inventory)";
    case "ok":
      return "";
  }
}

/** User feedback 2026-08-27 (net-turn rule: no paid digs): Mine Teflon
 * aborts on this once the free pick period -- 5 Unaccompanied Miner picks
 * plus the lodestone's Loded charges -- ends without ore, rather than
 * spending a real turn per square. A minin' dynamite pull is a separate pull
 * decision this policy has not made, so it's offered only as a manual
 * option, never auto-pulled. */
const NO_FREE_DIG_MESSAGE =
  "Free mining (5 Unaccompanied Miner picks + lodestone Loded) ended without teflon ore. Options: pull a minin' dynamite for one more free blast (ash hint UTS:2348-2350), or mine manually (ores show in adjacent veins of 5), then rerun.";

const abyss = $location`The Caliginous Abyss`;
const reef = $location`Madness Reef`;
const roughScale = $item`rough fish scale`;

/** Pure mirror of getLucky()'s rungs, for outfit/effect decisions that run
 * before do() and must not buy a clover as a side effect. */
function luckyObtainable(): boolean {
  if (have($effect`Lucky!`)) return true;
  if (
    have($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`) &&
    !get("_aug2Cast", false) &&
    get("_augSkillsCast", 0) < 5
  ) {
    return true;
  }
  return itemAmount($item`11-leaf clover`) > 0 || get("_cloversPurchased", 0) < 3;
}

/** The Economist of Scales rung is next when no Lucky! source is left and the
 * rough scales banked by the University trips (5 per trip) can be cashed. */
function reefTripNext(): boolean {
  return !luckyObtainable() && itemAmount(roughScale) >= 10;
}

/**
 * One scale-getting trip for the crappy disguise, cheapest first:
 *  1. Lucky! → A University of Fish in the Caliginous Abyss (1 pristine +
 *     5 rough + 10 dull; ash UTS:2455-2466).
 *  2. Madness Reef → "Heavily Invested in Pun Futures" (choice 311/1) →
 *     The Economist of Scales, where standalone/choice.ts's 310 handler
 *     trades every 10 rough for 1 pristine (310/2) and skips (310/6) when
 *     short. mafia's choice data: ChoiceAdventures.java "The Economist of
 *     Scales" (310 costs) / "Heavily Invested in Pun Futures" (311).
 * Live 2026-08-27: both this script and the deployed ash abort after the
 * third hermit clover (UTS:2572) — this run did so holding 22 rough scales,
 * and the user hand-drove the exchange for UnderTheSea (session
 * log:97784-97799, 2 turns, 20 rough → 2 pristine). Four Lucky! trips bank
 * exactly the 20 rough the tailpiece's last two scales need.
 * Returns false when neither rung is available (caller aborts).
 */
function scaleTrip(): boolean {
  getLucky();
  if (have($effect`Lucky!`)) {
    equipFamiliarBreather();
    recover();
    adv1(abyss, -1, () => killMacro(false).toString());
    return true;
  }
  if (itemAmount(roughScale) >= 10) {
    equipFamiliarBreather();
    recover();
    adv1(reef, -1, () => killMacro(false).toString());
    return true;
  }
  return false;
}

const NO_SCALE_SOURCE = (need: number): string =>
  `Need ${need} more pristine fish scale(s): out of hermitage clovers (3/day) and fewer than 10 rough fish scales for the Madness Reef exchange (choice 311/1 -> 310/2). Get scales (a Lucky! source for the Caliginous Abyss, or rough scales to trade), then rerun.`;

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

/** Live 2026-08-27 (session log:90836-91923): two digs cost 754 and 739 HP,
 * HP hit 0, and KoL refused the next ~530 dig requests until a Cocoon landed
 * on the rerun. The ash heals after every dig at 0 HP (UTS:636-637
 * `restore HP`) and lifts Beaten Up with the Walrus (liftBeatenUp()). Called
 * before every dig: Walrus for Beaten Up, then HP back above the largest hit
 * seen. Only the two allowed healing skills are reachable — recover() runs
 * through the restorer list the engine filters to Cocoon + Walrus. */
const DIG_HP_FLOOR = 760;
function healForDig(): void {
  const walrus = $skill`Tongue of the Walrus`;
  if (have($effect`Beaten Up`) && have(walrus)) {
    recover(0, mpCost(walrus));
    useSkill(walrus);
  }
  recover(DIG_HP_FLOOR);
}

/** Result of one dig attempt, kept for the progress check / abort diagnostic
 * in `Mine Teflon`'s do() below. `response` is the raw text KoL returned for
 * the dig request itself (not the mine=3 refresh). */
interface DigResult {
  col: number;
  row: number;
  which: number;
  response: string;
}

/** One dig (ash teflon(), UTS:603-615). Beaten Up from cave-ins is cleared by
 * engine post(). */
function mineSquare(): DigResult {
  // No equips here at all. The digpick lives in `Mine Teflon`'s `outfit`
  // (audit item 6) — a `do()` equip lands after dress() and fights the
  // maximizer, which is the same anti-pattern as the trunks bug below.
  // No breathing gear here either: `Mine Teflon` is `underwater: true`, so the
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
  const which = row * 8 + col;
  const response = visitUrl(`mining.php?mine=3&which=${which}`);
  return { col, row, which, response };
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
          // The actual lodestone pull+use lives in do() below (live bug
          // 2026-08-27): at prepare() time the day's Unaccompanied Miner
          // picks are typically still unspent, so freeDigAvailable() reads
          // true here and this would never fire before do() burns through
          // them. Nothing to duplicate that check for.
        },
        do: (): void => {
          // Live-bug precheck (2026-08-27): a session logged ~30 consecutive
          // mining.php hits with no "You start digging" and no state change
          // -- KoL was refusing every dig. mafia has no client-side gate on
          // this (MineDecorator.parseResponse only reacts to the response,
          // it never validates the request), so catch the two plausible
          // causes mafia *can* see before spending a request on them.
          if (!haveEquipped(digpick)) {
            abort(
              "Mer-kin digpick is not equipped (the outfit should have placed it -- dress() may have failed to keep it on). Equip it manually and rerun.",
            );
          }
          // Free picks first; only reach for the lodestone once those are
          // gone and no ore is in hand yet (live bug 2026-08-27: the picks
          // used to get spent by the loop below with the lodestone never
          // tried at all -- see tryLodestone()'s doc comment).
          let lodestoneResult: LodestoneAttempt = "ok";
          if (!freeDigAvailable()) lodestoneResult = tryLodestone();
          if (!freeDigAvailable()) {
            abort(NO_FREE_DIG_MESSAGE + lodestoneDetail(lodestoneResult));
          }
          // Bounded + progress-checked: cap at the currently-known free-dig
          // budget (remaining Unaccompanied Miner picks + Loded's live turn
          // count -- countFreeMines(), libram mining.ts, confirms Loded's
          // haveEffect() count IS its remaining free-dig count, decrementing
          // one per dig) plus one spare, and require real progress every
          // iteration instead of trusting KoL to eventually say yes. The cap
          // grows if a mid-loop lodestone use adds more Loded turns.
          let maxDigs = remainingFreePicks() + haveEffect($effect`Loded`) + 1;
          let digs = 0;
          for (;;) {
            if (itemAmount(ore) > 0) break;
            if (!freeDigAvailable()) {
              lodestoneResult = tryLodestone();
              if (lodestoneResult !== "ok") break;
              maxDigs += haveEffect($effect`Loded`);
            }
            if (digs >= maxDigs) {
              abort(
                `Mine Teflon hit its ${maxDigs}-dig safety cap without acquiring ore and without exhausting the free-dig budget; something is wrong with the loop itself. Open mining.php?mine=3 in the relay browser and dig one square manually, then rerun.`,
              );
            }
            healForDig();
            const beforeState = get("mineState3", "");
            const beforeUsed = get("_unaccompaniedMinerUsed", 0);
            const beforeLoded = haveEffect($effect`Loded`);
            const { col, row, which, response } = mineSquare();
            digs++;
            const progressed =
              get("mineState3", "") !== beforeState ||
              get("_unaccompaniedMinerUsed", 0) !== beforeUsed ||
              itemAmount(ore) > 0 ||
              haveEffect($effect`Loded`) < beforeLoded;
            if (!progressed) {
              abort(
                `KoL refused the dig at (col ${col}, row ${row}, which=${which}); mineState3, ` +
                  `_unaccompaniedMinerUsed, and Loded turns are all unchanged and no ore was acquired. ` +
                  `mineState3: ${beforeState}. _unaccompaniedMinerUsed: ${beforeUsed}. ` +
                  `digpick equipped: ${haveEquipped(digpick)}. Beaten Up: ${have($effect`Beaten Up`)} ` +
                  `(a likely cause if true -- KoL may refuse mining while beaten up). ` +
                  `Response (first 200 chars): ${response.slice(0, 200)}. ` +
                  `Open mining.php?mine=3 in the relay browser and dig one square manually, then rerun.`,
              );
            }
          }
          if (itemAmount(ore) === 0 && !freeDigAvailable()) {
            abort(NO_FREE_DIG_MESSAGE + lodestoneDetail(lodestoneResult));
          }
        },
        // The digpick is the dig; `ready` already requires one, and
        // createOutfit() strips it anyway on an account that has none.
        outfit: { equip: [digpick] },
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
            // before either barter (UTS ab1105e:2455). Note the aerated diving
            // helmet is itself a waterBreathingEquipment member, so on an
            // account that wore it as the breather this unequip voids dress()'s
            // breathing guarantee mid-task — harmless only because this branch
            // returns without adventuring.
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
                  ? `Grandma's ROW124 trade for the crappy Mer-kin mask failed; missing: ${missing.join(", ")}. The aerated diving helmet only comes from the Helmet quest (Wreck of the Edgar Fitzsimmons rivet hunt -> Craft Helmet) — it has not produced one; check rivetHuntActive()'s inputs (rusty rivet/porthole/broken diving helmet counts) rather than retrieving the helmet directly. Farm/pull the scales if those are what's short, then rerun.`
                  : "Grandma's ROW124 trade for the crappy Mer-kin mask failed despite having an aerated diving helmet and 3 pristine fish scales; Grandma (Mer-Kin Outpost) may be unreachable. Check access, then rerun.",
              );
            }
            return;
          }
          if (!scaleTrip()) abort(NO_SCALE_SOURCE(3 - availableAmount(scale)));
        },
        // Abyss gate accessory, declared not hand-equipped (audit item 7; same
        // shape as mom.ts's black glass). The familiar breather stays a do()
        // rider: engine famequip enforcement only fires for an outfit that
        // names a `familiar`, and this task wants whatever familiar is up
        // rather than a specific one. The reef trip hunts an NC, so it dresses
        // -combat (no forcer: the day's Forces are the rivet hunt's).
        outfit: () => ({ equip: [blackGlass], modifier: reefTripNext() ? "-combat" : undefined }),
        choices: { 311: 1 },
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
          if (!scaleTrip()) abort(NO_SCALE_SOURCE(3 - availableAmount(scale)));
        },
        // Same as the mask task above (audit item 7).
        outfit: () => ({ equip: [blackGlass], modifier: reefTripNext() ? "-combat" : undefined }),
        choices: { 311: 1 },
        underwater: true,
        limit: {
          soft: 8,
          message: "Pristine fish scales are not accumulating for the crappy tailpiece.",
        },
      },
    ],
  };
}
