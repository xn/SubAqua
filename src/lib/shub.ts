import { Item, itemAmount } from "kolmafia";
import { $effect, $item, $items, have } from "libram";

export function shubDelevelFactor(it: Item): number {
  if (it === $item`jam band bootleg`) return 0.5;
  if (it === $item`crayon shavings`) return 0.7;
  return 0.75;
}

export const shubDelevelers = $items`jam band bootleg, crayon shavings, rattler rattle, electronics kit`;

export function shubDelevelProjection(shavingsSpokenFor: number): number {
  let remaining = 1.0;
  for (const it of shubDelevelers) {
    let n = itemAmount(it);
    if (it === $item`crayon shavings`) n = Math.max(0, n - shavingsSpokenFor);
    for (let i = 0; i < n; i++) remaining *= shubDelevelFactor(it);
  }
  return remaining;
}

export function shubPrepShort(shavingsSpokenFor = 0): boolean {
  return shubDelevelProjection(shavingsSpokenFor) > 0.25 && !have($effect`Null Afternoon`);
}
