import {
  abort,
  equippedAmount,
  itemAmount,
  Item,
  Monster,
  monsterAttack,
  mpCost,
  myBuffedstat,
  myClass,
  myHp,
  myLocation,
  myMaxhp,
  myMp,
} from "kolmafia";
import {
  $class,
  $effect,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { killMacro } from "../../engine/combat";
import { shubDelevelers, shubDelevelFactor } from "../../lib/shub";
import { currentPolicy } from "../../resources/policy";

export type CombatFilter = (round: number, monster: Monster, text: string) => string;

const bladeswitcher = $monster`Mer-kin bladeswitcher`;
// Named-boss names contain commas, so no $monsters template (it splits on
// commas); six individual constants (freeRounds(), CCS:165-174).
const gladiators = [
  $monster`Mer-kin balldodger`,
  $monster`Mer-kin netdragger`,
  bladeswitcher,
  $monster`Georgepaul, the Balldodger`,
  $monster`Johnringo, the Netdragger`,
  $monster`Ringogeorge, the Bladeswitcher`,
];

/**
 * Bladeswitcher reflect tells (CCS:209-217). ONLY the regular bladeswitcher:
 * the netdragger must not stall (his special halves max HP once — stalling
 * ten rounds vs ~1000/round healing loses a four-round fight, CCS:129-132)
 * and Ringogeorge shares the name but has no specials (CCS:133-138).
 */
function reflectStall(monster: Monster, text: string): number {
  if (monster !== bladeswitcher) return 0;
  if (text.includes("twirling his blade around himself")) return 10; // live
  if (text.includes("an especially dope move")) return 11; // wind-up, one round early
  return 0;
}

/** Stall stock guard (CCS:288-303): while Yog-Urt is pending, one sea gel and
 * one Pungent Unguent are hers. */
function stallSpare(it: Item): boolean {
  const reserved = !get("yogUrtDefeated") ? 1 : 0;
  return itemAmount(it) > reserved;
}

/** One stall round (CCS:329-337). Thrown items deal no damage -> reflect
 * nothing; every branch advances the round; free delevelers are BANNED here
 * (once-per-combat skills may already be spent — a refused submission would
 * not advance the round, CCS:305-328). */
function stallAction(): string {
  if (myHp() * 2 < myMaxhp() && stallSpare($item`sea gel`)) {
    return Macro.tryItem($item`sea gel`).toString();
  }
  if (stallSpare($item`Doc Galaktik's Pungent Unguent`)) {
    return Macro.tryItem($item`Doc Galaktik's Pungent Unguent`).toString();
  }
  if (stallSpare($item`sea gel`)) return Macro.tryItem($item`sea gel`).toString();
  return Macro.attack().toString();
}

/**
 * The gladiator regime (port of cleanUp(), CCS:339-495, plus the colosseum
 * free_kill rule CCS:6-45): nuke-first on the special-free wind-up round,
 * delevel openers once on a clear round, reflect-stall with renewal cap,
 * Club 'Em Back in Time as the only colosseum-legal free kill, spell ladder,
 * 3-strikes stuck-round abort. Also serves the Gymnasium (same monsters,
 * CCS:1199-1218) — there it additionally banks skate-war NC forcers and
 * throws dreadscroll hint scrolls (opts.gym).
 *
 * opts.warOpen: the caller's already-computed skate-war state. The forcer
 * casts are only worth a round while the war is on (CCS:1067-1070); a filter
 * must never page-load per round, so the caller passes it in.
 */
export function gladiatorFilter(opts: { gym?: boolean; warOpen?: boolean } = {}): CombatFilter {
  let stallLeft = 0;
  let stalled = 0;
  let openersDone = false;
  let microUsed = false;
  let spinnerUsed = false;
  let weaksauceUsed = false;
  let mortarFired = false;
  let forcerBanked = false;
  let healTossed = false;
  let killTossed = false;
  let lastRound = -1;
  let lastHp = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3)
        abort(
          "Gladiator fight is not advancing rounds; aborting rather than looping (CCS:490-492).",
        );
    } else {
      stuck = 0;
      if (stallLeft > 0) {
        stallLeft -= 1;
        stalled += 1;
      }
    }
    lastRound = round;

    if (!gladiators.includes(monster)) return killMacro(false).toString(); // wanderers

    // Reflect bookkeeping off this round's page (= previous action's response).
    const renewed = reflectStall(monster, text);
    if (renewed > 0 && stalled < 14 && renewed > stallLeft) stallLeft = renewed; // renewal cap CCS:393-415
    if (stallLeft === 0 && monster === bladeswitcher && lastHp >= 0 && lastHp - myHp() > 400) {
      stallLeft = 10; // wording-independent backstop, CCS:474-477
    }
    lastHp = myHp();
    if (stallLeft > 0) return stallAction();

    // Gymnasium extras, clean rounds only (CCS:1199-1213): bank a skate-war
    // forcer (only while the war is open, CCS:1067-1070), throw dreadscroll
    // hint scrolls.
    if (opts.gym) {
      if (opts.warOpen === true && !forcerBanked && text.includes("Launch spikolodon spikes")) {
        forcerBanked = true;
        return Macro.trySkill($skill`Launch spikolodon spikes`).toString();
      }
      if (opts.warOpen === true && !forcerBanked && text.includes("McHugeLarge Avalanche")) {
        forcerBanked = true;
        return Macro.trySkill($skill`McHugeLarge Avalanche`).toString();
      }
      if (
        !healTossed &&
        get("dreadScroll2", 0) === 0 &&
        itemAmount($item`Mer-kin healscroll`) > 0
      ) {
        healTossed = true;
        return Macro.tryItem($item`Mer-kin healscroll`).toString();
      }
      if (
        !killTossed &&
        get("dreadScroll5", 0) === 0 &&
        itemAmount($item`Mer-kin killscroll`) > 0
      ) {
        killTossed = true; // gladiators are mer-kin phylum (monsters.txt:427-436)
        return Macro.tryItem($item`Mer-kin killscroll`).toString();
      }
    }

    const geyser = $skill`Saucegeyser`;
    const storm = $skill`Saucestorm`;
    const canGeyser = have(geyser) && myMp() >= mpCost(geyser);
    const canStorm = have(storm) && myMp() >= mpCost(storm);

    // Nuke-first: round 1 is special-free — every special needs a wind-up
    // (freeRounds()=1, CCS:143-174; bbee792: "a first-round nuke ended 45 of
    // 47 ordinary fights"). Skip openers while the nuke leads.
    const leadWithNuke = round <= 1 && (canGeyser || canStorm);
    if (!leadWithNuke && !openersDone) {
      // develOpeners (CCS:232-265): fire only while under-develeveled; each
      // response is read for the reflect on the NEXT call. Micrometeorite has
      // NO daily cap (_micrometeoriteUses is potency decay, 9e148ee).
      const underleveled = myBuffedstat($stat`Moxie`) + 10 < monsterAttack();
      if (underleveled && !microUsed && have($skill`Micrometeorite`)) {
        microUsed = true;
        return Macro.trySkill($skill`Micrometeorite`).toString();
      }
      if (underleveled && !spinnerUsed && itemAmount($item`Time-Spinner`) > 0) {
        spinnerUsed = true;
        return Macro.tryItem($item`Time-Spinner`).toString();
      }
      if (
        underleveled &&
        !weaksauceUsed &&
        have($skill`Curse of Weaksauce`) &&
        myMp() >= mpCost($skill`Curse of Weaksauce`)
      ) {
        weaksauceUsed = true;
        return Macro.trySkill($skill`Curse of Weaksauce`).toString();
      }
      openersDone = true;
    }

    // Club 'Em Back in Time: the one instakill that works on instakill-immune
    // gladiators (30% max HP + frees the fight); colosseum-only, 5/day,
    // mid-tier policy (CCS:24-45). Clean rounds only — clubbing a reflecting
    // bladeswitcher returns the damage.
    if (
      myLocation() === $location`Mer-kin Colosseum` &&
      currentPolicy().allowClubEmBackInTime &&
      get("_clubEmTimeUsed") < 5 &&
      text.includes("Club 'Em Back in Time")
    ) {
      return Macro.trySkill($skill`Club 'Em Back in Time`).toString();
    }

    // Kill ladder (CCS:433-472): LTS for muscle-leading Seal Clubbers OUTSIDE
    // the colosseum vs low phys resistance; else Saucegeyser; else Stuffed
    // Mortar Shell (never vs the bladeswitcher — its damage lands a round
    // late, unprotectable) + Saucestorm; else plain attacks.
    if (
      myClass() === $class`Seal Clubber` &&
      have($skill`Lunging Thrust-Smack`) &&
      myBuffedstat($stat`Muscle`) >= myBuffedstat($stat`Mysticality`) &&
      myLocation() !== $location`Mer-kin Colosseum` &&
      monster.physicalResistance < 50 &&
      myMp() >= mpCost($skill`Lunging Thrust-Smack`)
    ) {
      return Macro.trySkill($skill`Lunging Thrust-Smack`).toString();
    }
    if (canGeyser) return Macro.trySkill(geyser).toString();
    if (canStorm) {
      if (
        !mortarFired &&
        monster !== bladeswitcher &&
        have($skill`Stuffed Mortar Shell`) &&
        myMp() >= mpCost($skill`Stuffed Mortar Shell`) + mpCost(storm)
      ) {
        mortarFired = true;
        return Macro.trySkill($skill`Stuffed Mortar Shell`).toString();
      }
      return Macro.trySkill(storm).toString();
    }
    return Macro.attack().toString();
  };
}

// Yog-Urt item ladders (CCS:499-517; the ash's duplicate mouthsoap entry is
// an $items[] artifact, collapsed here). Dedup is closure-local instead of
// parsing _lastCombatActions.
const yogDelevelOrder = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;
const yogHealOrder = $items`sea gel, Mer-kin healscroll, waterlogged scroll of healing, soggy used band-aid, New Age healing crystal`;

/**
 * Yog-Urt, Right Door (CCS:1230-1249). Phys: 100 (monsters.txt:804) — spells
 * only. Two funkslinged deleveler+heal pairs (heal solo when moxie already
 * outpaces her attack), bead-count-conditional extra heals, the
 * elixir+unguent pair, then the spell ladder.
 */
export function yogUrtFilter(): CombatFilter {
  // Task 12 amends: fifth heal throw at one prayerbead.
  const thrown = new Set<Item>();
  let step = 0;
  let lastRound = -1;
  let stuck = 0;

  const next = (order: Item[]): Item | undefined =>
    order.find((it) => itemAmount(it) > 0 && !thrown.has(it));

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Yog-Urt fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (step < 2) {
      step += 1;
      const deleveler =
        myBuffedstat($stat`Moxie`) + 10 > monsterAttack() ? undefined : next(yogDelevelOrder);
      const heal = next(yogHealOrder);
      if (!heal) {
        abort(
          "Out of Yog-Urt healing items mid-fight (CCS:510-517) — acquire sea gel / Mer-kin healscroll / waterlogged scroll of healing and rerun.",
        );
      } else if (deleveler && have($skill`Ambidextrous Funkslinging`)) {
        thrown.add(deleveler);
        thrown.add(heal);
        return Macro.tryItem([deleveler, heal]).toString();
      } else {
        thrown.add(heal);
        return Macro.tryItem(heal).toString();
      }
    }
    if (step === 2) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 3) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 3) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 2) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 4) {
      step += 1;
      if (
        itemAmount($item`Doc Galaktik's Homeopathic Elixir`) > 0 &&
        itemAmount($item`Doc Galaktik's Pungent Unguent`) > 0 &&
        have($skill`Ambidextrous Funkslinging`)
      ) {
        return Macro.tryItem([
          $item`Doc Galaktik's Homeopathic Elixir`,
          $item`Doc Galaktik's Pungent Unguent`,
        ]).toString();
      }
    }
    if (have($skill`Saucegeyser`) && myMp() >= mpCost($skill`Saucegeyser`)) {
      return Macro.trySkill($skill`Saucegeyser`).toString();
    }
    if (have($skill`Saucestorm`) && myMp() >= mpCost($skill`Saucestorm`)) {
      return Macro.trySkill($skill`Saucestorm`).toString();
    }
    return Macro.attack().toString(); // her HP is 750; the attack tail is the ash's safety net (CCS:1247-1248)
  };
}

/**
 * Shub-Jigguwatt, Left Door (CCS:1251-1256, 539-568). Elem: 95
 * (monsters.txt:606) — physical only, and delevel items deal no damage (his
 * retaliation doubles on damage). Funksling same-item pairs while the
 * projection stays above the ~0.25 floor; then swing until it ends. Losing
 * is a sanctioned retry (engine post() Shub-loss carve-out).
 */
export function shubFilter(): CombatFilter {
  let remaining = have($effect`Null Afternoon`) ? 0.05 : 1.0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Shub fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (remaining > 0.05) {
      const d = shubDelevelers.find((it) => itemAmount(it) > 0);
      if (d) {
        const f = shubDelevelFactor(d);
        if (
          itemAmount(d) >= 2 &&
          remaining * f * f >= 0.2 &&
          have($skill`Ambidextrous Funkslinging`)
        ) {
          remaining *= f * f;
          return Macro.tryItem([d, d]).toString();
        }
        remaining *= f;
        return Macro.tryItem(d).toString();
      }
      remaining = 0; // stock exhausted; prep math should have prevented this
    }
    return Macro.attack().toString();
  };
}

/** Center Door (CCS:1258-1266): two Raise Backup Dancers when known (pure
 * damage boost — skipped, not errored, on other classes), then the ladder. */
export function centerDoorFilter(): CombatFilter {
  let dancers = 0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3)
        abort("Seaceress fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (
      dancers < 2 &&
      have($skill`Raise Backup Dancer`) &&
      myMp() >= mpCost($skill`Raise Backup Dancer`)
    ) {
      dancers += 1;
      return Macro.trySkill($skill`Raise Backup Dancer`).toString();
    }
    if (have($skill`Saucegeyser`) && myMp() >= mpCost($skill`Saucegeyser`)) {
      return Macro.trySkill($skill`Saucegeyser`).toString();
    }
    if (have($skill`Saucestorm`) && myMp() >= mpCost($skill`Saucestorm`)) {
      if (
        have($skill`Stuffed Mortar Shell`) &&
        myMp() >= mpCost($skill`Stuffed Mortar Shell`) + mpCost($skill`Saucestorm`)
      ) {
        return Macro.trySkill($skill`Stuffed Mortar Shell`).toString();
      }
      return Macro.trySkill($skill`Saucestorm`).toString();
    }
    return Macro.attack().toString();
  };
}
