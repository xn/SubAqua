import { Monster } from "kolmafia";
import { $item, $monsters, $skill, get, have, Macro } from "libram";

import { currentPolicy } from "./policy";

export const backupCamera = $item`backup camera`;
const backUp = $skill`Back-Up to your Last Enemy`;

export type BackupSpec = { targets: Monster[] | "free"; cap?: number; allowPaid?: boolean };

export const freeMonsters = $monsters`Black Crayon Golem, Black Crayon Beetle, Black Crayon Man, Black Crayon Goblin, Black Crayon Undead Thing, Black Crayon Slime, time cop, sausage goblin, kid who is too old to be Trick-or-Treating, suburban security civilian, vandal kid`;

export function backupUsesLeft(cap = 11): number {
  return have(backupCamera) ? Math.max(0, cap - get("_backUpUses", 0)) : 0;
}

export function lastCopyableMonster(): Monster | undefined {
  return get("lastCopyableMonster") ?? undefined;
}

export function backupTarget(spec: BackupSpec): Monster | undefined {
  if (!currentPolicy().useBackupCamera) return undefined;
  if (backupUsesLeft(spec.cap ?? 11) === 0) return undefined;
  const last = lastCopyableMonster();
  if (!last) return undefined;
  const targets = spec.targets === "free" ? freeMonsters : spec.targets;
  if (!targets.includes(last)) return undefined;
  if (!freeMonsters.includes(last) && !spec.allowPaid) return undefined;
  return last;
}

export function backupMacro(target: Monster): Macro {
  return Macro.ifNot(target, Macro.trySkill(backUp));
}
