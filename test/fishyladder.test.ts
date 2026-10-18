import assert from "node:assert/strict";
import { test } from "node:test";

import { FishyLadderState, fishyStep } from "../src/lib/fishyladder";

// Paid turn 12 of the gold run: the pipe's 10 turns are gone, the skate war is still on
// (Lutz's free 30 is ~12 paid turns away), the PYEC is unused.
const base: FishyLadderState = {
  fishyTurns: 0,
  pipe: false,
  mapPurchased: true,
  parkStatus: "war",
  lutzClaimed: false,
  pyecReady: true,
  waitForLutz: true,
};

test("Fishy with turns to spare needs nothing", () => {
  assert.equal(fishyStep({ ...base, fishyTurns: 7 }), "keep");
  assert.equal(fishyStep({ ...base, fishyTurns: 2 }), "keep");
});

test("the card only extends an active effect: it fires on Fishy's last turn, never after", () => {
  assert.equal(fishyStep({ ...base, fishyTurns: 1 }), "pyec");
  assert.equal(fishyStep({ ...base, fishyTurns: 0 }), "wait");
});

test("the card waits while the pipe is still to come", () => {
  assert.equal(fishyStep({ ...base, fishyTurns: 1, pipe: true }), "keep");
});

test("the card is not spent on Fishy when Lutz is claimable, claimed, or never coming", () => {
  assert.equal(fishyStep({ ...base, fishyTurns: 1, parkStatus: "ice" }), "keep");
  assert.equal(fishyStep({ ...base, fishyTurns: 1, lutzClaimed: true }), "keep");
  assert.equal(fishyStep({ ...base, fishyTurns: 1, mapPurchased: false }), "keep");
  assert.equal(fishyStep({ ...base, fishyTurns: 1, pyecReady: false }), "keep");
});

test("lapsed: the pipe first, then Lutz once the park is iced", () => {
  assert.equal(fishyStep({ ...base, pipe: true }), "pipe");
  assert.equal(fishyStep({ ...base, parkStatus: "ice" }), "lutz");
});

test("lapsed with Lutz's free 30 still coming: accept the doubled turn, buy nothing", () => {
  assert.equal(fishyStep(base), "wait");
});

test("lapsed: the paid rungs when Lutz is used, the war is not fought, or the flag is off", () => {
  assert.equal(fishyStep({ ...base, parkStatus: "ice", lutzClaimed: true }), "buy");
  assert.equal(fishyStep({ ...base, lutzClaimed: true }), "buy");
  assert.equal(fishyStep({ ...base, mapPurchased: false }), "buy");
  assert.equal(fishyStep({ ...base, waitForLutz: false }), "buy");
});

test("the card fires on Fishy's last turn even before Shadow Affinity: a doubled turn is never accepted while the card can bridge it", () => {
  assert.equal(fishyStep({ ...base, fishyTurns: 1 }), "pyec");
});
