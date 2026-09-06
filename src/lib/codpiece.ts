import { abort, cliExecute, equip, equippedItem, haveEquipped, Item, print } from "kolmafia";
import { $item, EternityCodpiece, have, unequip } from "libram";

export const codpiece = $item`The Eternity Codpiece`;

/** Whether the gem currently sits in one of the codpiece's slots. */
export function gemMounted(gem: Item): boolean {
  return EternityCodpiece.have() && EternityCodpiece.currentGems().includes(gem);
}

/** Owned either as an item or mounted in the codpiece (mounted gems leave inventory). */
export function haveGem(gem: Item): boolean {
  return have(gem) || gemMounted(gem);
}

/** Worn outright, or mounted in a worn codpiece (which grants the gem's conditional skills). */
export function wornOrMounted(item: Item): boolean {
  return haveEquipped(item) || (gemMounted(item) && haveEquipped(codpiece));
}

// Gems mount into mafia's codpiece1..5 pseudo-slots (libram EternityCodpiece.SLOTS), so equip()
// and unequip() drive choice 1588 for us. A mounted gem grants its conditional skills while the
// codpiece is worn, which frees the accessory slot it would otherwise take (gold-star-run.txt
// :4485-4500 mounted the BCZ and Heartstone for the corral opener and popped them right after).
/**
 * Mount `gems` into the first codpiece slots, in order. Pearls holding those slots go to
 * inventory (the finale's Pry Pearls step accepts them there). Aborts if a mount does not stick.
 */
export function mountGems(gems: Item[]): void {
  if (!EternityCodpiece.have()) return;
  gems.forEach((gem, index) => {
    const slot = EternityCodpiece.SLOTS[index];
    if (equippedItem(slot) === gem) return;
    if (!have(gem)) {
      const elsewhere = EternityCodpiece.SLOTS.find((other) => equippedItem(other) === gem);
      if (elsewhere) unequip(elsewhere);
      else return;
    }
    if (equippedItem(slot) !== $item.none) unequip(slot);
    unequip(gem);
    print(`Mounting ${gem} in the codpiece (slot ${index + 1}).`, "blue");
    equip(slot, gem);
  });
  cliExecute("refresh inv");
  const missing = gems.filter((gem) => have(gem) && !gemMounted(gem));
  if (missing.length > 0) abort(`Codpiece mount failed for ${missing.join(", ")}.`);
}

/** Pop any of `gems` out of the codpiece back into inventory. */
export function popGems(gems: Item[]): void {
  if (!EternityCodpiece.have()) return;
  for (const slot of EternityCodpiece.SLOTS) {
    if (gems.includes(equippedItem(slot))) unequip(slot);
  }
  cliExecute("refresh inv");
}
