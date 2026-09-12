import assert from "node:assert/strict";
import { test } from "node:test";

import { inZone } from "../src/lib/zone";

// mafia's appearance_rates reports a banished monster at -3 and a conditional one at 0; both
// still belong to the zone, so a banish source holding one must not be re-used there.
test("inZone counts a banished (-3) monster as belonging to the zone", () => {
  assert.equal(inZone({ "sea cowboy": -3, "sea cow": 45 }, "sea cowboy"), true);
});

test("inZone counts a 0%-rate conditional monster as belonging to the zone", () => {
  assert.equal(inZone({ "wild seahorse": 0 }, "wild seahorse"), true);
});

test("inZone rejects a monster the zone never rolls", () => {
  assert.equal(inZone({ "sea cow": 45 }, "Mer-kin burglar"), false);
});

test("inZone rejects an empty name", () => {
  assert.equal(inZone({ "sea cow": 45 }, undefined), false);
});
