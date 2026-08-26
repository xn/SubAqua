import { cliExecute, Item, itemAmount } from "kolmafia";
import { $item, get, have } from "libram";

const paw = $item`cursed monkey's paw`;

/** Five item wishes a day (mafia `_monkeyPawWishesUsed`). */
export function pawWishesLeft(): number {
  return have(paw) ? Math.max(0, 5 - get("_monkeyPawWishesUsed", 0)) : 0;
}

/**
 * One `monkeypaw wish <item>` (ash `monkeypaw()` call sites: rivets
 * UTS:1457-1463, prayerbeads UTS:1013-1014, sea lasso UTS:2516 at
 * HEAD 89982f5). Returns whether the item count actually rose — mafia's
 * command prints but does not throw on a refused wish.
 */
export function pawWish(item: Item): boolean {
  if (pawWishesLeft() === 0) return false;
  const before = itemAmount(item);
  cliExecute(`monkeypaw wish ${item.name}`);
  return itemAmount(item) > before;
}
