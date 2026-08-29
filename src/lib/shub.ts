import { Item, itemAmount } from "kolmafia";
import { $effect, $item, $items, have } from "libram";

/**
 * Shub-Jigguwatt delevel factors (ash globals.ash:150-156; header comment
 * CCS:535-538): jam band bootleg halves his attack, shavings take 30%,
 * rattle/kit 25% — all MULTIPLICATIVE on purpose, and none deal damage
 * (damage triggers his doubling 20%-max-HP retaliation).
 */
export function shubDelevelFactor(it: Item): number {
  if (it === $item`jam band bootleg`) return 0.5;
  if (it === $item`crayon shavings`) return 0.7;
  return 0.75; // rattler rattle, electronics kit
}

export const shubDelevelers = $items`jam band bootleg, crayon shavings, rattler rattle, electronics kit`;

/** Ash shubDelevelProjection (globals.ash:165-174): the attack fraction left
 * after throwing the whole current stock, with `shavingsSpokenFor` shavings
 * set aside (Yog-Urt's fight throws up to two first). */
export function shubDelevelProjection(shavingsSpokenFor: number): number {
  let remaining = 1.0;
  for (const it of shubDelevelers) {
    let n = itemAmount(it);
    if (it === $item`crayon shavings`) n = Math.max(0, n - shavingsSpokenFor);
    for (let i = 0; i < n; i++) remaining *= shubDelevelFactor(it);
  }
  return remaining;
}

/** Ash shubPrepShort (globals.ash:181-187): prep is short unless the stock
 * projects his attack to <= 25%, or Null Afternoon covers the fight. */
export function shubPrepShort(shavingsSpokenFor = 0): boolean {
  return shubDelevelProjection(shavingsSpokenFor) > 0.25 && !have($effect`Null Afternoon`);
}
