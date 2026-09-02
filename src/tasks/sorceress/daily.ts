import { use } from "kolmafia";
import { $effect, $item, get, have, SourceTerminal } from "libram";

import { Quest } from "../../engine/task";
import { haveAnywhere } from "../../lib";
import { currentPolicy } from "../../resources/policy";
import { pullSequence } from "../../resources/pulls";

const pyec = $item`Platinum Yendorian Express Card`;

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
        name: "PYEC",
        ready: () =>
          currentPolicy().usePyec &&
          haveAnywhere(pyec) &&
          (have($effect`Shadow Affinity`) || get("_shadowAffinityToday", false)),
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
        name: "Terminal Educate",
        ready: () => SourceTerminal.have(),
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
