import {
  abort,
  adv1,
  canFaxbot,
  cliExecute,
  equip,
  faxbot,
  handlingChoice,
  itemAmount,
  lastChoice,
  Monster,
  myClass,
  print,
  runChoice,
  runCombat,
  use,
} from "kolmafia";
import {
  $class,
  $familiar,
  $item,
  $location,
  $monster,
  $skill,
  ChestMimic,
  CombatLoversLocket,
  get,
  have,
  PeridotOfPeril,
} from "libram";

const mimic = $familiar`Chest Mimic`;

export function summonsAvailable(): number {
  let n = 0;
  if (!get("_photocopyUsed")) n += 1;
  if (CombatLoversLocket.have()) n += CombatLoversLocket.reminiscesLeft();
  if (have(mimic)) {
    n += Math.max(0, Math.min(Math.floor(mimic.experience / 100), 11 - get("_mimicEggsObtained")));
  }
  return n;
}

function farmPocketWish(): void {
  if (myClass() !== $class`Accordion Thief`) return;
  const lot = $location`The Overgrown Lot`;
  const snake = $monster`sewer snake with a sewer snake in it`;
  for (let tries = 0; tries < 5 && itemAmount($item`pocket wish`) === 0; tries++) {
    if (PeridotOfPeril.have() && !PeridotOfPeril.periledToday(lot)) {
      equip($item`Peridot of Peril`);
      PeridotOfPeril.setChoice(snake);
    }
    adv1(lot, -1, "");
  }
}

/**
 * Fight the first of `candidates` a free summon source can produce: a locket reminisce, a held
 * mimic egg, or a fresh egg from the DNA bank. Returns the monster fought, or undefined when no
 * source can; never aborts. Used to re-seed lastCopyableMonster for Back-Up farms.
 */
export function summonFree(candidates: Monster[]): Monster | undefined {
  for (const target of candidates) {
    if (CombatLoversLocket.canReminisce(target)) {
      CombatLoversLocket.reminisce(target);
      return target;
    }
  }
  if (!have(mimic)) return undefined;
  const hatch = (target: Monster): boolean => {
    if (!ChestMimic.differentiate(target)) return false;
    if (handlingChoice() && lastChoice() === 1387) runChoice(3);
    return true;
  };
  for (const target of candidates) {
    if (ChestMimic.differentiableQuantity(target) > 0 && hatch(target)) return target;
  }
  if (mimic.experience >= 100 && get("_mimicEggsObtained") < 11) {
    const receivable = ChestMimic.getReceivableMonsters();
    const target = candidates.find((candidate) => receivable.includes(candidate));
    if (target && ChestMimic.receive(target) && hatch(target)) return target;
  }
  return undefined;
}

export function summon(target: Monster): void {
  if (CombatLoversLocket.canReminisce(target)) {
    CombatLoversLocket.reminisce(target);
    return;
  }
  if (have(mimic) && mimic.experience >= 100 && get("_mimicEggsObtained") < 11) {
    if (ChestMimic.differentiableQuantity(target) === 0) ChestMimic.receive(target);
    if (ChestMimic.differentiableQuantity(target) > 0) {
      ChestMimic.differentiate(target);
      if (handlingChoice() && lastChoice() === 1387) runChoice(3);
      return;
    }
    print(`Mimic egg for ${target.name} could not be extracted; trying the fax.`, "red");
  }
  if (!get("_photocopyUsed") && canFaxbot(target)) {
    if (faxbot(target) || faxbot(target) || faxbot(target)) {
      use($item`photocopied monster`);
      runCombat();
      return;
    }
  }
  if (have($skill`Just the Facts`)) {
    if (itemAmount($item`pocket wish`) === 0) farmPocketWish();
    if (itemAmount($item`pocket wish`) > 0) {
      cliExecute(`genie monster ${target.name}`);
      runCombat();
      return;
    }
  }
  abort(
    `No summon source left for ${target.name} (locket, fax, mimic egg, and pocket wish all unavailable).`,
  );
}
