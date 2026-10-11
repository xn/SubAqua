import assert from "node:assert/strict";
import { test } from "node:test";

import { backupSeedWanted } from "../src/lib/backup-seed";

// 2026-10-05 [16]: lastCopyableMonster was "some fish" (the school's Talk to Some Fish), ten
// Back-Ups were left, and the library's five draws went to shadow bricks instead of free copies.
test("a dead seed with Back-Ups to spend wants a free fight first", () => {
  assert.equal(backupSeedWanted({ lastCopyableFree: false, backupsLeft: 10 }), true);
});

test("a live free seed needs nothing", () => {
  assert.equal(backupSeedWanted({ lastCopyableFree: true, backupsLeft: 10 }), false);
});

test("too few Back-Ups left are not worth a summon charge", () => {
  assert.equal(backupSeedWanted({ lastCopyableFree: false, backupsLeft: 2 }), false);
  assert.equal(backupSeedWanted({ lastCopyableFree: false, backupsLeft: 3 }), true);
});
