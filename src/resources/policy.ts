import { currentTier, Tier } from "../lib/tier";

/**
 * Spec §3: tier logic lives in exactly two places — the runplans (route
 * membership, Phase 3) and this policy object (resource behavior). These
 * fields replace the ash's lowShiny()/highShiny() call sites inside resource
 * systems; route-level tier sites become runplan composition, not policy
 * fields, and land in Phase 3.
 */
export type ResourcePolicy = {
  /** High shiny spends only darts plus the parka yellow-ray on free kills and
   * banks everything else for aftercore (ash CCS free_kill():7,
   * UnderTheSea.ash freeKill():240-244). */
  freeKillMode: "dartsOnly" | "full";
  /** Club 'Em Back in Time (Colosseum-only chip damage): disabled at low
   * shiny (CCS free_kill():37); high never reaches it via dartsOnly. */
  allowClubEmBackInTime: boolean;
  /** Discretionary (non-reserved) pulls: low shiny farms instead of pulling
   * (UnderTheSea.ash:1738/1746/2937). */
  allowDiscretionaryPulls: boolean;
};

const policies: Record<Tier, ResourcePolicy> = {
  low: { freeKillMode: "full", allowClubEmBackInTime: false, allowDiscretionaryPulls: false },
  mid: { freeKillMode: "full", allowClubEmBackInTime: true, allowDiscretionaryPulls: true },
  high: { freeKillMode: "dartsOnly", allowClubEmBackInTime: false, allowDiscretionaryPulls: true },
};

export function policyForTier(tier: Tier): ResourcePolicy {
  return policies[tier];
}

export function currentPolicy(): ResourcePolicy {
  return policyForTier(currentTier());
}
