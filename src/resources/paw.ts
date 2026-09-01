import {
  canEquip,
  equip,
  equippedItem,
  haveEquipped,
  Item,
  myFamiliar,
  Slot,
  toSlot,
} from "kolmafia";
import { $familiar, $item, $slot, CursedMonkeyPaw, have, unequip } from "libram";

import { familiarWaterBreathingEquipment, waterBreathingEquipment } from "../engine/outfit";

/** Thin veneer over libram's CursedMonkeyPaw (user directive 2026-08-31:
 * don't reinvent what libram already ships). Kept as a module so the ash
 * call-site mapping stays in one place: rivets UTS:1457-1463, prayerbeads
 * UTS:1013-1014, sea lasso UTS:2516 at HEAD 89982f5. */

/** Five item wishes a day (mafia `_monkeyPawWishesUsed`). */
export function pawWishesLeft(): number {
  return CursedMonkeyPaw.have() ? CursedMonkeyPaw.wishes() : 0;
}

/**
 * Make the sea reachable before wishing for a sea item, then put the outfit
 * back.
 *
 * THE BUG THIS FIXES. The wiki's rule for a paw ITEM wish: "The item must be a
 * monster drop from a monster whose native zone you can currently adventure
 * in. This uses a very strict definition of 'can currently adventure in' — if
 * you don't have any underwater breathing EQUIPPED, no underwater items for
 * you, and if you don't have the transfunctioner equipped, no 8-bit items."
 * A wish that fails this returns "Quite impossible" — "you don't have access
 * to the area where the item drops".
 * (wiki.kingdomofloathing.com/Cursed_monkey's_paw and its Talk page.)
 *
 * Every item this route wishes for (sea lasso, sea cowbell, Mer-kin
 * prayerbeads, rusty rivet) drops underwater, so a wish thrown while dressed
 * for dry land is refused, silently as far as the session log goes: no item,
 * no `Cursed by a Monkey`, and `_monkeyPawWishesUsed` never moves because
 * mafia only counts successes.
 *
 * That is exactly what the 2026-08-31 run did — TWENTY `wish=sea+lasso`
 * submissions across the turn-33 rift block, every one from a Shadow Rift
 * outfit (`Maximizer: item, -back, -hat, -off-hand, -pants, -weapon`), zero
 * granted, `_monkeyPawWishesUsed` at 0 all day, and all 16 free rift fights
 * then trained nothing. Gold, wishing for the same item from the same URL
 * (`main.php?action=cmonk` -> `choice.php?whichchoice=1501&wish=sea+lasso`),
 * got 3 for 3 — because the ash equips first (UnderTheSea.ash:874-876):
 *
 *     equip($item[really, really nice swimming trunks]);
 *     equip($item[little bitty bathysphere]);
 *     monkeypaw($item[sea lasso]);
 *
 * The earlier diagnosis in this file — "an aftercore garbo session spent the
 * rollover-day's five while mafia reset the counter" — was a guess, and wrong:
 * the invocation was the problem, not the allowance.
 *
 * libram's `wishFor` already tries to do this itself, but cannot get started:
 * it builds its location list with `Location.all().filter((l) => canAdventure(l)
 * && ...)` and only then calls `prepareForAdventure(locations[0])`. Underwater
 * zones fail `canAdventure` while we cannot breathe, so the list comes back
 * empty, the prepare is skipped, and it calls `monkeyPaw()` bare. Breathing
 * FIRST breaks that circle and lets libram's own machinery work as designed.
 *
 * Note EQUIPPED, not "able to breathe": the rule is written against worn gear,
 * and there is a live report of a Mer-kin drop wish that only succeeded once
 * breathing equipment was on. So this does NOT short-circuit on Driving
 * Waterproofly / Wet Willied the way the rest of the route's breathing checks
 * do — an effect may satisfy mafia's `canAdventure` and still leave KoL's own
 * check unhappy. Equipping when an effect would have sufficed costs one swap
 * that is restored immediately.
 *
 * Slot-scoped save/restore rather than `checkpoint`: libram's `wishFor` takes
 * the checkpoint itself once its location list is non-empty, and mafia keeps
 * only one, so a nested save here would hand our restore the sea outfit
 * instead of the caller's. Callers run this from `prepare`, which grimoire
 * fires AFTER `dress()` — so anything left equipped would ride into the fight.
 */
function withSeaAccess<T>(action: () => T): T {
  const restore: [Slot, Item][] = [];
  const wear = (item: Item, slot: Slot = toSlot(item)): void => {
    if (equippedItem(slot) === item) return;
    restore.push([slot, equippedItem(slot)]);
    equip(slot, item);
  };
  try {
    if (!waterBreathingEquipment.some((it) => haveEquipped(it))) {
      const gear = waterBreathingEquipment.find((it) => have(it) && canEquip(it));
      if (gear) wear(gear);
    }
    const familiar = myFamiliar();
    if (
      familiar !== $familiar.none &&
      !familiar.underwater &&
      !familiarWaterBreathingEquipment.some((it) => haveEquipped(it))
    ) {
      const breather = familiarWaterBreathingEquipment.find((it) => have(it));
      if (breather) wear(breather, $slot`familiar`);
    }
    return action();
  } finally {
    // Reverse order: a slot touched twice is restored to what it held first.
    for (const [slot, item] of restore.reverse()) {
      if (item === $item.none) unequip(slot);
      else equip(slot, item);
    }
  }
}

/** Refusals seen this session, per item. `_monkeyPawWishesUsed` cannot serve
 * as the give-up signal: mafia only increments it on SUCCESS, so a refused
 * wish leaves every gate that reads it unchanged and the caller walks straight
 * back in. The 08-31 run submitted the same wish twenty times that way. */
const refusals = new Map<Item, number>();

/** Two strikes, not one: a refusal can be transient — `Cursed by a Monkey`
 * runs 7 turns after a granted wish and blocks the next — so one failure is
 * not proof the day is dead. Three attempts for one item is thrash. */
const MAX_ATTEMPTS = 2;

/**
 * One paw item wish via libram's wishFor, from an outfit that can reach the
 * sea (see above).
 *
 * @returns whether KoL actually granted the wish.
 */
export function pawWish(item: Item): boolean {
  if (!CursedMonkeyPaw.have()) return false;
  if ((refusals.get(item) ?? 0) >= MAX_ATTEMPTS) return false;
  const granted = withSeaAccess(() => CursedMonkeyPaw.wishFor(item));
  if (!granted) refusals.set(item, (refusals.get(item) ?? 0) + 1);
  return granted;
}
