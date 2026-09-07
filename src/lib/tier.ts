import { getProperty, Item, storageAmount } from "kolmafia";
import { $item, get, have, set } from "libram";

import { args } from "../args";

export type Tier = "low" | "mid" | "high";

const shinyMarkers = [
  $item`2002 Mr. Store Catalog`,
  $item`cursed monkey's paw`,
  $item`august scepter`,
];

// lib/index re-exports this module, so haveAnywhere is inlined here rather than imported.
const ownedAnywhere = (item: Item): boolean => have(item) || storageAmount(item) > 0;

/** The three markers are 2015+ Mr. Store items (free pulls), so Hagnk's counts as owned. */
export function detectTier(owned: (item: Item) => boolean = ownedAnywhere): Tier {
  if (!shinyMarkers.some(owned)) return "low";
  const freeFightValue = Number(getProperty("garbo_valueOfFreeFight") || 0);
  if (freeFightValue > get("valueOfAdventure")) return "high";
  return "mid";
}

let cachedTier: Tier | undefined;

export function currentTier(): Tier {
  if (cachedTier === undefined) {
    cachedTier =
      args.tier === "low" || args.tier === "mid" || args.tier === "high" ? args.tier : detectTier();
    set("_subaqua_tier", cachedTier);
  }
  return cachedTier;
}
