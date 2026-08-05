import { Args, getTasks } from "grimoire-kolmafia";
import { inebrietyLimit, myInebriety, myLevel, myMp, print } from "kolmafia";
import { sinceKolmafiaRevision } from "libram";

import { args } from "./args";
import { Engine } from "./engine/engine";
import { Task } from "./engine/task";
import { BigQuest } from "./tasks/big";
import { GrandpaQuest } from "./tasks/grandpa";
import { LittleQuest } from "./tasks/little";
import {CurrentsQuest} from "./tasks/currents"
import { printSeaworthyDebug, SeaworthyQuest } from "./tasks/seaworthy";

const version = "0.0.1";

export function checkMP(): string {
  if (myMp() < 200) {
    return "Your MP is less than 200.";
  } else {
    return "Your MP is greater than or equal to 200.";
  }
}

export function main(command?: string): void {
  sinceKolmafiaRevision(28425);
  Args.fill(args, command);

  print(
    `[subaqua v${version}] main(${command !== undefined && command !== "" ? JSON.stringify(command) : "no CLI string"})`,
  );
  print(
    `[subaqua] args: quest=${String(args.quest)} list=${args.list} debug.verbose=${args.debug.verbose}`,
  );

  if (args.help) {
    Args.showHelp(args);
    return;
  }
  if (args.version) {
    print(`subaqua v${version}`);
    return;
  }

  if (myInebriety() > inebrietyLimit()) {
    print(
      `[subaqua] abort: overdrunk (${myInebriety()} > ${inebrietyLimit()}); sober up or try again tomorrow`,
    );
    return;
  }

  if (myLevel() < 13) {
    print(`[subaqua] abort: level ${myLevel()} < 13`);
    print("The Sea is a dangerous place. Come back when you are more experienced");
    return;
  }

  print(`[subaqua] mp=${myMp()} level=${myLevel()} drunk=${myInebriety()}/${inebrietyLimit()}`);
  printSeaworthyDebug("main (before engine)");

  const quest = args.quest;
  if (!quest) {
    print(
      '[subaqua] No quest is set. Try e.g. subaqua quest=grind — see CLI help for options ("subaqua help").',
    );
    throw `Unknown quest ${args.quest} for sim`;
  }

  const tasks: Task[] = getTasks([SeaworthyQuest, LittleQuest, BigQuest, GrandpaQuest, CurrentsQuest]);
  print(
    `[subaqua] engine.run() with ${tasks.length} quests: ${tasks.map((t) => t.name).join(", ")} (selected quest pref=${JSON.stringify(quest)})`,
  );

  const engine = new Engine(tasks);
  try {
    engine.run();
  } finally {
    engine.destruct();
  }
}
