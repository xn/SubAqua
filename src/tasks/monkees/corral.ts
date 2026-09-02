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
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

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

let armedNow: Monster[] | undefined;
let armedPrev: Monster[] | undefined;

function drawBanishable(target: Monster): boolean {
  if (!draws.some((other) => other !== target && !banishActive(other))) return false;
  if (target === cow && availableAmount(cowbell) < 3) return false;
  if (target === cowboy && availableAmount(lasso) < 1) return false;
  return true;
}

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

function waffleMacro(): Macro {
  if (itemAmount(waffle) === 0) return new Macro();
  if (draws.filter((draw) => !banishActive(draw)).length < 2) return new Macro();
  return openerOnce(Macro.ifNot(seahorse, Macro.tryItem(waffle))).if_(seahorse, seahorseMacro());
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

export function corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest {
  const swordOut = () =>
    opts.swordLane &&
    have(sword) &&
    get("swordOfSWordsMonster") !== null &&
    availableAmount(lasso) < 7;

  const lassoCombat = (): CombatStrategy => {
    const strategy = new CombatStrategy();
    if (opts.swordLane && have(sword)) {
      strategy.macro(
        () => openerOnce(Macro.trySkill($skill`%fn, kill a lot of these guys`)),
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
              name: "Corral Opener",
              ready: () => get("corralUnlocked"),
              completed: () =>
                corral.turnsSpent > 0 ||
                availableAmount($item`sea leather`) > 0 ||
                have($item`sea cowboy hat`) ||
                tamed(),
              do: corral,
              backup: () =>
                get("momSeaMonkeeProgress", 0) < 40
                  ? {
                      targets: $monsters`eye in the darkness, slithering thing`,
                      allowPaid: true,
                    }
                  : undefined,
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
              outfit: {
                modifier: "item",
                equip: $items`pro skateboard, blood cubic zirconia`,
              },
              effects: () =>
                combineMoods(superItemDropEffects(), itemDropEffects(), survivalEffects()),
              prepare: (): void => {
                recover();
                applyEffects(squintEffects(), "Corral Opener");
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
          assertBanishHeld([rustler], corral, "Corral Leather");
          recover();
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
        name: "Tame Seahorse",
        ready: () =>
          get("lassoTrainingCount", 0) >= 20 &&
          availableAmount(cowbell) >= 3 &&
          availableAmount(lasso) >= 1,
        completed: tamed,
        do: corral,
        combat: new CombatStrategy().macro(seahorseMacro, seahorse).macro(tamingRegimeMacro).kill(),
        outfit: (): OutfitSpec => {
          const equip: Item[] = [];
          const top = pickBanishSource(corral);
          if (top?.equip) equip.push(top.equip);
          if (draws.every(banishActive) && have(tearaway)) equip.push(tearaway);
          return { modifier: "initiative", equip, avoid: [$item`miniature crystal ball`] };
        },
        effects: () => survivalEffects(),
        prepare: (): void => {
          assertBanishHeld(armedPrev ?? [], corral, "Tame Seahorse");
          recover();
        },
        post: resyncSeahorse,
        limit: { soft: 12, message: "The wild seahorse is not spawning; check banishes." },
      },
    ],
  };
}
