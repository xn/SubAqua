/**
 * How many more casts of a blood cubic zirconia skill can be paid in a row while base substats stay
 * at or above `floorSq` (the kept mainstat, squared). Mirrors libram's availableCasts without its
 * inventory check: a gem mounted in the worn codpiece casts but is out of inventory.
 */
export function affordableCasts(c: {
  substats: number;
  timesCast: number;
  floorSq: number;
  /** Price of cast number n (0-based, counting every cast made today). */
  cost: (castNumber: number) => number;
  max?: number;
}): number {
  const max = c.max ?? 25;
  let left = c.substats;
  let casts = 0;
  for (let n = c.timesCast; n < c.timesCast + max; n++) {
    const price = c.cost(n);
    if (left - price < c.floorSq) break;
    left -= price;
    casts++;
  }
  return casts;
}
