import assert from "node:assert/strict";
import { test } from "node:test";

import {
  yogDelevelersShort,
  yogDelevelerPull,
  yogExploitWanted,
  YogDelevelState,
} from "../src/lib/yogdelevel";

const base: YogDelevelState = {
  highPriest: true,
  yogDefeated: false,
  typesHeld: 1,
  nullAfternoon: false,
  stored: ["train whistle", "HOA citation pad"],
  pulledToday: [],
};

test("one type held after the School lane is short", () => {
  assert.equal(yogDelevelersShort(base), true);
});

test("not short before High Priest: the School can still drop mouthsoap", () => {
  assert.equal(yogDelevelersShort({ ...base, highPriest: false }), false);
  assert.equal(yogDelevelerPull({ ...base, highPriest: false }), undefined);
});

test("two types, Null Afternoon or a dead Yog-Urt end the need", () => {
  assert.equal(yogDelevelersShort({ ...base, typesHeld: 2 }), false);
  assert.equal(yogDelevelersShort({ ...base, nullAfternoon: true }), false);
  assert.equal(yogDelevelersShort({ ...base, yogDefeated: true }), false);
});

test("the train whistle is the first stored deleveler, the citation pad the second", () => {
  assert.equal(yogDelevelerPull(base), "train whistle");
  assert.equal(yogDelevelerPull({ ...base, stored: ["HOA citation pad"] }), "HOA citation pad");
  assert.equal(yogDelevelerPull({ ...base, pulledToday: ["train whistle"] }), "HOA citation pad");
});

test("nothing stored means nothing to pull from Hagnk's", () => {
  assert.equal(yogDelevelerPull({ ...base, stored: [] }), undefined);
});

test("the exploit is the last rung: only with nothing stored, and only once", () => {
  assert.equal(yogExploitWanted(base), false);
  assert.equal(yogExploitWanted({ ...base, stored: [] }), true);
  assert.equal(yogExploitWanted({ ...base, stored: [], pulledToday: ["null-day exploit"] }), false);
  assert.equal(yogExploitWanted({ ...base, stored: [], typesHeld: 2 }), false);
});
