import { Location, myPrimestat, Stat, storageAmount, visitUrl } from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { sneakEffects } from "../../lib/moods";
import { selectFreeKill } from "../../resources/freekill";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";
import { summon, summonsAvailable } from "../../resources/summon";

const sword = $familiar`Sword of S Words`;
const payphone = $item`closed-circuit pay phone`;
const gothKid = $familiar`Artistic Goth Kid`;
const gap = $item`Greatest American Pants`;

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

const crayonMonsters = $monsters`Black Crayon Beast, Black Crayon Beetle, Black Crayon Constellation, Black Crayon Crimbo Elf, Black Crayon Demon, Black Crayon Elemental, Black Crayon Fish, Black Crayon Flower, Black Crayon Frat Orc, Black Crayon Goblin, Black Crayon Golem, Black Crayon Hippy, Black Crayon Hobo, Black Crayon Man, Black Crayon Manloid, Black Crayon Mer-kin, Black Crayon Penguin, Black Crayon Pirate, Black Crayon Shambling Monstrosity, Black Crayon Slime, Black Crayon Spiraling Shape, Black Crayon Undead Thing`;

function prop(): string {
  return guildQuestProp.get(myPrimestat()) ?? "questG09Muscle";
}

export function guildTasks(opts: { phonelessSwordOnly: boolean; unlockGuild: boolean }): Quest {
  return {
    name: "Openers",
    tasks: [
      {
        name: "Sword Imprint",
        ready: () =>
          have(sword) &&
          summonsAvailable() >= 3 &&
          (!opts.phonelessSwordOnly || !have(payphone)) &&
          selectFreeKill({ dropsMatter: true }) !== undefined,
        completed: () => get("swordOfSWordsMonster") !== null,
        do: () => summon($monster`sea cowboy`),
        choices: { 1589: "1&victim=776" },
        combat: new CombatStrategy()
          .macro(
            () => openerOnce(Macro.trySkill($skill`%fn, kill a lot of these guys`)),
            $monster`sea cowboy`,
          )
          .killFree($monster`sea cowboy`)
          .kill(),
        outfit: { modifier: "item", familiar: sword },
        prepare: () => recover(),
        limit: { tries: 2 },
      },
      {
        name: "Guild Start",
        ready: () => opts.unlockGuild && have(payphone),
        completed: () => questStepOf(prop()) >= 0,
        do: () => void visitUrl("guild.php?place=challenge"),
        outfit: () => (myPrimestat() === $stat`Moxie` ? { pants: $item`tearaway pants` } : {}),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Guild Test",
        ready: () => opts.unlockGuild && questStepOf(prop()) === 0,
        completed: () => questStepOf(prop()) !== 0,
        do: guildTestZone.get(myPrimestat()) ?? $location`The Outskirts of Cobb's Knob`,
        combat: new CombatStrategy().kill(crayonMonsters).freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: have(gothKid) ? gothKid : sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
        }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          if (!have(gap) && storageAmount(gap) > 0 && pullBudgetAllows(gap)) pullSequence(gap);
        },
        limit: {
          soft: 12,
          message: "The guild test grind is unlucky; rerun or finish it manually.",
        },
      },
      {
        name: "Guild Finish",
        ready: () => opts.unlockGuild && questStepOf(prop()) > 0,
        completed: () => questStepOf(prop()) === 999 && get("questG03Ego") !== "unstarted",
        do: (): void => {
          if (questStepOf(prop()) !== 999) visitUrl("guild.php?place=challenge");
          if (get("questG03Ego") === "unstarted") {
            visitUrl("guild.php?place=ocg");
            visitUrl("guild.php?place=ocg");
          }
        },
        freeaction: true,
        limit: {
          tries: 2,
          message: "The guild did not open (questG03Ego still unstarted); visit the guild by hand.",
        },
      },
    ],
  };
}
