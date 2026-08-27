import {
  abort,
  availableAmount,
  chew,
  cliExecute,
  drink,
  drinksilent,
  eatsilent,
  fullnessLimit,
  getCampground,
  getFuel,
  Item,
  mallPrice,
  myAdventures,
  myFullness,
  myInebriety,
  mySpleenUse,
  retrieveItem,
  spleenLimit,
  storageAmount,
  toInt,
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
export function eatSushi(): boolean {
  if (!get("hasSushiMat")) return false;
  if (!have($item`white rice`)) {
    retrieveItem($item`white rice`, 1);
  }
  cliExecute("refresh inventory");
  for (const [sushi, meat] of nigiris) {
    if (availableAmount(meat) > 0 && availableAmount($item`white rice`) > 0) {
      cliExecute(`eat 1 ${sushi}`);
      if (have(fishy)) return true;
    }
  }
  return false;
}

type Fishysource = {
  item: Item;
  available: () => boolean;
  turns: number;
  use?: () => void;
  /** Overrides item.fullness in fishyOpportunityCost() — for a pseudo-item
   * rung (e.g. nigiri) whose `item` is a priced stand-in with the wrong
   * fullness stat for the real thing being consumed. */
  fullness?: number;
};

const FISHY_SOURCES: Fishysource[] = [
  // The nigiri themselves have no item id/mall price (see the pseudoitem
  // note above), so `item` here is their real fish-meat ingredient instead
  // — a real, priced stand-in for the opportunity cost of burning it as
  // sushi rather than something else. `use` (not the `item` field) is what
  // useFishySource() actually consumes. fullness overrides the fish meat's
  // own fullness (1) with the nigiri's true fullness.txt value (2), since
  // that term dominates fishyOpportunityCost().
  {
    item: $item`beefy fish meat`,
    available: () => have($item`beefy fish meat`) && get("hasSushiMat"),
    turns: 20,
    use: () => eatSushi(),
    fullness: 2,
  },
  {
    item: $item`glistening fish meat`,
    available: () => have($item`glistening fish meat`) && get("hasSushiMat"),
    turns: 20,
    use: () => eatSushi(),
    fullness: 2,
  },
  {
    item: $item`slick fish meat`,
    available: () => have($item`slick fish meat`) && get("hasSushiMat"),
    turns: 20,
    use: () => eatSushi(),
    fullness: 2,
  },
  {
    item: $item`concentrated fish broth`,
    available: () => have($item`concentrated fish broth`),
    turns: 30,
  },
  {
    item: $item`cuppa Gill tea`,
    available: () =>
      have($item`cuppa Gill tea`) ||
      (getCampground()["potted tea tree"] !== undefined && !get("_pottedTeaTreeUsed")),
    turns: 30,
    use: () => {
      if (!have($item`cuppa Gill tea`)) {
        cliExecute(`teatree cuppa gill tea`);
      }
      use($item`cuppa Gill tea`);
    },
  },
  {
    item: $item`fish juice box`,
    available: () => have($item`fish juice box`),
    turns: 20,
  },
  {
    item: $item`powdered candy sushi set`,
    available: () => have($item`powdered candy sushi set`),
    turns: 30,
  },
  {
    item: $item`Aldebaran sardines`,
    available: () => have($item`Aldebaran sardines`),
    turns: 60,
  },
  {
    item: $item`buñuelos Jaliscos`,
    available: () => have($item`buñuelos Jaliscos`),
    turns: 30,
  },
  {
    item: $item`old chum`,
    available: () => have($item`old chum`),
    turns: 5,
  },
  {
    item: $item`shoo-fish pie`,
    available: () => have($item`shoo-fish pie`),
    turns: 20,
  },
  {
    item: $item`Centauri fish wine`,
    available: () => have($item`Centauri fish wine`),
    turns: 60,
  },
  {
    item: $item`fishelada`,
    available: () => have($item`fishelada`),
    turns: 30,
  },
  {
    item: $item`Punchplanter`,
    available: () => have($item`Punchplanter`),
    turns: 5,
  },
  {
    item: $item`Doublepunchplanter`,
    available: () => have($item`Doublepunchplanter`),
    turns: 10,
  },
  {
    item: $item`Haymaker`,
    available: () => have($item`Haymaker`),
    turns: 15,
  },
  {
    item: $item`Caipiranha`,
    available: () => have($item`Caipiranha`),
    turns: 5,
  },
  {
    item: $item`Flying Caipiranha`,
    available: () => have($item`Flying Caipiranha`),
    turns: 10,
  },
  {
    item: $item`Flaming Caipiranha`,
    available: () => have($item`Flaming Caipiranha`),
    turns: 15,
  },
  {
    item: $item`Herring Daiquiri`,
    available: () => have($item`Herring Daiquiri`),
    turns: 5,
  },
  {
    item: $item`Herring Wallbanger`,
    available: () => have($item`Herring Wallbanger`),
    turns: 10,
  },
  {
    item: $item`Herringtini`,
    available: () => have($item`Herringtini`),
    turns: 15,
  },
  // "super-sweet fish goo" (unspoiled) has no item id in items.txt — only
  // "super-sweet fish goo (spoiled)" exists, and statuseffects.txt confirms
  // chewing it grants Fishy. A duplicate rung under the unspoiled name was
  // removed rather than renamed, since this rung already covers the item.
  {
    item: $item`super-sweet fish goo (spoiled)`,
    available: () => have($item`super-sweet fish goo (spoiled)`),
    turns: 15,
  },
  {
    item: $item`fishy paste`,
    available: () => have($item`fishy paste`),
    turns: 10,
  },
  {
    // Stocked for free by the init "Sea Jelly" task (the garbo fork dailySea.ts:18-30):
    // one place.php visit with the Space Jellyfish out, 0 turns, 1/day
    // (_seaJellyHarvested). Nothing else in the run acquires one, so before
    // that task this rung never fired; `available()` needs no change — the
    // harvest is what puts the jelly in inventory.
    item: $item`sea jelly`,
    available: () => have($item`sea jelly`),
    turns: 10,
  },
  {
    item: $item`fish sauce`,
    available: () => have($item`fish sauce`),
    turns: 30,
  },
  {
    item: $item`fishy pipe`,
    available: () => have($item`fishy pipe`),
    turns: 10,
  },
];

function fishyOpportunityCost(source: Item, fullnessOverride?: number): number {
  const cost = mallPrice(source);
  const fullness = fullnessOverride ?? source.fullness;
  if (fullness > 0) {
    return get("valueOfAdventure") * (7 - toInt(source.adventures)) * fullness + 12_500 + cost;
  }

  if (source.inebriety > 0) {
    return get("valueOfAdventure") * (7 - toInt(source.adventures)) * source.inebriety + cost;
  }

  if (source.spleen > 0) {
    return 22_500 + cost;
  }

  return cost;
}

function cheapestFishySource(): Fishysource | null {
  const available = FISHY_SOURCES.filter((source) => {
    if (!source.available()) return false;
    // Spleen rungs need the room, same guard rung 3 below already carries: a
    // chew() with no spleen left fails, the ladder finds Fishy still missing,
    // and — now that the daily harvest keeps a sea jelly reliably on hand — the
    // optimizer would pick that same rung again on the next call.
    const spleen = source.item.spleen;
    if (spleen > 0 && mySpleenUse() + spleen > spleenLimit()) return false;
    return true;
  });

  if (available.length === 0) return null;

  return available.reduce((cheapest, source) =>
    fishyOpportunityCost(source.item, source.fullness) <
    fishyOpportunityCost(cheapest.item, cheapest.fullness)
      ? source
      : cheapest,
  );
}

function useFishySource(source: Fishysource): boolean {
  if (source.use) {
    source.use();
  } else if (source.item.fullness > 0) {
    eatsilent(source.item);
  } else if (source.item.inebriety > 0) {
    drinksilent(source.item);
  } else if (source.item.spleen > 0) {
    chew(source.item);
  } else {
    use(1, source.item);
  }

  return have(fishy);
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

  // Rung 1.5: Lutz the Ice Skate — free 30-turn Fishy once the skate war
  // resolved for ice (statuseffects.txt:552; SkateParkRequest state2buff1).
  // Ahead of the optimizer below: a free buff always beats consuming a source.
  if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
    cliExecute("skate lutz");
    if (have(fishy)) return;
  }

  // Rung 1.6: Do some automatic fishy optimization.
  const source = cheapestFishySource();
  if (source) {
    useFishySource(source);
  }
  if (have(fishy)) return;

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
