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
import { lassoExpert, requiredFamiliarBreather } from "../../engine/outfit";
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

function tailpieceOwned(): boolean {
  return tailpieces.some((it) => availableAmount(it) > 0);
}

function haveOreOrFins(): boolean {
  return itemAmount(ore) > 0 || availableAmount(fins) > 0;
}
function oreSecured(): boolean {
  return haveOreOrFins() || tailpieceOwned();
}

function equipFamiliarBreather(): void {
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
}

const lodestone = $item`lodestone`;

function freeDigAvailable(): boolean {
  return (
    (have($skill`Unaccompanied Miner`) && get("_unaccompaniedMinerUsed", 0) < 5) ||
    have($effect`Loded`)
  );
}

function remainingFreePicks(): number {
  return have($skill`Unaccompanied Miner`) ? Math.max(0, 5 - get("_unaccompaniedMinerUsed", 0)) : 0;
}

type LodestoneAttempt = "ok" | "used-today" | "unavailable";

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

const NO_FREE_DIG_MESSAGE =
  "Free mining (5 Unaccompanied Miner picks + lodestone Loded) ended without teflon ore. Options: pull a minin' dynamite for one more free blast (ash hint UTS:2348-2350), or mine manually (ores show in adjacent veins of 5), then rerun.";

const abyss = $location`The Caliginous Abyss`;
const reef = $location`Madness Reef`;
const roughScale = $item`rough fish scale`;

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

function reefTripNext(): boolean {
  return !luckyObtainable() && itemAmount(roughScale) >= 10;
}

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
  withProperty("autoSatisfyWithCoinmasters", true, () => retrieveItem($item`11-leaf clover`));
  if (itemAmount($item`11-leaf clover`) > 0) use($item`11-leaf clover`);
}

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
  const shaft = SHAFT.find(([c, r]) => stateAt(state, c, r) !== "o");
  if (shaft) return shaft;
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

const DIG_HP_FLOOR = 760;
function healForDig(): void {
  const walrus = $skill`Tongue of the Walrus`;
  if (have($effect`Beaten Up`) && have(walrus)) {
    recover(0, mpCost(walrus));
    useSkill(walrus);
  }
  recover(DIG_HP_FLOOR);
}

interface DigResult {
  col: number;
  row: number;
  which: number;
  response: string;
}

function mineSquare(): DigResult {
  visitUrl("mining.php?mine=3");
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
        name: "Digpick",
        ready: () => !oreSecured(),
        completed: () => availableAmount(digpick) > 0 || oreSecured(),
        prepare: (): void => {
          recover();
          if (availableAmount(digpick) === 0) discretionaryPull(digpick);
        },
        do: () => (availableAmount(digpick) > 0 ? undefined : $location`Anemone Mine`),
        underwater: true,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        limit: {
          soft: 8,
          message: "No Mer-kin digpick after 8 turns; pull one manually and rerun.",
        },
      },
      {
        name: "Mine Teflon",
        ready: () => availableAmount(digpick) > 0 && !oreSecured(),
        completed: oreSecured,
        prepare: (): void => {
          recover();
        },
        do: (): void => {
          if (!haveEquipped(digpick)) {
            abort(
              "Mer-kin digpick is not equipped (the outfit should have placed it -- dress() may have failed to keep it on). Equip it manually and rerun.",
            );
          }
          let lodestoneResult: LodestoneAttempt = "ok";
          if (!freeDigAvailable()) lodestoneResult = tryLodestone();
          if (!freeDigAvailable()) {
            abort(NO_FREE_DIG_MESSAGE + lodestoneDetail(lodestoneResult));
          }
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
        outfit: { equip: [digpick] },
        freeaction: freeDigAvailable,
        underwater: true,
        limit: {
          tries: 3,
          message: NO_FREE_DIG_MESSAGE,
        },
      },
      {
        name: "Crappy Mask",
        ready: () => !maskOwned(),
        completed: maskOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            unequip($item`aerated diving helmet`);
            unequip($item`sea chaps`);
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
          if (!lassoExpert()) {
            abort(
              `Grandma's ROW125 trade spends the sea chaps, but the lasso skill is only at ` +
                `${get("lassoTrainingCount", 0)}/20 (${get("lassoTraining") || "untrained"}). ` +
                `The chaps are +1 of the +3 per throw and are unpullable in-path, so trading ` +
                `them now would strand the skill below expert and make the wild seahorse ` +
                `untameable for the rest of the run. Finish the training first — the corral ` +
                `grind and the free Shadow Rift fights both throw, seven geared throws is 20 ` +
                `— then rerun.`,
            );
          }
          if (availableAmount(scale) >= 3) {
            unequip($item`aerated diving helmet`);
            unequip($item`sea chaps`);
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
