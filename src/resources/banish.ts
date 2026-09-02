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
  name: string;
  skill: Skill | Item;
  equip?: Item;
  available: () => boolean;
  macro?: () => Macro;
  paid?: boolean;
};

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
  {
    name: "Sea *dent",
    paid: true,
    skill: $skill`Sea *dent: Throw a Lightning Bolt`,
    equip: $item`Monodent of the Sea`,
    available: () => have($item`Monodent of the Sea`) && get("_seadentLightningUsed", 0) < 11,
  },
  {
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
    name: "Monkey Paw",
    paid: true,
    skill: $skill`Monkey Slap`,
    equip: $item`cursed monkey's paw`,
    available: () => have($item`cursed monkey's paw`) && get("_monkeyPawWishesUsed", 0) === 0,
  },
  {
    name: "Batter Up",
    paid: true,
    skill: $skill`Batter Up!`,
    equip: $item`seal-clubbing club`,
    available: () =>
      have($skill`Batter Up!`) && myClass() === $class`Seal Clubber` && myFury() >= 5,
  },
];

export function sourceMacro(source: BanishSource): Macro {
  return (
    source.macro?.() ??
    (source.skill instanceof Skill ? Macro.trySkill(source.skill) : Macro.tryItem(source.skill))
  );
}

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

function banishRecords(): BanishRecord[] {
  const parts = get("banishedMonsters").split(":");
  const records: BanishRecord[] = [];
  for (let i = 0; i + 1 < parts.length; i += 3) {
    if (!parts[i]) continue;
    records.push({ monster: toMonster(parts[i]), banisher: parts[i + 1] });
  }
  return records;
}

export function banishedBy(source: BanishSource): Monster | undefined {
  return banishRecords().find((record) =>
    record.banisher.toLowerCase().startsWith(source.name.toLowerCase()),
  )?.monster;
}

export function banishActive(target: Monster): boolean {
  return banishRecords().some((record) => record.monster === target);
}

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

const lastCheckedTurn = new Map<string, number>();

export function assertBanishHeld(targets: Monster[], location: Location, taskName: string): void {
  const now = myTurncount();
  const previous = lastCheckedTurn.get(taskName);
  lastCheckedTurn.set(taskName, now);
  if (previous === undefined || now - previous < 0 || now - previous > 1) return;
  const last = toMonster(get("lastEncounter"));
  if (!targets.includes(last)) return;
  if (banishActive(last)) return;
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
