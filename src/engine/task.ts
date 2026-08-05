import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  // Control safeguards
  limit: Limit;
  peridot?: Monster | (() => Monster | undefined); // Try and peridot to the given monster, if possible
  underwater?: boolean;
  freeaction?: boolean | (() => boolean);
} & BaseTask<CombatActions>;
