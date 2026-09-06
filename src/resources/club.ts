import { haveEquipped, Monster } from "kolmafia";
import { $item, $skill, get, have, Macro, set } from "libram";

export const legendaryClub = $item`legendary seal-clubbing club`;
const battlefield = $skill`Club 'Em Across the Battlefield`;
const PROPERTY = "_subaqua_club_targets";

// Club 'Em Across the Battlefield (legendary seal-clubbing club, 5/day) is a turn-taking
// insta-kill that chains into choice 1589, "Clubbed 'Em Into...": pick another non-boss monster
// native to the zone and its drops roll with the current +item. It sits after the free kills and
// before the plain kill: the turn is paid either way, so it may as well pay a second table.
// choice.ts reads the target list this module records (first listed monster that is not the one
// just clubbed wins).

export function battlefieldUsesLeft(): number {
  return have(legendaryClub) ? Math.max(0, 5 - get("_clubEmBattlefieldUsed", 0)) : 0;
}

export function battlefieldReady(): boolean {
  return battlefieldUsesLeft() > 0 && haveEquipped(legendaryClub);
}

export function battlefieldMacro(): Macro {
  return Macro.trySkill(battlefield);
}

export function setClubTargets(monsters: Monster[]): void {
  set(PROPERTY, monsters.map((monster) => monster.name).join("|"));
}

export function clubTargetNames(): string[] {
  const raw = get(PROPERTY, "");
  return raw === "" ? [] : raw.split("|");
}
