import {
  abort,
  availableAmount,
  buy,
  canAdventure,
  handlingChoice,
  itemAmount,
  myBuffedstat,
  myPrimestat,
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
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, monsterMacro, openerOnce } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { combineMoods, itemDropEffects, resEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const abyss = $location`The Caliginous Abyss`;
const glass = $item`black glass`;
const vhs = $item`Spooky VHS Tape`;
const eagle = $familiar`Patriotic Eagle`;
const habitatTargets = [$monster`slithering thing`, $monster`eye in the darkness`];
const vhsTargets = [...habitatTargets, $monster`school of many`];

function momDone(): boolean {
  return get("questS02Monkees") === "finished" || get("momSeaMonkeeProgress", 0) >= 40;
}

/** Ash pearlRes (UTS:22-26): the class zone's element. */
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

/** Record a Spooky VHS of an abyss monster during the ash's window
 * (22 < momSeaMonkeeProgress < 36; UTS:900-912, CCS:891-896). */
function vhsMacro(): Macro {
  return !get("spookyVHSTapeMonster") && get("momSeaMonkeeProgress", 0) < 36 && itemAmount(vhs) > 0
    ? Macro.tryItem(vhs)
    : new Macro();
}

function combJellyPrep(): void {
  // Reserved pull (pulls.ts); Jelly Combed shields the abyss dive (UTS:2177).
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) === 0) {
    if (pullBudgetAllows($item`comb jelly`)) pullSequence($item`comb jelly`);
  }
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) > 0) {
    use($item`comb jelly`);
  }
}

export function momQuest(opts: { cyber: boolean }): Quest {
  const cyberKit = () => have(eagle) && have($item`server room key`);
  return {
    name: "Mom",
    tasks: [
      {
        // questslog.txt:72 (0-indexed after "started"): step9 "Check back in
        // with Little Brother", step10 "Go check on Big Brother", step11
        // "Buy the black glass from Big Brother" — the sale only opens at
        // step11. QuestManager.java:1441-1532: visiting who=1 at step9
        // ("he's been actin' awful weird lately") advances to step10;
        // visiting who=2 at step10 ("I found this thing") advances to
        // step11. Live 2026-08-27 at step9: buying logged "trading 13 sand
        // dollars for 1 black glass" with no "You acquire an item" — KoL
        // silently refused the sale — twice, then the task aborted.
        // monkeesStep() >= 9 already implies bigBrotherRescued (set at
        // step2, QuestManager.java:1532), so that flag is redundant here.
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
              // Cyber lane 1 (ash UTS:2196-2205): banish the construct
              // phylum via Patriotic Screech so cyberzone fights draw the
              // habitat monsters.
              name: "Banish Constructs",
              ready: () => cyberKit(),
              completed: () => get("banishedPhyla").includes("construct"),
              do: $location`Madness Bakery`,
              combat: new CombatStrategy()
                .macro(openerOnce(Macro.trySkill($skill`%fn, Release the Patriotic Screech!`)))
                .kill(),
              outfit: { familiar: eagle },
              prepare: (): void => {
                recover();
                // The bakery unlocks via the armory conversation (ash
                // UTS:2199-2201).
                if (!canAdventure($location`Madness Bakery`)) {
                  visitUrl("shop.php?whichshop=armory&action=talk");
                  if (handlingChoice()) runChoice(1);
                }
              },
              limit: { tries: 4 },
            },
            {
              // Cyber lane 2 (UTS:2206-2213, CCS:897-900): habitat an abyss
              // monster. black glass is an accessory-type item (items.txt),
              // so it rides the generic `equip` array rather than the
              // `offhand` slot key — forcing it into the off-hand slot would
              // make grimoire's Outfit.equipSpec fail (accessories only
              // equip through the unforced/acc1-3 path) and createOutfit
              // throws on that failure.
              name: "Abyss Habitats",
              ready: () => cyberKit() && have($skill`Just the Facts`) && have(glass),
              completed: () => {
                const habitat = get("_monsterHabitatsMonster");
                return (
                  get("_monsterHabitatsRecalled", 0) >= 3 ||
                  habitatTargets.some((target) => target === habitat)
                );
              },
              do: abyss,
              combat: new CombatStrategy()
                .macro(
                  openerOnce(Macro.trySkill($skill`Recall Facts: Monster Habitats`)),
                  habitatTargets,
                )
                .kill(),
              outfit: { modifier: "item", equip: [glass] },
              effects: itemDropEffects,
              prepare: (): void => {
                recover();
                combJellyPrep();
              },
              limit: { soft: 8 },
            },
            {
              // Cyber lane 3 (UTS:2214-2222, CCS:728-735): burn the habitat
              // fights inside CyberRealm's free fights; each abyss-monster
              // kill ticks momSeaMonkeeProgress wherever it happens.
              name: "Cyber Mom",
              ready: () => cyberKit() && get("_monsterHabitatsFightsLeft", 0) > 0,
              completed: () => momDone() || get("_cyberFreeFights", 0) >= 10,
              do: $location`Cyberzone 1`,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`Throw Cyber Rock`).repeat(), habitatTargets)
                .kill(),
              outfit: () => ({
                modifier: "moxie",
                equip: $items`shark jumper, Monodent of the Sea`,
              }),
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
        // The universal lane (ash high branch UTS:2165-2195 + fallback
        // finishCaliginous UTS:1369-1377): grind the Abyss to
        // momSeaMonkeeProgress 40. Black glass must be *equipped* — mafia
        // refuses the zone otherwise (KoLAdventure.java:2887-2894). It rides
        // the generic `equip` array for the same accessory-slot reason as
        // "Abyss Habitats" above. VHS recording rides along during the
        // window.
        name: "Abyss Mom",
        ready: () => have(glass),
        completed: momDone,
        do: abyss,
        // monsterMacro(), not `.macro(vhsMacro, vhsTargets)`: vhsMacro is empty
        // outside the recording window, and an empty monster macro still compiles
        // to a bodyless `if monsterid …;endif;` block (see monsterMacro()).
        combat: new CombatStrategy().macro(monsterMacro(vhsMacro, vhsTargets)).kill(),
        outfit: () => ({
          modifier: "item",
          equip: [glass, ...$items`shark jumper, scale-mail underwear`],
        }),
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

/** Counter-window redemptions (spec §2: wanderer follow-ups are
 * high-priority tasks, never adventured from hooks). Both counters are
 * mafia-maintained 8-turn windows (FightRequest.java:9663-9682,
 * 11273-11287); the copies redeem at the class pearl zone wearing that
 * zone's resistance (ash UTS:888-924). */
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
