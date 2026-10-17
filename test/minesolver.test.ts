import assert from "node:assert/strict";
import { test } from "node:test";

import {
  choose,
  contentStatus,
  DEFAULT_PARAMS,
  observe,
  ORE_CELLS,
  posterior,
  solveDig,
  veinPlacements,
} from "../src/lib/minesolver";

// Build a 36-char wall from six 6-char rows, row 1 first (top), row 6 last (front).
const wall = (...rows: string[]): string => rows.join("");
const ROCK = "XXXXXX";
const img = (which: number, name: string): string =>
  `#${which}<img src="https://images.kingdomofloathing.com/itemimages/${name}.gif" alt="x">`;
const cell = (col: number, row: number): number => (row - 1) * 6 + (col - 1);

test("veinPlacements: every 4-connected tetromino position in a 6x4 field", () => {
  // 19 fixed tetrominoes over 6 columns x 4 rows: I horizontal 3x4=12, I vertical 6x1=6,
  // O 5x3=15, and the 16 remaining L/S/T orientations in 3x2 or 2x3 boxes: 8 x (4x3) + 8 x (5x2).
  const expected = 12 + 6 + 15 + 8 * 12 + 8 * 10;
  assert.equal(veinPlacements().length, expected);
  assert.equal(expected, 209);
});

test("contentStatus maps mafia's layout images", () => {
  assert.equal(contentStatus("teflonore"), "teflon");
  assert.equal(contentStatus("velcroore"), "velcro");
  assert.equal(contentStatus("vinylore"), "vinyl");
  assert.equal(contentStatus("hp"), "dud");
  assert.equal(contentStatus("meatstack"), "dud");
  assert.equal(contentStatus("aquamarine"), "dud");
});

test("observe: exposure without detection, everything visible with it", () => {
  // Shaft to (3,3); (3,2) twinkles; (2,3) rock is exposed; (1,1) is not.
  const state = wall(ROCK, "XX*XXX", "XXoXXX", "XXoXXX", "XXoXXX", "XXoXXX");
  const layout = img(3 * 8 + 3, "hp"); // (3,3) was a cave-in
  const blind = observe(state, layout, false);
  assert.equal(blind.length, 36);
  assert.equal(blind[32], "rock"); // (3,6) dug, nothing recorded
  assert.equal(blind[31], "rock"); // (2,6) front row: exposed, plain
  assert.equal(blind[24], "unknown"); // (1,5) not exposed
  assert.equal(blind[cell(3, 2)], "twinkle");
  assert.equal(blind[cell(2, 3)], "rock");
  assert.equal(blind[cell(1, 1)], "unknown");
  assert.equal(blind[cell(3, 3)], "dud");
  assert.equal(blind[cell(3, 4)], "rock"); // dug, nothing found
  const seeing = observe(state, layout, true);
  assert.equal(seeing[cell(1, 1)], "rock");
  assert.equal(
    seeing.every((s) => s !== "unknown"),
    true,
  );
});

test("posterior: uninformed wall puts teflon in rows 1-3, little in row 4, none below", () => {
  const post = posterior(observe("X".repeat(36), "", false));
  assert.ok(post.mass > 0);
  assert.deepEqual(post.counts, { teflon: 209, velcro: 209, vinyl: 209 });
  const rowMean = (row: number): number =>
    post.teflon.slice((row - 1) * 6, row * 6).reduce((a, b) => a + b, 0) / 6;
  assert.ok(rowMean(2) > rowMean(4) * 4);
  assert.ok(rowMean(1) > 0.1 && rowMean(3) > 0.1);
  // Four cells of teflon somewhere: the marginals sum to 4.
  assert.ok(Math.abs(post.teflon.reduce((a, b) => a + b, 0) - 4) < 1e-9);
});

test("posterior: a revealed vinyl square can't be teflon and pulls its neighbours down", () => {
  const state = wall(ROCK, "XX*XXX", "X*o*XX", "XXoXXX", "XXoXXX", "XXoXXX");
  const layout = img(3 * 8 + 3, "vinylore");
  const post = posterior(observe(state, layout, false));
  assert.equal(post.teflon[cell(3, 3)], 0);
  // The twinkles beside the vinyl are likelier vinyl than a far, unexposed cell is teflon.
  const far = post.teflon[cell(6, 1)];
  assert.ok(post.teflon[cell(2, 3)] < far + 0.2);
  // The exposed row-2 twinkle above is the best bet and the solver digs it.
  const dig = solveDig(state, layout, false);
  assert.ok(dig);
  if (dig) assert.deepEqual(dig.square, [3, 2]);
});

test("posterior with detection: teflon only on twinkles, and the three veins must fit them", () => {
  // Twenty twinkles: three 2x2 blocks in rows 1-4 plus eight duds in rows 5-6. The veins
  // have to tile the blocks, so every block twinkle carries some teflon probability and
  // nothing else does.
  const twenty = wall("**X**X", "**X**X", "XXXX**", "XXXX**", "***XXX", "*****X");
  const post = posterior(observe(twenty, "", true));
  assert.ok(post.mass > 0);
  for (let i = 0; i < ORE_CELLS; i++) {
    if (twenty.charAt(i) === "*") assert.ok(post.teflon[i] > 0);
    else assert.equal(post.teflon[i], 0);
  }
});

test("posterior with detection: a wall without its 19-20 twinkles has no placement", () => {
  const few = wall("**XXXX", "**XXXX", ROCK, ROCK, ROCK, ROCK);
  assert.equal(posterior(observe(few, "", true)).mass, 0);
  assert.equal(solveDig(few, "", true), undefined);
  // Twelve ore twinkles and no duds is impossible too: the wall has 16 rocky squares, not 24.
  const twelve = wall("**X**X", "**X**X", "XXXX**", "XXXX**", ROCK, ROCK);
  assert.equal(posterior(observe(twelve, "", true)).mass, 0);
  // Nineteen (no aquamarine) is fine.
  const nineteen = wall("**X**X", "**X**X", "XXXX**", "XXXX**", "***XXX", "****XX");
  assert.ok(posterior(observe(nineteen, "", true)).mass > 0);
});

test("choose: binomials, zero outside the triangle", () => {
  assert.equal(choose(24, 8), 735471);
  assert.equal(choose(5, 0), 1);
  assert.equal(choose(3, 5), 0);
  assert.equal(choose(3, -1), 0);
});

test("solveDig: with detection it walks toward the twinkles, never digs a plain front square far away", () => {
  const seen = wall("XXX***", "XXX***", "XXX***", "XXX***", "****XX", "****XX");
  const dig = solveDig(seen, "", true);
  assert.ok(dig);
  if (dig) {
    assert.equal(dig.square[1], 6);
    assert.ok(dig.square[0] >= 4);
  }
});

test("solveDig: only exposed squares are candidates", () => {
  const state = wall(ROCK, ROCK, ROCK, ROCK, ROCK, ROCK);
  const dig = solveDig(state, "", false, DEFAULT_PARAMS);
  assert.ok(dig);
  if (dig) assert.equal(dig.square[1], 6);
});

test("solveDig: a malformed state solves nothing", () => {
  assert.equal(solveDig("", "", false), undefined);
});
