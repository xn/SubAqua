import {
  abort,
  availableAmount,
  Effect,
  buy,
  canAdventure,
  currentRound,
  handlingChoice,
  itemAmount,
  lastMonster,
  Monster,
  myBuffedstat,
  myPrimestat,
  Phylum,
  print,
  runChoice,
  throwItem,
  totalTurnsPlayed,
  toUrl,
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
  set,
} from "libram";

import { CombatStrategy, monsterMacro, openerOnce } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { combineMoods, itemDropEffects, resEffects } from "../../lib/moods";
import { selectFreeKill } from "../../resources/freekill";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";
import { rivetHuntActive } from "../../resources/saber";
import { summonsAvailable } from "../../resources/summon";

import { habitatGolemsLive, screechReady } from "./outpost";

const abyss = $location`The Caliginous Abyss`;
const glass = $item`black glass`;
const vhs = $item`Spooky VHS Tape`;
const eagle = $familiar`Patriotic Eagle`;
const glover = $familiar`Glover`;

function cyberKit(): boolean {
  return have(eagle) && have($item`server room key`) && have($skill`OVERCLOCK(10)`) && have(glover);
}

function famWeightEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Leash of Linguini`)) effects.push($effect`Leash of Linguini`);
  if (have($skill`Empathy of the Newt`)) effects.push($effect`Empathy`);
  return effects;
}

const habitatTargets = [$monster`slithering thing`, $monster`eye in the darkness`];
const school = $monster`school of many`;
const peanut = $monster`Peanut`;
const waffle = $item`waffle`;
const macrometeorite = $skill`Macrometeorite`;
const vhsTargets = [...habitatTargets, school];
const monodent = $item`Monodent of the Sea`;
const crystalBall = $item`miniature crystal ball`;

function schoolBanished(): boolean {
  return get("banishedMonsters").includes("school of many");
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

const screech = $skill`%fn, Release the Patriotic Screech!`;

function constructScreechOpener(): Macro {
  return screechReady() ? openerOnce(Macro.trySkill(screech)) : new Macro();
}

function clubEmGolemPending(): boolean {
  return get("clubEmNextWeekMonster") === golem;
}

function wandererScreech(monsterPref: string): boolean {
  return get(monsterPref) === golem.name && screechReady() && !habitatGolemsLive();
}

function screechGolemFromLocket(): boolean {
  if (!CombatLoversLocket.canReminisce(golem)) return false;
  return !rivetHuntActive() || summonsAvailable() >= 2;
}

// Golem habitat charges the Outpost lane left behind. The second golem recall fires on the
// last golem of the first, whatever the lockkey timing; when the key drops early the leftover
// charges stop draining (2026-09-07: 2 charges sat untouched through ~40 gym, Colosseum and
// Abyss adventures) and every `_monsterHabitatsFightsLeft === 0` gate stayed shut, so the
// cyber lane never ran and the finish paid 17 Abyss turns. Once the black glass is in hand
// the golems buy nothing, so a stale golem habitat counts as free for the eye recall. KoL
// accepts a recall over live charges of a different monster: autoscend overwrites a live
// habitat on purpose (iotms/mr2023.ash auto_canHabitat/auto_habitatTarget refuse only a recast
// of the SAME monster) and casts it from its combat handler. The post-fight check below is a
// cheap guard: if the golem habitat ever survives the cast, the refusal is remembered for the
// day and the paid Abyss runs early instead.
const recallRefusedPref = "_subaqua_habitatRecallRefused";
const recalledBeforePref = "_subaqua_habitatRecalledBefore";

function staleGolemHabitat(): boolean {
  return (
    have(glass) &&
    get("_monsterHabitatsFightsLeft", 0) > 0 &&
    get("_monsterHabitatsMonster") === golem
  );
}

function recallRefused(): boolean {
  return get(recallRefusedPref, false);
}

function habitatFree(): boolean {
  return get("_monsterHabitatsFightsLeft", 0) === 0 || (staleGolemHabitat() && !recallRefused());
}

function recallsLeft(): boolean {
  return get("_monsterHabitatsRecalled", 0) < 3;
}

// The cyber lane can no longer deliver Mom progress: no recall left for an eye habitat, a
// recall over the stale golems was refused, or the eye habitat is up with no cyber fights
// left. Then the paid Abyss (Abyss Mom) runs early, while free kills are still held.
function cyberLaneStuck(): boolean {
  if (!cyberKit()) return false;
  if (recallRefused()) return true;
  if (habitatIsMomTarget()) {
    return get("_monsterHabitatsFightsLeft", 0) > 0 && get("_cyberFreeFights", 0) >= 10;
  }
  if (!recallsLeft()) return true;
  if (habitatFree()) return false;
  return !habitatDrawable() || get("_cyberFreeFights", 0) >= 10;
}

function noteRecallOutcome(): void {
  if (!staleGolemHabitat()) return;
  if (!habitatTargets.includes(lastMonster())) return;
  if (get("_monsterHabitatsRecalled", 0) !== get(recalledBeforePref, 0)) return;
  set(recallRefusedPref, true);
  print(
    `Recall Facts: Monster Habitats did not replace the leftover ${golem.name} habitat ` +
      `(${get("_monsterHabitatsFightsLeft", 0)} charges); KoL refused the recast. ` +
      "Mom goes through the paid Abyss with free kills for the rest of today.",
    "red",
  );
}

const abyssPeridot = () =>
  get("momSeaMonkeeProgress", 0) < 40 ? $monster`eye in the darkness` : undefined;

function initialMomProgress(): number {
  let bar = 24;
  if (!have($item`backup camera`)) bar += 4;
  if (!have($item`2002 Mr. Store Catalog`)) bar += 12;
  return bar;
}

// Peanut is a scheduled Abyss fight and is handled like a boss (user rule 2026-09-07): free
// kills, banishes and the fish-talk opener are refused, and a free run only delays him one
// fight (2026-09-07 run: ink bladder at `:111685`, Peanut back the very next adventure at t41,
// bladder wasted). So he is re-rolled or killed. A re-roll swaps him mid-fight for an eye or
// slithering thing the engine's free-kill rung then takes with the turn refunded; it only pays
// when a free kill is actually held, since a paid kill of the replacement earns less progress
// than a paid kill of Peanut (+2 for the eye at `:111700`, +3 for him). Macrometeorite is the
// free re-roll (10/day, user-verified on Peanut 2026-09-07 t41) and runs inside the macro; the
// waffle is the fallback and is thrown by hand before the compiled macro runs, for the reason
// at corral.ts throwWaffle(): a refused waffle inside a macro ends in "(Macro aborted.)" and
// kills the whole script. With neither, the kill action pays the turn, as the gold run did
// (gold-star-run.txt:8369).
function peanutRerollPays(): boolean {
  return selectFreeKill({ location: abyss }) !== undefined;
}

function macrometeoriteReady(): boolean {
  return have(macrometeorite) && get("_macrometeoriteUses", 0) < 10;
}

function peanutMacro(): Macro {
  if (!macrometeoriteReady() || !peanutRerollPays()) return new Macro();
  return Macro.trySkill(macrometeorite);
}

function waffleOnPeanut(): void {
  if (currentRound() === 0 || lastMonster() !== peanut || itemAmount(waffle) === 0) return;
  if (macrometeoriteReady() || !peanutRerollPays()) return;
  const page = throwItem(waffle);
  if (page.includes("waste a waffle")) {
    print("Waffle refused on Peanut; the kill macro takes over.");
  } else {
    print(`Waffle rolled Peanut into ${lastMonster().name}.`);
  }
}

function abyssAdventure(): void {
  visitUrl(toUrl(abyss));
  if (handlingChoice()) runChoice(-1);
  waffleOnPeanut();
}

const abyssCombat = () =>
  new CombatStrategy()
    .macro(monsterMacro(vhsMacro, vhsTargets))
    .macro(peanutMacro, peanut)
    .banish(school)
    .kill(peanut)
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
        do: abyssAdventure,
        location: abyss,
        peridot: abyssPeridot,
        combat: abyssCombat(),
        outfit: abyssOutfit,
        effects: itemDropEffects,
        prepare: momSpeedupPrep,
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

// Mom speedups (wiki, The Caliginous Abyss): 1 progress per combat, +1 each for the shark
// jumper, scale-mail underwear and Jelly Combed, so 4/combat with all three (10 kills) vs 2
// with the jumper alone (20 kills, the 2026-09-07 finish). Both items are pulled at init
// (init.ts); these preps are the fallback when a slot was lost or the jelly has expired.
function scaleMailPrep(): void {
  const underwear = $item`scale-mail underwear`;
  if (availableAmount(underwear) > 0) return;
  if (pullBudgetAllows(underwear)) pullSequence(underwear);
}

function momSpeedupPrep(): void {
  recover();
  combJellyPrep();
  scaleMailPrep();
}

const momSpeedupGear = $items`shark jumper, scale-mail underwear`;

export function momQuest(opts: { cyber: boolean }): Quest {
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
              ready: () => cyberKit() && habitatFree() && !clubEmGolemPending(),
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
              combat: new CombatStrategy().macro(constructScreechOpener).kill(),
              outfit: { familiar: eagle },
              prepare: (): void => {
                recover();
                set("_subaqua_screech_combat", get("_lastCombatStarted", ""));
                if (!screechGolemFromLocket() && !canAdventure(bakery)) {
                  visitUrl("shop.php?whichshop=armory&action=talk");
                  if (handlingChoice()) runChoice(1);
                }
              },
              post: (): void => {
                if (get("banishedPhyla").includes("construct") || get("screechCombats", 0) > 0)
                  return;
                if (get("_lastCombatStarted", "") === get("_subaqua_screech_combat", "")) return;
                throw (
                  `Banish Constructs fought ${get("lastEncounter")} with the Patriotic Eagle out and the screech ` +
                  "did not land (screechCombats still 0, construct unbanished). KoL did not cast skill 7451 " +
                  "from the opener. Turn mafia's debug log on, fight one Bakery construct with the eagle, " +
                  "and check whether 'Release the Patriotic Screech' is in the fight page, then rerun."
                );
              },
              limit: { tries: 4 },
            },
            {
              name: "Abyss Habitats",
              ready: () =>
                cyberKit() &&
                have($skill`Just the Facts`) &&
                have(glass) &&
                recallsLeft() &&
                habitatFree(),
              completed: () => !recallsLeft() || habitatIsMomTarget(),
              do: abyssAdventure,
              location: abyss,
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
                equip: [glass, ...momSpeedupGear],
                avoid: [crystalBall],
              },
              effects: itemDropEffects,
              prepare: (): void => {
                momSpeedupPrep();
                set(recalledBeforePref, get("_monsterHabitatsRecalled", 0));
              },
              post: noteRecallOutcome,
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
                familiar: glover,
                equip: [...momSpeedupGear, monodent],
                avoid: $items`miniature crystal ball`,
              },
              effects: famWeightEffects,
              prepare: (): void => {
                // Cyberzone habitat eyes score Mom progress like Abyss kills (gold: +3 each
                // with the jumper and Jelly Combed), so the speedups ride along here too.
                momSpeedupPrep();
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
        do: abyssAdventure,
        location: abyss,
        peridot: abyssPeridot,
        combat: abyssCombat(),
        outfit: abyssOutfit,
        effects: itemDropEffects,
        prepare: momSpeedupPrep,
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
    combat: new CombatStrategy()
      .macro(
        monsterMacro(
          () => (wandererScreech(monsterPref) ? constructScreechOpener() : new Macro()),
          golem,
        ),
      )
      .kill(),
    // Redeemed eye/slithering-thing copies score Mom progress (gold t22 Trench eye: +2), so
    // the speedup gear rides along when the wanderer is a Mom target.
    outfit: () => ({
      modifier: `item, ${pearlResModifier()}`,
      familiar: wandererScreech(monsterPref) ? eagle : undefined,
      equip: habitatTargets.some((target) => target.name === get(monsterPref))
        ? momSpeedupGear
        : [],
    }),
    effects: () => combineMoods(itemDropEffects(), resEffects()),
    prepare: () => {
      if (habitatTargets.some((target) => target.name === get(monsterPref))) momSpeedupPrep();
      else recover();
    },
    limit: { soft: 4 },
  });
  return [
    redemption("Redeem VHS", "spookyVHSTapeMonster", "spookyVHSTapeMonsterTurn"),
    redemption("Redeem Club 'Em", "clubEmNextWeekMonster", "clubEmNextWeekMonsterTurn"),
  ];
}
