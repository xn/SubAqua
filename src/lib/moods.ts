import { Effect, getClanLounge, itemAmount } from "kolmafia";
import {
  $effect,
  $item,
  $skill,
  AprilingBandHelmet,
  CinchoDeMayo,
  get,
  have,
  isSong,
} from "libram";

import { currentTier } from "./tier";

/**
 * Ports the ash mood() regimes (UnderTheSeaGlobals.ash mood(), UTS:67-170 at
 * HEAD) as castable-effect lists for grimoire's task.effects (the engine
 * acquireEffects each via ensureEffect, engine.js:162-181).
 *
 * Only effects whose source the account owns are returned — libram's
 * ensureEffect THROWS when the cli default fails to land the effect
 * (lib.js:563-572), where the ash's bare cli_execute(ef.default) fails
 * silently. So every entry carries the ash's own gate (skill known / item
 * owned / IOTM present / daily-limit pref), and a handful of ash entries whose
 * success is genuinely not predictable are dropped with a note rather than
 * risking an abort mid-run.
 */

/** getClanLounge() costs a clan_viplounge.php load, so read it once. An empty
 * map (no VIP key, no clan) simply gates every lounge effect off. */
let loungeCache: { [item: string]: number } | undefined;
function loungeHas(name: string): boolean {
  loungeCache ??= getClanLounge();
  return name in loungeCache;
}

/** The Clan VIP photo booth ("photobooth effect …" defaults); its three daily
 * grants are deterministic once the booth is in the lounge. */
const photoBooth = $item`photo booth sized crate`;
function photoBoothReady(): boolean {
  return loungeHas(photoBooth.name) && get("_photoBoothEffects", 0) < 3;
}

/** The Clan VIP Olympic-sized swimming pool ("swim sprints"). */
const swimmingPool = $item`Olympic-sized Clan crate`;

/** grimoire throws "Too many AT songs" when a task's effects list carries more
 * songs than the shrine allows (engine.js:165-168, maxSongs()). The ash never
 * hits this because cli_execute just shoves the oldest song out; here the list
 * has to be trimmed, keeping the ash's own priority order. */
function maxSongs(): number {
  return have($skill`Mariachi Memory`) ? 4 : 3;
}
function trimSongs(effects: Effect[]): Effect[] {
  let songs = 0;
  return effects.filter((effect) => !isSong(effect) || ++songs <= maxSongs());
}

/** Concatenate mood regimes for a task that wants several (the ash calls
 * mood() twice in a row at such sites, e.g. UTS:1746-1747, 2698-2699).
 * De-duplicates and re-applies the song cap across the union. */
export function combineMoods(...groups: Effect[][]): Effect[] {
  return trimSongs([...new Set(groups.flat())]);
}

/** "-combat" mood (ash mood():99-114). */
export function sneakEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`The Sonata of Sneakiness`)) effects.push($effect`The Sonata of Sneakiness`);
  if (itemAmount($item`ultra-soft ferns`) > 0) effects.push($effect`Ultra-Soft Steps`);
  if (photoBoothReady()) effects.push($effect`Wild and Westy!`);
  if (have($skill`Hide From Seekers`)) effects.push($effect`Hiding From Seekers`);
  if (itemAmount($item`Life Goals Pamphlet`) > 0) effects.push($effect`Life Goals`);
  if (have($skill`Smooth Movement`)) effects.push($effect`Smooth Movements`);
  // The ash gates on the helmet plus nextAprilBandTurn; canChangeSong() is
  // libram's spelling of exactly that pair.
  if (AprilingBandHelmet.have() && AprilingBandHelmet.canChangeSong()) {
    effects.push($effect`Apriling Band Patrol Beat`);
  }
  if (loungeHas(swimmingPool.name) && !get("_olympicSwimmingPool")) {
    effects.push($effect`Silent Running`);
  }
  if (have($skill`Feel Lonely`) && get("_feelLonelyUsed") < 3)
    effects.push($effect`Feeling Lonely`);
  return trimSongs(effects);
}

/**
 * "itdrop" mood (ash mood():76-97), in the ash's own order.
 *
 * Two ash entries are deliberately absent:
 *  - Thoughtful Empathy. Its default is "cast 1 Empathy of the Newt ^
 *    Thoughtful Empathy" — the SAME cast that grants plain Empathy (already in
 *    this list), and which of the two lands is account state, not a choice.
 *    ensureEffect would throw whenever the cast produced the other one.
 *  - The Source Terminal enhance and the Kremlin's Greatest Briefcase tab buff
 *    that the ash tops up alongside the list (sourceEnhance()/briefcase(),
 *    mood():88-95). Neither is an effect a mood list can express; the
 *    briefcase is unowned on this account besides.
 */
export function itemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Who's Going to Pay This Drunken Sailor?`))
    effects.push($effect`Who's Going to Pay This Drunken Sailor?`);
  if (have($skill`Fat Leon's Phat Loot Lyric`)) effects.push($effect`Fat Leon's Phat Loot Lyric`);
  // Lubricating Sauce is cast by Sauce Contemplation, not by a same-named skill
  // (statuseffects.txt:2989), so to_skill() is none in the ash and the ash's
  // have_skill gate never fires — the real requirement is the caster skill.
  if (have($skill`Sauce Contemplation`)) effects.push($effect`Lubricating Sauce`);
  if (have($skill`Singer's Faithful Ocelot`)) effects.push($effect`Singer's Faithful Ocelot`);
  if (have($skill`Leash of Linguini`)) effects.push($effect`Leash of Linguini`);
  if (have($skill`Empathy of the Newt`)) effects.push($effect`Empathy`);
  if (have($skill`Donho's Bubbly Ballad`)) effects.push($effect`Donho's Bubbly Ballad`);
  if (have($skill`The Ballad of Richie Thingfinder`))
    effects.push($effect`The Ballad of Richie Thingfinder`);
  // Not an ash itdrop entry (it is +meat, not +item) but long-standing local
  // behavior; kept last so the song cap sheds it before any ash song.
  if (have($skill`The Polka of Plenty`)) effects.push($effect`Polka of Plenty`);
  return trimSongs(effects);
}

/**
 * "superitdrop" mood (ash mood():71-75). The ash's switch case FALLS THROUGH
 * into "itdrop", so callers get both — use combineMoods(superItemDropEffects(),
 * itemDropEffects()) at the ash's mood("superitdrop") sites.
 *
 * Hustlin' is deliberately absent: its default is "pool 3", one stylish game at
 * the clan pool table, and the effect only lands on a WIN. ensureEffect throws
 * on a loss, so the ash's optimism is not portable here.
 *
 * NOTE Steely-Eyed Squint doubles the item bonus in force when it is cast, and
 * grimoire acquires a task's effects BEFORE it dresses the outfit
 * (engine.js:95 vs :98-101) — so here it squints the bare-gear bonus. The ash
 * casts it after tempEquipment at UTS:1402/1433 and before it at UTS:1651.
 * Moving it into those tasks' `prepare` (which runs after dress()) would
 * recover the difference; left as-is to keep the port a list-for-list one.
 */
export function superItemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Steely-Eyed Squint`) && !get("_steelyEyedSquintUsed"))
    effects.push($effect`Steely-Eyed Squint`);
  if (
    CinchoDeMayo.have() &&
    have($skill`Cincho: Party Soundtrack`) &&
    CinchoDeMayo.currentCinch() >= 25
  ) {
    effects.push($effect`Party Soundtrack`);
  }
  if (have($skill`Heartstone: %pals`)) effects.push($effect`Best Pals`);
  return trimSongs(effects);
}

/** "combat" mood (ash mood():116-134). */
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
  // The ash holds the photo booth's grants back until Yog-Urt is down — before
  // that the three-a-day budget belongs to her prep (mood():124-126).
  if (get("yogUrtDefeated") && photoBoothReady()) effects.push($effect`Towering Muscles`);
  if (have($skill`Attract Snakes`)) effects.push($effect`Attracting Snakes`);
  // BCZ: Blood Bath is an equipment-granted skill, so have() is already an
  // "is it castable right now" test. Skipped at low shiny per the ash.
  if (have($skill`BCZ: Blood Bath`) && currentTier() !== "low") effects.push($effect`Bloodbathed`);
  return trimSongs(effects);
}

/**
 * Elemental-resistance mood for the pearl/res zones (ash mood():136-153): the
 * generic multi-element buffs; per-element gear comes from the task maximizer
 * string. Scarysauce sits in the ash's sleaze/cold branch only, but it is
 * resistance either way and this repo has one shared res mood.
 */
export function resEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Astral Shell`)) effects.push($effect`Astral Shell`);
  if (itemAmount($item`scroll of minor invulnerability`) > 0)
    effects.push($effect`Minor Invulnerability`);
  if (have($skill`Elemental Saucesphere`)) effects.push($effect`Elemental Saucesphere`);
  if (have($skill`Scarysauce`)) effects.push($effect`Scarysauce`);
  return trimSongs(effects);
}
