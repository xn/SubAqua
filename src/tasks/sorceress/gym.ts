import {
  abort,
  adv1,
  availableAmount,
  buy,
  cliExecute,
  equip,
  itemAmount,
  maximize,
  useFamiliar,
  visitUrl,
} from "kolmafia";
import { $coinmaster, $item, $items, $location, $slot, get, have } from "libram";

import {
  ensureHelperBreathing,
  isTrainingLasso,
  requiredFamiliarBreather,
  seaKeyword,
} from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { applyEffects, combatEffects, combineMoods, survivalEffects } from "../../lib/moods";

import { gladiatorFilter, gymFreeRunGear } from "./fights";
import { skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const gladMask = $item`Mer-kin gladiator mask`;
const gladTail = $item`Mer-kin gladiator tailpiece`;

/**
 * Self-dressing helper: burn.ts's ladder calls this from inside other tasks'
 * `do()`s (library.ts `High Priest`, yogurt.ts `Gummiheart Burn`), i.e. outside
 * task machinery, so the outfit has to be built here rather than declared on
 * `Guard Grind`.
 *
 * One gymnasium turn (ash gymnasium(), UTS:617-641): +combat (the "Ators
 * Gonna Ate" NC guard is combat-rate pressure plus the forcer abort below),
 * skate-war NC-forcer gear banked when the war still needs one, 800 HP floor
 * (setRecoveryTargets UTS:216-225).
 *
 * The war state is computed ONCE per turn and handed to the filter: the gear
 * and the in-combat cast must agree on it, and a filter may never page-load
 * per round (CCS:1067-1070).
 */
export function gymnasiumTurn(): void {
  if (get("noncombatForcerActive")) {
    abort(
      "An NC forcer is pending while headed to the Mer-kin Gymnasium — it would be wasted on the zone NC (ash UTS:663-664). Spend it (e.g. at the Skate Park) and rerun.",
    );
  }
  // Ash gymnasium() runs tempEquipment THEN mood("combat") (UTS:660-662 at
  // HEAD). Casting first here is deliberate: the +combat buffs' own levels are
  // then in place when the maximize prices gear against them, so no slot is
  // spent on combat rate a buff already covers. This wrapper dresses itself,
  // so the engine's acquireEffects() never runs for it — cast them here.
  // ...plus the damage-mitigation mood (the garbo fork mood.ts:104-126): the gym's
  // Mer-kin roster hits as hard as the corral's and this turn runs to an 800 HP
  // floor. Cast before the maximize for the same reason the +combat buffs are.
  applyEffects(combineMoods(combatEffects(), survivalEffects()), "Guard Grind");
  const warOpen = skateWarOpen();
  const pieces: string[] = [];
  if (warOpen) {
    if (have($item`McHugeLarge left ski`) && get("_mcHugeLargeAvalancheUses", 0) < 3) {
      pieces.push("+equip McHugeLarge left ski");
    } else if (have($item`Jurassic Parka`) && get("_spikolodonSpikeUses", 0) < 5) {
      cliExecute("parka spikolodon");
      pieces.push("+equip Jurassic Parka");
    }
  }
  // The free-run/banish source's gear (ash tempEquipment(... freeRun() ...),
  // UTS:659) — see fights.ts gymFreeRun(). A familiar pick (the Stomping
  // Boots once the geared sources dry up — `runaway`, never the turn-taking
  // Release the Boots the ash casts; freerun.ts's note) is fielded HERE,
  // before the breather below prices against the fielded familiar.
  const runGear = gymFreeRunGear();
  if (runGear.familiar) useFamiliar(runGear.familiar);
  // Familiar breathing: this wrapper task declares no `outfit`, so the engine's
  // enforcement (engine.ts:240-246, which needs outfit.familiar) never runs and
  // whatever non-aquatic familiar an earlier task left up would make mafia
  // refuse the zone (KoLAdventure.java:2867-2884).
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) pieces.push(`+equip ${famBreather.name}`);
  for (const it of runGear.items) pieces.push(`+equip ${it.name}`);
  // Ash freeKill() wears the Sheriff set in the gym (G:659) so Assert your
  // Authority is castable when the run ladder dries up — D F4. The gym is a
  // sheriffZone (freekill.ts) and gymFreeRun()'s worn-check refuses unworn
  // sources, so an unworn set means the charges silently never fire. Pistol
  // is a 1-handed weapon, badge/moustache accessories (equipment.txt) — no
  // slot fight with the hat/chaps training pins above.
  const sheriffSet = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
  if (get("_assertYourAuthorityCast", 0) < 3 && sheriffSet.every((it) => have(it))) {
    for (const it of sheriffSet) pieces.push(`+equip ${it.name}`);
  }
  // Re-pin the lasso gear (audit item 4). `Guard Grind` is `underwater: true`
  // and non-`freeaction`, so engine customize() pins sea cowboy hat + sea chaps
  // and dress() wears them — and then this maximize, which runs afterwards,
  // strips both and drops lasso training to the un-geared rate. Nothing else in
  // `pieces` claims the hat or pants slot here, and putting the terms in
  // `pieces` carries them through the no-`sea` retry below.
  // Each piece is gated on OWNING it. isTrainingLasso() now tests the gear
  // too (outfit.ts — the 2026-09-01 mandate), so these are belt-and-braces
  // rather than load-bearing; they stay because naming an item on no account
  // makes Evaluator.checkEquipment fail every candidate — in the `sea` pass
  // AND the retry — and ROW125 does consume the sea chaps (mine.ts:525).
  if (isTrainingLasso()) {
    if (have($item`sea cowboy hat`)) pieces.push("+equip sea cowboy hat");
    if (have($item`sea chaps`)) pieces.push("+equip sea chaps");
  }
  // ...seaKeyword(): the gymnasium is a Sea zone and this wrapper task dresses
  // itself, so the breather has to come from this maximize. The keyword forces
  // "Adventure Underwater" (Evaluator.java:396-404) and lets the maximizer pick
  // the piece; it is omitted while Driving Waterproofly / Wet Willied covers us.
  const terms = ["combat rate", "-equip bat wings", ...pieces];
  const sea = seaKeyword();
  // A `sea` maximize can FAIL — the keyword masks Underwater Familiar too
  // (Evaluator.java:396-401) and getScore() fails any candidate missing either
  // boolean (Evaluator.java:980-984). Fielding no familiar is not what breaks
  // it (modifiers.txt:4832 gives `(none)` the Underwater Familiar bit and
  // Modifiers.java:1218 adds it before the raceData == null return at
  // :1228-1231); it fails when nothing on hand can satisfy the mask in a free
  // slot. A failing pass still emits its best candidate's slots (Maximizer
  // .java:211-225) rather than the objectives above, so re-run them without the
  // keyword and let ensureHelperBreathing() below breathe (or stop loudly).
  if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
    maximize(terms.join(", "), false);
  }
  ensureHelperBreathing("the Mer-kin Gymnasium");
  recover(800);
  adv1($location`Mer-kin Gymnasium`, -1, gladiatorFilter({ gym: true, warOpen }));
}

/**
 * Trade guards for the gladiator set (ash gladiatorGearStep tail,
 * UTS:2139-2157): sell scholar pieces back at Grandma's UNMODELED reverse
 * rows (131/1619 — commented out in mafia's coinmasters.txt:682,684, so raw
 * URLs exactly like the ash), then coinmaster-buy the gladiator set
 * (ROW126/127: crappy piece + guard).
 *
 * Deviation from ash, deliberate: the trade is gated on yogUrtDefeated. The
 * ash lets its burn ladder trade before Yog-Urt, which can strand her — the
 * Right Door requires Scholar's Vestments (KoLAdventure.java:2325-2411) and
 * the sell-back consumes them with the facecowl/waistrope already spent.
 */
export function gladiatorGearStep(): void {
  gymnasiumTurn();
  if (itemAmount(thighguard) === 0 || itemAmount(headguard) === 0) return;
  if (!get("yogUrtDefeated")) return;
  // Coinmaster-token requirement, not an outfit preference: CoinmasterData
  // .availableTokens counts INVENTORY only, so the scholar pieces being sold
  // (and the guards being spent) have to come off first — which is why no
  // `avoid` field replaces these two lines.
  equip($slot`hat`, $item.none);
  equip($slot`pants`, $item.none);
  // Deliberately NO breathing pass here (audit item 2, as re-ruled).
  // GrandmaRequest.java gates the shop on the Sea Monkee quest step alone — it
  // has no breathing requirement — and the next task's dress() re-establishes
  // breathing anyway. Re-dressing here would be actively harmful: ROW126 is
  // paid in `crappy Mer-kin mask` (coinmasters.txt:687), which is itself a
  // waterBreathingEquipment member, so a breathing pick could put the token
  // straight back on the hat we just blanked and the buy() below would no-op
  // against availableTokens. The old unconditional trunks equip is gone for the
  // same reason it always should have been: it ignored Driving Waterproofly and
  // stripped the lasso-pinned sea chaps.
  if (itemAmount($item`Mer-kin scholar mask`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=131");
  }
  if (itemAmount($item`Mer-kin scholar tailpiece`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=1619");
  }
  for (const it of [gladMask, gladTail]) {
    if (availableAmount(it) === 0) buy($coinmaster`Grandma Sea Monkey`, 1, it);
  }
}

export function gearQuest(): Quest {
  return {
    name: "Gladiator Gear",
    tasks: [
      {
        name: "Guard Grind",
        // The && is deliberate (ash UTS:2854-2857): the colosseum outfit needs
        // BOTH pieces, so the grind is only complete once the mask AND the
        // tailpiece are in hand — either one alone still leaves work to do.
        // A pending NC forcer must be spent (skate park) before another
        // gymnasium turn: the gym banks forcers in-combat while the war is open
        // (fights.ts gladiatorFilter gym extras) and gymnasiumTurn() then hard-
        // aborts on the pending one, so without this guard the very next
        // selection pass kills the run.
        //
        // ...but only while there is somewhere to spend it. With the war
        // already closed nothing downstream is reachable either (all gear-
        // gated), so hiding here would leave grimoire with no task at all and
        // main.ts would exit on a bare "N tasks remaining" with no instruction
        // (spec §9 wants an abort that says why). Staying ready hands the turn
        // to gymnasiumTurn(), whose abort explains how to clear the forcer.
        ready: () => get("yogUrtDefeated") && (!get("noncombatForcerActive") || !skateWarOpen()),
        completed: () => availableAmount(gladMask) > 0 && availableAmount(gladTail) > 0,
        do: gladiatorGearStep,
        underwater: true,
        // The guards come ONLY from the "Ators Gonna Ate" NC (choice 701) —
        // no gym monster drops them (monsters.txt:427-446) — and its locker
        // pays ONE uniform draw from the unowned uniques (both guards + the
        // three colosseum weapons) plus a repeatable fastjuice: ~4-7 NC hits
        // for both guards, at ~1 NC in 6 encounters under +combat (live
        // 2026-08-30: 3 NCs in 18). The ash runs this loop UNBOUNDED
        // (UTS:2793-2795) because its ENCOUNTERS ARE NEARLY FREE: every gym
        // combat is a free run (kick+away, then the boots' banked runaways),
        // so ~30-40 encounters cost only the ~5-7 NC turns. This limit
        // therefore bounds encounters, not turns — 40 attempts ≈ single-digit
        // real turns with the run ladder healthy, and still stops a genuinely
        // dead grind (NC precondition unmet, forcer leak, ladder dry) inside
        // one bad day.
        limit: {
          soft: 40,
          message: "Gladiator guards are not dropping; check the gymnasium grind.",
        },
      },
    ],
  };
}
