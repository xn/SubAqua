import { equip, Location, myPrimestat, Stat, visitUrl } from "kolmafia";
import { $familiar, $item, $location, $monster, $skill, $stat, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { summon, summonsAvailable } from "../../resources/summon";

const sword = $familiar`Sword of S Words`;
const payphone = $item`closed-circuit pay phone`;

/** Guild-unlock quest pref and test zone per mainstat (ash unlockGuild()
 * UTS:1176-1220). */
const guildQuestProp: Map<Stat, string> = new Map([
  [$stat`Muscle`, "questG09Muscle"],
  [$stat`Mysticality`, "questG07Myst"],
  [$stat`Moxie`, "questG08Moxie"],
]);
const guildTestZone: Map<Stat, Location> = new Map([
  [$stat`Muscle`, $location`The Outskirts of Cobb's Knob`],
  [$stat`Mysticality`, $location`The Haunted Pantry`],
  [$stat`Moxie`, $location`The Sleazy Back Alley`],
]);

function prop(): string {
  return guildQuestProp.get(myPrimestat()) ?? "questG09Muscle";
}

export function guildTasks(opts: { phonelessSwordOnly: boolean; unlockGuild: boolean }): Quest {
  return {
    name: "Openers",
    tasks: [
      {
        // Imprint the Sword of S Words on the sea cowboy (id 776) so every
        // later cowboy kill duplicates sea-lasso drops (ash UTS:1760-1767;
        // doSWord() UTS:569-578). High shiny always; others only when the
        // pay phone is absent (the ash's exact gate).
        name: "Sword Imprint",
        ready: () =>
          have(sword) && summonsAvailable() >= 3 && (!opts.phonelessSwordOnly || !have(payphone)),
        completed: () => get("swordOfSWordsMonster") !== null,
        do: () => summon($monster`sea cowboy`),
        choices: { 1589: "1&victim=776" },
        combat: new CombatStrategy()
          .macro(Macro.trySkill($skill`%fn, kill a lot of these guys`), $monster`sea cowboy`)
          .kill(),
        outfit: { modifier: "item", familiar: sword },
        prepare: () => recover(),
        limit: { tries: 2 },
      },
      {
        name: "Guild Start",
        ready: () => opts.unlockGuild && have(payphone),
        completed: () => questStepOf(prop()) >= 0,
        do: (): void => {
          // Moxie shortcut: tearaway pants skip the test grind (UTS:1186-1190).
          if (myPrimestat() === $stat`Moxie` && have($item`tearaway pants`)) {
            equip($item`tearaway pants`);
          }
          visitUrl("guild.php?place=challenge");
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Guild Test",
        ready: () => opts.unlockGuild && questStepOf(prop()) === 0,
        completed: () => questStepOf(prop()) !== 0,
        do: () => guildTestZone.get(myPrimestat()) ?? $location`The Outskirts of Cobb's Knob`,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        prepare: () => recover(),
        limit: {
          soft: 12,
          message: "The guild test grind is unlucky; rerun or finish it manually.",
        },
      },
      {
        name: "Guild Finish",
        ready: () => opts.unlockGuild && questStepOf(prop()) > 0 && questStepOf(prop()) < 999,
        completed: () => questStepOf(prop()) === 999,
        do: (): void => {
          visitUrl("guild.php?place=challenge");
          // Open the guild proper (ash UTS:1774-1776).
          visitUrl("guild.php?place=ocg");
          visitUrl("guild.php?place=ocg");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
