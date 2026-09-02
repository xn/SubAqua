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

export function pawWishesLeft(): number {
  return CursedMonkeyPaw.have() ? CursedMonkeyPaw.wishes() : 0;
}

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
    for (const [slot, item] of restore.reverse()) {
      if (item === $item.none) unequip(slot);
      else equip(slot, item);
    }
  }
}

const refusals = new Map<Item, number>();

const MAX_ATTEMPTS = 2;

export function pawWish(item: Item): boolean {
  if (!CursedMonkeyPaw.have()) return false;
  if ((refusals.get(item) ?? 0) >= MAX_ATTEMPTS) return false;
  const granted = withSeaAccess(() => CursedMonkeyPaw.wishFor(item));
  if (!granted) refusals.set(item, (refusals.get(item) ?? 0) + 1);
  return granted;
}
