// The gold-star run SubAqua compares itself against: docs/gold-star-run.txt. Pure so the
// checkpoints are testable; the ledger that reports a live run against them lives in ./gold.ts.
export const GOLD_RUN = "SubAqua 2026-10-06 (33 turns)";

// Turncount at which each group finished in the gold run: lastTurn per group from the final
// _subaqua_ledger table at the end of docs/gold-star-run.txt, in the ledger's order. The gold
// run is this script, so that order is runplan order and the checkpoints apply as-is.
export const goldTurncounts: Record<string, number> = {
  Init: 0,
  Openers: 1,
  Pellet: 1,
  "Big Brother": 2,
  Grandpa: 5,
  Outpost: 10,
  Currents: 10,
  Helmet: 10,
  Mom: 10,
  "Shadow Rift": 10,
  "Sorceress Dailies": 10,
  Corral: 10,
  Teflon: 10,
  School: 14,
  Wanderers: 18,
  Library: 16,
  "Yog-Urt": 17,
  "Gladiator Gear": 25,
  "Skate Park": 25,
  Colosseum: 31,
  "Mom Finish": 32,
  Shub: 33,
  Finale: 33,
};

// Groups whose lastTurn is not a runplan position: a wanderer lands inside whatever zone the
// run is in, so the group's checkpoint is wherever the last one happened to fall.
export const floatingGroups = new Set<string>(["Wanderers"]);
