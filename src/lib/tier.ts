import { getProperty } from "kolmafia";
import { $item, get, have, set } from "libram";

import { args } from "../args";

export type Tier = "low" | "mid" | "high";

// Spec §3: ships the ash *code's* rule, not its README's (no Asdon check in highShiny()).
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

/** Resolve the run's tier once: arg override beats detection; recorded in _subaqua_tier
 * so the separately-bundled choice script can read it (spec §1 principle 3). */
export function currentTier(): Tier {
  if (cachedTier === undefined) {
    cachedTier =
      args.tier === "low" || args.tier === "mid" || args.tier === "high" ? args.tier : detectTier();
    set("_subaqua_tier", cachedTier);
  }
  return cachedTier;
}
