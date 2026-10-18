import assert from "node:assert/strict";
import { test } from "node:test";

import { FishyPullCandidate, fishyPullObtainable, fishyPullOrder } from "../src/lib/fishypull";

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

test("the last-resort Fishy pull has its own price ceiling above the general buy limit", () => {
  // 2026-10-17: fish sauce at 21,060 with autoBuyPriceLimit 20,000 would have left the ladder empty.
  const sauce1017 = { have: false, pulledToday: false, stored: 0, price: 21_060 };
  assert.equal(fishyPullObtainable({ ...sauce1017, limit: 20_000 }), false);
  assert.equal(fishyPullObtainable({ ...sauce1017, limit: 50_000 }), true);
  assert.equal(fishyPullObtainable({ ...sauce1017, price: 60_000, limit: 50_000 }), false);
});

test("one in Hagnk's or in inventory needs no purchase; one pulled today is gone", () => {
  const over = { have: false, pulledToday: false, stored: 0, price: 999_999, limit: 50_000 };
  assert.equal(fishyPullObtainable({ ...over, stored: 1 }), true);
  assert.equal(fishyPullObtainable({ ...over, have: true }), true);
  assert.equal(fishyPullObtainable({ ...over, stored: 1, pulledToday: true }), false);
});
