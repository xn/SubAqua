import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatDungeonLayout,
  isDungeonPref,
  nextRoomIndex,
  peekMayFight,
  peekSplits,
} from "../src/lib/dungeonpeek";

// The two seeds from the 2026-09-23 seedfinder chat: bp + seahorse agreed, room 1 split them.
const A = "TTTD_DDMM_DTMM"; // 2621640
const B = "DTDT_DTMM_DTMM"; // 5500186

test("formatDungeonLayout: twelve shuffled rooms print as 4_4_4 like seedfinder", () => {
  assert.equal(formatDungeonLayout("TTTDDDMMDTMM"), A);
});

test("nextRoomIndex: room counter -> index into the 14-char pref, chests skipped", () => {
  assert.equal(nextRoomIndex(0), 0); // nothing done: room 1
  assert.equal(nextRoomIndex(3), 3); // room 4
  assert.equal(nextRoomIndex(4), undefined); // room 5 is the first chest
  assert.equal(nextRoomIndex(5), 5); // room 6 sits after the underscore
  assert.equal(nextRoomIndex(9), undefined); // room 10 chest
  assert.equal(nextRoomIndex(13), 13); // room 14
  assert.equal(nextRoomIndex(14), undefined); // room 15 final chest
  assert.equal(nextRoomIndex(15), undefined);
});

test("peekSplits: fresh dungeon, candidates disagree on room 1 -> peek", () => {
  assert.equal(peekSplits([A, B], "????_????_????", 0), true);
});

test("peekSplits: room 1 already recorded -> nothing left to learn there", () => {
  assert.equal(peekSplits([A, B], "D???_????_????", 0), false);
});

test("peekSplits: candidates agree on the next room -> no peek", () => {
  assert.equal(peekSplits([A, "TDDD_DDMM_DTMM"], "????_????_????", 0), false);
});

test("peekSplits: one candidate -> no peek", () => {
  assert.equal(peekSplits([A], "????_????_????", 0), false);
});

test("peekSplits: next room is a chest -> no peek", () => {
  assert.equal(peekSplits([A, B], "TTTD_????_????", 4), false);
});

test("peekMayFight: only when a candidate puts a monster in the next room", () => {
  assert.equal(peekMayFight([A, B], 0), false); // T vs D
  assert.equal(peekMayFight([A, B], 5), false); // room 6: D vs D
  assert.equal(peekMayFight([A, B], 6), false); // room 7: D vs T
  assert.equal(peekMayFight([A, B], 7), true); // room 8: M vs M
});

test("isDungeonPref: accepts mafia's layout string, rejects garbage", () => {
  assert.equal(isDungeonPref("D???_????_????"), true);
  assert.equal(isDungeonPref(A), true);
  assert.equal(isDungeonPref(""), false);
  assert.equal(isDungeonPref("DDDDDDDDDDDDDD"), false);
});
