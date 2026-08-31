import {
  abort,
  appearanceRates,
  getFuel,
  haveEquipped,
  Item,
  Location,
  Monster,
  myClass,
  myFury,
  myTurncount,
  Skill,
  toMonster,
} from "kolmafia";
import { $class, $effect, $item, $skill, AsdonMartin, get, have, Macro } from "libram";

export type BanishSource = {
  /** Literal prefix mafia records in the banishedMonsters pref. */
  name: string;
  skill: Skill | Item;
  /** Gear that must be worn to cast it (snokebomb needs none). */
  equip?: Item;
  available: () => boolean;
  /** Full macro when a bare trySkill/tryItem of `skill` is not enough (the
   * spring shoes' kick banishes without ending the fight and must be followed
   * by Spring Away). Engine customize() prefers this over `skill`. */
  macro?: () => Macro;
  /** Kills the monster and costs the turn (BanishManager isTurnFree=false).
   * Chained only as a tail fallback, never preferred over a free source. */
  paid?: boolean;
};

/** Ash banMap (iotm.ash:1073-1085) plus snokebomb, which the ash kept outside
 * its gear map (no item) but uses as a banish in free_run(banish=true). Order
 * is the ash's gear-picker order; snokebomb last. */
export const banishSources: BanishSource[] = [
  {
    name: "Bowl Curveball",
    skill: $skill`Bowl a Curveball`,
    available: () =>
      have($item`cosmic bowling ball`) || get("cosmicBowlingBallReturnCombats") === 0,
  },
  {
    name: "Asdon Martin",
    skill: $skill`Asdon Martin: Spring-Loaded Front Bumper`,
    available: (): boolean => {
      // The bumper only appears on the fight page with the Asdon installed
      // and 50+ fuel (the skill costs 50). Live 2026-08-28, Tame Seahorse:
      // the day's pie-man fuel had gone to Waterproofly (37) plus one bumper
      // at the Outpost, so at turn 44 the ladder "chose" a bumper KoL never
      // offered (`if hasskill 7288` skipped) and the banish-hold invariant
      // aborted the run. Same gap as loopstar-gap-analysis item 3.
      if (!AsdonMartin.installed() || getFuel() < 50) return false;
      const banishes = get("banishedMonsters").split(":");
      const bumperIndex = banishes
        .map((string) => string.toLowerCase())
        .indexOf("spring-loaded front bumper");
      if (bumperIndex === -1) return true;
      return myTurncount() - parseInt(banishes[bumperIndex + 1]) > 30;
    },
  },
  {
    // The Everything Looks Green gate is load-bearing: the spring shoes' kick
    // is refused while ELG is up, so an ungated copy of this entry would hand
    // the macro a banish step that does nothing. There used to be exactly such
    // a duplicate further down the list; it is gone.
    // Kick then Spring Away: the kick only RECORDS the banish and the fight
    // goes on (FightRequest.java:10185-10187; wiki Banishing table: "Does not
    // end combat!"). Live 2026-08-30 the bare kick paid 15 gym fights while
    // its one banish slot churned across the roster. Same pairing as
    // freerun.ts's Spring Kick rung.
    name: "Spring Kick",
    skill: $skill`Spring Kick`,
    equip: $item`spring shoes`,
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    macro: () => Macro.trySkill($skill`Spring Kick`).trySkill($skill`Spring Away`),
  },
  {
    name: "Feel Hatred",
    skill: $skill`Feel Hatred`,
    available: () => get("_feelHatredUsed") < 3 && have($skill`Emotionally Chipped`),
  },
  {
    name: "Latte",
    skill: $skill`Throw Latte on Opponent`,
    equip: $item`latte lovers member's mug`,
    // Spent-fill only, like the ash (UnderTheSeaGlobals.ash:485): KoL grants
    // Throw Latte only while the current fill's banish is UNSPENT, and no
    // code path here refills the mug — counting remaining refills as
    // availability (`_latteRefillsUsed < 2`) nominated a skill the character
    // did not have. Live 2026-08-30 Tame Seahorse: mug worn, _latteBanishUsed
    // true, `hasskill Throw Latte` false every fight, every "banish" degraded
    // to a kill, and assertBanishHeld (correctly) aborted.
    available: () => !get("_latteBanishUsed") && have($item`latte lovers member's mug`),
  },
  {
    name: "Reflex Hammer",
    skill: $skill`Reflex Hammer`,
    equip: $item`Lil' Doctor™ bag`,
    available: () => get("_reflexHammerUsed") < 3 && have($item`Lil' Doctor™ bag`),
  },
  {
    name: "Snokebomb",
    skill: $skill`Snokebomb`,
    available: () => get("_snokebombUsed") < 3 && have($skill`Snokebomb`),
  },
  {
    name: "KGB dart",
    skill: $skill`KGB tranquilizer dart`,
    equip: $item`Kremlin's Greatest Briefcase`,
    available: () =>
      get("_kgbTranquilizerDartUses") < 3 && have($item`Kremlin's Greatest Briefcase`),
  },
  {
    name: "Yam Stinkbomb",
    skill: $item`stuffed yam stinkbomb`,
    available: () => have($item`stuffed yam stinkbomb`),
  },
  {
    name: "Middle Finger",
    skill: $skill`Show them your ring`,
    equip: $item`mafia middle finger ring`,
    available: () => !get("_mafiaMiddleFingerRingUsed") && have($item`mafia middle finger ring`),
  },
  // ---- Everything above this line is turn-free (BanishManager.java isTurnFree
  // = true: Bowl a Curveball :77, Spring-Loaded Front Bumper :129, Spring Kick
  // :128, Feel Hatred :91, Throw Latte :137, Reflex Hammer :116, snokebomb
  // :126, KGB dart :101, stuffed yam stinkbomb :120, mafia middle finger ring
  // :105). Everything below KILLS the monster and costs the turn (isTurnFree =
  // false: Sea *dent :118, Heartstone %banish :96, Monkey Slap :106, Batter
  // Up! :73). They stay LAST as fallbacks, never preferences: when no free
  // banish is left, a `banish` action would degrade to a paid kill anyway, and
  // a paid kill that also banishes is strictly better than one that does not
  // (the wiki's Banishing table calls these Turntaking/Kill; none keeps drops,
  // which is fine for a monster the task wants gone). Path-only sources
  // (System Sweep — Grey You; Banishing Shout — Boris) were removed: nothing
  // in the Avail. = Path rows of that table can fire in this path.
  {
    // 11/day, rollover-long; preferred over the Heartstone for supply.
    name: "Sea *dent",
    paid: true,
    skill: $skill`Sea *dent: Throw a Lightning Bolt`,
    equip: $item`Monodent of the Sea`,
    available: () => have($item`Monodent of the Sea`) && get("_seadentLightningUsed", 0) < 11,
  },
  {
    // Heartstone: GONE — 5/day, 50 turns, castable underwater (user-verified
    // 2026-08-31). mafia records the banisher as "Heartstone %banish"
    // (BanishManager.java:96), so the literal-prefix match below is on
    // "Heartstone". The attunement must have unlocked the banish word
    // (heartstoneBanishUnlocked) and the stone must be worn (accessory).
    name: "Heartstone",
    paid: true,
    skill: $skill`Heartstone: %banish`,
    equip: $item`Heartstone`,
    available: () =>
      have($item`Heartstone`) &&
      get("heartstoneBanishUnlocked", false) &&
      get("_heartstoneBanishUsed", 0) < 5,
  },
  {
    // Practically never: every in-run paw wish (lassos) disables it.
    name: "Monkey Paw",
    paid: true,
    skill: $skill`Monkey Slap`,
    equip: $item`cursed monkey's paw`,
    available: () => have($item`cursed monkey's paw`) && get("_monkeyPawWishesUsed", 0) === 0,
  },
  {
    // Seal Clubber only.
    name: "Batter Up",
    paid: true,
    skill: $skill`Batter Up!`,
    equip: $item`seal-clubbing club`,
    available: () =>
      have($skill`Batter Up!`) && myClass() === $class`Seal Clubber` && myFury() >= 5,
  },
];

/** The macro that fires one source: its override, else a guarded skill/item. */
export function sourceMacro(source: BanishSource): Macro {
  return (
    source.macro?.() ??
    (source.skill instanceof Skill ? Macro.trySkill(source.skill) : Macro.tryItem(source.skill))
  );
}

/**
 * EVERY source castable right now at `location`, chained in ladder order —
 * available, not already holding a monster the zone still serves, and with
 * its gear worn (or none needed). Each step is hasskill/hascombatitem-guarded
 * by trySkill/tryItem, so the first one KoL offers ends the fight and the
 * rest are inert. Built at compile time (after dress()), the same point
 * grimoire undelays resource macros.
 *
 * Why a chain and not one pick: live 2026-08-30 Tame Seahorse compiled a
 * single `Bowl a Curveball` while Reflex Hammer 0/3, Snokebomb 0/3 and Feel
 * Hatred 1/3 sat unused — the ball was already out on the cow, so the
 * waffled rustler's "banish" was an empty `if hasskill` and the fight fell to
 * a paid kill (gold-trace B F1). The ash's free_run(page_text, true) walks
 * its whole list every round (UnderTheSeaCCS.ash:74-107).
 */
export function banishChainMacro(location?: Location, opts: { paid?: boolean } = {}): Macro {
  const macro = new Macro();
  for (const source of banishSources) {
    if (source.paid && !opts.paid) continue;
    if (source.equip && !haveEquipped(source.equip)) continue;
    if (!source.available()) continue;
    if (location) {
      const current = banishedBy(source);
      if (current && (appearanceRates(location)[current.name] ?? 0) > 0) continue;
    }
    macro.step(sourceMacro(source));
  }
  return macro;
}

type BanishRecord = { monster: Monster; banisher: string };

/**
 * Design note (deliberate spec deviation): the spec names libram's
 * getBanishedMonsters(), but its banisher-name → Item|Skill mapping cannot
 * represent all four of our sources faithfully — "Heartstone" resolves via
 * toItem to the Heartstone ITEM, silently returning the wrong source kind
 * for a skill-based banish. So we parse mafia's banishedMonsters pref
 * directly with the ash's literal-prefix matching (iotm.ash banished(),
 * :1096-1100) — same data, faithful semantics. Record format: flat
 * colon-separated triplets monster:banisher:turn.
 */
function banishRecords(): BanishRecord[] {
  const parts = get("banishedMonsters").split(":");
  const records: BanishRecord[] = [];
  for (let i = 0; i + 1 < parts.length; i += 3) {
    if (!parts[i]) continue;
    records.push({ monster: toMonster(parts[i]), banisher: parts[i + 1] });
  }
  return records;
}

/** The monster this source currently has banished, if any (ash banished():
 * literal-prefix, case-insensitive match against the recorded banisher name). */
export function banishedBy(source: BanishSource): Monster | undefined {
  return banishRecords().find((record) =>
    record.banisher.toLowerCase().startsWith(source.name.toLowerCase()),
  )?.monster;
}

export function banishActive(target: Monster): boolean {
  return banishRecords().some((record) => record.monster === target);
}

/**
 * Ash banishGear() (iotm.ash:1115-1132) minus its `<slot>Override` pref
 * side-effect (spec §4: replaced by returning the equip requirement for the
 * task outfit). Picks the first available source whose existing banish is
 * irrelevant at `location` — its currently-banished monster does not appear
 * there, so re-pointing the source wastes nothing.
 *
 * `exclude` names sources the caller already rejected (see selectFreeRun's own
 * note): the engine's provide is equip-gated, and a source whose gear cannot
 * land in the task outfit must not sink the whole banish.
 */
export function pickBanishSource(
  location?: Location,
  exclude?: ReadonlySet<string>,
): BanishSource | undefined {
  return banishSources.find((source) => {
    if (exclude?.has(source.name)) return false;
    if (!source.available()) return false;
    if (!location) return true;
    const current = banishedBy(source);
    if (!current) return true;
    return (appearanceRates(location)[current.name] ?? 0) === 0;
  });
}

/**
 * Loud unbanished-monster invariant (the garbo fork tasks/farm/farmTurn.ts:124-130,
 * "You encountered a banishable monster and didn't banish it, sort your life
 * out!"). A task whose turn economy assumes a banish holds — the corral needs
 * the rustler gone so cows/cowboys spawn, the outpost grind needs the
 * non-dropping burglar/raider gone — otherwise bleeds turns silently until its
 * `limit.soft` fires 12-30 turns later.
 *
 * The check is per-ENCOUNTER, not per-monster-list, because one banish source
 * serves every `banish` monster in a task (engine customize() provides exactly
 * one) and re-pointing it releases whatever it held: "all of `targets` are
 * banished" is not an invariant this route ever maintains. "The one just met is
 * banished now" is.
 *
 * Bounded four ways, so a normal turn can never trip it:
 *  - RECENCY: the encounter must be the one this task produced since its last
 *    prepare(), i.e. at most one turn has passed since the previous check of
 *    the SAME task. `lastEncounter` outlives the script and is never cleared,
 *    while banishes are turn-limited and rollover-reset (BanishManager.java:
 *    stuffed yam stinkbomb 15 turns, snokebomb / Spring-Loaded Front Bumper 30,
 *    and the whole pref is emptied at rollover) — so an older encounter may
 *    have been banished perfectly well and simply expired since, and a run
 *    resumed the day after its last corral fight would otherwise read a stale
 *    rustler against an emptied banish list and abort on turn zero. Only a turn
 *    this function watched happen tells it anything. That makes the first call
 *    on each task a free pass, which is also the garbo fork's "a first-turn absence is
 *    normal".
 *  - `lastEncounter` must BE one of the task's banish targets.
 *  - the banish must not currently hold (banishActive).
 *  - a source must still be pickable at `location`. Charges only decrease
 *    within a day, so a source available NOW was available on the turn just
 *    fought; if none is, the `banish` action legitimately degraded to `kill`
 *    (MyActionDefaults, spec §2's explicit degradations) and nothing is broken.
 *    That case stays with the task's soft limit rather than aborting a run that
 *    has merely spent its banishes.
 *
 * What is left is the real breakage: the banish fired and did not stick, or the
 * engine never emitted one (e.g. its gear failed to land in the outfit, which
 * customize() deliberately fails through instead of announcing).
 */
const lastCheckedTurn = new Map<string, number>();

export function assertBanishHeld(targets: Monster[], location: Location, taskName: string): void {
  // Stamped per task and lazily, never at module load: this file is imported
  // before the first turn of the invocation, and a module-level myTurncount()
  // is the same defect lib/index.ts grandpaZone() calls out.
  const now = myTurncount();
  const previous = lastCheckedTurn.get(taskName);
  lastCheckedTurn.set(taskName, now);
  // 0 covers a free fight (which still writes lastEncounter but spends no
  // turn); anything past 1 means other tasks adventured in between and
  // lastEncounter is not ours to judge.
  if (previous === undefined || now - previous < 0 || now - previous > 1) return;
  const last = toMonster(get("lastEncounter"));
  if (!targets.includes(last)) return;
  if (banishActive(last)) return;
  // A waffle re-roll (the task macros throw one first) or a backup-camera
  // copy (engine customize() prepends the back-up step ahead of every task
  // macro, so the copy is what the banish branch then sees) replaces the
  // drawn monster mid-fight, and mafia leaves lastEncounter on the ORIGINAL
  // draw; the banish, if any, was owed to the replacement. Judge that
  // instead — live 2026-08-29 Tame Seahorse: cowboy drawn, waffled into a
  // sea cow, cow banished by Feel Hatred, and this abort fired on the
  // unbanished cowboy; live 2026-08-30 Outpost Lockkey: burglar drawn,
  // backed up into a free healer copy, and this abort fired on the burglar
  // the fight never contained past round 1.
  // lastCopyableMonster is mafia's post-transform monster (set at fight
  // end); it is stale for a non-copyable replacement, so a replacement
  // outside the target set also stands down rather than judging a guess.
  const actions = get("_lastCombatActions", "");
  if (
    actions.includes(`it${$item`waffle`.id};`) ||
    actions.includes(`sk${$skill`Back-Up to your Last Enemy`.id};`)
  ) {
    const replacement = get("lastCopyableMonster");
    if (!replacement || !targets.includes(replacement) || banishActive(replacement)) return;
  }
  const source = pickBanishSource(location);
  if (!source) return;
  abort(
    `${taskName}: fought a ${last.name} in ${location.toString()} and it is not banished, ` +
      `even though ${source.name} was available — the banish did not land (its gear may have ` +
      "failed to equip, or the source misfired). Banish it by hand, or clear the stale " +
      "banishedMonsters entry, then rerun; leaving it unbanished bleeds turns until this " +
      "task's soft limit.",
  );
}
