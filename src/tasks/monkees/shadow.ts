import { adv1, haveEffect, itemAmount, print, use, useSkill } from "kolmafia";
import { $effect, $item, $items, $location, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy, fishMacro, openerOnce } from "../../engine/combat";
import { kramcoIfDue } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pawWish } from "../../resources/paw";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const rift = $location`Shadow Rift (The Misspelled Cemetary)`;
const phone = $item`closed-circuit pay phone`;
const lodestone = $item`Rufus's shadow lodestone`;
const lasso = $item`sea lasso`;
const affinity = $effect`Shadow Affinity`;
const waters = $effect`Shadow Waters`;
const monodent = $item`Monodent of the Sea`;

/** Free rift fights remain today: the affinity is up, or not yet claimed
 * (ash shadowRift() gate UTS:849-850). */
function riftFightsFree(): boolean {
  return haveEffect(affinity) > 0 || !get("_shadowAffinityToday", false);
}

function training(): number {
  return get("lassoTrainingCount", 0);
}

/** The +3/throw training gear (ash pins both while training < 20, UTS:876). */
function trainingGearReady(): boolean {
  return have($item`sea cowboy hat`) && have($item`sea chaps`);
}

const slab = $monster`shadow slab`;

/** Slab yoink (ash CCS:538-547, gold-trace #3): Septapus charm → Swoop like
 * a Bat → Perpetrate Mild Evil → Douse Foe until one lands (3/day). Each
 * rider multiplies the slab's brick yield: gold banked ~12 bricks off 5
 * slabs (G:5285-6184) and spent 10 as School/Abyss free kills; the 08-30
 * run farmed 0. Swoop needs the bat wings worn (task.batWings + outfit),
 * Douse the FLUDA; Mild Evil is a plain class skill (classskills.txt:254,
 * no gear). Every trySkill is hasskill-gated, so unworn gear just skips
 * its rung. Douse casts are
 * emitted at build time from the daily counter (the ash's consult loop
 * re-reads _douseFoeSuccess per round, which a compiled macro cannot);
 * a success mid-fight costs at most the leftover casts' rounds. */
function slabMacro(): Macro {
  const macro = new Macro();
  if (itemAmount($item`Septapus summoning charm`) > 0) {
    macro.tryItem($item`Septapus summoning charm`);
  }
  macro.trySkill($skill`Swoop like a Bat`);
  macro.trySkill($skill`Perpetrate Mild Evil`);
  if (!get("_douseFoeSuccess", false)) {
    const douses = Math.max(0, 3 - get("_douseFoeUses", 0));
    for (let i = 0; i < douses; i++) macro.trySkill($skill`Douse Foe`);
  }
  return macro;
}

/** Rift fight (ash CCS:532-554, mid tier): lasso on round 1 once the wave is
 * up, the slab yoink riders on a shadow slab, Talk to Some Fish while scales
 * are short, then the kill ladder (darts included). */
function riftCombat(): CombatStrategy {
  const strategy = new CombatStrategy();
  strategy.startingMacro(() =>
    // trainingGearReady(): the hat and chaps are +1 each on top of the bare
    // +1, so a geared throw is worth three. The throw is once per combat, so
    // an ungeared Labyrinth or Loded Stone adventure would spend a free rift
    // fight for a third of its training — seven geared throws reach 20, bare
    // ones would need twenty.
    get("_seadentWaveUsed", false) &&
    trainingGearReady() &&
    training() < 20 &&
    itemAmount(lasso) > 0
      ? openerOnce(Macro.tryItem(lasso), 1)
      : new Macro(),
  );
  strategy.macro(slabMacro, slab);
  strategy.macro(fishMacro);
  return strategy.kill();
}

function riftOutfit() {
  return {
    modifier: "item",
    // FLUDA (Douse Foe) / bat wings (Swoop, needs task.batWings) are the
    // slab-yoink riders — the ash's rift list exactly (UTS:866/882-886);
    // unowned gear is stripped by createOutfit and gold's rift item% ran
    // 863-928% with them on (B F2). NO vampyric cloake here: it shares the
    // back slot with the wings and force-equipping both made Outfit.from
    // throw "Failed to build outfit" (live 2026-08-31, Rufus Labyrinth) —
    // and Mild Evil never needed it (class skill).
    equip: [
      monodent,
      ...$items`Flash Liquidizer Ultra Dousing Accessory, bat wings`,
      ...kramcoIfDue(),
      ...(training() < 20 ? $items`sea cowboy hat, sea chaps` : []),
    ],
  };
}

/** Shared "Rufus Labyrinth"/"Rift Fights" prep: heal up, and buy a lasso when
 * the stock is dry mid-training (UTS:864-868) — both tasks can be the one
 * spending the day's free rift fights, depending on whether a forcer landed
 * the Labyrinth NC or the fights ran out naturally first.
 *
 * The wish can still come back empty, so pawWish() reports the outcome and we
 * fall through to a budgeted pull (the "sea lasso (training)" reservation in
 * pulls.ts holds the slot for exactly this). Two things changed on the wish
 * side after the 2026-08-31 run threw twenty refused `wish=sea+lasso`:
 * resources/paw.ts now dresses for the sea first, the way the ash does
 * (UTS:874-876), and it caps the retries. Whether the outfit was the actual
 * cause is NOT settled — see paw.ts; the exhausted-allowance explanation fits
 * the same evidence — so this fallback stays load-bearing. */
function riftPrepare(): void {
  recover();
  // trainingGearReady() gate: the Rufus chain now runs BEFORE the corral
  // (Rufus Quest's `ready`), so this fires at training 0 / lasso 0 with no hat
  // and no chaps. A bare throw DOES train, at +1 against the geared +3 (wiki;
  // user correction 2026-09-01) — the reason not to buy a lasso yet is that
  // the throw is once per combat, so a gearless rift fight would spend one of
  // the day's ~13 free fights for a third of its value. The gear is mandated
  // (engine/outfit.ts isTrainingLasso), so wait for the corral to smith it.
  if (trainingGearReady() && training() < 20 && itemAmount(lasso) === 0 && !pawWish(lasso)) {
    print(
      "Paw wish for a sea lasso produced nothing (wishes spent pre-run?); pulling instead.",
      "red",
    );
    if (pullBudgetAllows(lasso)) pullSequence(lasso);
  }
}

/** Cast Summon a Wave right after ANY rift adventure (ash UTS:853-855): mafia
 * stamps `_seadentWaveZone` to the CURRENT zone when the skill is cast
 * (KoLCharacter.java:5402), and AdventureDatabase.isUnderwater (:933) treats
 * that stamped zone as underwater for the rest of the day — that stamp is
 * what lets the sea lasso be thrown in the rift (riftCombat()'s opener).
 * Attached as `post` so it runs with the rift still the current location and
 * the Monodent still worn (`have(Skill)` is true for a Monodent-granted
 * skill only while the Monodent is equipped) regardless of which task's
 * adv1() got there — and so an aborted adv1 never strands the cast for the
 * day the way inlining it in one task's `do` did. */
function riftPost(): void {
  if (!get("_seadentWaveUsed", false) && have($skill`Sea *dent: Summon a Wave`)) {
    useSkill($skill`Sea *dent: Summon a Wave`);
  }
}

export function shadowRiftQuest(): Quest {
  return {
    name: "Shadow Rift",
    tasks: [
      {
        // Ash UTS:851-853, 862-869: an artifact quest from Rufus (choice
        // 1497 -> 2, standalone/choice.ts). Twice a day: before Shadow
        // Waters (its lodestone unlocks the waters) and again while the
        // waters are up but the forest is unlooted (its lodestone is the
        // forest loot). Never a third: the loot flag closes the second
        // disjunct once it is set.
        name: "Rufus Quest",
        // NOT gated on trainingGearReady(): the hat and chaps are the LASSO
        // THROW's requirement (Rift Fights below), not the phone call's, and
        // they come out of the corral — so gating the call on them chained
        // the whole rift to the corral. Live 2026-08-31: the corral opener
        // missed its bundle, the leather grind ran to turn 32, and Rufus was
        // not called until turn 33; gold calls him at turn 15, BEFORE it has
        // any corral gear at all (G:3640-3660, chaps smithed at turn 16), so
        // Shadow Waters is up and the day's free rift fights are waiting the
        // moment the first lasso lands.
        ready: () =>
          have(phone) &&
          get("questRufus") === "unstarted" &&
          !have(lodestone) &&
          get("encountersUntilSRChoice", 11) > 9 &&
          (!have(waters) || !get("_shadowForestLooted", false)),
        completed: () => get("questRufus") !== "unstarted" || have(lodestone),
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:853-855: force the Labyrinth NC (mafia picks the artifact's
        // theme, RufusManager.shadowLabyrinthChoiceDecision). The first
        // quest's Labyrinth is forced (saves the day's 11 free fights for
        // bricks/lasso training, ash NCforce() sits in its no-Shadow-Waters
        // branch, UTS ab1105e:815-846); the second quest's Labyrinth arrives
        // naturally at counter 0 after the 11 free fights (affinity and
        // counter both start at 11 after Loded Stone #1 and drain together).
        // The task adventures only when the fight is free, the NC is owed
        // now, or a forcer is already armed.
        // The soft limit spans BOTH quests' Labyrinths: grimoire counts
        // attempts per task name for the whole run, so quest #1's forced NC
        // (1 attempt) and quest #2's natural arrival (11 free fights + the
        // NC at counter 0 = 12) share one budget — 13 on the happy path.
        // Live 2026-08-30: soft 12 aborted on the fight that took the
        // counter to 0, one visit short of the artifact NC.
        name: "Rufus Labyrinth",
        ready: () =>
          have(phone) &&
          get("questRufus") === "started" &&
          get("rufusQuestType") === "artifact" &&
          // Quest #1 runs freely: its Labyrinth is FORCED (prepare below), so
          // it costs one fight. Quest #2's arrives naturally at counter 0 —
          // that is the hunt that eats the day's free rift fights, and those
          // fights are only worth their +3 lasso training once the corral has
          // smithed the hat and chaps. Live 2026-09-01 the corral unlocked at
          // turncount 11 (run log :3319) but the opener did not run until
          // :5065. Fifteen rift adventures fell in between (:4249-5054) and
          // trained ZERO, but this gate withholds only the ELEVEN hunt combats
          // at :4324-4996 — the other four are quest #1's forced Labyrinth
          // (:4249), Loded Stone #1 (:4290, itself ungated) and quest #2's
          // Labyrinth NC and Loded Stone (:5023, :5054), which are the payoff
          // the gate defers rather than cancels. Only five
          // fights were left afterwards, so training stalled at 12/20 and the
          // last 8 points were bought on PAID corral turns (:5802, :5866).
          // Gold: opener 4584, chaps 4683, hat 4699, then eighteen rift
          // fights carrying `lassoTrainingCount` 0->20 entirely free
          // (G:4887-5292).
          //
          // WHAT DEFERRING COSTS — and the bit that is NOT established.
          // The wiki says rift adventuring "will consume turns of [Shadow
          // Affinity] instead of Adventures" and that a duration is lost "at
          // the end of any combat in Shadow Rift". It does NOT say the effect
          // is inert elsewhere, and KoL effects normally tick once per
          // adventure spent anywhere. Do not assume it is a pure rift-combat
          // budget: the logs cannot settle it either way, because across all
          // three runs there is not ONE paid turn while affinity is active
          // (every non-rift adventure in the window is a free fight — 28 in
          // gold at `[16]`, 7 on 09-01 at `[13]` — and free fights do not tick
          // effects).
          //
          // It is mostly moot on the happy path: this gate waits only for hat
          // and chaps, which come out of the corral OPENER, itself a free
          // fight — 09-01 ran opener :5065 -> chaps :5316 -> hat :5335 without
          // spending a turn. The exposure is the unhappy path, where the
          // opener misses its bundle and the leather comes from the paid grind
          // instead: then the deferral spans real turns, and if affinity does
          // tick outside the rift we lose a free fight for each. That is the
          // same failure the ~30-turn Shadow Waters buff is exposed to, since
          // `Rift Fights` requires it — both risks reduce to "the corral
          // opener failed", which is worth guarding on its own account.
          (!have(waters) || trainingGearReady()) &&
          (riftFightsFree() ||
            get("encountersUntilSRChoice", 11) === 0 ||
            get("noncombatForcerActive")),
        completed: () => get("questRufus") !== "started",
        prepare: (): void => {
          riftPrepare();
          if (!have(waters) && get("encountersUntilSRChoice", 11) > 0) forceNextNoncombat();
        },
        do: rift,
        post: riftPost,
        batWings: true, // Swoop like a Bat rider on the slab (slabMacro)
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 16, message: "The Labyrinth of Shadows is not producing the artifact." },
      },
      {
        // Ash UTS:856, 2545: hand the artifact in (choice 1498 -> 1) for the
        // lodestone.
        name: "Rufus Turn-in",
        ready: () => have(phone) && get("questRufus") === "step1",
        completed: () => get("questRufus") !== "step1",
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // The lodestone makes the next rift adventure "Like a Loded Stone"
        // (choice 1500: Shadow Waters first, forest loot second — the
        // choice script decides). Ash UTS:857, 2546. The wave is cast by
        // riftPost() after this (or any) rift adventure, the way the ash
        // does (UTS:853-855): the lasso throw in the rift is gated on it
        // (CCS:534).
        name: "Loded Stone",
        ready: () => have(lodestone),
        completed: () => !have(lodestone),
        prepare: riftPrepare,
        do: () => void adv1(rift, -1, ""),
        post: riftPost,
        batWings: true, // Swoop like a Bat rider on the slab (slabMacro)
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:858-897 + 2432-2439 + 2536-2547: spend the day's free rift
        // fights — seven lasso throws train to 20, the rest are shadow bricks
        // (13 free kills' worth over the day) and Fishy. Runs only under
        // Shadow Waters like the ash. Tail task: covers leftover affinity on
        // days a forcer was unavailable for the Labyrinth.
        name: "Rift Fights",
        ready: () => have(phone) && trainingGearReady() && have(waters) && riftFightsFree(),
        completed: () => !riftFightsFree(),
        prepare: riftPrepare,
        do: rift,
        post: riftPost,
        batWings: true, // Swoop like a Bat rider on the slab (slabMacro)
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 14, message: "Shadow Affinity is not draining; check the rift fights." },
      },
    ],
  };
}
