import assert from "node:assert/strict";
import { test } from "node:test";

import { furnishPlan } from "../src/lib/leprecondo";

// the std layout by name (ids 22, 24, 12, 11, 10, 4, 5, 6); an unknown id maps to undefined
const layout = [
  "high-end home workout system",
  "ultimate retro game console",
  "internet-connected laptop",
  "padded weight bench",
  "beer pong table",
  "second-hand hot plate",
  "beer cooler",
  "free mattress",
  undefined,
];
const std = layout.slice(0, 4);

test("the first four discovered layout pieces, in layout order", () => {
  const discovered = [
    "padded weight bench",
    "internet-connected laptop",
    "ultimate retro game console",
    "high-end home workout system",
    "beer pong table",
  ];
  assert.deepEqual(furnishPlan(layout, discovered), [...std]);
});

test("layout gaps are filled with other discovered pieces, layout pieces first", () => {
  const discovered = ["Omnipot", "padded weight bench", "whiskeybed", "internet-connected laptop"];
  assert.deepEqual(furnishPlan(layout, discovered), [
    "internet-connected laptop",
    "padded weight bench",
    "Omnipot",
    "whiskeybed",
  ]);
});

test("empty and unknown ids are never furniture", () => {
  const discovered = ["empty", undefined, "Omnipot", "whiskeybed", "kegerator", "empty"];
  assert.equal(furnishPlan(layout, discovered), undefined);
  assert.deepEqual(furnishPlan(layout, [...discovered, "four-poster bed"]), [
    "Omnipot",
    "whiskeybed",
    "kegerator",
    "four-poster bed",
  ]);
});

test("fewer than four discovered pieces is no plan", () => {
  assert.equal(
    furnishPlan(layout, ["padded weight bench", "beer pong table", "Omnipot"]),
    undefined,
  );
  assert.equal(furnishPlan(layout, []), undefined);
});
