import { ActionDefaults, CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { availableAmount, haveEquipped, Location, Monster, mpCost, myLevel } from "kolmafia";
import { $effect, $item, $monsters, $phylum, $skill, have, Macro } from "libram";

import { freeMonsters } from "../resources/backup";
import { bangPotionRounds } from "../resources/bangpotions";

const myActions = [
  "ignore",
  "ignoreSoftBanish",
  "ignoreNoBanish",
  "kill",
  "killFree",
  "killHard",
  "banish",
  "killBanish",
  "abort",
  "killItem",
  "yellowRay",
  "forceItems",
  "freeRun",
] as const;
export type CombatActions = (typeof myActions)[number];

export const combatActions = myActions;

export class CombatStrategy extends BaseCombatStrategy.withActions(myActions) {}

export class MyActionDefaults implements ActionDefaults<CombatActions> {
  freeRun(target?: Monster | Location) {
    if (target instanceof Location && target.environment !== "underwater") {
      return fishMacro().step(killMacro(false));
    }
    return runMacro().step(fishMacro()).step(killMacro(false));
  }
  ignore(target?: Monster | Location) {
    return this.kill(target);
  }
  ignoreSoftBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  kill(_target?: Monster | Location) {
    return killMacro(false);
  }
  killHard(_target?: Monster | Location) {
    return killMacro(true);
  }
  killBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  ignoreNoBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  killFree() {
    return this.abort();
  }
  banish(target?: Monster | Location) {
    return fishMacro().step(this.kill(target));
  }
  abort() {
    return new Macro().abort();
  }
  killItem(target?: Monster | Location) {
    return this.kill(target);
  }
  yellowRay(target?: Monster | Location) {
    return this.killItem(target);
  }
  forceItems(target?: Monster | Location) {
    return this.killItem(target);
  }
}

export function killMacro(hard = false, options: { bullseye?: boolean } = {}): Macro {
  const { bullseye = true } = options;
  const result = new Macro();

  let leadingActions = 0;
  if (haveEquipped($item`Everfull Dart Holster`)) {
    if (bullseye && !hard && myLevel() >= 12 && !have($effect`Everything Looks Red`)) {
      result
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`);
      leadingActions += 5;
    } else {
      result.trySkill($skill`Darts: Throw at %part1`);
      leadingActions += 1;
    }
  }
  leadingActions += 1;
  leadingActions += 3;

  if (!hard) {
    const openers = new Macro();
    let anyOpener = false;
    if (have($skill`Micrometeorite`)) {
      openers.trySkill($skill`Micrometeorite`);
      anyOpener = true;
    }
    if (have($skill`Curse of Weaksauce`)) {
      const cost = mpCost($skill`Curse of Weaksauce`);
      openers.ifNot(`mpbelow ${cost}`, Macro.trySkill($skill`Curse of Weaksauce`));
      anyOpener = true;
    }
    if (anyOpener) result.step(openerOnce(openers, leadingActions + 1));
  }

  if (!haveEquipped($item`June cleaver`) && have($skill`Saucegeyser`)) {
    result.trySkill($skill`Saucegeyser`);
  }

  return result.attack().repeat();
}

export function runMacro(): Macro {
  return new Macro().tryItem($item`pulled indigo taffy`);
}

const shadowRiftBosses = $monsters`shadow cauldron, shadow matrix, shadow orrery, shadow scythe, shadow spire, shadow tongue`;

export function fishMacro(): Macro {
  if (!have($skill`Sea *dent: Talk to Some Fish`)) return new Macro();
  if (availableAmount($item`pristine fish scale`) >= 6) return new Macro();
  return Macro.ifNot(
    [...freeMonsters, ...shadowRiftBosses],
    Macro.ifNot($phylum`fish`, openerOnce(Macro.trySkill($skill`Sea *dent: Talk to Some Fish`), 3)),
  );
}

export function openerOnce(macro: Macro, round = 2): Macro {
  return Macro.ifNot(`pastround ${round + 1 + bangPotionRounds()}`, macro);
}

export function monsterMacro(macro: () => Macro, monsters: Monster | Monster[]): () => Macro {
  const targets = Array.isArray(monsters) ? monsters : [monsters];
  const guard = targets.map((monster) => `monsterid ${monster.id}`).join(" || ");
  return () => {
    const built = macro();
    return built.components.length === 0 ? new Macro() : Macro.if_(guard, built);
  };
}
