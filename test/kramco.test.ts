import assert from "node:assert/strict";
import { test } from "node:test";

import { kramcoWanted, KramcoState } from "../src/lib/kramco";

const base: KramcoState = {
  owned: true,
  forcerActive: false,
  tier: "mid",
  site: "outpost",
};

test("the Outpost wears the Kramco at every tier", () => {
  for (const tier of ["low", "mid", "high"] as const) {
    assert.equal(kramcoWanted({ ...base, tier }), true, tier);
  }
});

test("the farm zones wear it only at low", () => {
  assert.equal(kramcoWanted({ ...base, site: "farm", tier: "low" }), true);
  assert.equal(kramcoWanted({ ...base, site: "farm", tier: "mid" }), false);
  assert.equal(kramcoWanted({ ...base, site: "farm", tier: "high" }), false);
});

test("a forced noncombat keeps it off: the goblin would eat the force", () => {
  assert.equal(kramcoWanted({ ...base, forcerActive: true }), false);
  assert.equal(kramcoWanted({ ...base, site: "farm", tier: "low", forcerActive: true }), false);
});

test("nothing to wear when it is not owned", () => {
  assert.equal(kramcoWanted({ ...base, owned: false }), false);
});
