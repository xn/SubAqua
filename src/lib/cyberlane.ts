// The cyber lane (Mom's free eye habitat fights in Cyberzone 1) only pays with the construct
// phylum banished: Cyberzone 1 fills its even adventures from a pool of five construct
// "processes" and its odd ones with a hacker or the day's countermeasure (also a construct),
// so with the screech landed the habitat eye takes every even adventure (2026-09-13: 5 eyes in
// 8 fights; gold: 5 in 8) and with it unlanded the eye competes with the pool (2026-09-14:
// 2 eyes in 11 fights, then the Cyber Mom try limit). The screech normally lands in the
// Outpost on the last habitat golem; these predicates cover the day it does not.

export interface CyberLaneState {
  /** Eagle held, construct phylum unbanished, screech unspent (outpost.ts screechReady). */
  screechReady: boolean;
  /** No habitat fights left, or a stale golem habitat the eye recall may replace. */
  habitatFree: boolean;
  /** A Mom-target habitat with fights left and its phylum unbanished. */
  eyeHabitatUp: boolean;
  /** A Club 'Em golem copy is on its way (the free screech target, 7 paid turns out). */
  clubEmGolemPending: boolean;
  /** The golem habitat has exactly one fight left: the next golem is the last free target. */
  lastGolemHabitat: boolean;
}

/** Field the eagle and open with the screech on the last habitat golem in the Abyss, the
 *  way the Outpost does; 2026-09-14 the Outpost finished with two golem charges left and both
 *  golems were killed screechless in the paid Abyss. */
export function abyssScreechTurn(state: CyberLaneState): boolean {
  return state.screechReady && state.lastGolemHabitat;
}

/** Banish Constructs (a Bakery construct, one paid turn at most) waits for the Club 'Em golem
 *  while the habitat is free, but not once the eye habitat is up: the cyber lane is waiting
 *  on the banish and its fights never advance the turn counter the Club 'Em copy needs. */
export function banishConstructsReady(state: CyberLaneState): boolean {
  if (!state.screechReady) return false;
  if (state.habitatFree) return !state.clubEmGolemPending;
  return state.eyeHabitatUp;
}

/** Cyber Mom spends its free fights only after the screech is landed or gone. */
export function cyberMomReady(state: CyberLaneState): boolean {
  return state.eyeHabitatUp && !state.screechReady;
}

export interface CyberBudget {
  /** mafia's _cyberFreeFights: it counts only fight pages carrying FREEFREEFREE, and the
   *  construct process fights do not carry it (09-14: 11 fights, 5 counted). */
  freeFightsCounted: number;
  /** _cyberZone1Turns + _cyberZone2Turns + _cyberZone3Turns; the 10th adventure of a zone is a
   *  turn-free noncombat, so 11 zone adventures hold the 10 OVERCLOCK fights. */
  zoneAdventures: number;
  /** A Cyber Mom fight advanced the turn counter: the budget is spent whatever the counters say. */
  paidFightSeen: boolean;
}

/** OVERCLOCK(10)'s ten free CyberRealm fights are gone. 09-14's rerun paid 7 Cyberzone turns
 *  because the counted figure sat at 5. */
export function cyberFreeFightsGone(budget: CyberBudget): boolean {
  return budget.paidFightSeen || budget.freeFightsCounted >= 10 || budget.zoneAdventures >= 11;
}
