import assert from "node:assert/strict";
import { test } from "node:test";

import { floatingGroups, GOLD_RUN, goldTurncounts } from "../src/lib/goldrun";

// The checkpoints are the final _subaqua_ledger table of docs/gold-star-run.txt (lastTurn per
// group, in the ledger's order), so they run from Init at 0 to Finale at the run's paid total.
test("gold checkpoints are non-decreasing in runplan order and end at 33", () => {
  const groups = Object.keys(goldTurncounts);
  assert.equal(groups[0], "Init");
  assert.equal(groups[groups.length - 1], "Finale");
  let last = 0;
  for (const group of groups) {
    if (floatingGroups.has(group)) continue;
    const turn = goldTurncounts[group];
    assert.ok(turn >= last, `${group} finished at ${turn}, before the previous group at ${last}`);
    last = turn;
  }
  assert.equal(goldTurncounts.Finale, 33);
  assert.match(GOLD_RUN, /\(33 turns\)$/);
});

test("every floating group is a ledger group", () => {
  for (const group of floatingGroups) assert.ok(group in goldTurncounts, group);
});
