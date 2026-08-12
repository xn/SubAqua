import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

/**
 * One composition per tier (spec §3). Phases 3-4 populate these from the shared
 * task-factory catalog; the foundation ships an empty route so the engine loop,
 * list mode, and destruct paths are exercised end-to-end.
 */
export function buildRunplan(tier: Tier): Task[] {
  switch (tier) {
    case "low":
    case "mid":
    case "high":
      return [];
  }
}
