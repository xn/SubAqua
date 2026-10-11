// Back-Up to your Last Enemy copies whatever mafia recorded as lastCopyableMonster; a farm
// that backs its draws up into free copies (the Library) only works while that record is a
// free monster. Sea *dent: Talk to Some Fish rewrites it to "some fish" (2026-10-05 school
// :6768), which killed the Library's five free copies that every earlier run had.

/** Fewest Back-Ups left for which a summon charge (locket, mimic egg) is worth re-seeding. */
export const BACKUP_SEED_MIN = 3;

export function backupSeedWanted(state: {
  lastCopyableFree: boolean;
  backupsLeft: number;
}): boolean {
  return !state.lastCopyableFree && state.backupsLeft >= BACKUP_SEED_MIN;
}
