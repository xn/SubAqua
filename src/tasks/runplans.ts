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
import { colosseumQuest } from "./sorceress/colosseum";
import { sorceressDailies } from "./sorceress/daily";
import { finaleQuest } from "./sorceress/finale";
import { gearQuest } from "./sorceress/gym";
import { libraryQuest } from "./sorceress/library";
import { mineQuest } from "./sorceress/mine";
import { schoolQuest } from "./sorceress/school";
import { shubQuest } from "./sorceress/shub";
import { skateParkQuest } from "./sorceress/skatepark";
import { yogUrtQuest } from "./sorceress/yogurt";

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
 *
 * Then the sorceress endgame (Phase 4, ash UTS:2269-2999). Those quests carry
 * NO tier options — their tier behavior lives entirely in ResourcePolicy
 * (conserveFreeFights, usePyec, shubInsurancePulls, allowClubEmBackInTime,
 * pull gates), so every tier gets the same Phase 4 list in the same order.
 *
 * Upstream 2026-08-26 parasol `haveAnywhere` skip: NO-PORT. That amendment
 * retargets a late-pull ladder this route does not have; our only parasol site
 * is pulls.ts's escape-gear reservation, which keeps `availableAmount` per the
 * same amendment (a stored GAP still needs its own pull).
 *
 * `getTasks` is deliberately called WITHOUT `implicitAfter`: libraryQuest ships
 * two `ready`-selected farm lanes that share one `completed`, and an implicit
 * `after` chain would make the plain lane wait on the Force lane that never
 * completes on its own.
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
    // Sorceress endgame. Dailies first (they are free actions), then the mine:
    // the crappy disguise it builds gates every deepcity zone.
    sorceressDailies(),
    mineQuest(),
    // School before Library: libraryQuest's farm lanes are `ready`-gated on
    // scholarGearReady(), which schoolQuest's "Buy Scholar Gear" supplies.
    // schoolQuest's own quest-level `completed` is isMerkinHighPriest, so it
    // stops re-opening once the Library's High Priest task lands.
    schoolQuest(),
    libraryQuest(),
    // Yog-Urt (Right Door) needs isMerkinHighPriest, from the Library.
    yogUrtQuest(),
    // gearQuest BEFORE skateParkQuest, deliberately (ash UTS:645-647): while
    // the skate war is open the gymnasium banks the in-combat NC forcer, and
    // Guard Grind is `ready`-gated on !noncombatForcerActive — so the moment a
    // forcer is banked the gym goes not-ready and the park's War Resolution,
    // next in priority, spends it. The reverse order would resolve the war
    // before the gym ever got to bank one. gearQuest also needs yogUrtDefeated
    // (its scholar-strand guard), which is why Yog-Urt precedes both.
    gearQuest(),
    skateParkQuest(),
    // Colosseum needs the gladiator mask + tailpiece from gearQuest.
    colosseumQuest(),
    // Shub (Left Door) needs isMerkinGladiatorChampion, from the Colosseum.
    shubQuest(),
    // Finale needs both gods dead.
    finaleQuest(),
  ]);
}
