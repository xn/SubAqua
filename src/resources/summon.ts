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
 * The summon ladder: locket reminisce → mimic egg → fax (3 attempts) →
 * pocket wish/genie (with the AT Overgrown Lot farm) → abort. Starts a fight
 * against `target`; the active combat handler owns the fight. Every fallback
 * is explicit; the final abort means the account has no summon source left,
 * which is a routing error upstream.
 *
 * MIMIC BEFORE FAX is a deliberate deviation from the ash, which orders them
 * the other way (summon(), UnderTheSea.ash:937-957: locket, then
 * `_photocopyUsed == false && (faxbot || faxbot || faxbot)`, then the egg).
 * Three reasons:
 *
 *  - Gold never reaches the fax. Its log has no faxbot line and no
 *    `_photocopyUsed` at all — the aftercore session before the ascension
 *    had already spent the day's photocopy — so both of its unholy divers
 *    came from `[16] Combat Lover's Locket` and `[16] mimic egg`
 *    (`_mimicEggsObtained` 0→1→2 at G:3535, :3573). The ash's fax branch is
 *    dead code on a normal day; our run only found it because the ascension
 *    left `_photocopyUsed` false.
 *  - Its failure mode is the worst on the ladder. Observed live 2026-09-01 on
 *    diver #2, in the session console (NOT in docs/2026-09-01-run.txt, whose
 *    session-log form keeps only the three bare "Visiting Fax Machine in clan
 *    VIP lounge" lines at :3470-3474): "Asking Easyfax to send a fax of unholy
 *    diver ... No response from Easyfax after 60 seconds", three times over. A
 *    third-party bot that is down costs minutes of wall clock before the
 *    ladder moves on; the egg is local and instant. The run log alone does not
 *    evidence the stall — cite the console, not the file.
 *  - The egg is cheap. libram's ChestMimic gates on
 *    `experience >= 100 && _mimicEggsObtained < 11` (ChestMimic.js:25), so a
 *    grown mimic banks ten-plus eggs a day and this route spends one or two.
 *    (The ash's own `experience > 200` gate is stricter than the game's.)
 *
 * The fax keeps its place immediately behind: it costs no egg when it works,
 * so it is still worth trying before the pocket-wish tail.
 */
export function summon(target: Monster): void {
  if (CombatLoversLocket.canReminisce(target)) {
    CombatLoversLocket.reminisce(target);
    return;
  }
  if (have(mimic) && mimic.experience >= 100 && get("_mimicEggsObtained") < 11) {
    if (ChestMimic.differentiableQuantity(target) === 0) ChestMimic.receive(target);
    // FALL THROUGH, never abort. Moving the mimic ahead of the fax turned a
    // soft rung into a hard barrier: `ChestMimic.receive` returns false
    // whenever the target's option is absent or disabled in the DNA-bank
    // dropdown (libram ChestMimic.js:27-33, 74-83), which is a live
    // possibility for the sea cowboy (guild.ts Sword Imprint) and the Black
    // Crayon Golem (grandpa.ts) — neither of which the mimic has ever served
    // in either log. Aborting here would stop the whole run with the fax and
    // the pocket wish still untried, and under the OLD order the fax would
    // simply have fired. The ladder's promise is that every fallback is
    // explicit; a failed rung has to hand on to the next one.
    if (ChestMimic.differentiableQuantity(target) > 0) {
      ChestMimic.differentiate(target);
      // A Force cast mid-egg-fight can strand choice 1387; answer it (ash parity).
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
