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
const school = $monster`school of many`;
const vhsTargets = [...habitatTargets, school];
const monodent = $item`Monodent of the Sea`;
const crystalBall = $item`miniature crystal ball`;

/** The school of many gives no Mom progress. The ash keeps the Monodent on in
 * the Abyss until it is banished (UTS:381, 724, 1601) and, on meeting it,
 * throws the Monodent's Lightning Bolt then four Garbage Novas (CCS:938-941).
 * Live 2026-08-27: 7 of the 19 Abyss Mom turns were zero-progress school
 * fights, one of them 132 rounds long. */
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

/** The ash loops finishCaliginous() on `questS02Monkees == "step12"`
 * (UnderTheSea.ash ab1105e:2846-2847, 2872-2873) — the quest, not the
 * progress bar, gates the endgame loop. momSeaMonkeeProgress hitting 40 is
 * NOT done: the rescue non-combat ("Yo' Mama So Possessed By Evil . . .")
 * still needs one more Abyss adventure with black glass equipped to fire and
 * finish questS02Monkees (live 2026-08-28, session log 100339-100342, where
 * the bar had been at 40 for turns and only the other script's extra Abyss
 * visit closed the quest). The early no-kit grind is capped independently by
 * initialMomProgress() in "Abyss Mom"'s own `completed`. */
function momDone(): boolean {
  return get("questS02Monkees") === "finished";
}

/** At 40 the eye's backup/habitat copies are worthless progress, and a
 * forced Peridot eye fight would pre-empt the rescue NC that finishes the
 * quest — so stop offering it once the bar caps. */
const abyssPeridot = () =>
  get("momSeaMonkeeProgress", 0) < 40 ? $monster`eye in the darkness` : undefined;

/** Ash initialMomProgress (UTS:1573-1578): how far the early Abyss grind goes
 * on an account WITHOUT the cyber kit. Everything past it is meant to come
 * free — corral/library backup copies of the eye, VHS wanderers — with the
 * rest ground out late (ash finishCaliginous() before Shub, UTS:2963-2965). */
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

/** The late Abyss grind to 40 (ash `while (step12) finishCaliginous()`,
 * UTS:2963-2965) — runs right before Shub so the backup copies and wanderers
 * have had the whole run to fill the bar first. */
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
        },
        limit: { soft: 20, message: "Mom's rescue is stalling; check momSeaMonkeeProgress." },
      },
    ],
  };
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
              // Also done once the cyber lane has nothing left to use it for:
              // the Screech's phylum banish expires, and live 2026-08-28 this
              // re-fired at turn 120 (a paid Madness Bakery turn) with
              // _cyberFreeFights already 10/10.
              completed: () =>
                momDone() ||
                get("_cyberFreeFights", 0) >= 10 ||
                get("banishedPhyla").includes("construct"),
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
              // No crystal ball in the Abyss: its prediction overrides the
              // school-of-many banish (live 2026-08-28, log:85696 — the school
              // came back one turn after the Lightning Bolt).
              outfit: { modifier: "item", equip: [glass], avoid: [crystalBall] },
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
                // trySkillRepeat, not trySkill().repeat(): the latter compiles
                // to `if hasskill X;skill X;endif;repeat;` and KoL's `repeat`
                // re-runs the instruction before it — the `endif` — so after
                // the first rock the macro spun "69 instructions executed
                // without any actions" and mafia dropped the fight (live
                // 2026-08-28, first Cyberzone 1 fight). trySkillRepeat puts
                // `repeat hasskill X` right after the cast, inside the if
                // (libram combat.js trySkillRepeat); the ash loops
                // use_skill(Throw Cyber Rock) while current_round() > 0
                // (CCS:737-741).
                .macro(Macro.trySkillRepeat($skill`Throw Cyber Rock`), habitatTargets)
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
        // Early grind only on an account without the cyber kit, and only to
        // initialMomProgress() (ash UTS:1641-1643); with the kit the cyber
        // lane is the whole early phase and the remainder is deferred to
        // Mom Finish (runplans.ts). Live 2026-08-28 this ground 21 -> 40 at
        // 7 paid turns right after the cyber lane.
        ready: () => have(glass) && !(opts.cyber && cyberKit()),
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
