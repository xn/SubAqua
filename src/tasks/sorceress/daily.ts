import { $effect, get, have, SourceTerminal } from "libram";

import { Quest } from "../../engine/task";
import { pyecAvailable, usePyec } from "../../resources/pyec";

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
          pyecAvailable() && (have($effect`Shadow Affinity`) || get("_shadowAffinityToday", false)),
        completed: () => !pyecAvailable(),
        do: () => void usePyec(),
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
