import assert from "node:assert/strict";
import { test } from "node:test";

import {
  abyssScreechTurn,
  banishConstructsReady,
  CyberLaneState,
  cyberMomReady,
} from "../src/lib/cyberlane";

const base: CyberLaneState = {
  screechReady: true,
  habitatFree: false,
  eyeHabitatUp: false,
  clubEmGolemPending: false,
  lastGolemHabitat: false,
};

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
