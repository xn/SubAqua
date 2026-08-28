import { Monster, toMonster } from "kolmafia";
import { $item, $monster, $monsters, $skill, get, have, Macro } from "libram";

import { currentPolicy } from "./policy";

export const backupCamera = $item`backup camera`;
const backUp = $skill`Back-Up to your Last Enemy`;

/**
 * Backup-camera copies (Back-Up to your Last Enemy, 11/day): the fight you
 * are in becomes a copy of `lastCopyableMonster`, and a backed-up fight
 * refunds its adventure ("This combat did not cost a turn"). The ash wears
 * the camera and backs up wherever the last copyable is worth a free fight:
 *  - free monsters anywhere the camera is worn (CCS:969-971 school,
 *    1041-1044 library): a free fight for the drops/familiar, turn refunded;
 *  - Black Crayon Golem / Mer-kin healer at the Outpost during the lockkey
 *    hunt, cap 7 (CCS:684-708);
 *  - eye in the darkness / slithering thing on the first corral turn — Mom
 *    progress without an Abyss turn (UTS:1659-1662, CCS:754-763).
 * Phase 4 had dropped this as a "combat-optimizer layer"; user directive
 * 2026-08-28 (parity with UnderTheSea): the 08-26 baseline spends 11
 * backups a day and the audits price them at ~6 Abyss turns plus ~7 free
 * healer copies.
 */
export type BackupSpec = { targets: Monster[] | "free"; cap?: number };

/** ash free_monster() (Globals): copies of these are free fights. */
export const freeMonsters = $monsters`Black Crayon Golem, Black Crayon Beetle, Black Crayon Man, Black Crayon Goblin, Black Crayon Undead Thing, Black Crayon Slime, time cop, sausage goblin, kid who is too old to be Trick-or-Treating, suburban security civilian, vandal kid`;

export function backupUsesLeft(cap = 11): number {
  return have(backupCamera) ? Math.max(0, cap - get("_backUpUses", 0)) : 0;
}

export function lastCopyableMonster(): Monster | undefined {
  const name = get("lastCopyableMonster", "");
  if (name === "") return undefined;
  const monster = toMonster(name);
  return monster === $monster.none ? undefined : monster;
}

/** The monster a backup on this task would produce, or undefined when no
 * backup should be armed (policy, uses, or the last copyable isn't wanted). */
export function backupTarget(spec: BackupSpec): Monster | undefined {
  if (!currentPolicy().useBackupCamera) return undefined;
  if (backupUsesLeft(spec.cap ?? 11) === 0) return undefined;
  const last = lastCopyableMonster();
  if (!last) return undefined;
  const targets = spec.targets === "free" ? freeMonsters : spec.targets;
  return targets.includes(last) ? last : undefined;
}

/** Round-1 step: back up unless the fight already IS the target. */
export function backupMacro(target: Monster): Macro {
  return Macro.ifNot(target, Macro.trySkill(backUp));
}
