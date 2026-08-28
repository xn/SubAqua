import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { BackupSpec } from "../resources/backup";
import { ForcePurpose } from "../resources/saber";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  // Control safeguards
  limit: Limit;
  peridot?: Monster | (() => Monster | undefined); // Peridot of Peril target, if possible
  /** Backup-camera copy wanted on this task's fights (resources/backup.ts). */
  backup?: BackupSpec | (() => BackupSpec | undefined);
  underwater?: boolean; // force breathing enforcement for function-`do` tasks
  freeaction?: boolean | (() => boolean);
  /** Which saber-Force reservation a forceItems action draws from (default
   * "free"). "diver"/"healer" also flip the resolution to saber-before-ray —
   * their Forces guarantee specific quest drops (iotm.ash:185-199, 247-261). */
  saberPurpose?: ForcePurpose;
  /** freeRun may spend BANISHING rungs (Spring Kick, curveball, latte, Feel
   * Hatred, Snokebomb, thrown banishes) — the ash's `free_run(page_text, true)`
   * sites: pearl zones, the Wreck, the outpost's non-droppers. Default false
   * = plain runs only (the guild tests, ash CCS:505-521). */
  freeRunBanishes?: boolean;
} & BaseTask<CombatActions>;
