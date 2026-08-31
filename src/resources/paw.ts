import { Item } from "kolmafia";
import { CursedMonkeyPaw } from "libram";

/** Thin veneer over libram's CursedMonkeyPaw (user directive 2026-08-31:
 * don't reinvent what libram already ships). Kept as a module so the ash
 * call-site mapping stays in one place: rivets UTS:1457-1463, prayerbeads
 * UTS:1013-1014, sea lasso UTS:2516 at HEAD 89982f5. */

/** Five item wishes a day (mafia `_monkeyPawWishesUsed`). CAVEAT (live
 * 2026-08-31): the pref can lie — an aftercore garbo session before the
 * ascension spends the rollover-day's 5 while mafia resets the counter to 0
 * at ascension detection, so a nonzero return here does not guarantee KoL
 * will honor the wish. pawWish() reports the actual outcome; callers must
 * handle false. */
export function pawWishesLeft(): number {
  return CursedMonkeyPaw.have() ? CursedMonkeyPaw.wishes() : 0;
}

/**
 * One paw item wish via libram's wishFor, which (unlike the bare
 * `monkeypaw wish` CLI this used to issue) first `prepareForAdventure`s at a
 * location whose copyable monsters drop the item — item wishes can fail
 * without that context — and restores the checkpointed outfit after.
 *
 * @returns whether KoL actually granted the wish.
 */
export function pawWish(item: Item): boolean {
  if (!CursedMonkeyPaw.have()) return false;
  return CursedMonkeyPaw.wishFor(item);
}
