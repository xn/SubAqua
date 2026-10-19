import assert from "node:assert/strict";
import { test } from "node:test";

import { affordableCasts } from "../src/lib/bcz";

// libram BloodCubicZirconia.skillCost for casts 0..11: 11, 23, 37, then ×10 per cycle.
const cost = (castNumber: number): number =>
  [11, 23, 37][castNumber % 3] * 10 ** Math.floor(castNumber / 3);
const floorSq = 150 ** 2;

test("2026-10-18: base Moxie 300 with no casts used affords 11 Sweat Bullets above the 150 floor", () => {
  // 11+23+37+110+230+370+1100+2300+3700+11000+23000 = 41,881 spent, 48,119 left; the 12th (37,000) would dip under.
  assert.equal(affordableCasts({ substats: 300 ** 2, timesCast: 0, floorSq, cost }), 11);
});

test("the floor is inclusive: exactly enough substats for one cast is one cast", () => {
  assert.equal(affordableCasts({ substats: floorSq + 11, timesCast: 0, floorSq, cost }), 1);
  assert.equal(affordableCasts({ substats: floorSq + 10, timesCast: 0, floorSq, cost }), 0);
});

test("casts already used move the price up the table", () => {
  // 10th cast costs 11,000, the 11th 23,000.
  assert.equal(affordableCasts({ substats: 40_000, timesCast: 9, floorSq, cost }), 1);
  assert.equal(affordableCasts({ substats: 60_000, timesCast: 9, floorSq, cost }), 2);
});
