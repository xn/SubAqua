import { cliExecute, use } from "kolmafia";
import { $item, get, have, SourceTerminal } from "libram";

import { Quest } from "../../engine/task";
import { haveAnywhere } from "../../lib";
import { currentPolicy } from "../../resources/policy";
import { pullSequence } from "../../resources/pulls";

const pyec = $item`Platinum Yendorian Express Card`;

/** Free +30% item, up to 3/day with CRAM+SCRAM chips (ChoiceControl.java:
 * 9070-9072); called from item-farm task prepares (ash mood hook UTS:74-77). */
export function sourceEnhanceItems(): void {
  if (!SourceTerminal.have()) return;
  if (have(SourceTerminal.Buffs.Items)) return;
  if (SourceTerminal.enhanceUsesRemaining() <= 0) return;
  SourceTerminal.enhance(SourceTerminal.Buffs.Items);
}

export function sorceressDailies(): Quest {
  return {
    name: "Sorceress Dailies",
    tasks: [
      {
        // Free daily buff the ash never claims (MomRequest.java:43-55; 7
        // options). "stats" = Cereal Killer, +200 exp -> mys -> spell damage.
        // Mafia auto-equips underwater gear for the visit (Checkpoint).
        name: "Mom Buff",
        ready: () => get("questS02Monkees") === "finished",
        completed: () => get("_momFoodReceived", false),
        do: () => void cliExecute("mom stats"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // PYEC (ash UTS:2323-2330, !highShiny gate -> usePyec policy). The
        // storage take is a real ronin pull — pullSequence keeps the books.
        name: "PYEC",
        ready: () => currentPolicy().usePyec && haveAnywhere(pyec),
        completed: () => get("expressCardUsed", false),
        do: (): void => {
          if (!have(pyec)) pullSequence(pyec);
          if (have(pyec)) use(pyec);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // Slot duplicate.edu (ash sourceEducate G:984-988): 1/day in-path;
        // spent by the school monitor macro (Task 10).
        name: "Terminal Educate",
        ready: () => SourceTerminal.have(),
        completed: () => SourceTerminal.getSkills().includes(SourceTerminal.Skills.Duplicate),
        do: () => void SourceTerminal.educate(SourceTerminal.Skills.Duplicate),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
