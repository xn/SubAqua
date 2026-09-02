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
import { momFinishQuest, momQuest, wandererTasks } from "./monkees/mom";
import { outpostQuest } from "./monkees/outpost";
import { pelletQuest } from "./monkees/pellet";
import { shadowRiftQuest } from "./monkees/shadow";
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

export function buildRunplan(tier: Tier): Task[] {
  const wanderers = { name: "Wanderers", tasks: wandererTasks() };
  const high = tier === "high";
  return getTasks([
    initQuest(),
    wanderers,
    guildTasks({ phonelessSwordOnly: !high, unlockGuild: !high }),
    pelletQuest({ swordLane: !high }),
    bigBrotherQuest(),
    grandpaQuest({ golem: !high }),
    outpostQuest(),
    currentsQuest(),
    helmetQuest({ summonLane: !high }),
    momQuest({ cyber: !high }),
    sorceressDailies(),
    ...(high ? [] : [shadowRiftQuest()]),
    corralQuest({ opener: !high, swordLane: high }),
    mineQuest(),
    schoolQuest(),
    libraryQuest(),
    yogUrtQuest(),
    gearQuest(),
    skateParkQuest(),
    colosseumQuest(),
    momFinishQuest(),
    shubQuest(),
    finaleQuest(),
  ]);
}
