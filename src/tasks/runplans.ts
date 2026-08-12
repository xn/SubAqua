import { getTasks } from "grimoire-kolmafia";

import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

import { initQuest } from "./init";
import { bigBrotherQuest } from "./monkees/bigbrother";
import { corralQuest } from "./monkees/corral";
import { currentsQuest } from "./monkees/currents";
import { grandpaQuest } from "./monkees/grandpa";
import { guildTasks } from "./monkees/guild";
import { helmetQuest } from "./monkees/helmet";
import { momQuest, wandererTasks } from "./monkees/mom";
import { outpostQuest } from "./monkees/outpost";
import { pelletQuest } from "./monkees/pellet";

/**
 * One composition per tier (spec §3). List order is priority: init dailies,
 * then wanderer-window redemptions (they fire only inside their 8-turn
 * counters), then the seaMonkees() spine in ash order (UTS:1759-2296).
 * Tier differences are route membership only — resource behavior lives in
 * ResourcePolicy:
 *  - high skips the guild unlock and golem recall (UTS:1770-1777, 1911-1921
 *    !highShiny gates), skips the one-turn corral opener (UTS:2233), runs
 *    the sword corral lane, and uses the abyss-only Mom lane (UTS:2165).
 *  - low/mid run the guild, golem, summon-diver lane, cyber Mom lanes, and
 *    the corral opener; the sword imprint fires only on phoneless accounts
 *    (UTS:1760-1767).
 */
export function buildRunplan(tier: Tier): Task[] {
  const wanderers = { name: "Wanderers", tasks: wandererTasks() };
  const high = tier === "high";
  return getTasks([
    initQuest(),
    wanderers,
    guildTasks({ phonelessSwordOnly: !high, unlockGuild: !high }),
    pelletQuest(),
    bigBrotherQuest(),
    grandpaQuest({ golem: !high }),
    outpostQuest(),
    currentsQuest(),
    helmetQuest({ summonLane: !high }),
    momQuest({ cyber: !high }),
    corralQuest({ opener: !high, swordLane: high }),
  ]);
}
