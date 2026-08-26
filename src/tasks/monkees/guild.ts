import { equip, Location, myPrimestat, Stat, storageAmount, visitUrl } from "kolmafia";
import {
  $familiar,
  $item,
  $location,
  $monster,
  $monsters,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { sneakEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";
import { summon, summonsAvailable } from "../../resources/summon";

// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const sword = $familiar`Sword of S Words`;
const payphone = $item`closed-circuit pay phone`;
const gothKid = $familiar`Artistic Goth Kid`;
const gap = $item`Greatest American Pants`;

/** Guild-unlock quest pref and test zone per mainstat (ash unlockGuild()
 * UTS:1176-1220 at ab1105e; UTS:1100-1145 at 89982f5). */
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

/** The Artistic Goth Kid's crayon wanderers (monsters.txt:1638-1660): free
 * fights that refund the turn and drop crayon shavings at 100% — Shub's
 * deleveler. Killed, never run from (ash CCS free_monster() gate,
 * G:71-76 at 89982f5). */
const crayonMonsters = $monsters`Black Crayon Beast, Black Crayon Beetle, Black Crayon Constellation, Black Crayon Crimbo Elf, Black Crayon Demon, Black Crayon Elemental, Black Crayon Fish, Black Crayon Flower, Black Crayon Frat Orc, Black Crayon Goblin, Black Crayon Golem, Black Crayon Hippy, Black Crayon Hobo, Black Crayon Man, Black Crayon Manloid, Black Crayon Mer-kin, Black Crayon Penguin, Black Crayon Pirate, Black Crayon Shambling Monstrosity, Black Crayon Slime, Black Crayon Spiraling Shape, Black Crayon Undead Thing`;

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
          // eslint-disable-next-line libram/verify-constants -- Sword of S Words skill, plugin data lags (classskills.txt:1170)
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
        // The Guilded Youth tests are NONCOMBAT hunts (questslog.txt:39-41:
        // huge sausage / poltersandwich / your own pants), so every fight
        // here is a wasted turn: run from it for free when a source lands,
        // kill it otherwise (the surface degrade in MyActionDefaults). The
        // ash free-runs the same way and pulls the GAP for its three navel
        // runaways (UTS:1100-1145, CCS:505-520 at 89982f5); the Goth Kid's
        // crayon wanderers are the one fight worth taking.
        name: "Guild Test",
        ready: () => opts.unlockGuild && questStepOf(prop()) === 0,
        completed: () => questStepOf(prop()) !== 0,
        do: guildTestZone.get(myPrimestat()) ?? $location`The Outskirts of Cobb's Knob`,
        combat: new CombatStrategy().kill(crayonMonsters).freeRun(),
        outfit: () => ({
          modifier: "-combat",
          familiar: have(gothKid) ? gothKid : sneakFamiliar(),
        }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          // A stored GAP is worth its pull here: three free runaways now,
          // and it releases the escape-gear pull reservation for later.
          if (!have(gap) && storageAmount(gap) > 0 && pullBudgetAllows(gap)) pullSequence(gap);
        },
        limit: {
          soft: 12,
          message: "The guild test grind is unlucky; rerun or finish it manually.",
        },
      },
      {
        // Turn the item in, then open the guild proper (ash UTS:1774-1776 at
        // ab1105e). Completion keys on questG03Ego, not the test pref: the
        // tearaway-pants shortcut finishes the moxie test on the spot, and a
        // finished-test gate skipped the OCG visits entirely (upstream fix
        // c8e98d6).
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
