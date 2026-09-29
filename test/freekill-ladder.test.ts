import assert from "node:assert/strict";
import { test } from "node:test";

import { killRungLadder } from "../src/lib/freekill-ladder";

const darts = { name: "Darts: Bullseye" };
const punch = { name: "Shattering Punch" };
const mobHit = { name: "Gingerbread Mob Hit" };

test("2026-09-28 t9: a darts miss falls through to the worn chain instead of a paid kill", () => {
  assert.deepEqual(
    killRungLadder(darts, [punch, mobHit]).map((s) => s.name),
    ["Darts: Bullseye", "Shattering Punch", "Gingerbread Mob Hit"],
  );
});

test("a selected source already in the chain keeps the chain's order", () => {
  assert.deepEqual(
    killRungLadder(punch, [darts, punch, mobHit]).map((s) => s.name),
    ["Darts: Bullseye", "Shattering Punch", "Gingerbread Mob Hit"],
  );
});

test("no selected source: the worn chain alone", () => {
  assert.deepEqual(
    killRungLadder(undefined, [punch]).map((s) => s.name),
    ["Shattering Punch"],
  );
});

test("nothing held: empty ladder", () => {
  assert.deepEqual(killRungLadder(undefined, []), []);
});
