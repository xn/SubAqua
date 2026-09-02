import {
  abort,
  availableAmount,
  Item,
  itemAmount,
  mallPrice,
  pullsRemaining,
  storageAmount,
  takeStorage,
  toInt,
  buyUsingStorage,
} from "kolmafia";
import { $effect, $item, $items, get, have } from "libram";

import { buyLimit } from "../lib";
import { shubPrepShort } from "../lib/shub";

import { currentPolicy } from "./policy";

const unpullableInPath = $items`rough fish scale, pristine fish scale, rusty diving helmet, aerated diving helmet, teflon ore, teflon swim fins, sea leather, sea cowboy hat, sea chaps, Mer-kin bunwig, crappy Mer-kin mask, crappy Mer-kin tailpiece, Mer-kin gladiator mask, Mer-kin scholar mask, Mer-kin gladiator tailpiece, Mer-kin scholar tailpiece, Mer-kin headguard, Mer-kin waistrope, Mer-kin facecowl, Mer-kin thighguard, Mer-kin dodgeball, Mer-kin dragnet, Mer-kin switchblade, unblemished pearl`;

export function pullable(item: Item): boolean {
  return !unpullableInPath.includes(item);
}

export function pulledToday(item: Item): boolean {
  return `,${get("_roninStoragePulls")},`.includes(`,${toInt(item)},`);
}

export function pullSequence(item: Item): boolean {
  if (!pullable(item)) return false;
  if (pullsRemaining() === 0) return false;
  if (pulledToday(item)) return false;
  if (storageAmount(item) === 0) {
    const price = mallPrice(item);
    if (price > buyLimit()) {
      abort(
        `${item.name} costs ${price} meat in the mall, over your buy limit of ${buyLimit()}. ` +
          `Raise buyLimit= (or autoBuyPriceLimit), or put one in Hagnk's yourself, then rerun.`,
      );
    }
    buyUsingStorage(1, item);
  }
  return takeStorage(1, item);
}

type PullReservation = {
  name: string;
  item: Item;
  needed: () => boolean;
};

const pullReservations: PullReservation[] = [
  {
    name: "crayon shavings",
    item: $item`crayon shavings`,
    needed: () => availableAmount($item`crayon shavings`) < 9,
  },
  {
    name: "null-day exploit",
    item: $item`null-day exploit`,
    needed: () =>
      !get("shubJigguwattDefeated") && shubPrepShort(2) && !pulledToday($item`null-day exploit`),
  },
  {
    name: "Mer-kin pinkslip",
    item: $item`Mer-kin pinkslip`,
    needed: () =>
      availableAmount($item`Mer-kin pinkslip`) === 0 && !pulledToday($item`Mer-kin pinkslip`),
  },
  {
    name: "Mer-kin prayerbeads",
    item: $item`Mer-kin prayerbeads`,
    needed: () =>
      availableAmount($item`Mer-kin prayerbeads`) < 3 && !pulledToday($item`Mer-kin prayerbeads`),
  },
  {
    name: "ink bladder",
    item: $item`ink bladder`,
    needed: () => availableAmount($item`ink bladder`) === 0 && !pulledToday($item`ink bladder`),
  },
  {
    name: "comb jelly",
    item: $item`comb jelly`,
    needed: () =>
      !have($effect`Jelly Combed`) &&
      availableAmount($item`comb jelly`) === 0 &&
      !pulledToday($item`comb jelly`),
  },
  {
    name: "sea lasso (training)",
    item: $item`sea lasso`,
    needed: () =>
      have($item`sea cowboy hat`) &&
      have($item`sea chaps`) &&
      get("lassoTrainingCount", 0) < 20 &&
      availableAmount($item`sea lasso`) === 0 &&
      !pulledToday($item`sea lasso`),
  },
  {
    name: "sea cowbell",
    item: $item`sea cowbell`,
    needed: () =>
      get("corralUnlocked") &&
      get("seahorseName") === "" &&
      availableAmount($item`sea cowbell`) < 3 &&
      !pulledToday($item`sea cowbell`),
  },
  {
    name: "Mer-kin digpick",
    item: $item`Mer-kin digpick`,
    needed: () =>
      availableAmount($item`Mer-kin digpick`) === 0 &&
      itemAmount($item`teflon ore`) === 0 &&
      availableAmount($item`teflon swim fins`) === 0 &&
      ![
        $item`Mer-kin gladiator tailpiece`,
        $item`Mer-kin scholar tailpiece`,
        $item`crappy Mer-kin tailpiece`,
      ].some((it) => availableAmount(it) > 0) &&
      !pulledToday($item`Mer-kin digpick`),
  },
  {
    name: "Mer-kin hallpass",
    item: $item`Mer-kin hallpass`,
    needed: () =>
      get("merkinElementaryTeacherUnlock", false) &&
      availableAmount($item`Mer-kin hallpass`) <
        Number(
          availableAmount($item`Mer-kin facecowl`) === 0 &&
            availableAmount($item`Mer-kin scholar mask`) === 0,
        ) +
          Number(
            availableAmount($item`Mer-kin waistrope`) === 0 &&
              availableAmount($item`Mer-kin scholar tailpiece`) === 0,
          ) &&
      !pulledToday($item`Mer-kin hallpass`),
  },
  {
    name: "skate blade",
    item: $item`skate blade`,
    needed: () =>
      get("mapToTheSkateParkPurchased") &&
      get("skateParkStatus") === "war" &&
      !get("noncombatQueue").includes("Holey Rollers") &&
      availableAmount($item`skate blade`) === 0 &&
      !pulledToday($item`skate blade`),
  },
  {
    name: "Mer-kin knucklebone",
    item: $item`Mer-kin knucklebone`,
    needed: () =>
      availableAmount($item`Mer-kin dreadscroll`) > 0 &&
      get("dreadScroll4", 0) === 0 &&
      itemAmount($item`Mer-kin knucklebone`) === 0 &&
      !pulledToday($item`Mer-kin knucklebone`),
  },
  {
    name: "Mer-kin worktea",
    item: $item`Mer-kin worktea`,
    needed: () =>
      availableAmount($item`Mer-kin dreadscroll`) > 0 &&
      get("dreadScroll7", 0) === 0 &&
      get("merkinVocabularyMastery", 0) < 90 &&
      itemAmount($item`Mer-kin worktea`) === 0 &&
      !pulledToday($item`Mer-kin worktea`),
  },
];

export function reservedPulls(): number {
  return pullReservations.filter((reservation) => reservation.needed()).length;
}

export function pullBudgetAllows(item: Item): boolean {
  if (!pullable(item)) return false;
  const isOwnReservation = pullReservations.some(
    (reservation) => reservation.item === item && reservation.needed(),
  );
  return isOwnReservation ? pullsRemaining() >= 1 : pullsRemaining() > reservedPulls();
}

export function discretionaryPull(item: Item): boolean {
  if (!currentPolicy().allowDiscretionaryPulls) return false;
  if (!pullBudgetAllows(item)) return false;
  return pullSequence(item);
}
