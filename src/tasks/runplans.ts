import { getTasks } from "grimoire-kolmafia";

import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

import { initQuest } from "./init";

/**
 * One composition per tier (spec §3). Tasks 6-11 of the Phase 3 plan append
 * the monkee quests; the shared prefix is the init dailies. List order is
 * priority (stock grimoire scheduling).
 */
export function buildRunplan(tier: Tier): Task[] {
  switch (tier) {
    case "low":
    case "mid":
    case "high":
      return getTasks([initQuest()]);
  }
}
