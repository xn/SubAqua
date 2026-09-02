import {
  abort,
  availableAmount,
  buy,
  chew,
  cliExecute,
  create,
  drink,
  drinksilent,
  eatsilent,
  fullnessLimit,
  getCampground,
  getFuel,
  Item,
  mallPrice,
  myAdventures,
  myAscensions,
  myFullness,
  myInebriety,
  myMeat,
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

const fishyPastas = $items`Frutti di Scatoletta, Pesto alla Marziano, Arrattabbattabiata, Orzo di Riso, Pasta Grimavera, Linguini Ubriacapa, Gnocci Domani, Formica e Pepe, Tubetto Gelatto`;

const nigiris: [string, Item][] = [
  ["beefy nigiri", $item`beefy fish meat`],
  ["glistening nigiri", $item`glistening fish meat`],
  ["slick nigiri", $item`slick fish meat`],
];

export function eatSushi(): boolean {
  if (!get("hasSushiMat")) return false;
  if (!have($item`white rice`)) {
    retrieveItem($item`white rice`, 1);
  }
  cliExecute("refresh inventory");
  for (const [sushi, meat] of nigiris) {
    if (availableAmount(meat) > 0 && availableAmount($item`white rice`) > 0) {
      cliExecute(`make ${sushi}`);
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
  fullness?: number;
};

const FISHY_SOURCES: Fishysource[] = [
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

function averageAdventures(item: Item): number {
  const raw = item.adventures;
  if (!raw) return 0;
  const [low, high] = raw.split("-").map((n) => toInt(n));
  return high !== undefined ? (low + high) / 2 : low;
}

function fishyOpportunityCost(source: Item, fullnessOverride?: number): number {
  const cost = mallPrice(source);
  const fullness = fullnessOverride ?? source.fullness;
  if (fullness > 0) {
    return get("valueOfAdventure") * (7 - averageAdventures(source)) * fullness + 12_500 + cost;
  }

  if (source.inebriety > 0) {
    return get("valueOfAdventure") * (7 - averageAdventures(source)) * source.inebriety + cost;
  }

  if (source.spleen > 0) {
    return 22_500 + cost;
  }

  return cost;
}

function cheapestFishySource(): Fishysource | null {
  const available = FISHY_SOURCES.filter((source) => {
    if (!source.available()) return false;
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

export function maintainFishy(): void {
  if (have(fishy)) return;

  if (!get("_fishyPipeUsed") && (have($item`fishy pipe`) || storageAmount($item`fishy pipe`) > 0)) {
    if (!have($item`fishy pipe`)) pullSequence($item`fishy pipe`);
    if (have($item`fishy pipe`)) use($item`fishy pipe`);
    if (have(fishy)) return;
  }

  if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
    cliExecute("skate lutz");
    if (have(fishy)) return;
  }

  const source = cheapestFishySource();
  if (source) {
    useFishySource(source);
  }
  if (have(fishy)) return;

  if (currentPolicy().fishyPullMeal && fullnessLimit() - myFullness() >= 4) {
    const pasta = fishyPastas.reduce((a, b) => (mallPrice(a) <= mallPrice(b) ? a : b));
    if (availableAmount(pasta) > 0 || pullSequence(pasta)) cliExecute(`eat 1 ${pasta.name}`);
    if (availableAmount($item`Aldebaran sardines`) > 0 || pullSequence($item`Aldebaran sardines`)) {
      cliExecute(`eat 1 Aldebaran sardines`);
    }
    if (have(fishy)) return;
  }

  if (mySpleenUse() < spleenLimit()) {
    if (availableAmount($item`fish sauce`) > 0 || pullSequence($item`fish sauce`)) {
      chew(1, $item`fish sauce`);
    }
    if (have(fishy)) return;
  }

  if (eatSushi()) return;

  abort(
    "Could not acquire Fishy (pipe, pull-meal, fish sauce, and sushi all failed). " +
      "Get Fishy manually (fishy pipe / eat sea sushi / chew fish sauce), then rerun.",
  );
}

export function maintainWaterproofly(): void {
  if (!AsdonMartin.installed()) return;
  if (have($effect`Driving Waterproofly`)) return;
  if (getFuel() < 37) {
    const pie = $item`pie man was not meant to eat`;
    if (availableAmount(pie) === 0) pullSequence(pie);
    if (availableAmount(pie) > 0) AsdonMartin.insertFuel(pie, 1);
  }
  if (getFuel() < 37) sodaBreadRefuel();
  if (getFuel() >= 37) cliExecute("asdonmartin drive Waterproofly");
}

const SODA_BREAD_MEAT_FLOOR = 15000;
const SODA_BREAD_LOAVES = 23;

function sodaBreadRefuel(): void {
  if (myMeat() < SODA_BREAD_MEAT_FLOOR) return;
  if (myAscensions() < 10) return;
  const bread = $item`loaf of soda bread`;
  const dough = $item`wad of dough`;
  if (!have($item`bitchin' meatcar`) && !have($item`Desert Bus pass`)) {
    buy(1, $item`Desert Bus pass`);
    if (!have($item`Desert Bus pass`)) return;
  }
  if (availableAmount(dough) === 0) {
    buy(1, $item`all-purpose flower`);
    if (!have($item`all-purpose flower`)) return;
    use(1, $item`all-purpose flower`);
  }
  const loaves = Math.min(SODA_BREAD_LOAVES, availableAmount(dough));
  if (loaves === 0) return;
  buy(Math.max(0, loaves - availableAmount($item`soda water`)), $item`soda water`);
  create(loaves, bread);
  if (availableAmount(bread) > 0)
    cliExecute(`asdonmartin fuel ${availableAmount(bread)} loaf of soda bread`);
}

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
