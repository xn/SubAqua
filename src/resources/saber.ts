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

/** Four of the five payoff items (aerated diving helmet, Mer-kin
 * gladiator/scholar masks, crappy Mer-kin mask) sit on mafia's in-path pull
 * blocklist (InventoryManager.pullableInSeaPath) — a storage copy is
 * unreachable, so only inventory/equipped (`have`) releases the reservation
 * for those. The fifth, Elf Guard SCUBA tank, is pullable in-path, so
 * `haveAnywhere` (inventory/equipped/storage) is correct for it: a storage
 * copy really does mean pulling it beats a 2-Force hunt, and Phase 3's
 * seaGearPulls (tasks/init.ts) budgets that pull. */
export function diverHuntActive(): boolean {
  const scubaTank = $item`Elf Guard SCUBA tank`;
  const blocklisted = diverPayoffGear.filter((it) => it !== scubaTank);
  return (
    itemAmount($item`rusty rivet`) < 8 &&
    !blocklisted.some((it) => have(it)) &&
    !haveAnywhere(scubaTank)
  );
}

export function prayerbeadsShort(): boolean {
  return availableAmount($item`Mer-kin prayerbeads`) < 3;
}

export function seaCowNeeded(): boolean {
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

export function saberForcesFree(): number {
  return forcesAfterHealer() - (seaCowNeeded() ? 1 : 0);
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
      return diverHuntActive() && saberChargesLeft() > 0;
    case "healer":
      return prayerbeadsShort() && forcesAfterDiver() > 0;
    case "seaCow":
      return seaCowNeeded() && forcesAfterHealer() > 0;
    case "researcher":
    case "free":
      return saberForcesFree() > 0;
  }
}
