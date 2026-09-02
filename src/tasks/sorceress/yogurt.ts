import {
  abort,
  adv1,
  availableAmount,
  buy,
  equippedAmount,
  Item,
  itemAmount,
  myAdventures,
  myBuffedstat,
  myMaxhp,
  numericModifier,
  print,
  pullsRemaining,
  retrieveItem,
  use,
  useSkill,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $item,
  $items,
  $location,
  $skill,
  $stat,
  get,
  have,
  uneffect,
} from "libram";

import { expFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { survivalEffects } from "../../lib/moods";
import { currentPolicy } from "../../resources/policy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

import { burnTurnElsewhere } from "./burn";
import { yogUrtFilter } from "./fights";

const beads = $item`Mer-kin prayerbeads`;
const healscroll = $item`Mer-kin healscroll`;
const waterlogged = $item`waterlogged scroll of healing`;
const gel = $item`sea gel`;
const unguent = $item`Doc Galaktik's Pungent Unguent`;
const elixir = $item`Doc Galaktik's Homeopathic Elixir`;
const crystal = $item`New Age healing crystal`;
const bandaid = $item`soggy used band-aid`;
const antidote = $item`soft green echo eyedrop antidote`;
const penny = $item`sand penny`;
const yogDelevelStock = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;

function delevelersOwned(): number {
  return yogDelevelStock.filter((it) => itemAmount(it) > 0).length;
}

const healingHP = new Map<Item, number>([
  [gel, 500],
  [healscroll, 300],
  [waterlogged, 250],
  [bandaid, 1000],
  [crystal, 500],
]);

const yogHealingsNeeded = [21, 5, 3, 1];

function healsNeeded(): number {
  return yogHealingsNeeded[Math.min(availableAmount(beads), 3)];
}

function yogHealingsOwned(): number {
  return [...healingHP.keys()].filter((it) => availableAmount(it) > 0).length;
}

function yogHealingsShort(): boolean {
  return healsNeeded() - yogHealingsOwned() > pullsRemaining();
}

function yogHealKitReady(): boolean {
  return yogHealingsOwned() >= healsNeeded();
}

function maxHeal(): number {
  const needed = healsNeeded();
  let smallest = 1001;
  let counted = 0;
  for (const [it, hp] of healingHP) {
    if (counted >= needed) break;
    if (availableAmount(it) > 0) {
      if (hp < smallest) smallest = hp;
      counted += 1;
    }
  }
  return smallest;
}

function trueHPPercent(): number {
  return (
    Math.round(
      ((myMaxhp() - numericModifier("Maximum HP")) / (myBuffedstat($stat`Muscle`) + 3)) * 100,
    ) / 100
  );
}

function predictedHP(): number {
  const predictedMus = Math.trunc(
    Math.round(30 * (1 + numericModifier("Muscle Percent") / 100)) + numericModifier("Muscle"),
  );
  return Math.trunc(
    Math.round((predictedMus + 3) * trueHPPercent()) + numericModifier("Maximum HP"),
  );
}

function yogHpCheck(): void {
  const heal = maxHeal();
  let predicted = predictedHP();
  print(`Yog-Urt: predicted post-debuff HP ${predicted} vs a ${heal} HP heal`, "blue");
  if (0.8 * predicted > heal && have($effect`Gummiheart`)) {
    if (itemAmount(antidote) === 0 && pullBudgetAllows(antidote)) pullSequence(antidote);
    if (itemAmount(antidote) > 0 && !uneffect($effect`Gummiheart`)) {
      print("Couldn't remove Gummiheart before Yog-Urt.", "red");
    }
    if (have($effect`Gummiheart`)) {
      print("Gummiheart is still up; no antidote to remove it.", "red");
    } else {
      predicted = predictedHP();
      print(`Yog-Urt: predicted HP after antidote ${predicted}`, "blue");
    }
  }
  if (0.8 * predicted > heal) {
    abort(
      `Muscle/HP too high for Yog-Urt: ${predicted} predicted HP against a ${heal} HP heal. ` +
        "Shed Muscle/max-HP effects (uneffect them, or drop max-HP gear), or stock a stronger " +
        "heal (soggy used band-aid heals 1000), then rerun (ash G:741-757 at 89982f5, " +
        "threshold per upstream 7b57121).",
    );
  }
}

function pullHeal(it: Item): boolean {
  if (itemAmount(it) > 0 || pulledToday(it)) return false;
  if (!pullBudgetAllows(it)) return false;
  return pullSequence(it);
}

function yogPrepComplete(): boolean {
  return (
    itemAmount(unguent) > 0 &&
    itemAmount(elixir) > 0 &&
    (delevelersOwned() >= 2 || have($effect`Null Afternoon`)) &&
    yogHealKitReady()
  );
}

let gummiheartStalls = 0;
let gummiheartLadderDry = false;

function gummiheartWaitOver(): boolean {
  return !have($effect`Gummiheart`) || gummiheartLadderDry || gummiheartStalls >= 8;
}

export function yogUrtQuest(): Quest {
  return {
    name: "Yog-Urt",
    tasks: [
      {
        name: "Gummiheart Burn",
        ready: () =>
          have($effect`Gummiheart`) &&
          get("isMerkinHighPriest", false) &&
          !get("yogUrtDefeated") &&
          myAdventures() > 0,
        completed: () => gummiheartWaitOver() || get("yogUrtDefeated", false),
        do: (): void => {
          const before = myAdventures();
          if (!burnTurnElsewhere()) {
            gummiheartLadderDry = true;
            return;
          }
          if (myAdventures() < before) gummiheartStalls = 0;
          else gummiheartStalls += 1;
        },
        underwater: true,
        limit: { soft: 40, message: "Gummiheart is not burning down." },
      },
      {
        name: "Yog Prep",
        ready: () => get("isMerkinHighPriest", false) && !get("yogUrtDefeated"),
        completed: () => get("yogUrtDefeated", false) || yogPrepComplete(),
        do: (): void => {
          if (
            have($effect`Gummiheart`) &&
            itemAmount(antidote) === 0 &&
            trueHPPercent() >= 1.4 &&
            pullBudgetAllows(antidote)
          ) {
            pullSequence(antidote);
          }
          if (
            itemAmount(healscroll) === 0 &&
            !pulledToday(healscroll) &&
            pullBudgetAllows(healscroll)
          ) {
            pullSequence(healscroll);
          }
          if (itemAmount(waterlogged) === 0 && itemAmount(penny) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, waterlogged);
          }
          if (itemAmount(gel) === 0 && itemAmount(penny) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, gel);
          }
          retrieveItem(unguent);
          retrieveItem(elixir);
          if (
            delevelersOwned() < 2 &&
            !pulledToday($item`null-day exploit`) &&
            pullBudgetAllows($item`null-day exploit`)
          ) {
            if (pullSequence($item`null-day exploit`)) use($item`null-day exploit`);
          }
          if (delevelersOwned() < 2 && !have($effect`Null Afternoon`)) {
            abort(
              "Yog-Urt prep is short: need two deleveler types (Mer-kin mouthsoap / crayon shavings / table tennis ball / sea cowbell) or Null Afternoon. Farm the corral for cowbells or pull delevelers, then rerun.",
            );
          }
          if (availableAmount(beads) < 3 && !pulledToday(beads) && pullBudgetAllows(beads)) {
            pullSequence(beads);
          }
          if (!yogHealKitReady()) pullHeal(crystal);
          if (!yogHealKitReady()) pullHeal(bandaid);
          if (!yogHealKitReady()) {
            abort(
              `Yog-Urt's healing kit is short: ${availableAmount(beads)} prayerbeads means ` +
                `${healsNeeded()} healing item type(s) needed, and only ${yogHealingsOwned()} of the five ` +
                `healing item types (sea gel, Mer-kin healscroll, waterlogged scroll of healing, ` +
                `soggy used band-aid, New Age healing crystal) are on hand${
                  yogHealingsShort() ? " with no pulls left to fix it" : ""
                }. Farm outpost prayerbeads (-combat, healer saber) — every bead cuts the type ` +
                `count — or free up pulls for the crystal/band-aid, then rerun (ash G:709-724 at 89982f5).`,
            );
          }
        },
        freeaction: true,
        limit: { tries: 3 },
      },
      {
        name: "Yog-Urt",
        ready: () => yogPrepComplete() && gummiheartWaitOver() && get("isMerkinHighPriest", false),
        completed: () => get("yogUrtDefeated"),
        effects: () => survivalEffects(),
        prepare: (): void => {
          if (have($skill`Cannelloni Cocoon`)) useSkill($skill`Cannelloni Cocoon`);
          recover(myMaxhp());
          yogHpCheck();
        },
        do: () => void adv1($location`Mer-kin Temple (Right Door)`, -1, yogUrtFilter()),
        batWings: true,
        outfit: () => {
          const beadCount = Math.min(3, itemAmount(beads) + equippedAmount(beads));
          return {
            modifier:
              "moxie, hot damage, cold damage, spooky damage, sleaze damage, stench damage, -hp, -equip tiny yam cannon",
            equip: [
              $item`Mer-kin scholar mask`,
              $item`Mer-kin scholar tailpiece`,
              ...(currentPolicy().conserveFreeFights ? [] : [$item`bat wings`]),
            ],
            ...(beadCount >= 1 ? { acc1: beads } : {}),
            ...(beadCount >= 2 ? { acc2: beads } : {}),
            ...(beadCount >= 3 ? { acc3: beads } : {}),
            familiar: expFamiliar(),
          };
        },
        underwater: true,
        limit: { tries: 3, message: "Yog-Urt is not dying; check the deleveler/heal stock." },
      },
    ],
  };
}
