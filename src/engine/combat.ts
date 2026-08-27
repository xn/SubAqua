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

  // Rounds the macro can burn ahead of the delevel openers, for their
  // openerOnce() guard below. Every submitted action advances a round.
  let leadingActions = 0;
  if (haveEquipped($item`Everfull Dart Holster`)) {
    if (!hard && myLevel() >= 12 && !have($effect`Everything Looks Red`)) {
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
  // ...plus the engine's own round-1 sea lasso on an underwater task
  // (engine.ts customize()), which killMacro cannot see from here.
  leadingActions += 1;

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
  // CAN express — as the negation of `mpbelow`. There is no `mpabove`: mafia's
  // predicate table (relay/macrohelper.6.js:101-116) has mpbelow /
  // mppercentbelow / hpbelow / hppercentbelow / monsterhpabove / monsterhpbelow
  // and no mp- or hp-above at all, and mafia writes this very test as
  // `if !mpbelow <cost>` (Macrofier.java:537). The cost is read at macro-build
  // time (mpCost moves with buffs, so a mid-task shift is not tracked); the
  // macro tests live MP each round.
  //
  // Never on `hard`: killMacro(true) is the boss / already-free path, and both
  // openers deal damage — enough to trip Shub-Jigguwatt's retaliation.
  //
  // Both are once per combat, so they carry the same openerOnce() round guard
  // as the task macros — with the threshold raised past the dart chain and the
  // lasso, which would otherwise push these casts out of the window entirely.
  if (!hard) {
    const openers = new Macro();
    let anyOpener = false;
    if (have($skill`Micrometeorite`)) {
      openers.trySkill($skill`Micrometeorite`);
      anyOpener = true;
    }
    if (have($skill`Curse of Weaksauce`)) {
      // !mpbelow cost is exactly my_mp() >= cost.
      const cost = mpCost($skill`Curse of Weaksauce`);
      openers.ifNot(`mpbelow ${cost}`, Macro.trySkill($skill`Curse of Weaksauce`));
      anyOpener = true;
    }
    if (anyOpener) result.step(openerOnce(openers, leadingActions + 1));
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

/**
 * Round-guard a once-per-combat opener (the garbo fork combat.ts:333-340, :618-631 and
 * the comment there): "if the fight outlives the macro, mafia re-runs it from
 * the top, and re-casting a once-per-combat skill aborts mid-fight". The abort
 * drops the rest of the fight on mafia's default action — a lost turn, or on a
 * corral fight (cow HP 900 behind Def 675, exactly the fights that outlive a
 * macro) a lost combat and a hard post() abort.
 *
 * How certain the hazard is depends on the step. For ITEMS it is the garbo fork's
 * measured finding: `hascombatitem` only asks whether the item is in inventory,
 * and a once-per-fight item stays there after use, so a re-run re-throws it and
 * aborts. For SKILLS it is a precaution: libram's trySkill() emits
 * `if hasskill X`, which asks whether the skill is on the fight page rather
 * than whether its once-per-combat use is spent, and KoL does not reliably drop
 * a spent skill from that page. The guard costs nothing either way.
 *
 * `round` is the last round the opener may still fire on, and 2 rather than 1
 * is deliberate: `pastround N` is true once the round counter is past N
 * (macrohelper.6.js:101-116 lists pastround among the numeric predicates) and
 * every submitted action advances a round, so on an underwater task the
 * engine's own round-1 lasso injection (engine.ts customize(),
 * `Macro.ifNot("pastround 1", tryItem(sea lasso))`) already pushes a task
 * macro's opener to round 2. `!pastround 1` would skip it for the whole
 * lasso-training phase. Callers with more actions ahead of the opener —
 * killMacro's dart chain — pass a bigger number.
 *
 * The guard is one-directional: it blocks a re-run that lands past `round`,
 * which is the realistic case (a fight long enough to outlive the macro), but a
 * re-entry that happened to land ON round 2 could still double-fire. Same
 * threshold, and the same residual, as the garbo fork.
 */
export function openerOnce(macro: Macro, round = 2): Macro {
  return Macro.ifNot(`pastround ${round}`, macro);
}
