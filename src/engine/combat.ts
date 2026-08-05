import { ActionDefaults, CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { haveEquipped, Location, Monster, myLevel } from "kolmafia";
import { $effect, $item, $skill, have, Macro } from "libram";

const myActions = [
  "ignore", // Task doesn't care what happens
  "ignoreSoftBanish", // Do not seek out a banish, but it is advantageous to have it
  "ignoreNoBanish", // Task doesn't care what happens, as long as it is not banished
  "kill", // Task needs to kill it, with or without a free kill
  "killFree", // Task needs to kill it with a free kill
  "killHard", // Task needs to kill it without using a free kill (i.e., boss, or already free)
  "banish", // Task doesn't care what happens, but banishing is useful
  "killBanish", // Banishing is useful, but we prefer to still trigger end-of-combat things.
  "abort", // Abort the macro and the script; an error has occured
  "killItem", // Kill with an item boost,
  "yellowRay", // Kill with a drop-everything YR action
  "forceItems", // Force items to drop with a YR or saber
  "freeRun", // Run away from the monster
] as const;
export type CombatActions = (typeof myActions)[number];
export class CombatStrategy extends BaseCombatStrategy.withActions(myActions) {
  // empty
}
export class MyActionDefaults implements ActionDefaults<CombatActions> {
  freeRun(_target?: Monster | Location) {
    return runMacro();
  }

  ignore(target?: Monster | Location) {
    return this.kill(target);
  }

  ignoreSoftBanish(target?: Monster | Location) {
    return this.kill(target);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  kill(target?: Monster | Location) {
    return killMacro(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  killHard(target?: Monster | Location) {
    return killMacro(true);
  }

  killBanish(target: Monster | Location | undefined) {
    return this.kill(target);
  }

  ignoreNoBanish(target?: Monster | Location) {
    return this.kill(target);
  }

  killFree() {
    return this.abort();
  } // Abort if no resource provided

  banish(target?: Monster | Location) {
    return this.kill(target);
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

export function killMacro(hard?: boolean): Macro {
  const result = new Macro();

  if (haveEquipped($item`Everfull Dart Holster`)) {
    if (!hard && myLevel() >= 12 && !have($effect`Everything Looks Red`)) {
      // Only once we don't need Ready to Eat for leveling
      result
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`);
    } else {
      result.trySkill($skill`Darts: Throw at %part1`);
    }
  }

  if (!haveEquipped($item`June cleaver`) && have($skill`Saucegeyser`)) {
    // Fail-soft to avoid stat-point/MP gating hard-stopping combat.
    result.trySkill($skill`Saucegeyser`);
  }

  return result.attack().repeat();
}

export function runMacro(): Macro {
  return new Macro().tryItem($item`pulled indigo taffy`);
}

export function replaceActions<T extends string>(combat: BaseCombatStrategy<T>, from: T, to: T) {
  combat.action(
    to,
    (combat.where(from) ?? []).filter((mon: Monster) => !mon.boss),
  );
  if (combat.getDefaultAction() === from) combat.action(to);
}
