import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Location, Monster } from "kolmafia";

import { BackupSpec } from "../resources/backup";
import { ForcePurpose } from "../resources/saber";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  /**
   * grimoire's Limit plus `paidTurns`: abort once the task has spent that many real turns
   * (turncount deltas summed over its executions). Unlike `turns`, free fights and noncombats
   * in the zone do not count.
   */
  limit: Limit & { paidTurns?: number };
  peridot?: Monster | (() => Monster | undefined);
  /**
   * The zone a function-`do` task adventures in. The engine keys the Peridot, the free-kill
   * and banish ladders and the underwater check off the task's Location; a `do` that has to
   * be a function (the Abyss throws its waffle by hand) names its zone here instead.
   */
  location?: Location;
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
