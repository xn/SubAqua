import assert from "node:assert/strict";
import { test } from "node:test";

import { eyeRecallPays, momProgressPerFight, secondGolemRecallWanted } from "../src/lib/habitat";

test("momProgressPerFight: 1 base, +1 per speedup", () => {
  assert.equal(momProgressPerFight({ jumper: false, underwear: false, combed: false }), 1);
  assert.equal(momProgressPerFight({ jumper: true, underwear: false, combed: false }), 2);
  assert.equal(momProgressPerFight({ jumper: true, underwear: true, combed: true }), 4);
});

test("2026-09-19 t28: the recall fight itself fills the bar -> no recall", () => {
  assert.equal(eyeRecallPays({ progress: 38, perFight: 4, setupTurns: 0 }), false);
});

test("2026-09-19 t26: bar at 30 with a Bakery turn to pay -> the lane cannot beat the Abyss", () => {
  assert.equal(eyeRecallPays({ progress: 30, perFight: 4, setupTurns: 1 }), false);
});

test("after the free-kill fallback (24) the lane still saves fights past a Bakery turn", () => {
  assert.equal(eyeRecallPays({ progress: 24, perFight: 4, setupTurns: 1 }), true);
});

test("gold t14: empty bar, screech landed -> recall", () => {
  assert.equal(eyeRecallPays({ progress: 0, perFight: 3, setupTurns: 0 }), true);
});

test("bar at 30 with the screech already landed: one free fight is still worth a free recall", () => {
  assert.equal(eyeRecallPays({ progress: 30, perFight: 4, setupTurns: 0 }), true);
});

test("2026-09-19 t12: second golem recall 4 adventures short of the lockkey gate -> skipped", () => {
  assert.equal(secondGolemRecallWanted({ turnsSpent: 20, gate: 25 }), false);
});

test("second golem recall with a full batch of adventures before the gate -> cast", () => {
  assert.equal(secondGolemRecallWanted({ turnsSpent: 19, gate: 25 }), true);
  assert.equal(secondGolemRecallWanted({ turnsSpent: 10, gate: 25 }), true);
});
