import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { BackupSpec } from "../resources/backup";
import { ForcePurpose } from "../resources/saber";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  limit: Limit;
  peridot?: Monster | (() => Monster | undefined);
  backup?: BackupSpec | (() => BackupSpec | undefined);
  underwater?: boolean;
  freeaction?: boolean | (() => boolean);
  saberPurpose?: ForcePurpose;
  freeRunBanishes?: boolean | (() => boolean);
  batWings?: boolean;
  /** Set false to keep the bang-potion identification throws off this task's fights. */
  bangPotions?: boolean;
  /**
   * Monsters worth a Club 'Em Across the Battlefield table roll, best first. When set and the
   * club has uses left, the engine wears the club and clubs after the free kills fail.
   */
  clubTarget?: Monster | Monster[] | (() => Monster | Monster[] | undefined);
} & BaseTask<CombatActions>;
