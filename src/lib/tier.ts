import { getProperty } from "kolmafia";
import { $item, get, have, set } from "libram";

import { args } from "../args";

export type Tier = "low" | "mid" | "high";

const shinyMarkers = [
  $item`2002 Mr. Store Catalog`,
  $item`cursed monkey's paw`,
  $item`august scepter`,
];

export function detectTier(): Tier {
  if (!shinyMarkers.some((marker) => have(marker))) return "low";
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
