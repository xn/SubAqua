import {
  abort,
  availableAmount,
  buy,
  canAdventure,
  handlingChoice,
  itemAmount,
  Monster,
  myBuffedstat,
  myPrimestat,
  Phylum,
  runChoice,
  totalTurnsPlayed,
  use,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  $stat,
  CombatLoversLocket,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, monsterMacro, openerOnce } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { combineMoods, itemDropEffects, resEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";
import { rivetHuntActive } from "../../resources/saber";
import { summonsAvailable } from "../../resources/summon";

const abyss = $location`The Caliginous Abyss`;
const glass = $item`black glass`;
const vhs = $item`Spooky VHS Tape`;
const eagle = $familiar`Patriotic Eagle`;
const habitatTargets = [$monster`slithering thing`, $monster`eye in the darkness`];
const school = $monster`school of many`;
const vhsTargets = [...habitatTargets, school];
const monodent = $item`Monodent of the Sea`;
const crystalBall = $item`miniature crystal ball`;

function schoolBanished(): boolean {
  return get("banishedMonsters").includes("school of many");
}
function schoolMacro(): Macro {
  return Macro.trySkill($skill`Sea *dent: Throw a Lightning Bolt`)
    .trySkill($skill`Garbage Nova`)
    .trySkill($skill`Garbage Nova`)
    .trySkill($skill`Garbage Nova`)
    .trySkill($skill`Garbage Nova`);
}

function momDone(): boolean {
  return get("questS02Monkees") === "finished";
}

function phylumBanished(target: Phylum): boolean {
  const fields = get("banishedPhyla").split(":");
  for (let i = 0; i < fields.length; i += 3) {
    if (fields[i] === target.toString()) return true;
  }
  return false;
}

function habitatMonster(): Monster {
  return get("_monsterHabitatsFightsLeft", 0) > 0
    ? (get("_monsterHabitatsMonster") ?? $monster.none)
    : $monster.none;
}

function habitatDrawable(): boolean {
  const habitat = habitatMonster();
  return habitat === $monster.none || !phylumBanished(habitat.phylum);
}

function habitatIsMomTarget(): boolean {
  return habitatTargets.some((target) => target === get("_monsterHabitatsMonster"));
}

const golem = $monster`Black Crayon Golem`;
const bakery = $location`Madness Bakery`;

function screechGolemFromLocket(): boolean {
  if (!CombatLoversLocket.canReminisce(golem)) return false;
  return !rivetHuntActive() || summonsAvailable() >= 2;
}

function cyberLaneStuck(): boolean {
  if (!have(eagle) || !have($item`server room key`)) return false;
  if (get("_monsterHabitatsFightsLeft", 0) === 0) return false;
  if (habitatTargets.some((target) => target === get("_monsterHabitatsMonster"))) return false;
  return !habitatDrawable() || get("_cyberFreeFights", 0) >= 10;
}

const abyssPeridot = () =>
  get("momSeaMonkeeProgress", 0) < 40 ? $monster`eye in the darkness` : undefined;

function initialMomProgress(): number {
  let bar = 24;
  if (!have($item`backup camera`)) bar += 4;
  if (!have($item`2002 Mr. Store Catalog`)) bar += 12;
  return bar;
}

const abyssCombat = () =>
  new CombatStrategy()
    .macro(monsterMacro(vhsMacro, vhsTargets))
    .macro(schoolMacro(), school)
    .kill();

const abyssOutfit = () => ({
  modifier: "item",
  equip: [
    glass,
    ...$items`shark jumper, scale-mail underwear`,
    ...(schoolBanished() ? [] : [monodent]),
  ],
  avoid: [crystalBall],
});

export function momFinishQuest(): Quest {
  return {
    name: "Mom Finish",
    tasks: [
      {
        name: "Abyss Finish",
        ready: () => have(glass),
        completed: momDone,
        do: abyss,
        peridot: abyssPeridot,
        combat: abyssCombat(),
        outfit: abyssOutfit,
        effects: itemDropEffects,
        prepare: (): void => {
          recover();
          combJellyPrep();
          scaleMailPrep();
        },
        limit: { soft: 20, message: "Mom's rescue is stalling; check momSeaMonkeeProgress." },
      },
    ],
  };
}

export function pearlResModifier(): string {
  switch (myPrimestat()) {
    case $stat`Mysticality`:
      return "hot res";
    case $stat`Moxie`:
      return "sleaze res";
    default:
      return "spooky res";
  }
}

function vhsMacro(): Macro {
  return !get("spookyVHSTapeMonster") && get("momSeaMonkeeProgress", 0) < 36 && itemAmount(vhs) > 0
    ? Macro.tryItem(vhs)
    : new Macro();
}

function combJellyPrep(): void {
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) === 0) {
    if (pullBudgetAllows($item`comb jelly`)) pullSequence($item`comb jelly`);
  }
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) > 0) {
    use($item`comb jelly`);
  }
}

function scaleMailPrep(): void {
  const underwear = $item`scale-mail underwear`;
  if (have($effect`Jelly Combed`) || availableAmount(underwear) > 0) return;
  if (pullBudgetAllows(underwear)) pullSequence(underwear);
}

export function momQuest(opts: { cyber: boolean }): Quest {
  const cyberKit = () => have(eagle) && have($item`server room key`);
  return {
    name: "Mom",
    tasks: [
      {
        name: "Black Glass",
        ready: () => monkeesStep() >= 9 && itemAmount($item`sand dollar`) >= 13,
        completed: () => have(glass) || monkeesStep() >= 12,
        do: (): void => {
          let step = monkeesStep();
          while (step < 11) {
            if (step === 9) visitUrl("monkeycastle.php?who=1");
            else if (step === 10) visitUrl("monkeycastle.php?who=2");
            else break;
            const next = monkeesStep();
            if (next <= step) {
              abort(
                `Black Glass: visiting the castle at step${step} did not advance questS02Monkees (still step${next}). Check bigBrotherRescued and sand dollar count, then rerun.`,
              );
            }
            step = next;
          }
          buy($coinmaster`Big Brother`, 1, glass);
          if (!have(glass)) {
            abort(
              "Black Glass: bought from Big Brother at step11 but black glass never arrived. Check sand dollar count (needs 13) and Big Brother's coinmaster availability, then rerun.",
            );
          }
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
      ...(opts.cyber
        ? ([
            {
              name: "Banish Constructs",
              ready: () => cyberKit() && get("_monsterHabitatsFightsLeft", 0) === 0,
              completed: () =>
                momDone() ||
                get("_cyberFreeFights", 0) >= 10 ||
                get("banishedPhyla").includes("construct"),
              do: () => {
                if (screechGolemFromLocket()) {
                  CombatLoversLocket.reminisce(golem);
                  return undefined;
                }
                return bakery;
              },
              combat: new CombatStrategy()
                .macro(() =>
                  openerOnce(Macro.trySkill($skill`%fn, Release the Patriotic Screech!`)),
                )
                .kill(),
              outfit: { familiar: eagle },
              prepare: (): void => {
                recover();
                if (!screechGolemFromLocket() && !canAdventure(bakery)) {
                  visitUrl("shop.php?whichshop=armory&action=talk");
                  if (handlingChoice()) runChoice(1);
                }
              },
              limit: { tries: 4 },
            },
            {
              name: "Abyss Habitats",
              ready: () =>
                cyberKit() &&
                have($skill`Just the Facts`) &&
                have(glass) &&
                get("_monsterHabitatsFightsLeft", 0) === 0,
              completed: () => {
                const habitat = get("_monsterHabitatsMonster");
                return (
                  get("_monsterHabitatsRecalled", 0) >= 3 ||
                  habitatTargets.some((target) => target === habitat)
                );
              },
              do: abyss,
              peridot: abyssPeridot,
              combat: new CombatStrategy()
                .macro(monsterMacro(vhsMacro, vhsTargets))
                .macro(
                  () => openerOnce(Macro.trySkill($skill`Recall Facts: Monster Habitats`)),
                  habitatTargets,
                )
                .kill(),
              outfit: {
                modifier: "item",
                equip: [glass, $item`shark jumper`],
                avoid: [crystalBall],
              },
              effects: itemDropEffects,
              prepare: (): void => {
                recover();
                combJellyPrep();
              },
              limit: { soft: 8 },
            },
            {
              name: "Cyber Mom",
              ready: () =>
                cyberKit() &&
                get("_monsterHabitatsFightsLeft", 0) > 0 &&
                habitatIsMomTarget() &&
                habitatDrawable(),
              completed: () =>
                momDone() ||
                get("_monsterHabitatsFightsLeft", 0) === 0 ||
                get("_cyberFreeFights", 0) >= 10,
              do: $location`Cyberzone 1`,
              combat: new CombatStrategy()
                .macro(monsterMacro(vhsMacro, vhsTargets))
                .macro(Macro.trySkillRepeat($skill`Throw Cyber Rock`), habitatTargets)
                .kill(),
              outfit: {
                modifier: "moxie",
                equip: $items`shark jumper, Monodent of the Sea`,
                avoid: $items`miniature crystal ball`,
              },
              prepare: (): void => {
                recover();
                if (myBuffedstat($stat`Moxie`) < 500) {
                  throw "Cyberzone habitat fights want 500+ buffed moxie to be safe (ash UTS:2219). Buff up or let the abyss fallback run.";
                }
              },
              limit: { soft: 12 },
            },
          ] as Task[])
        : []),
      {
        name: "Abyss Mom",
        ready: () => have(glass) && (!(opts.cyber && cyberKit()) || cyberLaneStuck()),
        completed: () => momDone() || get("momSeaMonkeeProgress", 0) >= initialMomProgress(),
        do: abyss,
        peridot: abyssPeridot,
        combat: abyssCombat(),
        outfit: abyssOutfit,
        effects: itemDropEffects,
        prepare: (): void => {
          recover();
          combJellyPrep();
        },
        limit: { soft: 30, message: "Mom's rescue is stalling; check momSeaMonkeeProgress." },
      },
    ],
  };
}

export function wandererTasks(): Task[] {
  const redemption = (name: string, monsterPref: string, turnPref: string): Task => ({
    name,
    ready: () => !!get(monsterPref) && totalTurnsPlayed() >= get(turnPref, 0) + 8,
    completed: () => !get(monsterPref),
    do: () => grandpaZone(),
    underwater: true,
    combat: new CombatStrategy().kill(),
    outfit: () => ({ modifier: `item, ${pearlResModifier()}` }),
    effects: () => combineMoods(itemDropEffects(), resEffects()),
    prepare: () => recover(),
    limit: { soft: 4 },
  });
  return [
    redemption("Redeem VHS", "spookyVHSTapeMonster", "spookyVHSTapeMonsterTurn"),
    redemption("Redeem Club 'Em", "clubEmNextWeekMonster", "clubEmNextWeekMonsterTurn"),
  ];
}
