import { availableAmount, itemAmount, Location } from "kolmafia";
import { $item, $items, $location, get, have } from "libram";

import { haveAnywhere } from "../lib";

const saber = $item`Fourth of May Cosplay Saber`;

const diverPayoffGear = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask, aerated diving helmet, Elf Guard SCUBA tank`;

export function saberChargesLeft(): number {
  if (!haveAnywhere(saber)) return 0;
  return Math.max(0, 5 - get("_saberForceUses"));
}

export function saberAllowedAt(location: Location): boolean {
  return location !== $location`The Mer-Kin Outpost`;
}

const hatBreathers = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask, aerated diving helmet`;

function helmetPartsMissing(): boolean {
  return (
    itemAmount($item`rusty rivet`) < 8 ||
    !have($item`rusty porthole`) ||
    !have($item`rusty broken diving helmet`)
  );
}

export function diverHuntActive(): boolean {
  const scubaTank = $item`Elf Guard SCUBA tank`;
  const blocklisted = diverPayoffGear.filter((it) => it !== scubaTank);
  return helmetPartsMissing() && !blocklisted.some((it) => have(it)) && !haveAnywhere(scubaTank);
}

export function hatBreatherOwned(): boolean {
  return hatBreathers.some((it) => have(it));
}

export function rivetHuntActive(): boolean {
  return helmetPartsMissing() && !hatBreatherOwned();
}

export function prayerbeadsShort(): boolean {
  return availableAmount($item`Mer-kin prayerbeads`) < 3;
}

export function seaCowNeeded(): boolean {
  if (get("seahorseName", "") !== "") return false;
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) <
      2 || availableAmount($item`sea cowbell`) < 3
  );
}

export function forcesAfterDiver(): number {
  return saberChargesLeft() - (diverHuntActive() ? 2 : 0);
}

export function forcesAfterHealer(): number {
  return forcesAfterDiver() - (prayerbeadsShort() ? 1 : 0);
}

export function forcesAfterSeaCow(): number {
  return forcesAfterHealer() - (seaCowNeeded() ? 1 : 0);
}

export function researcherNeeded(): boolean {
  if (get("isMerkinHighPriest", false)) return false;
  return (
    (get("dreadScroll2", 0) === 0 && itemAmount($item`Mer-kin healscroll`) === 0) ||
    (get("dreadScroll5", 0) === 0 && itemAmount($item`Mer-kin killscroll`) === 0)
  );
}

export function saberForcesFree(): number {
  return forcesAfterSeaCow() - (researcherNeeded() ? 1 : 0);
}

export type ForcePurpose = "diver" | "healer" | "seaCow" | "researcher" | "free";

export function forceGranted(purpose: ForcePurpose, location?: Location): boolean {
  if (location && purpose !== "healer" && !saberAllowedAt(location)) return false;
  switch (purpose) {
    case "diver":
      return (
        rivetHuntActive() && (diverHuntActive() ? saberChargesLeft() > 0 : saberForcesFree() > 0)
      );
    case "healer":
      return prayerbeadsShort() && forcesAfterDiver() > 0;
    case "seaCow":
      return seaCowNeeded() && forcesAfterHealer() - (researcherNeeded() ? 1 : 0) > 0;
    case "researcher":
      return researcherNeeded() && forcesAfterSeaCow() > 0;
    case "free":
      return saberForcesFree() > 0;
  }
}
