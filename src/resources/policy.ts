import { currentTier, Tier } from "../lib/tier";

export type ResourcePolicy = {
  freeKillMode: "dartsOnly" | "full";
  allowClubEmBackInTime: boolean;
  allowDiscretionaryPulls: boolean;
  leprecondoLayout: number[];
  aprilingSecond: "quad tom" | "piccolo";
  catalogCredits: "vhs3" | "skateboard+vhs2";
  whistleOutpostDrops: boolean;
  fishyPullMeal: boolean;
  conserveFreeFights: boolean;
  usePyec: boolean;
  shubInsurancePulls: boolean;
  useBackupCamera: boolean;
  castWaffleDay: boolean;
};

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
    useBackupCamera: true,
    castWaffleDay: true,
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
    useBackupCamera: true,
    castWaffleDay: true,
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
    useBackupCamera: false,
    castWaffleDay: false,
  },
};

export function policyForTier(tier: Tier): ResourcePolicy {
  return policies[tier];
}

export function currentPolicy(): ResourcePolicy {
  return policyForTier(currentTier());
}
