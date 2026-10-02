import assert from "node:assert/strict";
import { test } from "node:test";

import { FishyPullCandidate, fishyPullOrder } from "../src/lib/fishypull";

const sauce: FishyPullCandidate = {
  name: "fish sauce",
  cost: 41_500,
  obtainable: true,
  usable: true,
};
const tea: FishyPullCandidate = {
  name: "cuppa Gill tea",
  cost: 41_500,
  obtainable: true,
  usable: true,
};

const names = (candidates: FishyPullCandidate[]): string[] =>
  fishyPullOrder(candidates).map((c) => c.name);

test("the cheaper opportunity cost is pulled first, the other stays as the fallback", () => {
  assert.deepEqual(names([{ ...sauce, cost: 28_500 }, tea]), ["fish sauce", "cuppa Gill tea"]);
  assert.deepEqual(names([{ ...sauce, cost: 60_000 }, tea]), ["cuppa Gill tea", "fish sauce"]);
});

test("a tie keeps the listed order", () => {
  assert.deepEqual(names([sauce, tea]), ["fish sauce", "cuppa Gill tea"]);
});

test("a full spleen drops the fish sauce", () => {
  assert.deepEqual(names([{ ...sauce, cost: 1, usable: false }, tea]), ["cuppa Gill tea"]);
});

test("a candidate over the buy limit or already pulled today drops out", () => {
  assert.deepEqual(names([sauce, { ...tea, cost: 1, obtainable: false }]), ["fish sauce"]);
  assert.deepEqual(
    names([
      { ...sauce, obtainable: false },
      { ...tea, obtainable: false },
    ]),
    [],
  );
});
