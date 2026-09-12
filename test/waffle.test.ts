import assert from "node:assert/strict";
import { test } from "node:test";

import { wafflePlan } from "../src/lib/waffle";

// Policy from the 2026-09-12 dynamic program over the wiki encounter model: keep one waffle for
// the <=1-standing state where a refused throw is kept (a repeatable 20% roll); spend extras
// early, one per fight, on a draw the macro then banishes; kick first when a spare is held.

test("a tumbleweed gets the waffle whenever one is held", () => {
  assert.deepEqual(
    wafflePlan({ current: "tumbleweed", othersStanding: 0, waffles: 1, kick: true }),
    ["waffle"],
  );
  assert.deepEqual(
    wafflePlan({ current: "tumbleweed", othersStanding: 0, waffles: 0, kick: true }),
    [],
  );
});

test("the last draw standing gets the waffle: the throw is refused and kept on a miss", () => {
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 0, waffles: 1, kick: true }), [
    "waffle",
  ]);
});

test("the last waffle is held while another draw stands", () => {
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 2, waffles: 1, kick: true }), []);
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 1, waffles: 1, kick: false }), []);
});

test("a spare waffle is thrown on a draw, after a kick when the kick is available", () => {
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 2, waffles: 2, kick: true }), [
    "kick",
    "waffle",
  ]);
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 1, waffles: 3, kick: false }), [
    "waffle",
  ]);
});

test("no waffle, no plan", () => {
  assert.deepEqual(wafflePlan({ current: "draw", othersStanding: 2, waffles: 0, kick: true }), []);
});
