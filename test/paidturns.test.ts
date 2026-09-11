import assert from "node:assert/strict";
import { test } from "node:test";

import { PaidTurnTally, paidTurnLimitFailure } from "../src/lib/paidturns";

test("PaidTurnTally accumulates per task across executions", () => {
  const tally = new PaidTurnTally();
  assert.equal(tally.get("School Unlocks"), 0);
  assert.equal(tally.add("School Unlocks", 1), 1);
  assert.equal(tally.add("School Unlocks", 0), 1);
  assert.equal(tally.add("School Unlocks", 2), 3);
  assert.equal(tally.get("Other"), 0);
});

test("paidTurnLimitFailure fires only at the limit and names the paid turns", () => {
  assert.equal(paidTurnLimitFailure("School Unlocks", 9, 10), undefined);
  assert.match(
    paidTurnLimitFailure("School Unlocks", 10, 10, "The lounge is not unlocking.") ?? "",
    /School Unlocks did not complete within 10 paid turns.*The lounge is not unlocking\./,
  );
  assert.equal(paidTurnLimitFailure("School Unlocks", 3, undefined), undefined);
});
