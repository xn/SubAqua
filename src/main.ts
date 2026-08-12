import { Args } from "grimoire-kolmafia";
import { abort, cliExecute, myPath, print, turnsPlayed } from "kolmafia";
import { $path, get, sinceKolmafiaRevision } from "libram";

import { args } from "./args";
import { SubAquaEngine } from "./engine/engine";
import { currentTier } from "./lib/tier";
import { printSimChecklist } from "./sim";
import { buildRunplan } from "./tasks/runplans";

const seaPath = $path`11,037 Leagues Under the Sea`;

export function main(command = ""): void {
  sinceKolmafiaRevision(29057);

  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }
  if (args.version) {
    print(`subaqua build ${process.env.GITHUB_SHA} (${process.env.GITHUB_REF_NAME})`, "blue");
    return;
  }

  if (args.command === "sim") {
    printSimChecklist();
    return;
  }
  if (args.command !== "run") {
    abort(`Unknown command "${args.command}". Try "subaqua help".`);
  }

  // Path-only script (spec scope): every my_path()==0 branch of the ash is cut.
  if (myPath() !== seaPath) {
    abort(
      "subaqua only runs inside the 11,037 Leagues Under the Sea path. " +
        'Use "subaqua sim" for the pre-ascension checklist.',
    );
  }
  if (!get("autoSatisfyWithNPCs")) {
    abort("subaqua requires autoSatisfyWithNPCs. Run: set autoSatisfyWithNPCs = true");
  }

  const tier = currentTier();
  print(`Shiny tier: ${tier}`, "blue");
  const tasks = buildRunplan(tier);

  if (args.list) {
    print(`Runplan (${tier}): ${tasks.length} tasks`, "blue");
    for (const task of tasks) {
      print(`${task.completed() ? "✓" : "○"} ${task.name}`, task.completed() ? "gray" : "blue");
    }
    return;
  }

  if (tasks.length === 0) {
    print("Runplan is empty — quest phases arrive in later milestones.", "red");
    return;
  }

  const startTurns = turnsPlayed();
  const engine = new SubAquaEngine(tasks);
  try {
    engine.run(args.actions);
  } finally {
    engine.destruct();
  }

  const remaining = tasks.filter((task) => !task.completed());
  print(`Spent ${turnsPlayed() - startTurns} turns; ${remaining.length} tasks remaining.`, "blue");
  if (remaining.length === 0 && args.postloopCommand !== "") {
    print(`Route complete — running: ${args.postloopCommand}`, "blue");
    cliExecute(args.postloopCommand);
  }
}
