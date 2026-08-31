import { Monster } from "kolmafia";
import { $item, $monsters, $skill, get, have, Macro } from "libram";

import { currentPolicy } from "./policy";

export const backupCamera = $item`backup camera`;
const backUp = $skill`Back-Up to your Last Enemy`;

/**
 * Backup-camera copies (Back-Up to your Last Enemy, 11/day): the fight you
 * are in becomes a copy of `lastCopyableMonster`. The copy is only free when
 * the copied monster is itself a free fight (ash free_monster()); a copy of
 * an ordinary monster costs the turn like any fight — live 2026-08-30 the
 * corral backup paid its turn (Y:4767, next marker [19]) and five Outpost
 * healer copies each burned a free-kill charge (A F1). The ash backs up
 * only INTO free targets:
 *  - free monsters anywhere the camera is worn (CCS:969-971 school,
 *    1041-1044 library): a free fight for the drops/familiar;
 *  - Black Crayon Golem at the Outpost during the lockkey hunt, cap 7
 *    (CCS:684-690);
 * plus one deliberate paid-copy exception — eye in the darkness / slithering
 * thing on the first corral turn (UTS:1659-1662, CCS:754-763), where the
 * turn is bought back by the free kill the opener macro lands on the copy.
 * Tasks opt into that trade with `allowPaid`; without it, backupTarget()
 * refuses any non-free copy.
 * Phase 4 had dropped this as a "combat-optimizer layer"; user directive
 * 2026-08-28 (parity with UnderTheSea): the 08-26 baseline spends 11
 * backups a day.
 */
export type BackupSpec = { targets: Monster[] | "free"; cap?: number; allowPaid?: boolean };

/** ash free_monster() (Globals): copies of these are free fights. */
export const freeMonsters = $monsters`Black Crayon Golem, Black Crayon Beetle, Black Crayon Man, Black Crayon Goblin, Black Crayon Undead Thing, Black Crayon Slime, time cop, sausage goblin, kid who is too old to be Trick-or-Treating, suburban security civilian, vandal kid`;

export function backupUsesLeft(cap = 11): number {
  return have(backupCamera) ? Math.max(0, cap - get("_backUpUses", 0)) : 0;
}

export function lastCopyableMonster(): Monster | undefined {
  // libram types this pref as a Monster: get() already returns Monster | null
  // ("" and $monster.none both map to null). Passing that Monster back through
  // toMonster() hit the JS bridge as to_monster(monster), which doesn't exist.
  return get("lastCopyableMonster") ?? undefined;
}

/** The monster a backup on this task would produce, or undefined when no
 * backup should be armed (policy, uses, or the last copyable isn't wanted). */
export function backupTarget(spec: BackupSpec): Monster | undefined {
  if (!currentPolicy().useBackupCamera) return undefined;
  if (backupUsesLeft(spec.cap ?? 11) === 0) return undefined;
  const last = lastCopyableMonster();
  if (!last) return undefined;
  const targets = spec.targets === "free" ? freeMonsters : spec.targets;
  if (!targets.includes(last)) return undefined;
  // A copy of a non-free monster costs its turn (doc above). Only a task
  // that explicitly buys that turn back (corral opener: free kill on the
  // copy) may arm one — A F1's "never arm a backup when lastCopyableMonster
  // is not in freeMonsters unless the task explicitly wants a paid copy".
  if (!freeMonsters.includes(last) && !spec.allowPaid) return undefined;
  return last;
}

/** Round-1 step: back up unless the fight already IS the target. */
export function backupMacro(target: Monster): Macro {
  return Macro.ifNot(target, Macro.trySkill(backUp));
}
