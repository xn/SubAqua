import { Monster } from "kolmafia";
import { $skill, get, have, Macro } from "libram";

const feelNostalgic = $skill`Feel Nostalgic`;

// Feel Nostalgic (Emotionally Chipped, 3/day) appends the last copyable monster's drop table to
// the current fight. mafia's lastCopyableMonster only updates on a completed kill or banish
// (FightRequest.java:3521): Use the Force and runaways leave it alone, and a Back-Up fight ends
// as the copied monster. The cast pays only on a win and does nothing on the anchor itself.

export function nostalgiaCastsLeft(): number {
  return have(feelNostalgic) ? Math.max(0, 3 - get("_feelNostalgicUsed", 0)) : 0;
}

export function nostalgiaAnchor(): Monster | undefined {
  return get("lastCopyableMonster") ?? undefined;
}

/**
 * Cast Feel Nostalgic on this fight when `anchor` is the last copyable monster and its table is
 * still wanted. Empty when the skill is unknown, spent, or the anchor does not match.
 */
export function nostalgiaMacro(anchor: Monster, wanted: () => boolean): Macro {
  if (nostalgiaCastsLeft() === 0 || nostalgiaAnchor() !== anchor || !wanted()) return new Macro();
  return Macro.ifNot(anchor, Macro.trySkill(feelNostalgic));
}
