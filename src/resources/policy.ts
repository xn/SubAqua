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
  /** Leprecondo furniture priority by KoL furniture id (ash UTS:1062-1067);
   * the init task installs the first four discovered. */
  leprecondoLayout: number[];
  /** Second Apriling section after the always-joined tuba (UTS:1076-1084);
   * piccolo is only joined when the Chest Mimic is owned (checked in-task). */
  aprilingSecond: "quad tom" | "piccolo";
  /** 2002 Mr. Store credit spending (UTS:1093-1102): high banks free fights
   * as 3 VHS tapes; others trade one for the pro skateboard (corral McTwist). */
  catalogCredits: "vhs3" | "skateboard+vhs2";
  /** Immediately dolphin-whistle back stolen outpost drops (prayerbeads,
   * rusty rivet) — ash gates this on lowShiny (UTS:761-762); richer kits
   * re-farm faster than they whistle. Corral drops are always whistled. */
  whistleOutpostDrops: boolean;
  /** Fishy pull-meal (cheapest pasta + Aldebaran sardines, UTS:816-829):
   * ash gate is highShiny() || (lowShiny() && not pulled today) — mid falls
   * through to the fish-sauce chew. */
  fishyPullMeal: boolean;
  /** High shiny banks free-fight riders (bat wings / retro cape) for
   * aftercore instead of spending them on colosseum/finale outfits
   * (ash !highShiny() gates at UTS:2179-2196, 2963-2969). */
  conserveFreeFights: boolean;
  /** Platinum Yendorian Express Card use in-run (ash gates on !highShiny(),
   * UTS:2325-2330). */
  usePyec: boolean;
  /** Pull gremlin juice + hand chalk before Shub when the account is likely
   * to miss (ash lowShiny() branch, UTS:2932-2944); all tiers still pull
   * them when buffed muscle < 1250 — that half is game-state, not tier. */
  shubInsurancePulls: boolean;
};

/** Leprecondo priorities, ash UTS:1062-1067 (ids are KoL furniture ids;
 * libram FURNITURE_PIECES maps id -> name). */
const leprecondoHigh = [10, 11, 12, 24, 4, 5, 6];
const leprecondoStd = [22, 24, 12, 11, 10, 4, 5, 6];

const policies: Record<Tier, ResourcePolicy> = {
  low: {
    freeKillMode: "full",
    allowClubEmBackInTime: false,
    allowDiscretionaryPulls: false,
    leprecondoLayout: leprecondoStd,
    aprilingSecond: "piccolo",
    catalogCredits: "skateboard+vhs2",
    whistleOutpostDrops: true,
    fishyPullMeal: true,
    conserveFreeFights: false,
    usePyec: true,
    shubInsurancePulls: true,
  },
  mid: {
    freeKillMode: "full",
    allowClubEmBackInTime: true,
    allowDiscretionaryPulls: true,
    leprecondoLayout: leprecondoStd,
    aprilingSecond: "piccolo",
    catalogCredits: "skateboard+vhs2",
    whistleOutpostDrops: false,
    fishyPullMeal: false,
    conserveFreeFights: false,
    usePyec: true,
    shubInsurancePulls: false,
  },
  high: {
    freeKillMode: "dartsOnly",
    allowClubEmBackInTime: false,
    allowDiscretionaryPulls: true,
    leprecondoLayout: leprecondoHigh,
    aprilingSecond: "quad tom",
    catalogCredits: "vhs3",
    whistleOutpostDrops: false,
    fishyPullMeal: true,
    conserveFreeFights: true,
    usePyec: false,
    shubInsurancePulls: false,
  },
};

export function policyForTier(tier: Tier): ResourcePolicy {
  return policies[tier];
}

export function currentPolicy(): ResourcePolicy {
  return policyForTier(currentTier());
}
