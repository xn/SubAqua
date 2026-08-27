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

/** Ash count_summons() (UnderTheSea.ash:580-591): banked monster-summon
 * charges across fax, locket, and mimic eggs (100 familiar exp per egg, 11/day
 * cap per mafia ChoiceControl.java choice 1517). Feeds Phase 3's opener
 * decisions and retry-loop guards. */
export function summonsAvailable(): number {
  let n = 0;
  if (!get("_photocopyUsed")) n += 1;
  if (CombatLoversLocket.have()) n += CombatLoversLocket.reminiscesLeft();
  if (have(mimic)) {
    n += Math.max(0, Math.min(Math.floor(mimic.experience / 100), 11 - get("_mimicEggsObtained")));
  }
  return n;
}

/** Just the Facts: an Accordion Thief's fact for the Overgrown Lot's sewer
 * snake is a pocket wish drop; the Peridot steers the zone onto it (iotm.ash
 * wantedMonster table :76, target id 1752). Bounded, and called only from
 * task context — resource modules never adventure from engine hooks (spec
 * §2). */
function farmPocketWish(): void {
  if (myClass() !== $class`Accordion Thief`) return;
  const lot = $location`The Overgrown Lot`;
  const snake = $monster`sewer snake with a sewer snake in it`;
  for (let tries = 0; tries < 5 && itemAmount($item`pocket wish`) === 0; tries++) {
    if (PeridotOfPeril.have() && !PeridotOfPeril.periledToday(lot)) {
      // Self-dressing detour: the `peridot` task field only covers `task.do`,
      // and this farms The Overgrown Lot — a zone no calling task names.
      equip($item`Peridot of Peril`);
      PeridotOfPeril.setChoice(snake);
    }
    adv1(lot, -1, "");
  }
}

/**
 * The summon ladder (ash summon(), UnderTheSea.ash:1597-1634): locket
 * reminisce → fax (3 attempts) → mimic egg (libram ChestMimic replaces the
 * c2t_megg dependency) → pocket wish/genie (with the AT Overgrown Lot farm) →
 * abort. Starts a fight against `target`; the active combat handler owns the
 * fight. Every fallback is explicit; the final abort means the account has no
 * summon source left, which is a routing error upstream.
 */
export function summon(target: Monster): void {
  if (CombatLoversLocket.canReminisce(target)) {
    CombatLoversLocket.reminisce(target);
    return;
  }
  if (!get("_photocopyUsed") && canFaxbot(target)) {
    if (faxbot(target) || faxbot(target) || faxbot(target)) {
      use($item`photocopied monster`);
      runCombat();
      return;
    }
  }
  if (have(mimic) && mimic.experience >= 100 && get("_mimicEggsObtained") < 11) {
    if (ChestMimic.differentiableQuantity(target) === 0) ChestMimic.receive(target);
    if (ChestMimic.differentiableQuantity(target) === 0) {
      abort(
        `Failed to extract a mimic egg for ${target.name}. Rerun; if it repeats, summon it manually.`,
      );
    }
    ChestMimic.differentiate(target);
    // A Force cast mid-egg-fight can strand choice 1387; answer it (ash parity).
    if (handlingChoice() && lastChoice() === 1387) runChoice(3);
    return;
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
