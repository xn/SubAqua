import { availableAmount, cliExecute } from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, monsterMacro, openerOnce } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { assertBanishHeld } from "../../resources/banish";
import { pawWish } from "../../resources/paw";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const outpost = $location`The Mer-Kin Outpost`;
const beads = $item`Mer-kin prayerbeads`;

function stashboxDone(): boolean {
  return have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`) || get("corralUnlocked");
}

/** Shared +item farm shape for the pre-stashbox outpost regimes (ash
 * UTS:1924-2003: itdrop + freeKill while the lockkey is unknown; the CCS
 * banishes burglar/raider as non-droppers, CCS:702-707). */
/** The banished half of the roster, shared by farmCombat() and by the
 * unbanished-monster invariant the two lanes that use it run in prepare().
 * Both lanes pay for the banish in turn economy — burglar and raider drop
 * nothing these grinds want — so a banish that quietly stops holding is a 25-30
 * turn bleed (the garbo fork farmTurn.ts:124-130; see assertBanishHeld for the bounds). */
const farmBanished = $monsters`Mer-kin burglar, Mer-kin raider`;

const golem = $monster`Black Crayon Golem`;
const eagle = $familiar`Patriotic Eagle`;

/** Second habitat recall, on a Black Crayon Golem met at the Outpost (ash
 * CCS:669-675): once the first recall's fights are spent and only one recall
 * has been used, recall the golem again so the lockkey hunt keeps drawing
 * free golem copies. UTS 08-26 recalled at [9] and again at [11]; the third
 * recall stays for the Abyss habitat lane (Abyss Habitats completes at
 * recalled >= 3). */
/** The last habitat golem fight (fights left 1 BEFORE the fight; mafia
 * decrements on encounter) once both outpost recalls are spent, on an
 * account with the cyber kit and no construct banish yet: the ash fields the
 * eagle for exactly that fight and screeches in it (UTS:1319-1322,
 * CCS:676-678) — the construct banish costs no turn there, where the Madness
 * Bakery lane costs one. */
function screechTurn(): boolean {
  return (
    have(eagle) &&
    have($item`server room key`) &&
    !get("banishedPhyla").includes("construct") &&
    get("_monsterHabitatsFightsLeft", 0) === 1 &&
    get("_monsterHabitatsRecalled", 0) >= 2
  );
}

/** True while golemRecallMacro() still has a recall to land. Shared by the
 * macro and farmBackup(): the engine prepends the backup ahead of every task
 * macro (engine.ts customize), so a backup that converts the last habitat
 * golem would eat the recall (F ledger #4: "emit the recall when fightsLeft
 * <= 1, and suppress the backup on that fight"). */
function recallPending(): boolean {
  return (
    have($skill`Just the Facts`) &&
    // <= 1, not === 0: mafia decrements _monsterHabitatsFightsLeft at
    // ENCOUNTER (FightRequest.java:2307), so the last habitat golem is met
    // with a build-time value of 1 — the same fact screechTurn() above
    // encodes with === 1. Gold recalled inside that fight (G:2531-2549);
    // live 2026-08-30 the recall clause first compiled after the 5th
    // habitat fight (Y:2634) and no golem followed (A F2).
    get("_monsterHabitatsFightsLeft", 0) <= 1 &&
    get("_monsterHabitatsRecalled", 0) < 2
  );
}

function golemRecallMacro(): Macro {
  const macro = new Macro();
  if (recallPending()) {
    macro.trySkill($skill`Recall Facts: Monster Habitats`);
  }
  if (screechTurn()) macro.trySkill($skill`%fn, Release the Patriotic Screech!`);
  return macro.components.length > 0 ? openerOnce(macro) : macro;
}

/** Outpost backups (ash CCS:684-690), cap 7 (UTS:1338): golem copies once
 * the habitat fights are spent and both recalls used — and never while a
 * recall is still pending (see recallPending). The Mer-kin healer is GONE
 * from the target list (A F1): a copy of a non-free monster costs its turn
 * and each 08-30 healer copy burned a free-kill charge — five golem-fight
 * healer copies drained the ladder and four healers were then killed at
 * paid turns (Y:2792-3013). The ash only backs up INTO a healer from a
 * healer fight it could not free-kill (CCS:698-707), a shape the round-1
 * macro cannot express. */
const farmBackup = () => ({
  targets:
    !recallPending() &&
    get("_monsterHabitatsFightsLeft", 0) === 0 &&
    get("_monsterHabitatsRecalled", 0) >= 2
      ? [golem]
      : [],
  cap: 7,
});

const farmCombat = () =>
  new CombatStrategy().macro(monsterMacro(golemRecallMacro, golem)).banish(farmBanished).kill();

export function outpostQuest(): Quest {
  return {
    name: "Outpost",
    tasks: [
      {
        // Runs BEFORE "Outpost Grandma" in list order: grimoire picks the
        // first available task, and Outpost Grandma stays available (ready
        // step>=6, not completed until step>=9) through steps 6-8. This task's
        // own ready() only fires once the Note + both yarns are in hand, so it
        // is a no-op until it's needed and then preempts the grind exactly
        // when `grandpa note` must run to produce Grandma's Map for step 9.
        name: "Grandma Note",
        ready: () =>
          have($item`Grandma's Note`) &&
          have($item`Grandma's Fuchsia Yarn`) &&
          have($item`Grandma's Chartreuse Yarn`),
        completed: () => have($item`Grandma's Map`) || monkeesStep() >= 8,
        do: () => void cliExecute("grandpa note"),
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Grandma rescue rides the same turns: Note (step7) and yarns drop
        // in-zone, the map (step8) comes from `grandpa note`, and step9 is
        // the "Phew, that was a close one" adventure result
        // (QuestManager.java:1462-1466, ResultProcessor.java:1870-1876).
        name: "Outpost Grandma",
        ready: () => monkeesStep() >= 6,
        completed: () => monkeesStep() >= 9,
        do: outpost,
        backup: farmBackup,
        combat: farmCombat(),
        outfit: () => ({ modifier: "item", familiar: screechTurn() ? eagle : undefined }),
        effects: itemDropEffects,
        prepare: (): void => {
          assertBanishHeld(farmBanished, outpost, "Outpost Grandma");
          recover();
        },
        limit: { soft: 30, message: "Grandma's rescue is stalling; check the outpost drops." },
      },
      {
        // Farm on until the lockkey drops (any of burglar/raider/healer can
        // drop it; mafia stamps merkinLockkeyMonster + choiceAdventure312,
        // ResultProcessor.java:2271-2283). The hut NC needs ~24 turns spent
        // in-zone before the stashbox chain opens (ash regime split at 24,
        // CCS:675/711) — these turns overlap the Grandma grind above.
        name: "Outpost Lockkey",
        ready: () => monkeesStep() >= 9,
        completed: () => get("merkinLockkeyMonster") !== null || stashboxDone(),
        do: outpost,
        backup: farmBackup,
        combat: farmCombat(),
        outfit: () => ({ modifier: "item", familiar: screechTurn() ? eagle : undefined }),
        effects: itemDropEffects,
        prepare: (): void => {
          assertBanishHeld(farmBanished, outpost, "Outpost Lockkey");
          recover();
        },
        limit: { soft: 25, message: "No lockkey after a long grind; verify drops and rerun." },
      },
      {
        // -combat hunt for the hut NC; the choice script walks the
        // per-monster search order (Task 4) and records visited locations in
        // _subaqua_stashbox_checked.
        name: "Outpost Stashbox",
        ready: () => get("merkinLockkeyMonster") !== null,
        completed: () => stashboxDone(),
        do: outpost,
        // ash free_run(page_text, true) here, CCS:721-724 (burglar/raider) —
        // but the ash keeps free_kill(drop) for the bead-short healer even in
        // -combat mode (CCS:698-704). Banishing him wastes a banish AND
        // fights the crystal ball's re-force: live 2026-08-30 two Feel
        // Hatreds went to healers the ball predicted right back (A F3,
        // Y:3226-3262). The kill action is upgraded to a free kill by the
        // engine when a charge + its gear land (engine.ts customize); with
        // the healer-backup drain fixed (A F1) charges now survive phase A.
        // A paid healer kill still rolls the prayerbeads the route needs <3.
        freeRunBanishes: true,
        combat: new CombatStrategy().kill($monster`Mer-kin healer`).freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
          // The turkey carried the ball in as maximizer famequip and its
          // predictions overrode the banishes (A F3, Y:3219).
          avoid: $items`miniature crystal ball`,
        }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          const checked = get("_subaqua_stashbox_checked", "");
          if (
            ["1", "2", "3"].every((option) => `,${checked},`.includes(`,${option},`)) &&
            !stashboxDone()
          ) {
            throw (
              "All three stashbox locations were searched without finding the stashbox — " +
              "something is off. Check the Mer-kin Outpost huts manually, then rerun."
            );
          }
        },
        limit: { soft: 15, message: "The stashbox hut NC is hiding; check -combat sources." },
      },
      {
        // Prayerbead top-up: pull one (reserved slot in pulls.ts), then
        // saber-Force healers for guaranteed beads (iotm:247-261; the healer
        // purpose is exempt from the outpost saber ban, Task 1). Yog-Urt
        // prep wants 3 equipped beads (spec §9).
        name: "Prayerbeads",
        // Post-currents the outpost hut NC is the beads shop and -combat is
        // productive; farming beads before `intenseCurrents` is told wastes
        // the hut NC roll (earlier bead income still flows from the grind
        // kills and the 315 shop branch).
        ready: () => monkeesStep() >= 9 && get("intenseCurrents"),
        completed: () => availableAmount(beads) >= 3,
        do: outpost,
        saberPurpose: "healer",
        // ash free_run(page_text, true) here, CCS:721-724 (burglar/raider)
        freeRunBanishes: true,
        combat: new CombatStrategy().forceItems($monster`Mer-kin healer`).freeRun(),
        outfit: () => ({
          modifier: "-combat, item",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
        }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          // Monkey paw wishes before the pull and the farm (upstream
          // farmPrayerbeads(), UTS:1013-1014 at 89982f5 wishes ahead of the
          // outpost loop; we also put the wish ahead of the pull — five
          // wishes a day are the cheaper budget).
          while (availableAmount(beads) < 3 && pawWish(beads));
          if (availableAmount(beads) < 3 && pullBudgetAllows(beads)) pullSequence(beads);
        },
        limit: { soft: 12, message: "Prayerbeads are not accumulating; check healer handling." },
      },
    ],
  };
}
