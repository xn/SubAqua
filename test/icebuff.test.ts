import assert from "node:assert/strict";
import { test } from "node:test";

import { claimIceBuffWith, IceBuffIo } from "../src/lib/icebuff";

// The war-ending skate-park adventure: the pref still reads "war" until the park page is
// visited again (grimoire runs `completed` after `do`; the refresh used to live only there).
function parkAfterWar(claimedAlready = false): IceBuffIo & {
  refreshes: number;
  claims: number;
} {
  let status = "war";
  let claimed = claimedAlready;
  return {
    refreshes: 0,
    claims: 0,
    status: () => status,
    refresh() {
      this.refreshes += 1;
      status = "ice";
    },
    claimed: () => claimed,
    claim() {
      this.claims += 1;
      claimed = true;
    },
  };
}

test("the war-ending turn refreshes the park and claims Lutz exactly once", () => {
  const park = parkAfterWar();
  assert.equal(claimIceBuffWith(park), true);
  assert.equal(park.refreshes, 1);
  assert.equal(park.claims, 1);
  // The next skate-park or gym turn: already claimed today.
  assert.equal(claimIceBuffWith(park), false);
  assert.equal(park.claims, 1);
});

test("a buff already taken today is left alone, without a page hit", () => {
  const park = parkAfterWar(true);
  assert.equal(claimIceBuffWith(park), false);
  assert.equal(park.refreshes, 0);
  assert.equal(park.claims, 0);
});

test("a war still on after the refresh claims nothing", () => {
  const park = parkAfterWar();
  park.refresh = function () {
    this.refreshes += 1;
  };
  assert.equal(claimIceBuffWith(park), false);
  assert.equal(park.refreshes, 1);
  assert.equal(park.claims, 0);
});

test("a park already iced claims without refreshing", () => {
  const park = parkAfterWar();
  park.status = () => "ice";
  assert.equal(claimIceBuffWith(park), true);
  assert.equal(park.refreshes, 0);
  assert.equal(park.claims, 1);
});

test("no skate park on the route: nothing happens", () => {
  const park = parkAfterWar();
  park.status = () => "";
  assert.equal(claimIceBuffWith(park), false);
  assert.equal(park.refreshes, 0);
  assert.equal(park.claims, 0);
});
