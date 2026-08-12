import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { ForcePurpose } from "../resources/saber";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  // Control safeguards
  limit: Limit;
  peridot?: Monster | (() => Monster | undefined); // Peridot of Peril target, if possible
  underwater?: boolean; // force breathing enforcement for function-`do` tasks
  freeaction?: boolean | (() => boolean);
  /** Which saber-Force reservation a forceItems action draws from (default
   * "free"). "diver"/"healer" also flip the resolution to saber-before-ray —
   * their Forces guarantee specific quest drops (iotm.ash:185-199, 247-261). */
  saberPurpose?: ForcePurpose;
} & BaseTask<CombatActions>;
