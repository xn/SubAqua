import { debug } from ".";
import { buy, hermit, itemAmount, myMeat, npcPrice, use, useSkill } from "kolmafia";
import { $effect, $item, $items, $skill, get, have } from "libram";

import { pullSequence } from "../resources/pulls";

import { luckySources, LuckyState } from "./luckyorder";

const clover = $item`11-leaf clover`;
const gum = $item`chewing gum on a string`;
const permit = $item`hermit permit`;
const worthless = $items`worthless trinket, worthless gewgaw, worthless knick-knack`;
const aug2 = $skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`;

function scepterReady(): boolean {
  return have(aug2) && !get("_aug2Cast", false) && get("_augSkillsCast", 0) < 5;
}

function luckyState(pull: boolean): LuckyState {
  return {
    clovers: itemAmount(clover),
    cloversPurchased: get("_cloversPurchased", 0),
    scepterReady: scepterReady(),
    pull,
  };
}

export function luckyObtainable(): boolean {
  return have($effect`Lucky!`) || luckySources(luckyState(false)).length > 0;
}

// Buy one clover from the hermit, fishing a worthless item out of the sewer with gum first.
// Gum is a use, not an adventure, and the sewer hands out class starter gear alongside the
// worthless items (docs/gold-star-run.txt:1312), so the loop keeps chewing until one lands.
function acquireHermitClover(): boolean {
  const before = itemAmount(clover);
  while (itemAmount(clover) === before && get("_cloversPurchased", 0) < 3) {
    if (worthless.some((it) => itemAmount(it) > 0)) {
      // The permit is only bought where the game still sells one (npcPrice is 0 otherwise).
      if (itemAmount(permit) === 0 && npcPrice(permit) > 0 && myMeat() >= npcPrice(permit)) {
        buy(1, permit);
      }
      if (!hermit(1, clover)) return false;
    } else {
      if (itemAmount(gum) === 0) {
        if (myMeat() < npcPrice(gum) || !buy(1, gum)) return false;
      }
      use(1, gum);
    }
  }
  return itemAmount(clover) > before;
}

export function getLucky(opts: { pull?: boolean } = {}): boolean {
  if (have($effect`Lucky!`)) return true;
  for (const source of luckySources(luckyState(opts.pull ?? false))) {
    switch (source) {
      case "clover":
        use(1, clover);
        break;
      case "hermit":
        if (acquireHermitClover()) use(1, clover);
        break;
      case "scepter":
        useSkill(aug2);
        break;
      case "pull":
        if (pullSequence(clover)) use(1, clover);
        break;
    }
    if (have($effect`Lucky!`)) {
      debug(`Lucky! from ${source}`);
      return true;
    }
  }
  return false;
}
