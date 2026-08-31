import { availableAmount, itemAmount, Location } from "kolmafia";
import { $item, $items, $location, get, have } from "libram";

import { haveAnywhere } from "../lib";

const saber = $item`Fourth of May Cosplay Saber`;

/** Breathing hats the diver hunt exists to replace — once any is owned the
 * diver reservation releases (iotm.ash diverHuntActive(), :123-132). */
const diverPayoffGear = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask, aerated diving helmet, Elf Guard SCUBA tank`;

export function saberChargesLeft(): number {
  if (!haveAnywhere(saber)) return 0;
  return Math.max(0, 5 - get("_saberForceUses"));
}

/** Forcing burns no turn but forfeits the win — safe only where zone progress
 * is item-gated. The Outpost's lockkey progress gates on turns spent, so
 * Forces are banned there (iotm.ash saberZone()). */
export function saberAllowedAt(location: Location): boolean {
  return location !== $location`The Mer-Kin Outpost`;
}

/** The four hat-slot payoffs — Mer-kin gladiator mask, Mer-kin scholar mask,
 * crappy Mer-kin mask, aerated diving helmet (items.txt: all `hat`) — versus
 * the fifth, the Elf Guard SCUBA tank (`container`, i.e. an off-hand/trinket
 * breather, never a hat). The distinction is load-bearing: ash rivetHunt()
 * (UTS:1310) gates on `to_slot(divingHelmet()) != $slot[hat]`, so the tank
 * lets you breathe without ever satisfying that gate. */
const hatBreathers = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask, aerated diving helmet`;

/** The helmet needs the porthole and the broken helmet as well as eight
 * rivets — eight rivets with no porthole used to end the hunt with nothing
 * to craft (upstream rivetHunt() fix, UnderTheSea 6b7cd80 / UTS:1373-1377).
 * Shared by both predicates below: the Force-reservation one (diverHuntActive)
 * and the hunt-progress one (rivetHuntActive). */
function helmetPartsMissing(): boolean {
  return (
    itemAmount($item`rusty rivet`) < 8 ||
    !have($item`rusty porthole`) ||
    !have($item`rusty broken diving helmet`)
  );
}

/** Four of the five payoff items (aerated diving helmet, Mer-kin
 * gladiator/scholar masks, crappy Mer-kin mask) sit on mafia's in-path pull
 * blocklist (InventoryManager.pullableInSeaPath) — a storage copy is
 * unreachable, so only inventory/equipped (`have`) releases the reservation
 * for those. The fifth, Elf Guard SCUBA tank, is pullable in-path, so
 * `haveAnywhere` (inventory/equipped/storage) is correct for it: a storage
 * copy really does mean pulling it beats a 2-Force hunt, and Phase 3's
 * seaGearPulls (tasks/init.ts) budgets that pull.
 *
 * This is the Force-RESERVATION predicate only (ash globals.ash:823
 * diverHuntActive()): any of the five payoffs, tank included, is enough to
 * stop reserving Force for the diver, because once you can breathe some
 * other way a Force here would be spent for nothing. It is NOT the hunt's
 * own progress gate — see rivetHuntActive() below for that — because the
 * tank only lets you breathe meanwhile; it does not produce the crappy
 * Mer-kin mask (Grandma ROW124 needs the aerated diving helmet) or the
 * gladiator/scholar disguises that need that mask. Consumers deciding
 * whether to keep hunting must use rivetHuntActive(); consumers deciding
 * whether to spend/reserve saber Force on the diver use this one. */
export function diverHuntActive(): boolean {
  const scubaTank = $item`Elf Guard SCUBA tank`;
  const blocklisted = diverPayoffGear.filter((it) => it !== scubaTank);
  return helmetPartsMissing() && !blocklisted.some((it) => have(it)) && !haveAnywhere(scubaTank);
}

/** The hunt-PROGRESS predicate (ash rivetHunt(), UTS:1310): `item_amount(rusty
 * rivet) < 8 && to_slot(divingHelmet()) != $slot[hat]` (plus our porthole/
 * broken-helmet fix, see helmetPartsMissing()). Unlike diverHuntActive()
 * above, owning the Elf Guard SCUBA tank does NOT satisfy this — the tank
 * fills no hat slot, so it can release the saber Force reservation without
 * ending the hunt. The Diver Summon, Wreck Rivets, and Craft Helmet tasks
 * must gate on this, not on diverHuntActive(). */
/** A hat-slot breather is in hand: the hunt's payoff exists, so nothing in
 * the Helmet quest is left to do. Distinct from `!rivetHuntActive()`, which
 * is ALSO true at the moment every part is collected but the helmet is not
 * yet crafted — Craft Helmet must key on this, not on the hunt predicate. */
export function hatBreatherOwned(): boolean {
  return hatBreathers.some((it) => have(it));
}

export function rivetHuntActive(): boolean {
  return helmetPartsMissing() && !hatBreatherOwned();
}

export function prayerbeadsShort(): boolean {
  return availableAmount($item`Mer-kin prayerbeads`) < 3;
}

export function seaCowNeeded(): boolean {
  // Once the seahorse is tamed the corral is over — leather/cowbell counts
  // no longer bind a Force, and the researcher's bank must see the charge
  // released (F ledger #3: two cow Forces on 08-30 left
  // forceGranted("researcher") false and the library researcher was farmed
  // at paid turns; gold Forced it at G:7507 for both scrolls).
  if (get("seahorseName", "") !== "") return false;
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) <
      2 || availableAmount($item`sea cowbell`) < 3
  );
}

/**
 * The reservation chain (iotm.ash:149-174): each tier sees only what remains
 * after every higher tier's live reservation — diver ×2, then outpost healer
 * ×1, then sea cow ×1; the leftovers are free for researcher/free-run use.
 * Reservations are recomputed on every call and release when their need-check
 * goes false; the only consumed state is mafia's _saberForceUses.
 */
export function forcesAfterDiver(): number {
  return saberChargesLeft() - (diverHuntActive() ? 2 : 0);
}

export function forcesAfterHealer(): number {
  return forcesAfterDiver() - (prayerbeadsShort() ? 1 : 0);
}

export function forcesAfterSeaCow(): number {
  return forcesAfterHealer() - (seaCowNeeded() ? 1 : 0);
}

/**
 * One Force stays banked for the Mer-kin researcher while a combat scroll
 * clue is still unresolved (the ash's researcherForce(), Globals:1019-1031:
 * one charge lands both scrolls, "the slowest slots in the zone"). Deviation
 * from the ash's chain, which treats the researcher as a "free" claimant —
 * live 2026-08-28 all five Forces were gone by turn 31 (prayerbeads, two
 * divers, two sea cows) and the library farmed the scrolls at paid turns
 * (11 vs UTS 08-26's 2, which Forced the researcher at [19]).
 */
export function researcherNeeded(): boolean {
  if (get("isMerkinHighPriest", false)) return false;
  return (
    (get("dreadScroll2", 0) === 0 && itemAmount($item`Mer-kin healscroll`) === 0) ||
    (get("dreadScroll5", 0) === 0 && itemAmount($item`Mer-kin killscroll`) === 0)
  );
}

export function saberForcesFree(): number {
  return forcesAfterSeaCow() - (researcherNeeded() ? 1 : 0);
}

export type ForcePurpose = "diver" | "healer" | "seaCow" | "researcher" | "free";

/** May this purpose spend a Force right now? Higher-priority purposes always
 * see their own reservation; lower ones only the leftovers. The ash's
 * seaCowForce McTwist/opener skips are combat-context guards and live with
 * the Phase 3 combat builders, not here. */
export function forceGranted(purpose: ForcePurpose, location?: Location): boolean {
  // The outpost saber ban protects turns_spent-gated progress from zero-turn
  // Forces — but the healer Force is the ash's deliberate exception: its own
  // gate is beads-only (iotm.ash healerForce():247-261, no zone test) and
  // farmPrayerbeads pins the saber at the outpost (UTS:1684-1699).
  if (location && purpose !== "healer" && !saberAllowedAt(location)) return false;
  switch (purpose) {
    case "diver":
      // Deliberate deviation from the ash's diverForceReady() (globals.ash:
      // 857-859), which goes Force-less once the reservation releases (e.g.
      // a scuba tank owned). By that point every higher claimant (healer,
      // sea cow) has already taken its cut of the free pool, so an idle
      // charge here is a charge wasted for no offsetting gain — a Force on
      // the diver forces its porthole/broken-helmet/rivet drops on the
      // hunt's longest-odds fight, which is strictly net turns positive
      // over letting the charge sit unspent. So: still gate on the hunt
      // being live (rivetHuntActive()), but once the reservation itself has
      // released, draw from the shared free pool instead of refusing.
      return (
        rivetHuntActive() && (diverHuntActive() ? saberChargesLeft() > 0 : saberForcesFree() > 0)
      );
    case "healer":
      return prayerbeadsShort() && forcesAfterDiver() > 0;
    case "seaCow":
      // The researcher's bank comes off the top here too, or a second cow
      // Force (seaCowNeeded() stays true until the whole set is in) eats it.
      return seaCowNeeded() && forcesAfterHealer() - (researcherNeeded() ? 1 : 0) > 0;
    case "researcher":
      return researcherNeeded() && forcesAfterSeaCow() > 0;
    case "free":
      return saberForcesFree() > 0;
  }
}
