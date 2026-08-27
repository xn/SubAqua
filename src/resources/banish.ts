import {
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
import { $class, $effect, $item, $locations, $skill, get, have } from "libram";

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
    name: "Spring Kick",
    skill: $skill`Spring Kick`,
    equip: $item`spring shoes`,
    available: () => have($item`spring shoes`),
  },
  {
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
 * Zones that get the 11/day Monodent banish ahead of the gear-picker order
 * (the garbo fork resources/banish.ts:68-74 + seaDent.ts:19-22, `canLightningBanish`).
 *
 * The corral is the only place in the route that wants ONE banish held for
 * 20-40 turns (the Mer-kin rustler, off a three-monster roster) while the
 * guild, the outpost and the gymnasium all still want banishes of their own —
 * and every other source in the list is 1-3 a day. Taking the first available
 * source here burns Bowl Curveball / Asdon / Spring Kick / Feel Hatred on the
 * rustler and leaves the later zones with nothing, while `_seadentLightning`
 * still has ten uses left.
 *
 * Deliberate deviation from the ash, which at the corral calls free_run(banish)
 * FIRST and only reaches for the Lightning Bolt as the second banish in the
 * same fight (CCS:795-828, where the bolt is the cowboy/cow branch and the
 * rustler gets the Heartstone banish). The ash is spending from a full
 * aftercore-ish kit; in-run the scarce sources are worth more later.
 */
const monodentZones = $locations`The Coral Corral`;

/**
 * Ash banishGear() (iotm.ash:1115-1132) minus its `<slot>Override` pref
 * side-effect (spec §4: replaced by returning the equip requirement for the
 * task outfit). Picks the first available source whose existing banish is
 * irrelevant at `location` — its currently-banished monster does not appear
 * there, so re-pointing the source wastes nothing.
 */
export function pickBanishSource(location?: Location): BanishSource | undefined {
  const usable = (source: BanishSource): boolean => {
    if (!source.available()) return false;
    if (!location) return true;
    const current = banishedBy(source);
    if (!current) return true;
    return (appearanceRates(location)[current.name] ?? 0) === 0;
  };
  if (location && monodentZones.includes(location)) {
    const monodent = banishSources.find((source) => source.name === "Sea *dent");
    if (monodent && usable(monodent)) return monodent;
  }
  return banishSources.find((source) => usable(source));
}
