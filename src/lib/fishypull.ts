// The Fishy pull is one slot either way and 30 adventures either way: fish sauce costs a spleen
// point on top of its mall price, cuppa Gill tea costs no organ. Cheapest opportunity cost first;
// the other one stays behind it as the fallback.
export type FishyPullCandidate = {
  name: string;
  /** Mall price plus the organ's opportunity cost. */
  cost: number;
  /** A pull can land it: not pulled today, and in Hagnk's or within the buy limit. */
  obtainable: boolean;
  /** Its organ has room. */
  usable: boolean;
};

/** Whether a pull can land the item: owned, in Hagnk's, or buyable under the Fishy ceiling. */
export function fishyPullObtainable(c: {
  have: boolean;
  pulledToday: boolean;
  stored: number;
  price: number;
  /** The last-resort Fishy ceiling (`fishyBuyLimit`), not the general buy limit. */
  limit: number;
}): boolean {
  if (c.have) return true;
  if (c.pulledToday) return false;
  return c.stored > 0 || c.price <= c.limit;
}

export function fishyPullOrder<T extends FishyPullCandidate>(candidates: readonly T[]): T[] {
  return candidates.filter((c) => c.obtainable && c.usable).sort((a, b) => a.cost - b.cost);
}
