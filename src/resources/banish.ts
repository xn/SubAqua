import { appearanceRates, Item, Location, Monster, Skill, toMonster } from "kolmafia";
import { $item, $skill, get, have } from "libram";

export type BanishSource = {
  /** Literal prefix mafia records in the banishedMonsters pref. */
  name: string;
  skill: Skill;
  /** Gear that must be worn to cast it (snokebomb needs none). */
  equip?: Item;
  available: () => boolean;
};

/** Ash banMap (iotm.ash:1073-1085) plus snokebomb, which the ash kept outside
 * its gear map (no item) but uses as a banish in free_run(banish=true). Order
 * is the ash's gear-picker order; snokebomb last. */
export const banishSources: BanishSource[] = [
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
    available: () => have($item`Monodent of the Sea`),
  },
  {
    name: "Heartstone",
    skill: $skill`Heartstone: %banish`,
    equip: $item`Heartstone`,
    available: () => have($item`Heartstone`) && get("heartstoneBanishUnlocked"),
  },
  {
    name: "snokebomb",
    skill: $skill`Snokebomb`,
    available: () => have($skill`Snokebomb`) && get("_snokebombUsed") < 3,
  },
];

type BanishRecord = { monster: Monster; banisher: string };

function banishRecords(): BanishRecord[] {
  const parts = get("banishedMonsters").split(":");
  const records: BanishRecord[] = [];
  for (let i = 0; i + 1 < parts.length; i += 3) {
    if (!parts[i]) continue;
    records.push({ monster: toMonster(parts[i]), banisher: parts[i + 1] ?? "" });
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
