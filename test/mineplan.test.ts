import assert from "node:assert/strict";
import { test } from "node:test";

import { indexOf, parseBadOre, planDig, whichOf } from "../src/lib/mineplan";

// Build a 36-char wall from six 6-char rows, row 1 first (top), row 6 last (front).
const wall = (...rows: string[]): string => rows.join("");
const ROCK = "XXXXXX";

test("whichOf/indexOf match mafia's layouts: (3,6) is index 32 and square 51", () => {
  assert.equal(indexOf([3, 6]), 32);
  assert.equal(whichOf([3, 6]), 51);
  assert.equal(whichOf([3, 2]), 19);
});

test("parseBadOre reads velcro/vinyl squares out of mineLayout3", () => {
  const layout =
    '#35<img src="https://images.kingdomofloathing.com/itemimages/hp.gif" height=30 width=30>' +
    '#19<img src="https://images.kingdomofloathing.com/itemimages/vinylore.gif" alt="vinyl ore">' +
    '#18<img src="https://images.kingdomofloathing.com/itemimages/velcroore.gif" alt="velcro ore">' +
    '#21<img src="https://images.kingdomofloathing.com/itemimages/teflonore.gif" alt="teflon ore">';
  assert.deepEqual(parseBadOre(layout), [
    [3, 2],
    [2, 2],
  ]);
});

test("blind fresh wall (gold run): only a front-row twinkle shows, so the shaft starts", () => {
  // docs/gold-star-run.txt: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX*XXXXX
  const state = wall(ROCK, ROCK, ROCK, ROCK, ROCK, "*XXXXX");
  assert.deepEqual(planDig(state, []), { action: "dig", square: [3, 6], cost: 1, target: [3, 6] });
});

test("blind: the shaft walks past exposed row-4 and row-3 twinkles (0 and 7/57 teflon)", () => {
  // Shaft dug to (3,4): (2,4) and (4,4) twinkle; keep digging (3,3).
  const r4 = wall(ROCK, ROCK, ROCK, "X*o*XX", "XXoXXX", "XXoXXX");
  const r4plan = planDig(r4, []);
  assert.equal(r4plan.action, "dig");
  if (r4plan.action === "dig") assert.deepEqual(r4plan.square, [3, 3]);
  // Shaft dug to (3,3): (2,3) twinkles, (3,2) is plain rock; dig (3,2) to reach the ore row.
  const r3 = wall(ROCK, ROCK, "X*oXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  const r3plan = planDig(r3, []);
  assert.equal(r3plan.action, "dig");
  if (r3plan.action === "dig") assert.deepEqual(r3plan.square, [3, 2]);
});

test("blind: an exposed row-2 twinkle beats the shaft's plain-rock square", () => {
  const state = wall(ROCK, "X*oXXX", "XXoXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  assert.deepEqual(planDig(state, []), { action: "dig", square: [2, 2], cost: 1, target: [2, 2] });
});

test("seeing: walks the fewest digs to a row-2 twinkle, not a nearer row-3 one", () => {
  // Cluster at rows 2-3 columns 5-6 plus a lone row-3 twinkle at (1,3). Row 2 wins: (5,2) at
  // cost 5 via (5,6)..(5,3), and the path through (5,3)'s twinkle is the preferred one.
  const state = wall(ROCK, "XXXX**", "*XXX**", ROCK, ROCK, ROCK);
  const plan = planDig(state, []);
  assert.equal(plan.action, "dig");
  if (plan.action === "dig") {
    assert.deepEqual(plan.target, [5, 2]);
    assert.equal(plan.cost, 5);
    assert.deepEqual(plan.square, [5, 6]);
  }
});

test("seeing: equal digs -> the path with more twinkles on the way", () => {
  // Two row-2 twinkles at cost 5: (2,2) over plain rock, (5,2) through a row-3 twinkle.
  const state = wall(ROCK, "X*XX*X", "XXXX*X", ROCK, ROCK, ROCK);
  const plan = planDig(state, []);
  assert.equal(plan.action, "dig");
  if (plan.action === "dig") assert.deepEqual(plan.target, [5, 2]);
});

test("seeing: a far twinkle is walked to, never abandoned for a new wall (user rule)", () => {
  const state = wall("**XXXX", "**XXXX", ROCK, ROCK, ROCK, ROCK);
  assert.deepEqual(planDig(state, []), { action: "dig", square: [1, 6], cost: 5, target: [1, 2] });
});

test("twinkles next to a revealed wrong ore wait while another row-2 twinkle exists", () => {
  // 09-28 run shape: (3,2) came up vinyl. (2,2) sits next to it; (5,2) does not.
  const state = wall(ROCK, "X*oX*X", "XXoXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  const plan = planDig(state, [[3, 2]]);
  assert.equal(plan.action, "dig");
  if (plan.action === "dig") assert.deepEqual(plan.target, [5, 2]);
  // With nothing else in rows 1-2 the neighbour is still dug before any row-3 fallback.
  const only = wall(ROCK, "X*oXXX", "X*oXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  const fallback = planDig(only, [[3, 2]]);
  assert.equal(fallback.action, "dig");
  if (fallback.action === "dig") assert.deepEqual(fallback.square, [2, 2]);
});

test("row-3 twinkles are the fallback once rows 1-2 are dug out", () => {
  const state = wall("oooooo", "oooooo", "X*oXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  assert.deepEqual(planDig(state, []), { action: "dig", square: [2, 3], cost: 1, target: [2, 3] });
});

test("rows 1-3 dug out: the teflon vein must be in row 4, so a row-4 twinkle is last", () => {
  const state = wall("oooooo", "oooooo", "XXoXXX", "XXoX*X", "XXoXXX", "XXoXXX");
  const plan = planDig(state, []);
  assert.equal(plan.action, "dig");
  if (plan.action === "dig") {
    assert.deepEqual(plan.target, [5, 4]);
    assert.equal(plan.cost, 2);
  }
});

test("no twinkle left in rows 1-4: none", () => {
  const state = wall("oooooo", "oooooo", "XXoXXX", "XXoXXX", "XXoX*X", "XXoXXX");
  assert.deepEqual(planDig(state, []), { action: "none" });
});

test("a malformed state plans nothing", () => {
  assert.deepEqual(planDig("", []), { action: "none" });
});
