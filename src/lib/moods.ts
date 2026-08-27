import {
  booleanModifier,
  Effect,
  getClanLounge,
  itemAmount,
  moodList,
  myEffects,
  numericModifier,
  toEffect,
  toSkill,
} from "kolmafia";
import {
  $effect,
  $effects,
  $item,
  $skill,
  AprilingBandHelmet,
  CinchoDeMayo,
  ensureEffect,
  get,
  have,
  isSong,
  uneffect,
} from "libram";

import { bczAffordable } from "../resources/freekill";

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

/**
 * grimoire THROWS "Too many AT songs" when a task's effects list carries more
 * songs than the shrine allows (engine.js:165-168, maxSongs()); the ash never
 * hits it because cli_execute just shoves a song out. Trim to the cap the same
 * way the ash's casts settle: it casts each mood in order and every cast past
 * the cap evicts the OLDEST song, so the songs that survive are the LAST ones
 * listed. Keeping the first N instead would invert the ash at every site that
 * runs mood("combat") before mood("itdrop") (UTS:2698-2699), evicting the
 * +item songs off an +item grind to keep Cantata.
 */
function maxSongs(): number {
  return have($skill`Mariachi Memory`) ? 4 : 3;
}
function trimSongs(effects: Effect[]): Effect[] {
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
  // Not an ash itdrop entry (it is +meat, not +item) but long-standing local
  // behavior; listed FIRST so the keep-last song trim sheds it before any ash
  // song.
  if (have($skill`The Polka of Plenty`)) effects.push($effect`Polka of Plenty`);
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
  return trimSongs(effects);
}

/**
 * "superitdrop" mood (ash mood():71-75), minus Steely-Eyed Squint — see
 * squintEffects() for why that one cannot ride in task.effects. The ash's
 * switch case FALLS THROUGH into "itdrop", so callers get both: use
 * combineMoods(superItemDropEffects(), itemDropEffects()) at the ash's
 * mood("superitdrop") sites.
 *
 * Hustlin' is deliberately absent: its default is "pool 3", one stylish game at
 * the clan pool table, and the effect only lands on a WIN. ensureEffect throws
 * on a loss, so the ash's optimism is not portable here.
 */
export function superItemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (
    CinchoDeMayo.have() &&
    have($skill`Cincho: Party Soundtrack`) &&
    CinchoDeMayo.currentCinch() >= 25
  ) {
    effects.push($effect`Party Soundtrack`);
  }
  // dailylimits.txt:126 caps Heartstone: %pals at 5/day; past that the cast
  // fails and ensureEffect throws (libram lib.js:566-570).
  if (have($skill`Heartstone: %pals`) && get("_heartstonePalsUsed", 0) < 5)
    effects.push($effect`Best Pals`);
  return trimSongs(effects);
}

/**
 * The rest of the ash's "superitdrop": Steely-Eyed Squint, which DOUBLES the
 * item bonus in force at the moment it is cast and is once a day
 * (_steelyEyedSquintUsed). grimoire acquires a task's effects BEFORE it builds
 * and wears the outfit (engine.js:95 vs :98-101), so an `effects` entry would
 * spend the day's squint on the bare-gear bonus. `prepare` runs AFTER dress()
 * (engine.js:101 vs :108), which is where the ash casts it too — after
 * tempEquipment at UTS:1402/1433.
 *
 * Apply with applyEffects(squintEffects()) at the tail of a task's prepare(),
 * after recover() has topped the MP back up.
 */
export function squintEffects(): Effect[] {
  if (!have($skill`Steely-Eyed Squint`) || get("_steelyEyedSquintUsed")) return [];
  return [$effect`Steely-Eyed Squint`];
}

/**
 * Acquire a mood list by hand, for the two places the engine's own
 * acquireEffects() cannot serve: a task's prepare() (which is the only hook
 * that runs after dress()) and the self-dressing gymnasiumTurn() helper.
 * Same ensureEffect the engine uses, so the same abort-on-failure contract —
 * which is why every list above is gated to what the account can actually get.
 */
export function applyEffects(effects: Effect[]): void {
  for (const effect of effects) ensureEffect(effect);
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
  // "is it castable right now" test. Skipped at low shiny per the ash — and
  // gated on the substat price the ash models for its OTHER BCZ casts
  // (bczCost(), resources/freekill.ts), which the ash itself omits here: a BCZ
  // skill you cannot pay for simply fails, and ensureEffect turns that into an
  // abort. mafia does not record which substat each BCZ skill drains; the
  // family split in the ash's own gates is Sweat -> submoxie (G:473, CCS:41)
  // and Refracted Gaze -> submysticality (CCS:113), so Blood Bath is read as
  // submuscle, over the same 150-stat floor the ash uses for Sweat Bullets.
  if (
    have($skill`BCZ: Blood Bath`) &&
    currentTier() !== "low" &&
    bczAffordable("_bczBloodBathCasts", "submuscle", 22500)
  ) {
    effects.push($effect`Bloodbathed`);
  }
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

/**
 * Does this effect hit the monster on its own, without us acting? The four
 * modifiers the garbo fork enumerates for exactly this question (mood.ts:335-341).
 * Two consumers: the damage-free Shub filter (fights.ts shubFilter — delevel
 * items deal no damage because his retaliation doubles on damage) and the
 * bladeswitcher's reflect stall (fights.ts:56-61), where a passive tick is
 * damage we cannot see coming.
 */
export function dealsPassiveDamage(effect: Effect): boolean {
  return (
    numericModifier(effect, "Thorns") > 0 ||
    numericModifier(effect, "Sporadic Thorns") > 0 ||
    numericModifier(effect, "Damage Aura") > 0 ||
    numericModifier(effect, "Sporadic Damage Aura") > 0
  );
}

/**
 * Damage-mitigation mood for the fights that can actually be lost (the garbo fork
 * mood.ts:104-126 "Sea farming survivability", :83-86). Sea cow Atk 600 /
 * cowboy 750 / rustler 700 (monsters.txt:583,584,441) against an in-run moxie
 * of ~200 means every corral round lands for 110-175 (CCS:227) into a 570 HP
 * floor; the gym, the colosseum and the two temple bosses are the same shape.
 * MP only — every entry is a castable skill buff.
 *
 * Astral Shell and Elemental Saucesphere overlap resEffects(); combineMoods()
 * de-duplicates, so a task may carry both lists.
 *
 * Three of the garbo fork's entries are deliberately absent:
 *  - Blood Bubble. It is a Vampyre book skill costing 30 HP a cast
 *    (SkillDatabase.getHPCost, :1291 — mpcost 0 in classskills.txt:4042) with
 *    a THREE turn duration, so it would recast on nearly every adventure and
 *    pay in HP, which our restore then buys back. The MP-only rule excludes it.
 *  - Shield of the Pastalord. One cast, two possible effects — Flimsy Shield
 *    of the Pastalord (10% physical DR) and Shield of the Pastalord (30%),
 *    statuseffects.txt:1443-1444, both with default "cast 1 Shield of the
 *    Pastalord" — and which one lands is account state. That is exactly the
 *    Thoughtful Empathy case this file already drops: ensureEffect would throw
 *    whenever the cast produced the other one. mafia models neither
 *    numerically (modifiers.txt:6575, :7823 are comments), so nothing else is
 *    lost by leaving it out.
 *  - Get Big / Song of Bravado / Carol of the Bulls / Disco over Matter, which
 *    the garbo fork casts only in its OVERDRUNK branch (mood.ts:104-118); the sober
 *    sea branch (:122-126) is Ghostly Shell + Shield of the Pastalord alone.
 *
 * Tenacity of the Snapper is kept although mafia models it as Weapon Damage
 * +8 (modifiers.txt:8230), not mitigation: on these fights a faster kill IS
 * mitigation (fewer rounds taken), and it costs only MP.
 *
 * `damageFree` drops anything that would hit the monster by itself — the Shub
 * filter's premise (fights.ts:392-397). Nothing in the list trips it today;
 * the filter is here so a later addition cannot silently break that fight.
 */
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

/**
 * "colosseum" mood (ash mood():158-168), never ported until now. The round's
 * own maximize prices spell damage against mysticality (colosseum.ts coeff),
 * so the two big entries are Carol of the Hells (+100 spell damage percent,
 * modifiers.txt:6004) and Ultraheart (+50 flat and +50% to all three stats,
 * :8436).
 *
 * Three ash entries are dropped, each for a rule this file already applies:
 *  - Tubes of Universal Meat and Mariachi Moisture. Their defaults are
 *    "cast 1 Manicotti Meditation ^ Tubes of Universal Meat" and "cast 1 Moxie
 *    of the Mariachi ^ Mariachi Moisture" (statuseffects.txt:2988, 2991) — the
 *    same cast grants either the plain or the upgraded effect, the Thoughtful
 *    Empathy problem, and ensureEffect throws on the other outcome.
 *  - Everybody Calls Him Gorgon. Its default is "fortune buff gorgonzola", the
 *    clan fortune teller (FortuneCommand:30-52), which needs that specific
 *    lounge furnishing; the ash also gates it to lowShiny accounts only. Not
 *    predictable enough for ensureEffect.
 */
export function colosseumEffects(): Effect[] {
  const effects: Effect[] = [];
  // dailylimits.txt:127 caps Heartstone: %buff at 5/day, and the ash gates on
  // the unlock pref (mood():165).
  if (
    have($skill`Heartstone: %buff`) &&
    get("heartstoneBuffUnlocked", false) &&
    get("_heartstoneBuffUsed", 0) < 5
  ) {
    effects.push($effect`Ultraheart`);
  }
  if (have($skill`Carol of the Hells`)) effects.push($effect`Carol of the Hells`);
  // dailylimits.txt:94 caps Elron's at 10 casts a day; past that the cast fails
  // and ensureEffect throws, and fifteen colosseum rounds can get there.
  if (have($skill`Elron's Explosive Etude`) && get("_elronsCasts", 0) < 10)
    effects.push($effect`Elron's Explosive Etude`);
  if (have($skill`Get Big`)) effects.push($effect`Big`);
  // to_skill() is none, so the ash's have_skill gate never fires: the real
  // limit is the once-a-day monorail visit (MonorailCommand:15-18 refuses a
  // second, which would make ensureEffect throw).
  if (!get("_lyleFavored")) effects.push($effect`Favored by Lyle`);
  if (have($skill`The Magical Mojomuscular Melody`))
    effects.push($effect`The Magical Mojomuscular Melody`);
  return trimSongs(effects);
}

/**
 * The route's own casts that the bad-effect sweep below would otherwise strip:
 * Scarysauce is in resEffects() (ash mood():145-153) and carries Thorns 1
 * (modifiers.txt:7769); Scariersauce is its velour-viscometer upgrade (:7768,
 * UseSkillRequest:393-397). Shrugging them after every task would just fight
 * the next task's own mood, burning MP a turn.
 */
export const routeDamageEffects = $effects`Scarysauce, Scariersauce`;

/** Every bad effect currently up, by the garbo fork's own four categories
 * (mood.ts:335-352): passive damage, "Alters Page Text", teleportitis
 * ("Adventure Randomly"), and Blind / Always Fumble. Walks myEffects() rather
 * than Effect.all() — the same set intersected with what we have, at ~20
 * lookups a call instead of ~3000. */
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

/**
 * Is this effect one mafia will SHRUG (charsheet.php action=unbuff, free)
 * rather than cure with an item? Mirrors UneffectRequest.isShruggable
 * (:145-200): songs always, otherwise the effect must map to a skill that is a
 * buff. (statuseffects.txt has no "remove" column — the `default` column is
 * the action that GRANTS the effect, e.g. "use 1 wussiness potion" for
 * Wussiness — so shruggability has to be derived the way mafia derives it.)
 *
 * The `toEffect(skill) === effect` tail covers isShruggable's last clause: an
 * effect reached through a buff skill but only WITH a casting aid is not
 * shruggable (UseSkillRequest.requiredItemForSkillEffect:473-493 over the
 * replaceEffects/additionalEffects tables at :386-460). Those upgraded
 * variants — Scariersauce, Snarl of Three Timberwolves, Tubes of Universal
 * Meat … — map back to a skill whose own to_effect() is the BASE effect, so
 * this comparison rejects exactly them.
 */
function shruggable(effect: Effect): boolean {
  if (effect.attributes.includes("noremove")) return false;
  if (isSong(effect)) return true;
  const skill = toSkill(effect);
  if (skill === $skill.none || !skill.buff) return false;
  return toEffect(skill) === effect;
}

/** moodList() is a property read, not a page load, but the sweep runs after
 * every task — read it once. */
let moodCache: string[] | undefined;
function myMoodList(): string[] {
  return (moodCache ??= moodList());
}

/**
 * Would mafia's own removal path spend an ITEM on this effect, however
 * shruggable it is? UneffectRequest.getAction() (:683-706) reads the player's
 * CURRENT MOOD for a "gain_effect" trigger first, and run() (:810-820)
 * executes it verbatim unless it starts with uneffect / shrug / remedy — so a
 * user whose mood says `gain_effect | Foo | use 1 hot dog` would have us eat a
 * hot dog. mood_list() is that same trigger list (RuntimeLibrary:5413-5423,
 * "type | name | action"), so we can see it coming and decline.
 */
function moodWouldSpend(effect: Effect): boolean {
  const prefix = `gain_effect | ${effect.name} | `;
  return myMoodList().some((line) => {
    if (!line.startsWith(prefix)) return false;
    const action = line.slice(prefix.length).trim().toLowerCase();
    return !["uneffect", "shrug", "remedy"].some((verb) => action.startsWith(verb));
  });
}

/**
 * the garbo fork's shrugBadEffects() (mood.ts:345-358), narrowed to the one removal
 * that is free: the shrug. the garbo fork uneffect()s the whole list, which in ronin
 * means spending a soft green echo eyedrop antidote / anti-anti-antidote / hot
 * dog on the effects that cannot be shrugged. Per the run's rule that only
 * shrugs are free, anything item-cured is left alone — and, at the one site
 * where it actually breaks a fight, warned about (shub.ts).
 *
 * Why it earns its place in-run: (a) any passive-damage effect breaks the
 * deliberately damage-free Shub filter (fights.ts:392-397) and feeds the
 * bladeswitcher's reflect (fights.ts:56-61); (b) teleportitis and Always
 * Fumble silently burn turns in every zone.
 *
 * @param exclude effects to leave alone (the route's own casts).
 * @returns the bad effects still up afterwards — the ones no shrug can reach.
 */
export function shrugBadEffects(...exclude: Effect[]): Effect[] {
  const left: Effect[] = [];
  for (const effect of activeBadEffects()) {
    if (exclude.includes(effect)) continue;
    if (!shruggable(effect) || moodWouldSpend(effect)) {
      left.push(effect);
      continue;
    }
    // libram's uneffect() is cliExecute("uneffect <name>"), which reaches
    // UneffectRequest; for a shruggable effect that request is built against
    // charsheet.php?action=unbuff (:69-90) and run() takes the "Shrugging off
    // your buff" branch (:833) before any cure item is ever considered. No
    // item, no meat.
    uneffect(effect);
    if (have(effect)) left.push(effect);
  }
  return left;
}
