import { itemAmount } from "kolmafia";
import { $items } from "libram";

// Yog-Urt accepts each specific item once per fight, so two deleveling rounds need two types.
// Throw order = stock order: the biggest drop first (mouthsoap -250..300 flat), then shavings,
// then the reusable Hagnk's pulls (see lib/yogdelevel for the pull ladder).
export const yogDelevelStock = $items`Mer-kin mouthsoap, crayon shavings, train whistle, HOA citation pad, table tennis ball, sea cowbell`;

export function delevelersOwned(): number {
  return yogDelevelStock.filter((it) => itemAmount(it) > 0).length;
}

export const yogDelevelNames = yogDelevelStock.map((it) => it.name).join(" / ");
