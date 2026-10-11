import assert from "node:assert/strict";
import { test } from "node:test";

import { banisherHolds, banishRunAllowed, reflexHammerRemaining } from "../src/lib/freerun-pick";

// A banishedMonsters value as mafia wrote it on 2026-10-05 after the gym's Snokebomb (:7874).
const pref =
  "fluffy bunny:ice house:0:Mer-kin raider:Spring-Loaded Front Bumper:8:Mer-kin healer:" +
  "Throw Latte on Opponent:10:Mer-kin poseur:Bowl a Curveball:21:Mer-kin trainer:Feel Hatred:22:" +
  "Mer-kin juicer:snokebomb:23";

test("banisherHolds reads the monster a source holds, ignoring case", () => {
  assert.equal(banisherHolds(pref, "Snokebomb"), "Mer-kin juicer");
  assert.equal(banisherHolds(pref, "Feel Hatred"), "Mer-kin trainer");
});

test("banisherHolds is undefined for a source that holds nothing", () => {
  assert.equal(banisherHolds(pref, "Reflex Hammer"), undefined);
  assert.equal(banisherHolds("", "Snokebomb"), undefined);
});

test("a banishing run is refused while its held monster is in the zone and banishes matter", () => {
  assert.equal(banishRunAllowed({ heldInZone: true, banishValue: true }), false);
});

test("2026-10-05 gym: the same run is allowed where a banish changes nothing (100% combat)", () => {
  assert.equal(banishRunAllowed({ heldInZone: true, banishValue: false }), true);
});

test("a banishing run is allowed when its held monster is elsewhere", () => {
  assert.equal(banishRunAllowed({ heldInZone: false, banishValue: true }), true);
});

test("Reflex Hammer has three charges a day with the bag, none without", () => {
  assert.equal(reflexHammerRemaining(0, true), 3);
  assert.equal(reflexHammerRemaining(2, true), 1);
  assert.equal(reflexHammerRemaining(3, true), 0);
  assert.equal(reflexHammerRemaining(0, false), 0);
});
