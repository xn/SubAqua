import { ActionDefaults, CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { haveEquipped, Location, Monster, mpCost, myLevel } from "kolmafia";
import { $effect, $item, $skill, have, Macro } from "libram";

const myActions = [
  "ignore", // Task doesn't care what happens
  "ignoreSoftBanish", // Do not seek out a banish, but it is advantageous to have it
  "ignoreNoBanish", // Task doesn't care what happens, as long as it is not banished
  "kill", // Task needs to kill it, with or without a free kill
  "killFree", // Task needs to kill it with a free kill
  "killHard", // Task needs to kill it without using a free kill (boss / already free)
  "banish", // Task doesn't care what happens, but banishing is useful
  "killBanish", // Banishing is useful, but we prefer to still trigger end-of-combat things
  "abort", // Abort the macro and the script; an error has occurred
  "killItem", // Kill with an item boost
  "yellowRay", // Kill with a drop-everything YR action
  "forceItems", // Force items to drop with a YR or saber
  "freeRun", // Run away from the monster
] as const;
export type CombatActions = (typeof myActions)[number];

/** The action list itself, for engine code that has to ask "does this task
 * handle any monster with something other than X?" (grimoire's CombatStrategy
 * exposes where(action) but not the whole monster -> action map). */
export const combatActions = myActions;

export class CombatStrategy extends BaseCombatStrategy.withActions(myActions) {}

/**
 * Defaults when the resources layer provides nothing for an action.
 * Degradations are deliberate and explicit per spec §2: banish, the ignore family,
 * killItem, yellowRay and forceItems all degrade to kill; freeRun is taffy-or-nothing
 * underwater and a plain kill on the surface (the indigo taffy only works underwater,
 * modifiers.txt:11752-11754, so "nothing" there would stall the fight);
 * killFree ABORTS (a task that requires a free kill must be given one).
 */
export class MyActionDefaults implements ActionDefaults<CombatActions> {
  freeRun(target?: Monster | Location) {
    // grimoire hands the default action its task location (combat.js:269).
    if (target instanceof Location && target.environment !== "underwater") {
      return killMacro(false);
    }
    return runMacro();
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

  // Delevel openers, ash CCS develOpeners() (CCS:171-198), which cleanUp()
  // (CCS:238-300) throws before the nuke on every ordinary fight — freeRounds()
  // is 1 only for the colosseum six, so leadWithNuke is false and the openers
  // go first. Time-Spinner is in the ash's ladder and deliberately not here:
  // SubAqua dropped the item.
  //
  // The ash gates each on my_buffedstat(moxie) + 10 < monster_attack(). BALLS
  // has no monster-attack predicate (its conditions are hp/mp/monsterhp,
  // round/pastround, has(combat)item/skill, haseffect, monstername/id/phylum/
  // element, snarfblat, match, times — nothing reads the monster's attack), and
  // killMacro is built once per task at customize() time, before the monster is
  // known, so the comparison cannot be pre-computed either. Micrometeorite is
  // therefore cast unconditionally: it has NO daily ration — _micrometeoriteUses
  // models POTENCY, which decays across the day from a 25% delevel to a 10%
  // floor and resets at rollover (the ten-a-day limit belongs to
  // Macrometeorite). The ash pays the same price, since its cleanUp() casts it
  // on every fight too; over-casting only walks that decay down sooner.
  //
  // Weaksauce keeps the ash's SECOND condition, my_mp() >= mp_cost, which BALLS
  // CAN express as `mpabove`: the cost is read at macro-build time (mpCost
  // moves with buffs, so a mid-task shift is not tracked) and the macro tests
  // live MP each round.
  //
  // Never on `hard`: killMacro(true) is the boss / already-free path, and both
  // openers deal damage — enough to trip Shub-Jigguwatt's retaliation.
  if (!hard) {
    if (have($skill`Micrometeorite`)) result.trySkill($skill`Micrometeorite`);
    if (have($skill`Curse of Weaksauce`)) {
      // `mpabove N` is MP > N, so the ash's >= becomes cost - 1.
      const cost = mpCost($skill`Curse of Weaksauce`);
      result.if_(`mpabove ${Math.max(0, cost - 1)}`, Macro.trySkill($skill`Curse of Weaksauce`));
    }
  }

  if (!haveEquipped($item`June cleaver`) && have($skill`Saucegeyser`)) {
    // Fail-soft so MP gating never hard-stops combat.
    result.trySkill($skill`Saucegeyser`);
  }

  return result.attack().repeat();
}

export function runMacro(): Macro {
  return new Macro().tryItem($item`pulled indigo taffy`);
}
