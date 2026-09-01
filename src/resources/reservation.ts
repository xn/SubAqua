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
 *    latte spent — four in An Octopus's Garden on turn 3, two in the Marinara
 *    Trench, and two more at the Outpost on turn 13. Gold banished FOUR gym
 *    guards (Curveball, Throw Latte, Feel Hatred, Snokebomb; G:8260, :8313,
 *    :8349, :8397) and paid only for the "Ators Gonna Ate" NCs: 8 visits,
 *    4 turns, against our 15.
 *
 * The banish half is NOT implemented as a reservation. A count held at the
 * END of a gradually-drained ladder does not stop the drain — at turn 3 the
 * ladder still held ~12 charges, so a 3-charge hold passes — it only starves
 * the sites in the middle. Live replay of the 08-31 state at turn 27: the
 * corral had `Reflex Hammer, Sea *dent, Monkey Paw` available (run log
 * :5558), i.e. two free charges, so a 3-charge hold would have left the
 * Mer-kin rustler unbanishable for a 15-attempt grind and deadlocked Tame
 * Seahorse, whose whole premise is banishing the other draws. Only the
 * free-KILL ladder is reserved here; the banish drain wants a zone policy
 * (gold spends ZERO banishes in An Octopus's Garden and the Trench, where we
 * spent six), which is a separate, unmade decision.
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
 * The reservations currently holding charges for sites OTHER than `location`.
 *
 * A site never blocks itself. An unknown location — a task whose `do` is a
 * function, so grimoire hands customize() no location — is treated as "not
 * this site", which is the conservative direction: it may skip a spend the
 * route could have afforded, never spend one another site is holding.
 *
 * Returns the holders rather than a count so a caller can ask which POOL is
 * being held: a source none of the holders could spend cannot deplete their
 * reservation, and refusing it would cost a turn for nothing.
 */
export function activeHolders(
  reservations: readonly ChargeReservation[],
  location: Location | undefined,
): ChargeReservation[] {
  return reservations
    .filter((reservation) => !(location && reservation.sites.includes(location)))
    .filter((reservation) => reservation.needed());
}
