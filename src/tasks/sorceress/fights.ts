import {
  abort,
  currentRound,
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
  myFamiliar,
  myMaxhp,
  myMp,
  haveEquipped,
  Familiar,
} from "kolmafia";
import {
  $class,
  $effect,
  $item,
  $items,
  $location,
  $monster,
  $phylum,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { killMacro } from "../../engine/combat";
import { belowHpFloor, floorClearingHeal, stallSpare } from "../../lib";
import { shubDelevelers, shubDelevelFactor } from "../../lib/shub";
import { selectFreeRun } from "../../resources/freerun";
import { currentPolicy } from "../../resources/policy";

export type CombatFilter = (round: number, monster: Monster, text: string) => string;

const bladeswitcher = $monster`Mer-kin bladeswitcher`;
const gladiators = [
  $monster`Mer-kin balldodger`,
  $monster`Mer-kin netdragger`,
  bladeswitcher,
  $monster`Georgepaul, the Balldodger`,
  $monster`Johnringo, the Netdragger`,
  $monster`Ringogeorge, the Bladeswitcher`,
];

function reflectStall(monster: Monster, text: string): number {
  if (monster !== bladeswitcher) return 0;
  if (text.includes("twirling his blade around himself")) return 10;
  if (text.includes("an especially dope move")) return 11;
  return 0;
}

function stallAction(): string {
  if (myHp() * 2 < myMaxhp() && stallSpare($item`sea gel`)) {
    return Macro.tryItem($item`sea gel`).toString();
  }
  if (belowHpFloor()) {
    const heal = floorClearingHeal();
    if (heal) return Macro.tryItem(heal).toString();
  }
  if (stallSpare($item`Doc Galaktik's Pungent Unguent`)) {
    return Macro.tryItem($item`Doc Galaktik's Pungent Unguent`).toString();
  }
  if (stallSpare($item`sea gel`)) return Macro.tryItem($item`sea gel`).toString();
  return Macro.attack().toString();
}

const gymnasium = $location`Mer-kin Gymnasium`;

function equipItems(equip: unknown): Item[] {
  if (equip instanceof Item) return [equip];
  if (equip instanceof Familiar || equip === undefined) return [];
  const specs = Array.isArray(equip) ? equip : [equip];
  return specs.flatMap((spec) =>
    Object.values(spec as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v): v is Item => v instanceof Item),
  );
}

export function gymFreeRun(target?: Monster): { do: Macro } | undefined {
  const exclude = new Set<string>();
  for (;;) {
    const source = selectFreeRun({ banish: true, location: gymnasium, target, exclude });
    if (!source || exclude.has(source.name)) return undefined;
    const worn =
      source.equip === undefined ||
      (source.equip instanceof Familiar
        ? myFamiliar() === source.equip
        : equipItems(source.equip).every((item) => haveEquipped(item)));
    if (worn) return source;
    exclude.add(source.name);
  }
}

export function gymFreeRunGear(): { items: Item[]; familiar?: Familiar } {
  const source = selectFreeRun({ banish: true, location: gymnasium });
  if (!source) return { items: [] };
  if (source.equip instanceof Familiar) return { items: [], familiar: source.equip };
  return { items: equipItems(source.equip) };
}

export function gladiatorFilter(opts: { gym?: boolean; warOpen?: boolean } = {}): CombatFilter {
  let stallLeft = 0;
  let stalled = 0;
  let openersDone = false;
  let microUsed = false;
  let spinnerUsed = false;
  let weaksauceUsed = false;
  let mortarFired = false;
  let forcerBanked = false;
  let runTried = false;
  let clubbed = false;
  let lastRound = -1;
  let lastHp = -1;
  let stuck = 0;

  return (round, monster, text) => {
    void round;
    const here = currentRound();
    if (here === lastRound) {
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
    lastRound = here;

    const ours = opts.gym ? monster.phylum === $phylum`mer-kin` : gladiators.includes(monster);
    if (!ours) return killMacro(false).toString();

    const renewed = reflectStall(monster, text);
    if (renewed > 0 && stalled < 14 && renewed > stallLeft) stallLeft = renewed;
    if (stallLeft === 0 && monster === bladeswitcher && lastHp >= 0 && lastHp - myHp() > 400) {
      stallLeft = 10;
    }
    lastHp = myHp();
    if (stallLeft > 0) return stallAction();

    if (opts.gym) {
      if (get("dreadScroll2", 0) === 0 && itemAmount($item`Mer-kin healscroll`) > 0) {
        return Macro.tryItem($item`Mer-kin healscroll`).toString();
      }
      if (get("dreadScroll5", 0) === 0 && itemAmount($item`Mer-kin killscroll`) > 0) {
        return Macro.tryItem($item`Mer-kin killscroll`).toString();
      }
      if (opts.warOpen === true && !forcerBanked && text.includes("Launch spikolodon spikes")) {
        forcerBanked = true;
        return Macro.trySkill($skill`Launch spikolodon spikes`).toString();
      }
      if (opts.warOpen === true && !forcerBanked && text.includes("McHugeLarge Avalanche")) {
        forcerBanked = true;
        return Macro.trySkill($skill`McHugeLarge Avalanche`).toString();
      }
      if (!runTried) {
        runTried = true;
        const run = gymFreeRun(monster);
        if (run) return run.do.toString();
      }
    }

    const geyser = $skill`Saucegeyser`;
    const storm = $skill`Saucestorm`;
    const canGeyser = have(geyser) && myMp() >= mpCost(geyser);
    const canStorm = have(storm) && myMp() >= mpCost(storm);

    const leadWithNuke = here <= 1 && (canGeyser || canStorm);
    if (!leadWithNuke && !openersDone) {
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

    if (
      !clubbed &&
      myLocation() === $location`Mer-kin Colosseum` &&
      currentPolicy().allowClubEmBackInTime &&
      get("_clubEmTimeUsed") < 5 &&
      text.includes("Club 'Em Back in Time")
    ) {
      clubbed = true;
      return Macro.trySkill($skill`Club 'Em Back in Time`).toString();
    }

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

const yogDelevelOrder = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;
const yogHealOrder = $items`sea gel, Mer-kin healscroll, waterlogged scroll of healing, soggy used band-aid, New Age healing crystal`;

export function yogUrtFilter(): CombatFilter {
  const thrown = new Set<Item>();
  let healsThrown = 0;
  let step = 0;
  let lastRound = -1;
  let stuck = 0;

  const next = (order: Item[]): Item | undefined =>
    order.find((it) => itemAmount(it) > 0 && !thrown.has(it));

  return (round, monster, text) => {
    const here = currentRound();
    if (here === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Yog-Urt fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = here;
    void round;
    void monster;
    void text;

    if (step < 2) {
      step += 1;
      const deleveler =
        myBuffedstat($stat`Moxie`) + 10 > monsterAttack() ? undefined : next(yogDelevelOrder);
      const heal = next(yogHealOrder);
      if (heal) {
        healsThrown += 1;
        if (deleveler && have($skill`Ambidextrous Funkslinging`)) {
          thrown.add(deleveler);
          thrown.add(heal);
          return Macro.tryItem([deleveler, heal]).toString();
        }
        thrown.add(heal);
        return Macro.tryItem(heal).toString();
      }
      if (healsThrown === 0 || equippedAmount($item`Mer-kin prayerbeads`) < 3) {
        abort(
          "Out of Yog-Urt healing items mid-fight (CCS:510-517) — acquire sea gel / Mer-kin healscroll / waterlogged scroll of healing and rerun.",
        );
      }
      if (deleveler) {
        thrown.add(deleveler);
        return Macro.tryItem(deleveler).toString();
      }
    }
    if (step === 2) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 3) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          healsThrown += 1;
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
          healsThrown += 1;
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 4) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 2) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          healsThrown += 1;
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 5) {
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
    if (belowHpFloor()) {
      const heal = next(yogHealOrder);
      if (heal) {
        thrown.add(heal);
        healsThrown += 1;
        return Macro.tryItem(heal).toString();
      }
    }
    if (have($effect`More Like a Suckrament`)) {
      const deleveler =
        myBuffedstat($stat`Moxie`) + 10 > monsterAttack() ? undefined : next(yogDelevelOrder);
      if (deleveler) {
        thrown.add(deleveler);
        return Macro.tryItem(deleveler).toString();
      }
      const heal = next(yogHealOrder);
      if (heal) {
        thrown.add(heal);
        healsThrown += 1;
        return Macro.tryItem(heal).toString();
      }
      return Macro.attack().toString();
    }
    if (have($skill`Saucegeyser`) && myMp() >= mpCost($skill`Saucegeyser`)) {
      return Macro.trySkill($skill`Saucegeyser`).toString();
    }
    if (have($skill`Saucestorm`) && myMp() >= mpCost($skill`Saucestorm`)) {
      return Macro.trySkill($skill`Saucestorm`).toString();
    }
    return Macro.attack().toString();
  };
}

export function shubFilter(): CombatFilter {
  let remaining = have($effect`Null Afternoon`) ? 0.05 : 1.0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    const here = currentRound();
    if (here === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Shub fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = here;
    void round;
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
      remaining = 0;
    }
    return Macro.attack().toString();
  };
}

export function centerDoorFilter(): CombatFilter {
  let dancers = 0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    const here = currentRound();
    if (here === lastRound) {
      stuck += 1;
      if (stuck > 3)
        abort("Seaceress fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = here;
    void round;
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
