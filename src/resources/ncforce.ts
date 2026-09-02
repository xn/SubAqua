import {
  chew,
  cliExecute,
  equip,
  haveEquipped,
  itemAmount,
  pullsRemaining,
  storageAmount,
  totalFreeRests,
  use,
  useSkill,
} from "kolmafia";
import {
  $item,
  $items,
  $skill,
  $slot,
  AprilingBandHelmet,
  CinchoDeMayo,
  get,
  have,
  Macro,
} from "libram";

import { debug, haveAnywhere } from "../lib";

import { pulledToday, pullSequence } from "./pulls";
import { CombatResource, Resource } from "./resource";

export type CombatNCForceSource = CombatResource & { do: Macro };

export const combatNCForceSources: CombatNCForceSource[] = [
  {
    name: "Spikolodon Spikes",
    available: () =>
      have($skill`Torso Awareness`) &&
      have($item`Jurassic Parka`) &&
      get("_spikolodonSpikeUses") < 5,
    remaining: () =>
      have($item`Jurassic Parka`) ? Math.max(0, 5 - get("_spikolodonSpikeUses")) : 0,
    equip: { equip: [$item`Jurassic Parka`], modes: { parka: "spikolodon" } },
    do: Macro.trySkill($skill`Launch spikolodon spikes`),
  },
  {
    name: "McHugeLarge Avalanche",
    available: () => have($item`McHugeLarge left ski`) && get("_mcHugeLargeAvalancheUses") < 3,
    remaining: () =>
      have($item`McHugeLarge left ski`) ? Math.max(0, 3 - get("_mcHugeLargeAvalancheUses")) : 0,
    equip: $item`McHugeLarge left ski`,
    do: Macro.trySkill($skill`McHugeLarge Avalanche`),
  },
];

export type NCForceSource = Resource & { force: () => void };

const reusableForcerGear = $items`McHugeLarge duffel bag, Jurassic Parka, Allied Radio Backpack`;

function pullBackedFallbackActive(): boolean {
  return !reusableForcerGear.some((it) => have(it)) && pullsRemaining() > 0;
}

export const ncForceSources: NCForceSource[] = [
  {
    name: "Apriling tuba",
    available: () => have($item`Apriling band tuba`) && get("_aprilBandTubaUses") < 3,
    remaining: () =>
      have($item`Apriling band tuba`) ? Math.max(0, 3 - get("_aprilBandTubaUses")) : 0,
    force: () => AprilingBandHelmet.play($item`Apriling band tuba`),
  },
  {
    name: "Cincho: Fiesta Exit",
    available: () => have($item`Cincho de Mayo`) && CinchoDeMayo.totalAvailableCinch() >= 60,
    remaining: () =>
      have($item`Cincho de Mayo`) ? Math.floor(CinchoDeMayo.totalAvailableCinch() / 60) : 0,
    force: () => {
      if (!haveEquipped($item`Cincho de Mayo`)) equip($slot`acc3`, $item`Cincho de Mayo`);
      while (CinchoDeMayo.currentCinch() < 60 && totalFreeRests() > get("timesRested")) {
        cliExecute("rest free");
      }
      if (CinchoDeMayo.currentCinch() >= 60) useSkill(CinchoDeMayo.skills.FiestaExit);
    },
  },
  {
    name: "Pillkeeper Sneakisol",
    available: () =>
      haveAnywhere($item`Eight Days a Week Pill Keeper`) && !get("_freePillKeeperUsed"),
    remaining: () =>
      haveAnywhere($item`Eight Days a Week Pill Keeper`) && !get("_freePillKeeperUsed") ? 1 : 0,
    force: () => cliExecute("pillkeeper free noncombat"),
  },
  {
    name: "handheld Allied radio",
    available: () => pullBackedFallbackActive() && !pulledToday($item`handheld Allied radio`),
    remaining: () =>
      pullBackedFallbackActive() && !pulledToday($item`handheld Allied radio`) ? 1 : 0,
    force: () => {
      if (
        itemAmount($item`handheld Allied radio`) > 0 ||
        pullSequence($item`handheld Allied radio`)
      ) {
        cliExecute("alliedradio misc sniper");
      }
    },
  },
  {
    name: "Clara's bell",
    available: () =>
      pullBackedFallbackActive() &&
      !get("_claraBellUsed") &&
      !pulledToday($item`Clara's bell`) &&
      (have($item`Clara's bell`) || storageAmount($item`Clara's bell`) > 0),
    remaining: () =>
      pullBackedFallbackActive() &&
      !get("_claraBellUsed") &&
      !pulledToday($item`Clara's bell`) &&
      (have($item`Clara's bell`) || storageAmount($item`Clara's bell`) > 0)
        ? 1
        : 0,
    force: () => {
      if (have($item`Clara's bell`) || pullSequence($item`Clara's bell`)) use($item`Clara's bell`);
    },
  },
  {
    name: "stench jelly",
    available: () => pullBackedFallbackActive() && !pulledToday($item`stench jelly`),
    remaining: () => (pullBackedFallbackActive() && !pulledToday($item`stench jelly`) ? 1 : 0),
    force: () => {
      if (itemAmount($item`stench jelly`) > 0 || pullSequence($item`stench jelly`)) {
        chew(1, $item`stench jelly`);
      }
    },
  },
];

export function ncForceEstimate(): number {
  let force = 2;
  if (have($item`Apriling band tuba`)) force += Math.max(0, 3 - get("_aprilBandTubaUses"));
  if (have($item`McHugeLarge left ski`)) force += Math.max(0, 3 - get("_mcHugeLargeAvalancheUses"));
  if (have($item`Cincho de Mayo`)) {
    force += Math.min(3, 1 + Math.floor(Math.max(0, totalFreeRests() - get("timesRested")) / 2));
  }
  if (have($item`Jurassic Parka`)) force += Math.max(0, 5 - get("_spikolodonSpikeUses"));
  return force;
}

export function forceNextNoncombat(): boolean {
  if (get("noncombatForcerActive")) return true;
  const source = ncForceSources.find((s) => s.available());
  if (!source) return false;
  debug(`NC force via ${source.name}`);
  source.force();
  return get("noncombatForcerActive");
}
