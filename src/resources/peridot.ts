import { appearanceRates, Location, Monster } from "kolmafia";
import { get, set } from "libram";

const PROPERTY = "_subaqua_peridot_target";

export function peridotTargetOffered(location: Location, monster: Monster): boolean {
  appearanceRates(location, true);
  return (appearanceRates(location, false)[monster.name] ?? 0) > 0;
}

export function setPeridotTargetId(monster: Monster | undefined): void {
  set(PROPERTY, monster ? `${monster.id}` : "");
}

export function peridotTargetId(): number | undefined {
  const raw = get(PROPERTY, "");
  return raw === "" ? undefined : Number(raw);
}
