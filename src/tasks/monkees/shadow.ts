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
    get("_seadentWaveUsed", false) && training() < 20 && itemAmount(lasso) > 0
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

/** Shared "Rufus Labyrinth"/"Rift Fights" prep: heal up, and wish for a
 * lasso when the stock is dry mid-training (UTS:864-868) — both tasks can be
 * the one spending the day's free rift fights, depending on whether a
 * forcer landed the Labyrinth NC or the fights ran out naturally first.
 *
 * The wish can FAIL SILENTLY: KoL's paw limit is 5 per rollover-day, and an
 * aftercore garbo session before the ascension spends them all while mafia's
 * `_monkeyPawWishesUsed` resets to 0 at ascension detection — live
 * 2026-08-31, two `wish=sea+lasso` submissions produced nothing and all 16
 * free rift fights then trained ZERO (no lasso in inventory), pushing the
 * training onto 8 paid corral fights. pawWish() reports the failure; fall
 * back to a budgeted pull (the "sea lasso (training)" reservation in
 * pulls.ts holds the slot in exactly this broken state). */
function riftPrepare(): void {
  recover();
  if (training() < 20 && itemAmount(lasso) === 0 && !pawWish(lasso)) {
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
        ready: () =>
          have(phone) &&
          trainingGearReady() &&
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
