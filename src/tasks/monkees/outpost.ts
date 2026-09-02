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

const farmBanished = $monsters`Mer-kin burglar, Mer-kin raider`;

const golem = $monster`Black Crayon Golem`;
const eagle = $familiar`Patriotic Eagle`;

export function screechTurn(): boolean {
  return (
    have(eagle) &&
    have($item`server room key`) &&
    !get("banishedPhyla").includes("construct") &&
    get("_monsterHabitatsFightsLeft", 0) === 1 &&
    get("_monsterHabitatsMonster") === golem &&
    get("_monsterHabitatsRecalled", 0) >= 2
  );
}

function recallPending(): boolean {
  return (
    have($skill`Just the Facts`) &&
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
        name: "Outpost Stashbox",
        ready: () => get("merkinLockkeyMonster") !== null,
        completed: () => stashboxDone(),
        do: outpost,
        freeRunBanishes: true,
        combat: new CombatStrategy().kill($monster`Mer-kin healer`).freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
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
        name: "Prayerbeads",
        ready: () => monkeesStep() >= 9 && get("intenseCurrents"),
        completed: () => availableAmount(beads) >= 3,
        do: outpost,
        saberPurpose: "healer",
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
          while (availableAmount(beads) < 3 && pawWish(beads));
          if (availableAmount(beads) < 3 && pullBudgetAllows(beads)) pullSequence(beads);
        },
        limit: { soft: 12, message: "Prayerbeads are not accumulating; check healer handling." },
      },
    ],
  };
}
