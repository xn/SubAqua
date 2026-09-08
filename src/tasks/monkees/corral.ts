import { OutfitSpec } from "grimoire-kolmafia";
import {
  availableAmount,
  currentRound,
  Familiar,
  handlingChoice,
  Item,
  itemAmount,
  lastMonster,
  Monster,
  print,
  retrieveItem,
  runChoice,
  throwItem,
  toUrl,
  visitUrl,
} from "kolmafia";
import {
  $familiar,
  $item,
  $location,
  $monster,
  $monsters,
  $skill,
  EternityCodpiece,
  get,
  have,
  Macro,
  $phylum,
} from "libram";

//import { mapMonster } from "libram/dist/resources/2020/Cartography";

import { CombatStrategy } from "../../engine/combat";
import { lassoExpert } from "../../engine/outfit";
import { Quest, Task } from "../../engine/task";
import { HP_FLOOR_PERCENT, recover, runawayHeal } from "../../lib";
import { gemMounted, haveGem, mountGems, popGems } from "../../lib/codpiece";
import {
  applyEffects,
  combineMoods,
  familiarExpEffects,
  familiarWeightEffects,
  itemDropEffects,
  squintEffects,
  superItemDropEffects,
  survivalEffects,
} from "../../lib/moods";
import { currentTier } from "../../lib/tier";
import { backupCamera, backupMacro, BackupSpec, backupTarget } from "../../resources/backup";
import {
  assertBanishHeld,
  banishActive,
  banishChainMacro,
  pickBanishSource,
} from "../../resources/banish";
import { bczAffordable, selectFreeKill } from "../../resources/freekill";
import { bootsRunAvailable, freeRunChainMacro } from "../../resources/freerun";
import { nostalgiaMacro } from "../../resources/nostalgia";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";
import { forceGranted } from "../../resources/saber";

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
const draws = [rustler, cowboy, cow];
const sword = $familiar`Sword of S Words`;
const boots = $familiar`Pair of Stomping Boots`;
const mimic = $familiar`Chest Mimic`;
const medal = $item`Congressional Medal of Insanity`;
const bcz = $item`blood cubic zirconia`;
const heartstone = $item`Heartstone`;
const codpiece = $item`The Eternity Codpiece`;
const monodent = $item`Monodent of the Sea`;
const bottle = $item`broken champagne bottle`;
const skateboard = $item`pro skateboard`;
const springShoes = $item`spring shoes`;
const glitch = $item`software glitch`;
const talkToFish = $skill`Sea *dent: Talk to Some Fish`;
const gaze = $skill`BCZ: Refracted Gaze`;
const mcTwist = $skill`Do an epic McTwist!`;
const corralGems = [bcz, heartstone];
const copyTargets = $monsters`eye in the darkness, slithering thing`;

const tier = currentTier();

function leatherDone(): boolean {
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) >=
      2 && availableAmount(cowbell) >= 3
  );
}

function lassosDone(): boolean {
  return get("lassoTrainingCount", 0) >= 20 && availableAmount(lasso) >= 1;
}

function tamed(): boolean {
  return get("seahorseName") !== "";
}

// Each geared throw adds 3 training and consumes the lasso (2026-09-05-run.txt:5028-5764: seven
// throws, 0 → 20), and taming needs one more.
function lassosOwed(): number {
  const throwsLeft = lassoExpert() ? 0 : Math.ceil((20 - get("lassoTrainingCount", 0)) / 3);
  return Math.max(0, throwsLeft + 1 - availableAmount(lasso));
}

function cowDone(): boolean {
  return leatherDone();
}

function cowboyDone(): boolean {
  return lassosOwed() === 0;
}

function drawDone(monster: Monster): boolean {
  return monster === cow ? cowDone() : monster === cowboy ? cowboyDone() : true;
}

function owedDraws(): Monster[] {
  return [cow, cowboy].filter((draw) => !drawDone(draw));
}

let armedNow: Monster[] | undefined;
let armedPrev: Monster[] | undefined;

function standingDraws(): Monster[] {
  return draws.filter((draw) => !banishActive(draw));
}

// A waffle re-rolls the fight only when another draw is standing: with the cow alone, six
// throws were refused (2026-09-05-run.txt:6295-6617), and the wiki says it never rolls a
// tumbleweed. So while waffles are held a banish must leave two draws standing, and the second
// banish waits. Once the waffles are gone the banishes go to zero and the tumbleweed, with Tear
// Away and the free runs, carries the lottery.
function drawBanishable(target: Monster): boolean {
  if (banishActive(target)) return false;
  if (itemAmount(waffle) > 0 && standingDraws().length < 3) return false;
  if (target === cow && availableAmount(cowbell) < 3) return false;
  if (target === cowboy && availableAmount(lasso) < 1) return false;
  return true;
}

// The seahorse lottery. The waffle re-roll is thrown by hand before this macro runs
// (tameSeahorseAdventure). A tumbleweed (the filler once every draw is banished) gets Tear Away
// your Pants! for its adventure refund, then Talk to Some Fish for the scale, then the free
// runs. Any other draw is banished while a banish is held and it is safe to banish, else run
// from; whatever is left falls to the kill action, where the engine's free kill ends it.
function tamingRegimeMacro(): Macro {
  armedPrev = armedNow;
  armedNow = draws.filter(drawBanishable);
  const armed = armedNow;
  const chain = banishChainMacro(corral, { paid: true });
  const runs = freeRunChainMacro({ location: corral });
  const macro = new Macro().if_(
    tumbleweed,
    Macro.trySkill($skill`Tear Away your Pants!`)
      .trySkill(talkToFish)
      .step(runs),
  );
  if (chain.components.length > 0) for (const target of armed) macro.if_(target, chain);
  if (runs.components.length > 0) macro.ifNot([seahorse, tumbleweed], runs);
  return macro;
}

// Every fight here ends in a banish, a run or a free kill, so the slot goes to a familiar that
// gains from the volume: the boots while their runaways last (they join the run chain), then
// the Chest Mimic for egg experience.
function tamingFamiliar(): Familiar | undefined {
  if (have(boots) && bootsRunAvailable(corral)) return boots;
  return have(mimic) ? mimic : undefined;
}

function resyncSeahorse(): void {
  if (tamed()) return;
  if (!get("_lastCombatActions", "").includes(`it${lasso.id};`)) return;
  visitUrl("place.php?whichplace=sea_merkin");
}

function tamingMacro(): Macro {
  return have($skill`Ambidextrous Funkslinging`)
    ? Macro.item([cowbell, cowbell]).item([cowbell, lasso]).abort()
    : Macro.item(cowbell).item(cowbell).item(cowbell).item(lasso).abort();
}

// The wild seahorse rejects 80% of corral adventures regardless of banishes (wiki), so once
// the banishes are spent every draw is a ~20% lottery. A waffle is one more roll inside a
// fight that is already free; the ash throws one whenever it holds one (UnderTheSeaCCS:836),
// and gold tamed on its third (gold-uts-2026-08-21.log:5751-6044). Never gate it on how
// many draws are still unbanished: that state is exactly when the waffle matters.
//
// The throw must NOT live in the KoL macro. When the re-roll finds no new monster (the
// usual case once the other two draws are banished) KoL answers "You don't want to waste
// a waffle right now", keeps the waffle, and ends the macro with "(Macro aborted.)", which
// mafia's FightRequest.runOnce treats as a macro error and aborts the whole script
// (2026-08-31 t45 and 2026-09-05 t18, lastMacroError = "(Macro aborted.)"). The ash never
// saw this because its CCS runs round by round: throw_item is a plain
// fight.php?action=useitem with no macro to abort. So the fight is opened by hand, the
// waffle goes out as that same plain useitem, and only then does the compiled macro run.
function throwWaffle(): void {
  if (currentRound() === 0 || itemAmount(waffle) === 0) return;
  if (lastMonster() === seahorse) return;
  if (availableAmount(cowbell) < 3 || availableAmount(lasso) < 1) return;
  const before = lastMonster();
  if (!standingDraws().some((draw) => draw !== before)) {
    print(`Waffle held: no other draw is standing to roll ${before.name} into.`);
    return;
  }
  const page = throwItem(waffle);
  if (page.includes("waste a waffle")) {
    print(`Waffle refused on ${before.name} (no other draw to roll into); macro takes over.`);
  } else {
    print(`Waffle rolled ${before.name} into ${lastMonster().name}.`);
  }
}

function tameSeahorseAdventure(): void {
  visitUrl(toUrl(corral));
  if (handlingChoice()) runChoice(-1);
  throwWaffle();
}

function seahorseMacro(): Macro {
  const ready =
    get("lassoTrainingCount", 0) >= 20 &&
    availableAmount(cowbell) >= 3 &&
    availableAmount(lasso) >= 1;
  if (ready) return tamingMacro();

  const heal = runawayHeal();
  return heal
    ? Macro.if_(`!pastround 6 && hppercentbelow ${HP_FLOOR_PERCENT}`, Macro.tryItem(heal))
        .runaway()
        .repeat()
    : Macro.runaway().repeat();
}

// ── Leather / Lassos draws ───────────────────────────────────────────────────────────────────
// One macro per draw, decided when the fight's macro is built. A draw we are done with (and the
// rustler, always) leaves by the first rung held: a drop-safe free kill while any table is still
// owed (Refracted Gaze puts the owed table on it first), else a banish, else the engine's Club
// 'Em rung, else a plain kill. A draw still owed keeps its kill action: the engine's ladder is
// Force/ray (cow) → free kill → Club 'Em → kill, with the round-1 lasso throw from the engine's
// training opener. Feel Nostalgic rides any kill exit whose anchor is an owed draw.

function corralNostalgia(host: Monster): Macro {
  const macro = new Macro();
  for (const anchor of [cow, cowboy]) {
    if (anchor !== host) macro.step(nostalgiaMacro(anchor, () => !drawDone(anchor)));
  }
  return macro;
}

// A banish is the exit for a done draw when no free kill is held, or when nothing is owed at
// all (a free kill would buy no drops). Otherwise the fight is a kill: the engine's ladder ends
// it and Gaze / nostalgia ride along.
function banishExit(): boolean {
  const banish = banishChainMacro(corral, { paid: true }).components.length > 0;
  if (!banish) return false;
  const freeKill = selectFreeKill({ location: corral, dropsMatter: true }) !== undefined;
  return !freeKill || owedDraws().length === 0;
}

function doneDrawMacro(host: Monster): Macro {
  if (banishExit()) return banishChainMacro(corral, { paid: true });
  const macro = new Macro();
  const gazeWanted = owedDraws().some((draw) => draw !== host);
  if (gazeWanted && bczAffordable(gaze, 200)) macro.trySkill(gaze);
  return macro.step(corralNostalgia(host));
}

function owedDrawMacro(host: Monster): Macro {
  // Use the Force forfeits the win, and with it a Feel Nostalgic cast; the parka spit does not.
  if (host === cow && forceGranted("seaCow", corral)) return new Macro();
  return corralNostalgia(host);
}

function drawMacro(host: Monster): () => Macro {
  return () => (drawDone(host) ? doneDrawMacro(host) : owedDrawMacro(host));
}

function corralDrawsCombat(opts: { forceCow: boolean }): CombatStrategy {
  const strategy = new CombatStrategy()
    .macro(seahorseMacro, seahorse)
    .macro(() => Macro.trySkill($skill`Tear Away your Pants!`), tumbleweed)
    .macro(drawMacro(rustler), rustler)
    .macro(drawMacro(cow), cow)
    .macro(drawMacro(cowboy), cowboy)
    .kill([rustler, cowboy]);
  return opts.forceCow ? strategy.forceItems(cow) : strategy.kill(cow);
}

function cowBackup(): BackupSpec | undefined {
  return cowDone() ? undefined : { targets: [cow], allowPaid: true };
}

function mountedCodpiece(): Item[] {
  return EternityCodpiece.have() && corralGems.some(gemMounted) ? [codpiece] : [];
}

function corralDrawsPrepare(name: string): void {
  recover();
  // After dress: the codpiece is on, so the mounted Heartstone grants %pals.
  applyEffects(superItemDropEffects(), name);
}

// ── McTwist opener ──────────────────────────────────────────────────────────────────────────
// Refracted Gaze puts every corral table on the monster in front of us and McTwist doubles it,
// so one free fight yields the whole kit (gold-uts-2026-08-21.log:4573-4599: 2 cowbells, 2 leather,
// 2 lassos off a Back-Up eye). A corral draw keeps its own table at natural rates, so the fight
// is first swapped onto a monster from outside the zone: the software glitch's bugged bugbear,
// Talk to Some Fish's some fish, or a Back-Up copy when no monodent is on hand. The rustler is
// Spring Kicked first so the leather and lasso tasks never draw it again.

function swordImprintCow(): boolean {
  return tier === "high" && have(sword) && get("swordOfSWordsMonster") !== cow;
}

// A Back-Up copy of the habitat eye or slithering thing also advances Mom's rescue
// (gold-uts-2026-08-21.log:4629 momSeaMonkeeProgress 18 → 21 on the opener copy), so while that
// progress is still owed the copy is the swap on every draw and the camera takes the slot
// the spring shoes would have had.
function seaMonkeeBackup(): Monster | undefined {
  if (get("momSeaMonkeeProgress", 0) >= 40) return undefined;
  return backupTarget({ targets: copyTargets, allowPaid: true });
}

function backupSwap(): Monster | undefined {
  if (have(monodent)) return seaMonkeeBackup();
  return backupTarget({ targets: copyTargets, allowPaid: true });
}

// The opener runs on whichever of the skateboard and the BCZ is owned; each skill is a trySkill,
// so a missing piece just drops out. Without the skateboard there is no McTwist to wait for, so
// one corral adventure closes the task.
function openerDone(): boolean {
  if (get("_epicMcTwistUsed") || tamed()) return true;
  return !have(skateboard) && corral.turnsSpent > 0;
}

function openerReady(): boolean {
  return get("corralUnlocked") && (have(skateboard) || haveGem(bcz)) && !openerDone();
}

function gazeTwistMacro(): Macro {
  const macro = new Macro();
  if (bczAffordable(gaze, 200)) macro.trySkill(gaze);
  return macro.trySkill(mcTwist);
}

function rustlerOpenerMacro(): Macro {
  const macro = Macro.trySkill($skill`Spring Kick`);
  const target = backupSwap();
  if (target) macro.step(backupMacro(target));
  else if (have(monodent)) macro.step(fishTalk());
  return macro.step(gazeTwistMacro());
}

// Talk to Some Fish fails on fish (KoL refuses the skill, the macro aborts, and mafia's round
// counter desyncs: 2026-09-07 corral opener on the sea cowboy). The cowboy and the cow are
// phylum fish; the rustler is mer-kin. Guarded the same way fishMacro() guards it.
function fishTalk(): Macro {
  return Macro.ifNot($phylum`fish`, Macro.trySkill(talkToFish));
}

function drawOpenerMacro(): Macro {
  const macro = new Macro();
  if (swordImprintCow()) macro.if_(cow, Macro.trySkill($skill`%fn, kill a lot of these guys`));
  const target = backupSwap();
  if (target) macro.step(backupMacro(target));
  else if (have(glitch)) macro.tryItem(glitch);
  else if (have(monodent)) macro.step(fishTalk());
  return macro.step(gazeTwistMacro());
}

function openerOutfit(): OutfitSpec {
  const equip: Item[] = [];
  if (have(skateboard)) equip.push(skateboard);
  if (EternityCodpiece.have()) equip.push(codpiece);
  if (tier === "low" && have(medal)) equip.push(medal);
  if (have(bottle) && get("garbageChampagneCharge", 0) > 0) equip.push(bottle);
  if (have(monodent)) equip.push(monodent);
  if (backupSwap() !== undefined) equip.push(backupCamera);
  else if (have(monodent) && have(springShoes)) equip.push(springShoes);
  return {
    modifier: "item",
    equip,
    avoid: [$item`Peridot of Peril`],
    familiar: swordImprintCow() ? sword : undefined,
  };
}

export function corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest {
  const swordOut = () =>
    opts.swordLane &&
    have(sword) &&
    get("swordOfSWordsMonster") !== null &&
    availableAmount(lasso) < 7;

  return {
    name: "Corral",
    tasks: [
      {
        name: "Mount Corral Gems",
        ready: () => get("corralUnlocked") && !tamed(),
        completed: () => corralGems.every((gem) => !have(gem) || gemMounted(gem)),
        do: () => mountGems(corralGems),
        freeaction: true,
        limit: { tries: 1 },
      },
      ...((opts.opener
        ? [
            {
              // Pulled before the opener's macro is compiled: grimoire compiles the combat
              // strategy before task.prepare runs, so a pull in prepare left have(glitch)
              // false at compile time and the opener fell through to Talk to Some Fish
              // (2026-09-07 `:106637`, CCS without the glitch, then the pull).
              name: "Glitch Pull",
              ready: () =>
                openerReady() &&
                backupSwap() === undefined &&
                !have(glitch) &&
                !pulledToday(glitch) &&
                pullBudgetAllows(glitch),
              completed: () => have(glitch) || pulledToday(glitch) || openerDone(),
              do: () => void pullSequence(glitch),
              freeaction: true,
              limit: { tries: 1 },
            },
            {
              name: "Corral Opener",
              ready: openerReady,
              completed: openerDone,
              do: corral,
              combat: new CombatStrategy()
                .macro(seahorseMacro, seahorse)
                .macro(rustlerOpenerMacro, rustler)
                .macro(drawOpenerMacro, [cow, cowboy])
                .kill(),
              outfit: openerOutfit,
              effects: () => combineMoods(itemDropEffects(), survivalEffects()),
              prepare: (): void => {
                recover();
                // After dress: the codpiece is on, so the mounted Heartstone grants %pals.
                applyEffects(
                  combineMoods(squintEffects(), superItemDropEffects()),
                  "Corral Opener",
                );
              },
              limit: { tries: 3 },
            },
          ]
        : []) as Task[]),
      {
        name: "Pull Cowbell",
        ready: () =>
          get("corralUnlocked") &&
          availableAmount($item`sea leather`) +
            availableAmount($item`sea chaps`) +
            availableAmount($item`sea cowboy hat`) >=
            2 &&
          availableAmount(cowbell) < 3 &&
          !pulledToday(cowbell) &&
          pullBudgetAllows(cowbell),
        completed: () => availableAmount(cowbell) >= 3 || pulledToday(cowbell) || tamed(),
        do: () => void pullSequence(cowbell),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Corral Leather",
        ready: () => get("corralUnlocked"),
        completed: () => leatherDone() || tamed(),
        do: corral,
        peridot: cow,
        backup: cowBackup,
        clubTarget: owedDraws,
        saberPurpose: "seaCow" as const,
        combat: corralDrawsCombat({ forceCow: true }),
        outfit: () => ({
          modifier: "item",
          equip: mountedCodpiece(),
          familiar: swordOut() ? sword : undefined,
        }),
        effects: () => combineMoods(itemDropEffects(), survivalEffects()),
        prepare: () => corralDrawsPrepare("Corral Leather"),
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
        name: "Corral Lassos",
        ready: () => get("corralUnlocked"),
        completed: () => (lassosDone() && availableAmount(lasso) >= 1) || tamed(),
        do: corral,
        peridot: cowboy,
        backup: cowBackup,
        clubTarget: owedDraws,
        combat: corralDrawsCombat({ forceCow: false }),
        outfit: () => ({
          modifier: "item",
          equip: mountedCodpiece(),
          familiar: swordOut() ? sword : undefined,
        }),
        effects: () => combineMoods(itemDropEffects(), survivalEffects()),
        prepare: () => corralDrawsPrepare("Corral Lassos"),
        limit: { soft: 15, message: "Sea lassos are not accumulating." },
      },
      {
        name: "Tame Seahorse",
        ready: () =>
          get("lassoTrainingCount", 0) >= 20 &&
          availableAmount(cowbell) >= 3 &&
          availableAmount(lasso) >= 1,
        completed: tamed,
        do: tameSeahorseAdventure,
        combat: new CombatStrategy().macro(seahorseMacro, seahorse).macro(tamingRegimeMacro).kill(),
        outfit: (): OutfitSpec => {
          const equip: Item[] = [];
          const top = pickBanishSource(corral);
          if (top?.equip) equip.push(gemMounted(top.equip) ? codpiece : top.equip);
          if (draws.every(banishActive)) {
            if (have(tearaway)) equip.push(tearaway);
            if (have(monodent)) equip.push(monodent);
          }
          equip.push(...mountedCodpiece());
          return {
            modifier: "initiative",
            equip,
            avoid: [$item`miniature crystal ball`],
            familiar: tamingFamiliar(),
          };
        },
        effects: () => survivalEffects(),
        prepare: (): void => {
          assertBanishHeld(armedPrev ?? [], corral, "Tame Seahorse");
          recover();
          // After dress: the codpiece is on, so the mounted Heartstone grants %pals.
          applyEffects(
            combineMoods(familiarWeightEffects(), familiarExpEffects()),
            "Tame Seahorse",
          );
        },
        post: resyncSeahorse,
        limit: { soft: 12, message: "The wild seahorse is not spawning; check banishes." },
      },
      {
        name: "Pop Corral Gems",
        ready: tamed,
        completed: () => corralGems.every((gem) => !gemMounted(gem)),
        do: () => popGems(corralGems),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
