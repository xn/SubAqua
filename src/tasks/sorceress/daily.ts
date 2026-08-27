import { use } from "kolmafia";
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
        // PYEC (ash UTS:2323-2330, !highShiny gate -> usePyec policy). The
        // storage take is a real ronin pull — pullSequence keeps the books.
        name: "PYEC",
        ready: () => currentPolicy().usePyec && haveAnywhere(pyec),
        // Complete OR not applicable: an account with no PYEC anywhere (and a
        // tier whose policy declines it) would otherwise sit
        // incomplete-but-unavailable for the whole run.
        completed: () =>
          get("expressCardUsed", false) || !currentPolicy().usePyec || !haveAnywhere(pyec),
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
        // Terminal-less accounts report complete rather than
        // incomplete-but-unavailable (and getSkills() is never asked about a
        // terminal that isn't there).
        completed: () =>
          !SourceTerminal.have() ||
          SourceTerminal.getSkills().includes(SourceTerminal.Skills.Duplicate),
        do: () => void SourceTerminal.educate(SourceTerminal.Skills.Duplicate),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
