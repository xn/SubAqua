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
 * math, which lands with Phase 4's sorceress module — The null-day entry
 * below is that Phase 4 addition. The first two entries skip the
 * pulled-today check on purpose,
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
    // Shub null-day exploit (ash reservedPulls() globals.ash:235-239): hold a
    // slot for Null Afternoon while Shub is undefeated and the delevel stock
    // projects short. Yog-Urt's fight may throw up to two crayon shavings
    // first, so they are spoken for (shubPrepShort(2)).
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
    // C F1: the hallpass supply IS the cowl/rope hunt — each "Halls Passing
    // in the Night" superlikely consumes one pass for one piece. Reserve one
    // whenever the lounge is open, a piece is missing, and passes are short
    // of the missing count, so the pull at school.ts's prepare clears
    // pullBudgetAllows' `>=` self-branch (the strict `>` discretionary
    // branch refused it all of 08-30: 16 pulls used, 5 reservations idle).
    name: "Mer-kin hallpass",
    item: $item`Mer-kin hallpass`,
    needed: () =>
      get("merkinElementaryTeacherUnlock", false) &&
      // A scholar piece fills a slot too (school.ts cowlAndRope()).
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
    // Skate-war Fishy: hold the blade while the war is live and Holey Rollers
    // hasn't been queued (ash also gated on path 55 — always true here).
    // The map gate is skateWarOpen()'s (skatepark.ts): skateParkStatus keeps
    // its defaults.txt "war" value forever on a map-less account, which would
    // otherwise hold this slot for the whole run. Inlined rather than imported
    // so `needed()` stays a pure pref read — skateWarOpen() page-loads.
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
    // Dreadscroll clue 4 (library.ts "Knucklebone"). The ash pulls this
    // unconditionally (UTS ab1105e:2629-2637) — on the short route these two
    // library pulls ARE the route, so they get reservation slots instead of
    // competing with them: pullBudgetAllows is strict `>` for a discretionary
    // pull, and reservedPulls() can hold 4-6 slots late in a day, which would
    // abort the task with pulls still on the books. Listed here, the call
    // site's pullBudgetAllows takes the `>=` self-reservation branch.
    name: "Mer-kin knucklebone",
    item: $item`Mer-kin knucklebone`,
    needed: () =>
      availableAmount($item`Mer-kin dreadscroll`) > 0 &&
      get("dreadScroll4", 0) === 0 &&
      itemAmount($item`Mer-kin knucklebone`) === 0 &&
      !pulledToday($item`Mer-kin knucklebone`),
  },
  {
    // Dreadscroll clue 7 (library.ts "Worktea Sushi"), same reasoning. The
    // vocabulary clause mirrors that task's own `ready`: at >= 90 the 703
    // handler brute-forces the single unknown and no tea is ever pulled, so
    // the slot releases instead of riding to the end of the run.
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
