import { OutfitSpec } from "grimoire-kolmafia";
import { availableAmount, Item, itemAmount, Monster, retrieveItem, visitUrl } from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { HP_FLOOR_PERCENT, recover, runawayHeal } from "../../lib";
import {
  applyEffects,
  combineMoods,
  itemDropEffects,
  squintEffects,
  superItemDropEffects,
  survivalEffects,
} from "../../lib/moods";
import {
  assertBanishHeld,
  banishActive,
  banishChainMacro,
  pickBanishSource,
} from "../../resources/banish";
import { bczAffordable } from "../../resources/freekill";
import { freeRunChainMacro } from "../../resources/freerun";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const corral = $location`The Coral Corral`;
const rustler = $monster`Mer-kin rustler`;
const cowboy = $monster`sea cowboy`;
const cow = $monster`sea cow`;
const seahorse = $monster`wild seahorse`;
const cowbell = $item`sea cowbell`;
const lasso = $item`sea lasso`;
const waffle = $item`waffle`;
const tumbleweed = $monster`tumbleweed`;
const tearaway = $item`tearaway pants`;
/** The three non-seahorse corral draws, in the ash's order. */
const draws = [rustler, cowboy, cow];
// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const sword = $familiar`Sword of S Words`;

/** Ash doneWithSeaCow (G:652-660 at c84c28b). */
function leatherDone(): boolean {
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) >=
      2 && availableAmount(cowbell) >= 3
  );
}

/** Ash doneWithCowboy (G:638-650 at c84c28b): banked lassos finish the
 * training. Threshold 23, not 21 (upstream 611a915): each lasso is 3 training
 * points, but the tame itself consumes a lasso beyond the 20 points, so one
 * must stay in reserve — 21 scores 7 lassos from scratch as "done" even though
 * training to 20 eats all 7, stranding the seahorse as a fight with no ending. */
function lassosDone(): boolean {
  return get("lassoTrainingCount", 0) + 3 * availableAmount(lasso) >= 23;
}

function tamed(): boolean {
  return get("seahorseName") !== "";
}

/** Which draws the Tame Seahorse macro armed a banish for, stamped at macro
 * compile — the same evaluation that decides the lane. Grimoire compiles
 * combat BEFORE task.prepare() (engine execute(): setCombat, then prepare), so
 * by assert time the current attempt's compile has already restamped: the
 * assert must read the PREVIOUS compile's list, kept in armedPrev by the shift
 * inside tamingRegimeMacro(). A draw deliberately left unbanished (the last
 * one standing, ash CCS:804-811; a cow while cowbells are short) is a designed
 * outcome, never a failed banish. undefined until enough compiles have run,
 * which assertBanishHeld's first-call free pass covers. */
let armedNow: Monster[] | undefined;
let armedPrev: Monster[] | undefined;

/**
 * Ash CCS:804-811 (taming regime): banish a draw only while at least one OTHER
 * draw is still unbanished — never the last one standing, or the corral serves
 * nothing but tumbleweeds (live 2026-08-29/30: three paid tumbleweed kills at
 * Y:6368-6452 after all three were banished). And never a cow while the three
 * cowbells for the throw are not in hand (the cow is the only cowbell source;
 * user rule 2026-08-29) nor a cowboy while lassoless (the only lasso source).
 */
function drawBanishable(target: Monster): boolean {
  if (!draws.some((other) => other !== target && !banishActive(other))) return false;
  if (target === cow && availableAmount(cowbell) < 3) return false;
  if (target === cowboy && availableAmount(lasso) < 1) return false;
  return true;
}

/**
 * The ash corral handler in taming mode (UnderTheSeaCCS.ash:792-859), as one
 * delayed general macro built per fight after dress(): plants get the pants
 * (+15% item, FightRequest.java:11101-11106) → banish block → waffle (tamer
 * inlined behind the throw) → banish block AGAIN for the re-rolled draw (the
 * ash consult re-runs every round; a BALLS macro does not, so the block is
 * emitted twice) → plain free runs on whatever is left → the engine's kill
 * default. The banish block chains EVERY castable source (banishChainMacro;
 * gold used Curveball, Feel Hatred and two ink-bladder runs across five free
 * corral visits, G:5406-6069), paid kill-banishes last — the ash's own
 * Heartstone / Lightning Bolt fallbacks at CCS:818-826.
 */
function tamingRegimeMacro(): Macro {
  armedPrev = armedNow;
  armedNow = draws.filter(drawBanishable);
  const armed = armedNow;
  const banishBlock = (): Macro => {
    const chain = banishChainMacro(corral, { paid: true });
    const block = new Macro();
    if (chain.components.length === 0) return block;
    for (const target of armed) block.if_(target, chain);
    return block;
  };
  const supplied = availableAmount(cowbell) >= 3 && availableAmount(lasso) >= 1;
  const runs = freeRunChainMacro({ location: corral });
  const macro = new Macro()
    .if_(tumbleweed, Macro.trySkill($skill`Tear Away your Pants!`))
    .step(banishBlock())
    .step(supplied ? waffleMacro() : new Macro())
    .step(banishBlock());
  if (runs.components.length > 0) macro.ifNot(seahorse, runs);
  return macro;
}

/**
 * Mafia learns the seahorse's name from the fight text only when the fight's
 * ORIGINAL monster was the wild seahorse (FightRequest.java:5862 sets
 * status.seahorse from the opening monster name; handleSeahorse :8759 bails
 * otherwise). A waffled cowboy/cow that becomes the seahorse and gets tamed
 * therefore leaves seahorseName "" — live 2026-08-29: tamed at turn 13, and
 * with every other draw banished and the seahorse's own condition ("not yet
 * tamed") no longer met, the corral served nothing but tumbleweeds for ~16
 * paid turns until a manual resync. The Deepcity map names the seahorse and
 * QuestManager.java:1540-1544 parses it — one turn-free page visit.
 */
function resyncSeahorse(): void {
  if (tamed()) return;
  if (!get("_lastCombatActions", "").includes(`it${lasso.id};`)) return;
  visitUrl("place.php?whichplace=sea_merkin");
}

/** Cowbell,cowbell then cowbell,lasso (funkslinging); singles otherwise.
 * Ash CCS:738-744 + the old salvage's singles fallback. Ends with abort:
 * if the fight is still open the tame failed (ash's exact protocol). */
function tamingMacro(): Macro {
  return have($skill`Ambidextrous Funkslinging`)
    ? Macro.item([cowbell, cowbell]).item([cowbell, lasso]).abort()
    : Macro.item(cowbell).item(cowbell).item(cowbell).item(lasso).abort();
}

/**
 * The waffle re-rolls the monster in front of us (ash CCS:829-843): in the
 * taming regime every rustler/cowboy/cow is a waffle away from being the wild
 * seahorse. The re-rolled fight keeps running through THIS macro, and the
 * seahorse's own monster macro (compiled ahead of general macros) will not
 * re-run, so the tamer is inlined right behind the throw. The ash guards the
 * throw with `!contains_text(_lastCombatActions, "it11311")` (CCS
 * ab1105e:978-979); ours is `openerOnce`'s round guard, which also blocks a
 * re-throw when BALLS `repeat` re-runs this macro from the top mid-fight.
 * The ash additionally throws when the monster IS the seahorse the tamer
 * just declined (an unready re-roll attempt); that branch is deliberately
 * not ported here — an unready seahorse is handled by seahorseMacro()'s
 * runaway, not by waffling it away.
 */
function waffleMacro(): Macro {
  if (itemAmount(waffle) === 0) return new Macro();
  return openerOnce(Macro.ifNot(seahorse, Macro.tryItem(waffle))).if_(seahorse, tamingMacro());
}

/** The wild seahorse is a BOSS (upstream UnderTheSea cf01d4d, 2026-08-12):
 * free-run skills, banishes and copies all fail against it and every hit
 * lands for 1, so an unready encounter can only end on the round limit —
 * a lost combat and a hard post() abort. The ash CCS runs its tamer ahead
 * of all zone logic and answers unready seahorses with the plain Run Away
 * button, the one exit a boss allows. Mirror both: tame on the spot when
 * training and supplies are ready, otherwise spam runaway. */
function seahorseMacro(): Macro {
  const ready =
    get("lassoTrainingCount", 0) >= 20 &&
    availableAmount(cowbell) >= 3 &&
    availableAmount(lasso) >= 1;
  if (ready) return tamingMacro();

  // HP floor on the runaway loop (the garbo fork combat.ts:509-519 welds
  // `!hppercentbelow 25` into every stall/stasis predicate). The garbo fork's floor
  // SKIPS the stall round; here the round cannot be skipped — the Run Away
  // button is the only exit a boss allows — so the floor heals on the way
  // instead, and only when it is breached: above the floor the guard is false
  // and the runaway is still the first thing tried. Every failed run is a free
  // swing from an Atk 500 boss with Init 10000 (monsters.txt:797) against a
  // ~570 HP character, and a lost combat here is a hard post() abort.
  //
  // One item, never a skill and never the Yog kit — see runawayHeal() for why
  // sea gel in particular is excluded (a build-time reserve check cannot hold
  // inside a `repeat`, whose only guard is `hascombatitem`). `!pastround 6`
  // bounds the drain and the wasted rounds to the window where the loop is
  // actually dangerous; past it the macro is a pure runaway spam again.
  //
  // Both predicates are real BALLS numerics (macrohelper.6.js:101-116
  // `numPreds`: hppercentbelow, pastround) evaluated live, and `repeat` re-runs
  // the whole macro from the top, so a macro built once still tracks HP round
  // by round.
  const heal = runawayHeal();
  return heal
    ? Macro.if_(`!pastround 6 && hppercentbelow ${HP_FLOOR_PERCENT}`, Macro.tryItem(heal))
        .runaway()
        .repeat()
    : Macro.runaway().repeat();
}

/**
 * Peridot of Peril, one imperil per zone per day (`_perilLocations`,
 * ChoiceControl.java:8855-8867; the engine equips it and writes choice 1557 in
 * customize()/`do`). The garbo fork points it at the monster it means to BANISH
 * (fishyPrep.ts:248-251) because it farms the zone all day and wants the trash
 * gone; in-run that is the wrong target. Our banish sources are turn-FREE
 * (BanishManager.java:77, :91, :116, :126-129, :137 — isTurnFree true), so the
 * rustler costs nothing whenever he shows up, and spending the zone's only
 * imperil on him buys nothing. Pointed at the drop source instead, the same
 * imperil is a guaranteed useful fight on turn 1: the sea cow for the
 * leather/cowbell grind (leather 20%, cowbell 10%) and the sea cowboy for the
 * lasso grind (lasso 30%).
 *
 * NOT on "Corral Opener": that task is a single turn built around a sea cow
 * where the once-a-day squint is spent (ash UTS:2229-2261, :1650-1651), and
 * leaving it unset keeps the day's imperil for the grind tasks below, which
 * spend the turns. NOT on "Tame Seahorse" either — the wild seahorse is a
 * BOSS, which the peril choice does not offer.
 */

export function corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest {
  // Ash doSWord() (G:773-780 at 89982f5): the imprinted sword rides only
  // while lassos are still short — seven banked (upstream bumped 6 → 7 to
  // match the 23-point lassosDone reserve); past that an item familiar earns
  // more on the leather/cowbell fights.
  const swordOut = () =>
    opts.swordLane &&
    have(sword) &&
    get("swordOfSWordsMonster") !== null &&
    availableAmount(lasso) < 7;

  /**
   * "Corral Lassos" combat, built here so the sword opener can be registered —
   * or not — rather than emitted as a macro that may resolve to nothing.
   *
   * The opener must stay a MONSTER macro: grimoire compiles monster macros
   * before default macros (grimoire combat.js:249-257) and the engine's
   * opportunistic free-kill upgrade emits its own per-monster step for the
   * cowboy/cow, so a default-slot opener would let the free kill end the fight
   * in front of the sword swing (engine.ts's "ash free_kills LAST" invariant).
   * A monster macro that resolves EMPTY, though, compiles to a bodyless
   * `if monsterid …;endif;` block (combat.ts monsterMacro() has the mechanism
   * and the live 2026-08-27 evidence).
   *
   * Both constraints are met by registering an unconditionally non-empty body
   * and letting BALLS do the gating that the old `swordOut() ? … : new Macro()`
   * ternary did in TypeScript: libram renders this skill by id (its name fails
   * `/^[A-Za-z ]+$/`, libram combat.js:94-100), so trySkill emits
   * `if hasskill <id>;skill <id>;endif` — inert on every turn the Sword of S
   * Words is not the fielded familiar, which is exactly every turn swordOut()
   * is false, since swordOut() is what fields it.
   *
   * The registration itself is gated on the BUILD-TIME-stable half of
   * swordOut(): the run plan is composed once (runplans.ts buildRunplan, called
   * from main.ts:48), while swordOut()'s other two conjuncts — the imprint pref
   * and the lasso count — both move during the run and so cannot be read here.
   */
  const lassoCombat = (): CombatStrategy => {
    const strategy = new CombatStrategy();
    if (opts.swordLane && have(sword)) {
      strategy.macro(
        () =>
          openerOnce(
            // eslint-disable-next-line libram/verify-constants -- Sword of S Words skill, plugin data lags (classskills.txt:1170)
            Macro.trySkill($skill`%fn, kill a lot of these guys`),
          ),
        cowboy,
      );
    }
    return strategy
      .kill($monsters`sea cowboy, sea cow`)
      .banish(rustler)
      .macro(seahorseMacro, seahorse);
  };

  return {
    name: "Corral",
    tasks: [
      ...((opts.opener
        ? [
            {
              // One-turn opener (ash UTS:2229-2261): first corral fight with
              // the pro skateboard — Do an epic McTwist! forces every drop
              // off the sea cow (leather + cowbell in one turn).
              name: "Corral Opener",
              ready: () => get("corralUnlocked"),
              completed: () =>
                corral.turnsSpent > 0 ||
                availableAmount($item`sea leather`) > 0 ||
                have($item`sea cowboy hat`) ||
                tamed(),
              do: corral,
              // The ash's "1 turn coral corral" (UTS:1659-1662, CCS:754-763):
              // with an Abyss monster as the last copyable, the first corral
              // turn backs up to it — Mom progress on a refunded turn.
              backup: () =>
                get("momSeaMonkeeProgress", 0) < 40
                  ? // allowPaid (backup.ts): the eye/slithering copy costs its
                    // turn unless the free kill in the opener macro lands —
                    // exactly the ash's trade (UTS:1659-1662).
                    {
                      targets: $monsters`eye in the darkness, slithering thing`,
                      allowPaid: true,
                    }
                  : undefined,
              // Ash CCS:763-766: after the Back-Up lands (the engine PREPENDS
              // its starting macro in customize, so it runs first), Refracted
              // Gaze + McTwist run on the COPY, whatever it is. B F4: the
              // 08-30 copy (slithering thing) fell to the paid kill ladder
              // because McTwist was scoped to the sea cow only. Guarded off
              // the rustler (the banish handles him when no backup armed) and
              // the seahorse (boss; skills fail). Gaze gated on affordability
              // (submysticality over a 40k floor, freekill.ts bczAffordable).
              combat: new CombatStrategy()
                .startingMacro(() =>
                  openerOnce(
                    Macro.ifNot(
                      $monsters`Mer-kin rustler, wild seahorse`,
                      (bczAffordable($skill`BCZ: Refracted Gaze`, 200)
                        ? Macro.trySkill($skill`BCZ: Refracted Gaze`)
                        : new Macro()
                      ).trySkill($skill`Do an epic McTwist!`),
                    ),
                  ),
                )
                .kill($monsters`sea cow, sea cowboy`)
                .banish(rustler)
                .macro(seahorseMacro, seahorse)
                .kill(),
              // BCZ gem worn so the gaze is castable — gold socketed it into
              // the codpiece for exactly this fight (G:4529-4534); same equip
              // pattern as freekill.ts's Sweat Bullets source.
              outfit: {
                modifier: "item",
                equip: $items`pro skateboard, blood cubic zirconia`,
              },
              // Ash UTS:1650-1651 spends the once-a-day squint on this
              // one-turn corral opener when it is still unused.
              effects: () =>
                combineMoods(superItemDropEffects(), itemDropEffects(), survivalEffects()),
              // The squint doubles the +item that is ON when it is cast, so it
              // goes in prepare() — the only hook after dress() (grimoire
              // engine.js:101 vs :108).
              prepare: (): void => {
                recover();
                applyEffects(squintEffects(), "Corral Opener");
              },
              limit: { tries: 3 },
            },
          ]
        : []) as Task[]),
      {
        // Sea-cow farm: leather (chaps + hat) and three cowbells. The
        // seaCow saber reservation backs forceItems; the parka ray serves
        // first when charged (both force all drops). Ash getMissingCorralItems
        // UTS:1455-1495, CCS tier-3 regime CCS:823-876.
        name: "Corral Leather",
        ready: () => get("corralUnlocked"),
        completed: () => leatherDone() || tamed(),
        do: corral,
        peridot: cow,
        saberPurpose: "seaCow" as const,
        combat: new CombatStrategy()
          .macro(() => openerOnce(Macro.trySkill($skill`Do an epic McTwist!`)), cow)
          .forceItems(cow)
          .kill(cowboy)
          .banish(rustler)
          .macro(seahorseMacro, seahorse),
        outfit: () => ({
          modifier: "item",
          equip: $items`pro skateboard`,
          familiar: swordOut() ? sword : undefined,
        }),
        effects: () => combineMoods(itemDropEffects(), survivalEffects()),
        prepare: (): void => {
          // The whole point of the corral grind is that the rustler is gone and
          // the two droppers spawn instead; a banish that quietly failed is 15
          // turns of nothing (the garbo fork farmTurn.ts:124-130). NOT on "Corral
          // Opener" above: it is a single forced turn with no prior corral
          // fight to check.
          assertBanishHeld([rustler], corral, "Corral Leather");
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        limit: { soft: 15, message: "Sea leather/cowbells are not accumulating." },
      },
      {
        name: "Craft Chaps",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea chaps`),
        completed: () => have($item`sea chaps`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea chaps`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Craft Hat",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea cowboy hat`),
        completed: () => have($item`sea cowboy hat`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea cowboy hat`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // Lasso stock + training. Sea cowboys drop lassos (doubled under
        // the imprinted Sword); the engine's round-1 lasso injection
        // (customize(), Phase 1) trains on every underwater fight while
        // hat + chaps are worn, +3 per throw.
        name: "Corral Lassos",
        ready: () => get("corralUnlocked"),
        completed: () => (lassosDone() && availableAmount(lasso) >= 1) || tamed(),
        do: corral,
        peridot: cowboy,
        combat: lassoCombat(),
        outfit: () => ({ modifier: "item", familiar: swordOut() ? sword : undefined }),
        effects: () => combineMoods(itemDropEffects(), survivalEffects()),
        prepare: (): void => {
          assertBanishHeld([rustler], corral, "Corral Lassos");
          recover();
        },
        limit: { soft: 15, message: "Sea lassos are not accumulating." },
      },
      {
        // Taming (ash sorceress() UTS:3024-3074 + CCS:738-744): banish the
        // other draws so the seahorse spawns, then throw cowbell/cowbell,
        // cowbell/lasso at exactly lassoTrainingCount 20. Initiative
        // maximized so the throws land before the 1M-HP seahorse acts
        // (monsters.txt: Phys+Elem 100 — the lasso is the only win).
        name: "Tame Seahorse",
        // Reserve math, NOT a hard `training >= 20`: lassosDone() retires the
        // lasso grind at `training + 3·lassos >= 23` (a 20-point finish plus
        // one banked lasso for the tame), so the run legitimately arrives
        // here at training 19 with 2 lassos — live 2026-08-31 the hard gate
        // deadlocked exactly there (no corral task would fight, the engine
        // fell through to an unreachable School and burned its 15-try
        // limit). The regime's own fights finish the training: the engine's
        // round-1 lasso injection (customize, ash CCS:534) throws while
        // training < 20 and stops the moment it caps, leaving the reserved
        // lasso for the tame throw.
        ready: () =>
          availableAmount(cowbell) >= 3 &&
          availableAmount(lasso) >= 1 &&
          get("lassoTrainingCount", 0) + 3 * (availableAmount(lasso) - 1) >= 20,
        completed: tamed,
        do: corral,
        // Upstream 611a915's guard — never banish the cowboy/cow while its
        // drop is still needed — is satisfied structurally here: this task
        // sits after Corral Leather and Corral Lassos, so the engine only
        // reaches it once leatherDone() and lassosDone() hold, and the
        // farming tasks above kill (never banish) both sources.
        //
        // Waffle first (general macro), banish second (action): after a
        // re-roll the compiled monster actions re-evaluate against the new
        // monster, so a cow that came out of the waffle is still banished.
        combat: new CombatStrategy()
          .macro(tamingMacro, seahorse)
          // Everything else the ash does in this regime, in its order — see
          // tamingRegimeMacro(). No `.banish` action: the block inside picks
          // its own targets per fight (never the last draw standing), which a
          // static action list cannot express.
          .macro(tamingRegimeMacro)
          .kill(),
        // No crystal ball while taming: with the ball on, the next corral
        // fight is LOCKED to its prediction (drawn from the zone's current
        // pool, which the wild seahorse's 80% rejection all but excludes) —
        // live 2026-08-29: six straight predicted tumbleweeds, then the
        // 12-attempt soft limit. grimoire's `avoid` also strips it if worn.
        outfit: (): OutfitSpec => {
          // With no `.banish` action the engine equips no banish gear here, so
          // the top-ranked source's gear is asked for directly (ash UTS:2487-
          // 2500 does the same with its conditional equip list). Tearaway
          // pants only when every draw is already banished — carried-over
          // banishes, since drawBanishable() never produces that state — the
          // ash's own gate (UTS:2499-2504).
          const equip: Item[] = [];
          const top = pickBanishSource(corral);
          if (top?.equip) equip.push(top.equip);
          if (draws.every(banishActive) && have(tearaway)) equip.push(tearaway);
          return { modifier: "initiative", equip, avoid: [$item`miniature crystal ball`] };
        },
        // The unready-seahorse branch of seahorseMacro() is Macro.runaway()
        // .repeat() against Atk 500 with Init 10000 — every failed run is a
        // free round of damage, and enough of them is a lost combat and a hard
        // post() abort. Damage absorption is the only lever the task has.
        effects: () => survivalEffects(),
        prepare: (): void => {
          // "The wild seahorse is not spawning; check banishes" is exactly the
          // failure this makes immediate: the seahorse only shows once the
          // other draws are out of the way. Only the draws the PREVIOUS
          // fight's compile armed are judged (armedPrev — this attempt's
          // compile has already restamped armedNow by now); a draw left
          // unbanished on purpose is a designed outcome, not a failed banish.
          assertBanishHeld(armedPrev ?? [], corral, "Tame Seahorse");
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        post: resyncSeahorse,
        limit: { soft: 12, message: "The wild seahorse is not spawning; check banishes." },
      },
    ],
  };
}
