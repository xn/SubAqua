import {
  abort,
  availableAmount,
  Item,
  mallPrice,
  pullsRemaining,
  storageAmount,
  takeStorage,
  toInt,
  buyUsingStorage,
} from "kolmafia";
import { $effect, $item, $items, get, have } from "libram";

import { buyLimit } from "../lib";

import { currentPolicy } from "./policy";

/** _roninStoragePulls holds today's pulled item ids, comma-separated. Exact-id
 * membership needs the comma-wrap trick (iotm.ash:368): id 360 must not
 * substring-match a list containing 3604. */
export function pulledToday(item: Item): boolean {
  return `,${get("_roninStoragePulls")},`.includes(`,${toInt(item)},`);
}

/** Ash pullSequence() (iotm.ash:363-379) minus its user_confirm: the
 * mall-price guard aborts with instructions instead of prompting (spec §4).
 * Returns false when the pull is unavailable (already pulled today / no pulls
 * left) so callers fall back to farming, exactly like the ash. */
export function pullSequence(item: Item): boolean {
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
  /** The pull that would satisfy this reservation. */
  item: Item;
  /** Recomputed live; the reservation releases the moment the need lapses. */
  needed: () => boolean;
};

const escapeGear = $items`peppermint parasol, navel ring of navel gazing, Greatest American Pants`;

/**
 * Ash reservedPulls() (UnderTheSea.ash:181-235). Each item can be pulled once
 * per day in-run, so every entry reserves at most one slot. The Shub null-day
 * exploit entry is deliberately absent: it needs shubPrepShort()'s delevel
 * math, which lands with Phase 4's sorceress module — Phase 4 adds that entry
 * here. The first two entries skip the pulled-today check on purpose,
 * mirroring the ash (any of the three escape items serves; shavings are
 * farmable).
 */
const pullReservations: PullReservation[] = [
  {
    name: "escape gear",
    item: $item`peppermint parasol`,
    needed: () => !escapeGear.some((it) => availableAmount(it) > 0),
  },
  {
    name: "crayon shavings",
    item: $item`crayon shavings`,
    needed: () => availableAmount($item`crayon shavings`) < 9,
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
    name: "sea cowbell",
    item: $item`sea cowbell`,
    needed: () => availableAmount($item`sea cowbell`) < 3 && !pulledToday($item`sea cowbell`),
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
    // Skate-war Fishy: hold the blade while the war is live and Holey Rollers
    // hasn't been queued (ash also gated on path 55 — always true here).
    name: "skate blade",
    item: $item`skate blade`,
    needed: () =>
      get("skateParkStatus") === "war" &&
      !get("noncombatQueue").includes("Holey Rollers") &&
      availableAmount($item`skate blade`) === 0 &&
      !pulledToday($item`skate blade`),
  },
];

export function reservedPulls(): number {
  return pullReservations.filter((reservation) => reservation.needed()).length;
}

/** Budget gate. Strict `>` for discretionary pulls; `>=` when the requested
 * item is itself a live reservation — its slot is already inside the count, so
 * `>` would deadlock the reservation against its own pull. The ash documents
 * this exact trap at the skate-blade site (UnderTheSea.ash:1331-1333); this
 * generalizes it to every reserved item. */
export function pullBudgetAllows(item: Item): boolean {
  const isOwnReservation = pullReservations.some(
    (reservation) => reservation.item === item && reservation.needed(),
  );
  return isOwnReservation
    ? pullsRemaining() >= reservedPulls()
    : pullsRemaining() > reservedPulls();
}

/** Policy- and budget-gated convenience for non-essential pulls (low shiny
 * farms instead — ash `lowShiny() == false && pulls_remaining() >
 * reservedPulls()`). Reserved pulls call pullSequence directly after a
 * pullBudgetAllows check. */
export function discretionaryPull(item: Item): boolean {
  if (!currentPolicy().allowDiscretionaryPulls) return false;
  if (!pullBudgetAllows(item)) return false;
  return pullSequence(item);
}
