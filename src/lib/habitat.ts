// Pure arithmetic for the two Recall Facts: Monster Habitats decisions. KoL hides the skill
// while any habitat has fights left (hasskill false in the compiled macro, 09-14 and 09-19), so
// a batch of charges that cannot be spent blocks every later recall until it drains.

export const MOM_BAR = 40;
export const HABITAT_CHARGES = 5;

/** Mom progress per Abyss or habitat-eye combat (wiki, The Caliginous Abyss): 1 base, +1 each
 *  for the shark jumper, scale-mail underwear and Jelly Combed. */
export function momProgressPerFight(speedups: {
  jumper: boolean;
  underwear: boolean;
  combed: boolean;
}): number {
  return 1 + Number(speedups.jumper) + Number(speedups.underwear) + Number(speedups.combed);
}

/**
 * The eye recall is worth casting on the coming Abyss fight. That fight scores its own
 * progress whether or not the recall fires; the recall then buys up to five free Cyberzone
 * eye fights against whatever bar is left. The lane pays when those fights outnumber the
 * turns spent opening it (a Bakery construct for the screech, when it has not landed).
 * 2026-09-19: cast at 38 (the fight filled the bar) and the five copies were paid gym kills.
 */
export function eyeRecallPays(opts: {
  progress: number;
  perFight: number;
  setupTurns: number;
  charges?: number;
}): boolean {
  const { progress, perFight, setupTurns, charges = HABITAT_CHARGES } = opts;
  const remaining = MOM_BAR - progress - perFight;
  if (remaining <= 0) return false;
  const fightsSaved = Math.floor(Math.min(remaining, charges * perFight) / perFight);
  return fightsSaved > setupTurns;
}

/**
 * The Outpost's second golem recall fires on the last golem of the first batch, so its charges
 * only count toward the lockkey gate while the gate is still a full batch away (turnsSpent is
 * read before that fight, which counts too). 2026-09-19: cast at adventure 21 of 25, one charge
 * reached the gate and four sat on the eye recall for twelve turns.
 */
export function secondGolemRecallWanted(opts: {
  turnsSpent: number;
  gate: number;
  charges?: number;
}): boolean {
  const { turnsSpent, gate, charges = HABITAT_CHARGES } = opts;
  return gate - (turnsSpent + 1) >= charges;
}
