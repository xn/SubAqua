import {
  abort,
  appearanceRates,
  Item,
  Location,
  Monster,
  myClass,
  myFury,
  myTurncount,
  Skill,
  toMonster,
} from "kolmafia";
import { $class, $effect, $item, $skill, get, have } from "libram";

export type BanishSource = {
  /** Literal prefix mafia records in the banishedMonsters pref. */
  name: string;
  skill: Skill | Item;
  /** Gear that must be worn to cast it (snokebomb needs none). */
  equip?: Item;
  available: () => boolean;
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
    name: "Spring Kick",
    skill: $skill`Spring Kick`,
    equip: $item`spring shoes`,
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
  },
  {
    name: "System Sweep",
    skill: $skill`System Sweep`,
    available: () => have($skill`System Sweep`),
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
    available: () =>
      (!get("_latteBanishUsed") || (get("_latteRefillsUsed") < 2 && myTurncount() < 1000)) &&
      have($item`latte lovers member's mug`),
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
  {
    name: "Banishing Shout",
    skill: $skill`Banishing Shout`,
    available: () => have($skill`Banishing Shout`),
  },
  {
    name: "Batter Up",
    skill: $skill`Batter Up!`,
    equip: $item`seal-clubbing club`,
    available: () =>
      have($skill`Batter Up!`) && myClass() === $class`Seal Clubber` && myFury() >= 5,
  },
  {
    name: "Monkey Paw",
    skill: $skill`Monkey Slap`,
    equip: $item`cursed monkey's paw`,
    available: () => have($item`cursed monkey's paw`) && get("_monkeyPawWishesUsed", 0) === 0,
  },
  {
    // Last on purpose, and it stays last: the bolt is the ONE banish in this
    // list that is not turn-free. BanishManager.java:118 records it as
    // SEADENT_LIGHTNING("Sea *dent", -1, 1, false, ROLLOVER_RESET) — the 4th
    // field is isTurnFree — while every source above it that the corral would
    // otherwise reach IS turn-free: Bowl a Curveball (:77), Spring-Loaded Front
    // Bumper (:129), Spring Kick (:128), Feel Hatred (:91), Reflex Hammer
    // (:116), snokebomb (:126), Throw Latte (:137), KGB dart (:101). Its 11/day
    // supply looks tempting for a long-lived zone banish (the garbo fork
    // resources/banish.ts:68-74, seaDent.ts:19-22), but preferring it there
    // would trade a free banish for a spent adventure — so it is a fallback for
    // when nothing above is available, never a preference.
    name: "Sea *dent",
    skill: $skill`Sea *dent: Throw a Lightning Bolt`,
    equip: $item`Monodent of the Sea`,
    available: () => have($item`Monodent of the Sea`) && get("_seadentLightningUsed", 0) < 11,
  },
];

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
 */
export function pickBanishSource(location?: Location): BanishSource | undefined {
  return banishSources.find((source) => {
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
