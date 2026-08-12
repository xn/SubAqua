import {
  abort,
  availableAmount,
  chew,
  cliExecute,
  drink,
  fullnessLimit,
  getFuel,
  Item,
  mallPrice,
  myAdventures,
  myFullness,
  myInebriety,
  mySpleenUse,
  spleenLimit,
  storageAmount,
  use,
  useSkill,
} from "kolmafia";
import { $effect, $item, $items, $skill, AsdonMartin, get, have } from "libram";

import { currentPolicy } from "./policy";
import { pullSequence } from "./pulls";

const fishy = $effect`Fishy`;

/** The nine mall pastas the ash price-scans for the Fishy meal (UTS:32-35,
 * 817-825). Pre-verified against items.txt; lint is the authority. */
const fishyPastas = $items`Frutti di Scatoletta, Pesto alla Marziano, Arrattabbattabiata, Orzo di Riso, Pasta Grimavera, Linguini Ubriacapa, Gnocci Domani, Formica e Pepe, Tubetto Gelatto`;

/** The three sushi-mat nigiri are concoctions.txt SUSHI pseudoitems
 * (fullness.txt marks them `pseudoitem`): no real item id, so $item`` can't
 * resolve the sushi name itself — only its real-item fish-meat ingredient. */
const nigiris: [string, Item][] = [
  ["beefy nigiri", $item`beefy fish meat`],
  ["glistening nigiri", $item`glistening fish meat`],
  ["slick nigiri", $item`slick fish meat`],
];

/** Ash eatSushi() (UTS:650-662): first nigiri whose fish meat is on hand.
 * Sushi is made-and-eaten in one step off the rolling mat; mafia's `eat`
 * command knows sushi names. Returns true if a sushi was eaten. */
function eatSushi(): boolean {
  if (!get("hasSushiMat")) return false;
  cliExecute("refresh inventory");
  for (const [sushi, meat] of nigiris) {
    if (availableAmount(meat) > 0 && availableAmount($item`white rice`) > 0) {
      cliExecute(`eat 1 ${sushi}`);
      if (have(fishy)) return true;
    }
  }
  return false;
}

/**
 * The in-run Fishy ladder (ash post_adv UTS:811-843), called from
 * engine.prepare() before every underwater adventuring task. Restore-at-zero,
 * like the ash: underwater turns cost 2 without Fishy
 * (AdventureRequest.getAdventuresUsed, AdventureRequest.java:1294-1295).
 *
 * Deviation from ash, documented: the fishy pipe rung drops the ash's
 * high-kit gate (payphone+Monodent+PYEC, UTS:812) — the pipe is a zero-turn
 * +10 Fishy daily with no competing in-run use, so the net-turn principle
 * (spec §9) says spend it first on every account that owns one.
 */
export function maintainFishy(): void {
  if (have(fishy)) return;

  // Rung 1: fishy pipe — zero turns, +10 Fishy, 1/day.
  if (!get("_fishyPipeUsed") && (have($item`fishy pipe`) || storageAmount($item`fishy pipe`) > 0)) {
    if (!have($item`fishy pipe`)) pullSequence($item`fishy pipe`);
    if (have($item`fishy pipe`)) use($item`fishy pipe`);
    if (have(fishy)) return;
  }

  // Rung 2: pull-meal — cheapest pasta + Aldebaran sardines (UTS:816-829).
  // Policy-gated (high/low yes, mid no); pullSequence's pulled-today
  // bookkeeping enforces once per day.
  if (currentPolicy().fishyPullMeal && fullnessLimit() - myFullness() >= 4) {
    const pasta = fishyPastas.reduce((a, b) => (mallPrice(a) <= mallPrice(b) ? a : b));
    if (availableAmount(pasta) > 0 || pullSequence(pasta)) cliExecute(`eat 1 ${pasta.name}`);
    if (availableAmount($item`Aldebaran sardines`) > 0 || pullSequence($item`Aldebaran sardines`)) {
      cliExecute(`eat 1 Aldebaran sardines`);
    }
    if (have(fishy)) return;
  }

  // Rung 3: fish sauce chew (spleen; UTS:830-832).
  if (mySpleenUse() < spleenLimit()) {
    if (availableAmount($item`fish sauce`) > 0 || pullSequence($item`fish sauce`)) {
      chew(1, $item`fish sauce`);
    }
    if (have(fishy)) return;
  }

  // Rung 4: sea sushi off the rolling mat (UTS:838-840). The ash's
  // worktea-sushi variant (dreadscroll clue 7, UTS:833-837) is Phase 4's
  // dreadscroll concern — see the deferrals list.
  cliExecute("acquire 1 white rice");
  if (eatSushi()) return;

  abort(
    "Could not acquire Fishy (pipe, pull-meal, fish sauce, and sushi all failed). " +
      "Get Fishy manually (fishy pipe / eat sea sushi / chew fish sauce), then rerun.",
  );
}

/**
 * Asdon Driving Waterproofly upkeep (ash post_adv UTS:799-809): effect-based
 * breathing that frees every gear slot. Only relevant when the Asdon is the
 * workshed. Fuel comes from the ash's dedicated pull ("pie man was not meant
 * to eat", one pull = ~100 fuel); we never mall-fuel in-run.
 */
export function maintainWaterproofly(): void {
  if (!AsdonMartin.installed()) return;
  if (have($effect`Driving Waterproofly`)) return;
  if (getFuel() < 37) {
    const pie = $item`pie man was not meant to eat`;
    if (availableAmount(pie) === 0) pullSequence(pie);
    if (availableAmount(pie) > 0) AsdonMartin.insertFuel(pie, 1);
  }
  if (getFuel() >= 37) cliExecute("asdonmartin drive Waterproofly");
}

/**
 * Ash's path-55 zero-adventure diet (post_adv UTS:781-796): crack the astral
 * six-pack, shrug Donho's for the Ode slot, Ode to Booze, drink a pilsner.
 * Called from engine post(); aborts with the ash's message when dry.
 */
export function emergencyDiet(): void {
  if (myAdventures() > 0) return;
  if (availableAmount($item`astral pilsner`) === 0 && availableAmount($item`astral six-pack`) > 0) {
    use($item`astral six-pack`);
  }
  if (availableAmount($item`astral pilsner`) === 0) {
    abort(
      "Out of adventures and no more easy diet (astral pilsners exhausted). Eat/drink manually, then rerun.",
    );
  }
  if (myInebriety() >= 14) {
    abort("Out of adventures and too drunk for another pilsner. Handle diet manually, then rerun.");
  }
  if (have($effect`Donho's Bubbly Ballad`)) cliExecute("shrug Donho's Bubbly Ballad");
  if (have($skill`The Ode to Booze`)) useSkill($skill`The Ode to Booze`);
  drink(1, $item`astral pilsner`);
}
