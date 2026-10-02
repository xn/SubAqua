import { Tier } from "./tier";

// Where the Kramco Sausage-o-Matic™ is worn. A sausage goblin replaces the zone's encounter
// and takes no turn, so it is turn-neutral in a kill zone; in the Outpost it is a free in-zone
// adventure toward the lockkey gate (the lockkey drops from adventure 26 on, free fights
// included), so every goblin there is a turn. The wanderer chance is not gated: the partial
// rolls between guaranteed goblins are free EV, and the guaranteed ones land regardless.
export type KramcoSite = "outpost" | "farm";

export type KramcoState = {
  owned: boolean;
  forcerActive: boolean;
  tier: Tier;
  site: KramcoSite;
};

export function kramcoWanted(state: KramcoState): boolean {
  if (!state.owned) return false;
  // A goblin appears instead of the forced noncombat and spends the force.
  if (state.forcerActive) return false;
  if (state.site === "outpost") return true;
  return state.tier === "low";
}
