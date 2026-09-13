import assert from "node:assert/strict";
import { test } from "node:test";

import { luckySources, LuckyState } from "../src/lib/luckyorder";

const base: LuckyState = {
  clovers: 0,
  cloversPurchased: 0,
  scepterReady: false,
  pull: false,
};

// Hermit clovers (3/day) are spent before the August scepter's single Aug. 2nd cast.
test("hermit clovers come before the scepter", () => {
  assert.deepEqual(luckySources({ ...base, scepterReady: true }), ["hermit", "scepter"]);
});

test("a clover already in inventory is used first", () => {
  assert.deepEqual(luckySources({ ...base, clovers: 1, scepterReady: true }), [
    "clover",
    "hermit",
    "scepter",
  ]);
});

test("the scepter is the fallback only once the hermit's 3/day are gone", () => {
  assert.deepEqual(luckySources({ ...base, cloversPurchased: 3, scepterReady: true }), ["scepter"]);
});

test("a pull is the last resort and only when the caller allows it", () => {
  assert.deepEqual(luckySources({ ...base, cloversPurchased: 3, scepterReady: true, pull: true }), [
    "scepter",
    "pull",
  ]);
  assert.deepEqual(luckySources({ ...base, cloversPurchased: 3 }), []);
});
