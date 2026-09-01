import { Location } from "kolmafia";

/**
 * A charge held back from a shared daily ladder so that the site which
 * actually needs one still has it when the route arrives.
 *
 * Modelled on pulls.ts's PullReservation, and for the same reason: the ladders
 * (free kills, banishes) are first-come-first-served, so the zones the route
 * walks EARLY drain them and the zones where a charge is worth a whole turn
 * arrive empty. Measured 2026-08-31 vs gold UTS 08-21
 * (docs/superpowers/research/2026-09-01-gold-diff/REPORT.md):
 *  - at the corral opener (turn 22) the free-kill ladder was completely dry —
 *    Chest X-Ray 3/3, Shattering Punch 3/3, Assert your Authority 3/3,
 *    Gingerbread used, BCZ Sweat Bullets 11/11, Everything Looks Red AND
 *    Yellow up. Gold held Sweat Bullets #10 for that fight and #11 for the
 *    school, and the corral cost it ZERO turns against our 25;
 *  - at the gymnasium (turn 58) Snokebomb was 3/3, Feel Hatred 3/3 and the
 *    latte spent — all of them thrown in An Octopus's Garden and the Marinara
 *    Trench before turn 13. Gold banished three gym guards and paid only for
 *    the "Ators Gonna Ate" NCs: 8 visits, 4 turns, against our 15.
 *
 * `needed()` is recomputed live, so a reservation releases the moment its site
 * is satisfied — an idle reservation never holds a charge hostage.
 */
export type ChargeReservation = {
  name: string;
  /** How many charges to hold. */
  count: number;
  /** The sites allowed to spend the held charges. */
  sites: Location[];
  /** Recomputed live; the reservation releases the moment the need lapses. */
  needed: () => boolean;
};

/**
 * Charges held for sites OTHER than `location`.
 *
 * A site never blocks itself. An unknown location — a task whose `do` is a
 * function, so grimoire hands customize() no location — is treated as "not
 * this site", which is the conservative direction: it may skip a spend the
 * route could have afforded, never spend one another site is holding.
 */
export function reservedElsewhere(
  reservations: readonly ChargeReservation[],
  location: Location | undefined,
): number {
  return reservations
    .filter((reservation) => !(location && reservation.sites.includes(location)))
    .filter((reservation) => reservation.needed())
    .reduce((total, reservation) => total + reservation.count, 0);
}
