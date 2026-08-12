import { availableAmount, cliExecute } from "kolmafia";
import { $item, $location, $monster, $monsters, get, have } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const outpost = $location`The Mer-Kin Outpost`;
const beads = $item`Mer-kin prayerbeads`;

function stashboxDone(): boolean {
  return have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`) || get("corralUnlocked");
}

/** Shared +item farm shape for the pre-stashbox outpost regimes (ash
 * UTS:1924-2003: itdrop + freeKill while the lockkey is unknown; the CCS
 * banishes burglar/raider as non-droppers, CCS:702-707). */
const farmCombat = () =>
  new CombatStrategy().banish($monsters`Mer-kin burglar, Mer-kin raider`).kill();

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
        combat: farmCombat(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        prepare: () => recover(),
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
        combat: farmCombat(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        prepare: () => recover(),
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
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({ modifier: "-combat", familiar: sneakFamiliar() }),
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
        combat: new CombatStrategy().forceItems($monster`Mer-kin healer`).freeRun(),
        outfit: () => ({ modifier: "-combat, item", familiar: sneakFamiliar() }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          if (availableAmount(beads) < 3 && pullBudgetAllows(beads)) pullSequence(beads);
        },
        limit: { soft: 12, message: "Prayerbeads are not accumulating; check healer handling." },
      },
    ],
  };
}
