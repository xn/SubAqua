import {
  booleanModifier,
  Effect,
  getClanLounge,
  itemAmount,
  moodList,
  mpCost,
  myClass,
  myEffects,
  myLevel,
  myMaxmp,
  myMp,
  numericModifier,
  print,
  restoreMp,
  toEffect,
  toSkill,
} from "kolmafia";
import {
  $class,
  $effect,
  $effects,
  $item,
  $skill,
  AprilingBandHelmet,
  CinchoDeMayo,
  ensureEffect,
  EnsureError,
  get,
  getSongLimit,
  have,
  isSong,
  uneffect,
} from "libram";

import { bczAffordable } from "../resources/freekill";

import { currentTier } from "./tier";

let loungeCache: { [item: string]: number } | undefined;
function loungeHas(name: string): boolean {
  loungeCache ??= getClanLounge();
  return name in loungeCache;
}

const photoBooth = $item`photo booth sized crate`;
function photoBoothReady(): boolean {
  return loungeHas(photoBooth.name) && get("_photoBoothEffects", 0) < 3;
}

const swimmingPool = $item`Olympic-sized Clan crate`;

function maxSongs(): number {
  return getSongLimit();
}

function hoboSongCastable(): boolean {
  return myClass() === $class`Accordion Thief` && myLevel() >= 15;
}

export function trimSongs(effects: Effect[]): Effect[] {
  const cap = maxSongs();
  const total = effects.filter((effect) => isSong(effect)).length;
  let dropsLeft = total - cap;
  if (dropsLeft <= 0) return effects;
  return effects.filter((effect) => {
    if (!isSong(effect) || dropsLeft <= 0) return true;
    dropsLeft -= 1;
    return false;
  });
}

function activeSongs(): Effect[] {
  return Object.keys(myEffects())
    .map((name) => toEffect(name))
    .filter((effect) => isSong(effect));
}

export function shrugForSongs(wanted: Effect[]): void {
  const wantedSongs = wanted.filter((effect) => isSong(effect));
  if (wantedSongs.length === 0) return;
  const cap = maxSongs();
  const extra = activeSongs().filter((effect) => !wantedSongs.includes(effect));
  while (wantedSongs.length + extra.length > cap) {
    const toRemove = extra.pop();
    if (toRemove === undefined) break;
    uneffect(toRemove);
  }
}

export function combineMoods(...groups: Effect[][]): Effect[] {
  return trimSongs([...new Set(groups.flat())]);
}

export function rawSneakEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`The Sonata of Sneakiness`)) effects.push($effect`The Sonata of Sneakiness`);
  if (itemAmount($item`ultra-soft ferns`) > 0) effects.push($effect`Ultra-Soft Steps`);
  if (photoBoothReady()) effects.push($effect`Wild and Westy!`);
  if (have($skill`Hide From Seekers`)) effects.push($effect`Hiding From Seekers`);
  if (itemAmount($item`Life Goals Pamphlet`) > 0) effects.push($effect`Life Goals`);
  if (have($skill`Smooth Movement`)) effects.push($effect`Smooth Movements`);
  if (AprilingBandHelmet.have() && AprilingBandHelmet.canChangeSong()) {
    effects.push($effect`Apriling Band Patrol Beat`);
  }
  if (loungeHas(swimmingPool.name) && !get("_olympicSwimmingPool")) {
    effects.push($effect`Silent Running`);
  }
  if (have($skill`Feel Lonely`) && get("_feelLonelyUsed") < 3)
    effects.push($effect`Feeling Lonely`);
  return effects;
}

export function sneakEffects(): Effect[] {
  return trimSongs(rawSneakEffects());
}

export function itemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`The Polka of Plenty`)) effects.push($effect`Polka of Plenty`);
  if (have($skill`Who's Going to Pay This Drunken Sailor?`))
    effects.push($effect`Who's Going to Pay This Drunken Sailor?`);
  if (have($skill`Fat Leon's Phat Loot Lyric`)) effects.push($effect`Fat Leon's Phat Loot Lyric`);
  if (have($skill`Sauce Contemplation`)) effects.push($effect`Lubricating Sauce`);
  if (have($skill`Singer's Faithful Ocelot`)) effects.push($effect`Singer's Faithful Ocelot`);
  if (have($skill`Leash of Linguini`)) effects.push($effect`Leash of Linguini`);
  if (have($skill`Empathy of the Newt`)) effects.push($effect`Empathy`);
  if (have($skill`Donho's Bubbly Ballad`)) effects.push($effect`Donho's Bubbly Ballad`);
  if (
    have($skill`The Ballad of Richie Thingfinder`) &&
    hoboSongCastable() &&
    get("_thingfinderCasts", 0) < 10
  ) {
    effects.push($effect`The Ballad of Richie Thingfinder`);
  }
  return trimSongs(effects);
}

export function superItemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (
    CinchoDeMayo.have() &&
    have($skill`Cincho: Party Soundtrack`) &&
    CinchoDeMayo.currentCinch() >= 25
  ) {
    effects.push($effect`Party Soundtrack`);
  }
  if (have($skill`Heartstone: %pals`) && get("_heartstonePalsUsed", 0) < 5)
    effects.push($effect`Best Pals`);
  return trimSongs(effects);
}

export function squintEffects(): Effect[] {
  if (!have($skill`Steely-Eyed Squint`) || get("_steelyEyedSquintUsed")) return [];
  return [$effect`Steely-Eyed Squint`];
}

export function exceedsMaxMp(effect: Effect): boolean {
  const skill = toSkill(effect);
  return skill !== $skill.none && mpCost(skill) > myMaxmp();
}

export function resolveWantedEffects(effects: Effect[]): {
  wanted: Effect[];
  skipLines: string[];
} {
  const skipLines: string[] = [];
  const affordable = effects.filter((effect) => {
    if (!exceedsMaxMp(effect)) return true;
    skipLines.push(`skipped ${effect}: needs ${mpCost(toSkill(effect))} MP, max is ${myMaxmp()}`);
    return false;
  });
  const wanted = trimSongs(affordable);
  if (wanted.length !== affordable.length) {
    const cap = maxSongs();
    const wantedSongCount = affordable.filter((effect) => isSong(effect)).length;
    for (const effect of affordable) {
      if (!wanted.includes(effect)) {
        skipLines.push(`skipped ${effect}: song cap (${wantedSongCount}/${cap})`);
      }
    }
  }
  return { wanted, skipLines };
}

export function isEnsureError(e: unknown): e is Error {
  if (e instanceof EnsureError) return true;
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "Ensure Error";
}

export function effectFailureContext(effect: Effect): string {
  const skill = toSkill(effect);
  const cap = maxSongs();
  const activeCount = activeSongs().length;
  const cost = skill === $skill.none ? 0 : mpCost(skill);
  const skillState = skill === $skill.none ? "n/a" : have(skill) ? "known" : "unknown";
  return `songs ${activeCount}/${cap}, MP ${myMp()}/${cost}, skill ${skillState}`;
}

export function applyEffects(effects: Effect[], context?: string): void {
  reserveMpFor(effects);
  const { wanted, skipLines } = resolveWantedEffects(effects);
  if (effects.length > 0) {
    print(
      `Effects${context ? ` (${context})` : ""}: ${wanted.length > 0 ? wanted.map((effect) => `${effect}`).join(", ") : "(none)"}`,
      "blue",
    );
    for (const line of skipLines) print(line, "yellow");
  }
  shrugForSongs(wanted);
  for (const effect of wanted) {
    const skill = toSkill(effect);
    if (!have(effect) && skill !== $skill.none && myMp() < mpCost(skill)) {
      print(`skipped ${effect}: needs ${mpCost(skill)} MP, have ${myMp()}`, "yellow");
      continue;
    }
    try {
      ensureEffect(effect);
    } catch (e) {
      if (!isEnsureError(e)) throw e;
      print(`failed ${effect}: ${e} (${effectFailureContext(effect)})`, "yellow");
    }
  }
}

export function moodMpCost(effects: Effect[]): number {
  return effects.reduce((sum, effect) => {
    if (have(effect)) return sum;
    const skill = toSkill(effect);
    return sum + (skill === $skill.none ? 0 : mpCost(skill));
  }, 0);
}

export function reserveMpFor(effects: Effect[]): void {
  if (effects.length === 0) return;
  const nuke = have($skill`Saucegeyser`) ? mpCost($skill`Saucegeyser`) : 0;
  const target = Math.min(myMaxmp(), moodMpCost(effects) + nuke);
  if (myMp() < target) restoreMp(target);
}

export function combatEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Carlweather's Cantata of Confrontation`))
    effects.push($effect`Carlweather's Cantata of Confrontation`);
  if (have($skill`Aug. 6th: Fresh Breath Day!`) && !get("_aug6Cast"))
    effects.push($effect`Fresh Breath`);
  if (have($skill`Musk of the Moose`)) effects.push($effect`Musk of the Moose`);
  if (itemAmount($item`crunchy brush`) > 0) effects.push($effect`Crunchy Steps`);
  if (AprilingBandHelmet.have() && AprilingBandHelmet.canChangeSong()) {
    effects.push($effect`Apriling Band Battle Cadence`);
  }
  if (get("yogUrtDefeated") && photoBoothReady()) effects.push($effect`Towering Muscles`);
  if (have($skill`Attract Snakes`)) effects.push($effect`Attracting Snakes`);
  if (
    have($skill`BCZ: Blood Bath`) &&
    currentTier() !== "low" &&
    bczAffordable($skill`BCZ: Blood Bath`, 150)
  ) {
    effects.push($effect`Bloodbathed`);
  }
  return trimSongs(effects);
}

export function resEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Astral Shell`)) effects.push($effect`Astral Shell`);
  if (itemAmount($item`scroll of minor invulnerability`) > 0)
    effects.push($effect`Minor Invulnerability`);
  if (have($skill`Elemental Saucesphere`)) effects.push($effect`Elemental Saucesphere`);
  if (have($skill`Scarysauce`)) effects.push($effect`Scarysauce`);
  return trimSongs(effects);
}

export function dealsPassiveDamage(effect: Effect): boolean {
  return (
    numericModifier(effect, "Thorns") > 0 ||
    numericModifier(effect, "Sporadic Thorns") > 0 ||
    numericModifier(effect, "Damage Aura") > 0 ||
    numericModifier(effect, "Sporadic Damage Aura") > 0
  );
}

export function survivalEffects(opts: { damageFree?: boolean } = {}): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Ghostly Shell`)) effects.push($effect`Ghostly Shell`);
  if (have($skill`Astral Shell`)) effects.push($effect`Astral Shell`);
  if (have($skill`Elemental Saucesphere`)) effects.push($effect`Elemental Saucesphere`);
  if (have($skill`Tenacity of the Snapper`)) effects.push($effect`Tenacity of the Snapper`);
  return trimSongs(
    opts.damageFree ? effects.filter((effect) => !dealsPassiveDamage(effect)) : effects,
  );
}

export function colosseumEffects(): Effect[] {
  const effects: Effect[] = [];
  if (
    have($skill`Heartstone: %buff`) &&
    get("heartstoneBuffUnlocked", false) &&
    get("_heartstoneBuffUsed", 0) < 5
  ) {
    effects.push($effect`Ultraheart`);
  }
  if (have($skill`Carol of the Hells`)) effects.push($effect`Carol of the Hells`);
  if (have($skill`Elron's Explosive Etude`) && hoboSongCastable() && get("_elronsCasts", 0) < 10) {
    effects.push($effect`Elron's Explosive Etude`);
  }
  if (have($skill`Get Big`)) effects.push($effect`Big`);
  if (have($skill`The Magical Mojomuscular Melody`))
    effects.push($effect`The Magical Mojomuscular Melody`);
  return trimSongs(effects);
}

export const routeDamageEffects = $effects`Scarysauce, Scariersauce`;

function activeBadEffects(): Effect[] {
  return Object.keys(myEffects())
    .map((name) => toEffect(name))
    .filter(
      (effect) =>
        dealsPassiveDamage(effect) ||
        booleanModifier(effect, "Alters Page Text") ||
        booleanModifier(effect, "Adventure Randomly") ||
        booleanModifier(effect, "Blind") ||
        booleanModifier(effect, "Always Fumble"),
    );
}

const alwaysShruggable = [
  873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 1003, 1492, 1515, 2128, 2129, 2131, 2132, 2133,
  2134, 2135, 2147, 2600, 2601, 2602,
];

function shruggable(effect: Effect): boolean {
  if (effect.attributes.includes("noremove")) return false;
  if (alwaysShruggable.includes(effect.id)) return true;
  if (isSong(effect)) return true;
  const skill = toSkill(effect);
  if (skill === $skill.none || !skill.buff) return false;
  return toEffect(skill) === effect;
}

let moodCache: string[] | undefined;
function myMoodList(): string[] {
  return (moodCache ??= moodList());
}

export function moodWouldSpend(effect: Effect): boolean {
  const prefix = `gain_effect | ${effect.name} | `;
  return myMoodList().some((line) => {
    if (!line.startsWith(prefix)) return false;
    const action = line.slice(prefix.length).trim().toLowerCase();
    return !["uneffect", "shrug", "remedy"].some((verb) => action.startsWith(verb));
  });
}

export function shrugBadEffects(...exclude: Effect[]): Effect[] {
  const left: Effect[] = [];
  for (const effect of activeBadEffects()) {
    if (exclude.includes(effect)) continue;
    if (!shruggable(effect) || moodWouldSpend(effect)) {
      left.push(effect);
      continue;
    }
    uneffect(effect);
    if (have(effect)) left.push(effect);
  }
  return left;
}
