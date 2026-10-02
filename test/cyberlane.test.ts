import assert from "node:assert/strict";
import { test } from "node:test";

import {
  abyssScreechTurn,
  banishConstructsReady,
  cyberFreeFightsGone,
  CyberLaneState,
  cyberMomReady,
} from "../src/lib/cyberlane";

const base: CyberLaneState = {
  screechReady: true,
  habitatFree: false,
  eyeHabitatUp: false,
  clubEmGolemPending: false,
  lastGolemHabitat: false,
  recallPays: true,
};

test("2026-09-19 t26: habitat drained, bar at 30 -> no Bakery turn for a lane that cannot pay", () => {
  const today = { ...base, habitatFree: true, recallPays: false };
  assert.equal(banishConstructsReady(today), false);
});

test("eye habitat already up: the copies exist, so the banish still lands whatever the bar says", () => {
  const up = { ...base, eyeHabitatUp: true, recallPays: false };
  assert.equal(banishConstructsReady(up), true);
});

test("2026-09-14: eye habitat up, screech unspent, Club 'Em golem pending -> banish first", () => {
  const today = { ...base, eyeHabitatUp: true, clubEmGolemPending: true };
  assert.equal(
    cyberMomReady(today),
    false,
    "Cyber Mom must not burn free fights into the construct pool",
  );
  assert.equal(
    banishConstructsReady(today),
    true,
    "the Club 'Em gate yields to the waiting cyber lane",
  );
});

test("gold: screech landed in the Outpost -> Cyber Mom runs, no Bakery fight", () => {
  const gold = { ...base, screechReady: false, eyeHabitatUp: true };
  assert.equal(cyberMomReady(gold), true);
  assert.equal(banishConstructsReady(gold), false);
});

test("the Club 'Em gate still holds while the habitat is free", () => {
  assert.equal(
    banishConstructsReady({ ...base, habitatFree: true, clubEmGolemPending: true }),
    false,
  );
  assert.equal(banishConstructsReady({ ...base, habitatFree: true }), true);
});

test("the Abyss screeches only the last habitat golem, only while the screech is ready", () => {
  assert.equal(abyssScreechTurn({ ...base, lastGolemHabitat: true }), true);
  assert.equal(abyssScreechTurn({ ...base, lastGolemHabitat: true, screechReady: false }), false);
  assert.equal(abyssScreechTurn(base), false);
});

test("nothing to do with no eye habitat", () => {
  assert.equal(cyberMomReady({ ...base, screechReady: false }), false);
  assert.equal(banishConstructsReady(base), false);
});

test("the free-fight budget ends on zone adventures, not on mafia's undercount", () => {
  // 09-14 first pass: 12 zone adventures, 5 counted, then every fight cost a turn.
  assert.equal(
    cyberFreeFightsGone({ freeFightsCounted: 5, zoneAdventures: 12, paidFightSeen: false }),
    true,
  );
  assert.equal(
    cyberFreeFightsGone({ freeFightsCounted: 5, zoneAdventures: 10, paidFightSeen: false }),
    false,
  );
  assert.equal(
    cyberFreeFightsGone({ freeFightsCounted: 10, zoneAdventures: 3, paidFightSeen: false }),
    true,
  );
  assert.equal(
    cyberFreeFightsGone({ freeFightsCounted: 2, zoneAdventures: 3, paidFightSeen: true }),
    true,
  );
});
