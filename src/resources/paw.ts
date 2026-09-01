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
 * WHY. The wiki's rule for a paw ITEM wish (Cursed monkey's paw, "Items"):
 * the item has to be tradable, has to be a monster drop, the monster cannot be
 * uncopyable, and "the item must be dropped from a monster that is available
 * in a zone you can currently access". The wiki then says, in as many words,
 * "It's unclear what counts as 'available'". When the conditions are unmet the
 * message is "quite impossible" rather than "impossible" — and that text is
 * server response, which mafia's session log does not record.
 *
 * So the STRICT reading — that an underwater zone is not "currently
 * accessible" without breathing gear — is not established. What is established
 * is that both reference implementations take it. The ash equips before every
 * sea wish (UnderTheSea.ash:874-876):
 *
 *     equip($item[really, really nice swimming trunks]);
 *     equip($item[little bitty bathysphere]);
 *     monkeypaw($item[sea lasso]);
 *
 * and libram's `wishFor` calls `prepareForAdventure()` at a location where the
 * item drops. Neither is accidental. This wrapper follows them: worn gear
 * satisfies both the strict and loose readings, and the swap is restored
 * immediately, so it is a cheap precaution rather than a claim.
 *
 * WHAT IS NOT ESTABLISHED. The 2026-08-31 run submitted TWENTY
 * `wish=sea+lasso` across the turn-33 rift block — every one from a Shadow
 * Rift outfit (`Maximizer: item, -back, -hat, -off-hand, -pants, -weapon`) —
 * and got nothing: no item, no `Cursed by a Monkey`, `_monkeyPawWishesUsed` at
 * 0 all day (mafia only counts successes). Gold submitted the identical URL
 * and went 3 for 3, having equipped the trunks and bathysphere first. That is
 * a correlation, not a mechanism. The competing explanation — the day's five
 * wishes were already spent by an aftercore session before the ascension,
 * while mafia's daily counter reset — predicts exactly the same trace and
 * CANNOT be distinguished from these logs. The next run distinguishes them: if
 * three lasso wishes land from a sea outfit, the outfit was the problem.
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
