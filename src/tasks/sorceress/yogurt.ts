import {
  abort,
  adv1,
  availableAmount,
  buy,
  equip,
  Item,
  itemAmount,
  myAdventures,
  myBuffedstat,
  myMaxhp,
  numericModifier,
  print,
  pullsRemaining,
  retrieveItem,
  use,
  useSkill,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $item,
  $items,
  $location,
  $skill,
  $slot,
  $stat,
  get,
  have,
  uneffect,
} from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

import { burnTurnElsewhere } from "./burn";
import { yogUrtFilter } from "./fights";

const beads = $item`Mer-kin prayerbeads`;
const healscroll = $item`Mer-kin healscroll`;
const waterlogged = $item`waterlogged scroll of healing`;
const gel = $item`sea gel`;
const unguent = $item`Doc Galaktik's Pungent Unguent`;
const elixir = $item`Doc Galaktik's Homeopathic Elixir`;
const crystal = $item`New Age healing crystal`;
const bandaid = $item`soggy used band-aid`;
const antidote = $item`soft green echo eyedrop antidote`;
const penny = $item`sand penny`;
const yogDelevelStock = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;

function delevelersOwned(): number {
  // ash delevelers() (G:634-640; its duplicate mouthsoap entry collapsed).
  return yogDelevelStock.filter((it) => itemAmount(it) > 0).length;
}

/**
 * ash HealingHP (G:695-701 at 89982f5), but listed in the order the FIGHT
 * throws them (fights.ts yogHealOrder / CCS yogHealing(), CCS:370-377).
 * The ash's own `foreach it in HealingHP` walks a TreeMap keyed by item id
 * (MapValue.java:13, Value.compareTo -> contentLong for non-string-like
 * types), which is an ash storage artifact, not a decision; the amendment
 * states the intent — "the smallest heal among the owned types the fight will
 * throw" — so the throw order is what maxHeal() walks here.
 */
const healingHP = new Map<Item, number>([
  [gel, 500],
  [healscroll, 300],
  [waterlogged, 250],
  [bandaid, 1000],
  [crystal, 500],
]);

/** ash YogHealingsNeeded (G:709-714): healing throws the fight makes, by
 * prayerbeads on hand. Beyond three beads the ash's ternary pins the index at
 * 3 (G:730). Zero beads (21 throws) is out of reach of a five-type kit — the
 * prep abort says so. */
const yogHealingsNeeded = [21, 5, 3, 2];

function healsNeeded(): number {
  return yogHealingsNeeded[Math.min(availableAmount(beads), 3)];
}

/** ash YogHealingsOwned() (G:716-724): DISTINCT healing item types on hand. */
function yogHealingsOwned(): number {
  return [...healingHP.keys()].filter((it) => availableAmount(it) > 0).length;
}

/** ash farm/pull-loop condition (UTS:2698, 2762, 2827, 2846 at 89982f5):
 * still reachable? False once owned + the day's remaining pulls cover the
 * throws. */
function yogHealingsShort(): boolean {
  return healsNeeded() - yogHealingsOwned() > pullsRemaining();
}

/** The pulls above actually realized: enough distinct types for every throw. */
function yogHealKitReady(): boolean {
  return yogHealingsOwned() >= healsNeeded();
}

/** ash YogHpCheck()'s maxHeal (G:726-736): the weakest of the heals the fight
 * will throw — the one that has to keep up with her debuffed damage. */
function maxHeal(): number {
  const needed = healsNeeded();
  let smallest = 1001;
  let counted = 0;
  for (const [it, hp] of healingHP) {
    if (counted >= needed) break;
    if (availableAmount(it) > 0) {
      if (hp < smallest) smallest = hp;
      counted += 1;
    }
  }
  return smallest;
}

/** ash trueHPPercent() (G:703-708): max HP per point of Muscle with flat
 * max-HP bonuses factored out, to two places. */
function trueHPPercent(): number {
  return (
    Math.round(
      ((myMaxhp() - numericModifier("Maximum HP")) / (myBuffedstat($stat`Muscle`) + 3)) * 100,
    ) / 100
  );
}

/** ash YogHpCheck()'s prediction (G:737-740): Yog-Urt's debuff floors Muscle
 * at 30, so the post-debuff HP pool follows from trueHPPercent(). Both ash
 * assignments are `int`, hence the truncation of the float modifier terms. */
function predictedHP(): number {
  const predictedMus = Math.trunc(
    Math.round(30 * (1 + numericModifier("Muscle Percent") / 100)) + numericModifier("Muscle"),
  );
  return Math.trunc(
    Math.round((predictedMus + 3) * trueHPPercent()) + numericModifier("Maximum HP"),
  );
}

/**
 * ash YogHpCheck() (G:726-757 at 89982f5). Replaces the old flat `my_maxhp() >
 * 311` ceiling: what matters is whether one heal throw out-paces the damage
 * she does to the post-debuff HP pool. Gummiheart's flat +100 Muscle is the
 * one contributor an antidote can clear, so it is the fallback when the
 * Gummiheart Burn task's free ladder ran dry.
 */
function yogHpCheck(): void {
  const heal = maxHeal();
  let predicted = predictedHP();
  print(`Yog-Urt: predicted post-debuff HP ${predicted} vs a ${heal} HP heal`, "blue");
  if (predicted * 0.9 > heal && have($effect`Gummiheart`)) {
    if (itemAmount(antidote) === 0 && pullBudgetAllows(antidote)) pullSequence(antidote);
    if (itemAmount(antidote) > 0 && !uneffect($effect`Gummiheart`)) {
      print("Couldn't remove Gummiheart before Yog-Urt.", "red");
    }
    if (have($effect`Gummiheart`)) {
      print("Gummiheart is still up; no antidote to remove it.", "red");
    } else {
      predicted = predictedHP();
      print(`Yog-Urt: predicted HP after antidote ${predicted}`, "blue");
    }
  }
  if (predicted * 0.9 > heal) {
    abort(
      `Muscle/HP too high for Yog-Urt: ${predicted} predicted HP against a ${heal} HP heal. ` +
        "Shed Muscle/max-HP effects (uneffect them, or drop max-HP gear), or stock a stronger " +
        "heal (soggy used band-aid heals 1000), then rerun (ash G:741-757 at 89982f5).",
    );
  }
}

/** One heal-type pull, ash-shaped (UTS:2856-2868): only when the type is
 * missing and today's pull for it is unspent, and only inside the reservation
 * budget (pulls.ts discipline). */
function pullHeal(it: Item): boolean {
  if (itemAmount(it) > 0 || pulledToday(it)) return false;
  if (!pullBudgetAllows(it)) return false;
  return pullSequence(it);
}

function yogPrepComplete(): boolean {
  return (
    itemAmount(unguent) > 0 &&
    itemAmount(elixir) > 0 &&
    (delevelersOwned() >= 2 || have($effect`Null Afternoon`)) &&
    yogHealKitReady()
  );
}

/** Gummiheart wait bookkeeping (ash UTS:2818-2830): free combats spend no turn
 * yet still make progress, so only a run of turnless passes — or a ladder with
 * nothing left on it — means genuinely stuck. Run-scoped, like the ash's
 * loop-local counter. */
let gummiheartStalls = 0;
let gummiheartLadderDry = false;

function gummiheartWaitOver(): boolean {
  return !have($effect`Gummiheart`) || gummiheartLadderDry || gummiheartStalls >= 8;
}

export function yogUrtQuest(): Quest {
  return {
    name: "Yog-Urt",
    tasks: [
      {
        // Gummiheart's flat +100 Muscle inflates the HP pool her debuff scales
        // against while the healing items heal fixed amounts, so it wants to
        // lapse before the cocoon. This is the FREE option: burn its turns on
        // route work (ash UTS:2814-2830, stall-guarded). When the ladder runs
        // dry the wait ends anyway and yogHpCheck()'s antidote takes over.
        name: "Gummiheart Burn",
        ready: () =>
          have($effect`Gummiheart`) &&
          get("isMerkinHighPriest", false) &&
          !get("yogUrtDefeated") &&
          myAdventures() > 0,
        // `|| yogUrtDefeated`: the wait is moot once she is dead, and the
        // effect can outlive the fight — without the OR this task reports
        // incomplete-but-unavailable forever (`subaqua list` shows a stale
        // circle).
        completed: () => gummiheartWaitOver() || get("yogUrtDefeated", false),
        do: (): void => {
          const before = myAdventures();
          if (!burnTurnElsewhere()) {
            gummiheartLadderDry = true;
            return;
          }
          if (myAdventures() < before) gummiheartStalls = 0;
          else gummiheartStalls += 1;
        },
        underwater: true,
        limit: { soft: 40, message: "Gummiheart is not burning down." },
      },
      {
        // Stock the fight (ash UTS:2832-2869). Pull order matters: the
        // antidote goes first because the heal pulls below can exhaust the
        // day's budget before yogHpCheck() runs, and under 1.4 HP per point of
        // Muscle a flat +100 cannot reach that check's threshold anyway
        // (UTS:2830-2836).
        name: "Yog Prep",
        ready: () => get("isMerkinHighPriest", false) && !get("yogUrtDefeated"),
        // `|| yogUrtDefeated`: the fight consumes the kit, so yogPrepComplete()
        // is false again the moment the prep has served its purpose — the OR is
        // what keeps this from reading as permanently unfinished afterwards.
        completed: () => get("yogUrtDefeated", false) || yogPrepComplete(),
        do: (): void => {
          if (
            have($effect`Gummiheart`) &&
            itemAmount(antidote) === 0 &&
            trueHPPercent() >= 1.4 &&
            pullBudgetAllows(antidote)
          ) {
            pullSequence(antidote);
          }
          if (
            itemAmount(healscroll) === 0 &&
            !pulledToday(healscroll) &&
            pullBudgetAllows(healscroll)
          ) {
            pullSequence(healscroll);
          }
          // `acquire waterlogged scroll of healing, sea gel, ...` (UTS:2838):
          // the two cheap Wet Crap heals plus the Doc Galaktik closing pair.
          if (itemAmount(waterlogged) === 0 && itemAmount(penny) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, waterlogged);
          }
          if (itemAmount(gel) === 0 && itemAmount(penny) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, gel);
          }
          retrieveItem(unguent);
          retrieveItem(elixir);
          if (
            delevelersOwned() < 2 &&
            !pulledToday($item`null-day exploit`) &&
            pullBudgetAllows($item`null-day exploit`)
          ) {
            if (pullSequence($item`null-day exploit`)) use($item`null-day exploit`);
          }
          if (delevelersOwned() < 2 && !have($effect`Null Afternoon`)) {
            abort(
              "Yog-Urt prep is short: need two deleveler types (Mer-kin mouthsoap / crayon shavings / table tennis ball / sea cowbell) or Null Afternoon. Farm the corral for cowbells or pull delevelers, then rerun.",
            );
          }
          if (availableAmount(beads) < 3 && !pulledToday(beads) && pullBudgetAllows(beads)) {
            pullSequence(beads);
          }
          // Heal-type top-up (UTS:2851-2869): crystal first, band-aid second.
          // The ash branches on the bead count (three -> neither, two -> one of
          // them, fewer -> both); the throw budget says the same thing exactly
          // and says it once, spends nothing when the kit already covers the
          // throws, and also covers the ash's blind spot — three beads with
          // only one healing type on hand pulls nothing there and then aborts
          // mid-fight on yogHealing().
          if (!yogHealKitReady()) pullHeal(crystal);
          if (!yogHealKitReady()) pullHeal(bandaid);
          if (!yogHealKitReady()) {
            abort(
              `Yog-Urt's healing kit is short: ${availableAmount(beads)} prayerbeads means ` +
                `${healsNeeded()} healing throws, and only ${yogHealingsOwned()} of the five ` +
                `healing item types (sea gel, Mer-kin healscroll, waterlogged scroll of healing, ` +
                `soggy used band-aid, New Age healing crystal) are on hand${
                  yogHealingsShort() ? " with no pulls left to fix it" : ""
                }. Farm outpost prayerbeads (-combat, healer saber) — every bead cuts the throw ` +
                `count — or free up pulls for the crystal/band-aid, then rerun (ash G:709-724 at 89982f5).`,
            );
          }
        },
        freeaction: true,
        limit: { tries: 3 },
      },
      {
        // The fight (UTS:2871-2891 + CCS:1091-1112): -hp outfit, the "exp"
        // no-attack familiar, every bead in an accessory slot, Cannelloni
        // Cocoon to full, then the HP prediction.
        name: "Yog-Urt",
        ready: () => yogPrepComplete() && gummiheartWaitOver() && get("isMerkinHighPriest", false),
        completed: () => get("yogUrtDefeated"),
        prepare: (): void => {
          for (const slot of [$slot`acc1`, $slot`acc2`, $slot`acc3`].slice(
            0,
            availableAmount(beads),
          )) {
            equip(slot, beads);
          }
          if (have($skill`Cannelloni Cocoon`)) useSkill($skill`Cannelloni Cocoon`);
          recover(myMaxhp());
          yogHpCheck();
        },
        do: () => void adv1($location`Mer-kin Temple (Right Door)`, -1, yogUrtFilter()),
        outfit: () => ({
          modifier:
            "moxie, hot damage, cold damage, spooky damage, sleaze damage, stench damage, -hp, -equip tiny yam cannon",
          equip: [
            $item`Mer-kin scholar mask`,
            $item`Mer-kin scholar tailpiece`,
            ...(currentPolicy().conserveFreeFights ? [] : [$item`bat wings`]),
          ],
          familiar: expFamiliar(),
        }),
        underwater: true,
        limit: { tries: 3, message: "Yog-Urt is not dying; check the deleveler/heal stock." },
      },
    ],
  };
}
