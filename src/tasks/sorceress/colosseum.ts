import {
  adv1,
  availableAmount,
  buy,
  cliExecute,
  itemAmount,
  maximize,
  myBuffedstat,
  myMaxhp,
  numericModifier,
  retrieveItem,
  use,
  useFamiliar,
  useSkill,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $location,
  $skill,
  $stat,
  get,
  have,
  set,
} from "libram";

import { ensureHelperBreathing, requiredFamiliarBreather, seaKeyword } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { applyEffects, colosseumEffects, combineMoods, survivalEffects } from "../../lib/moods";
import { currentPolicy } from "../../resources/policy";

import { gladiatorFilter } from "./fights";

const gel = $item`sea gel`;
const unguent = $item`Doc Galaktik's Pungent Unguent`;
const cmoi = $item`Congressional Medal of Insanity`;

export function colosseumRoundPrep(): void {
  if (itemAmount(unguent) < 11) retrieveItem(11, unguent);
  while (itemAmount(gel) < 5 && itemAmount($item`sand penny`) >= 10) {
    if (!buy($coinmaster`Wet Crap For Sale`, 1, gel)) break;
  }
  if (
    get("lastColosseumRoundWon", 0) >= 3 &&
    !have($effect`Up To 11`) &&
    have($skill`BCZ: Dial it up to 11`)
  ) {
    useSkill($skill`BCZ: Dial it up to 11`);
  }
  if (
    get("lastColosseumRoundWon", 0) >= 6 &&
    itemAmount($item`crayon shavings`) < 8 &&
    itemAmount($item`null-day exploit`) > 0 &&
    !have($effect`Null Afternoon`)
  ) {
    use($item`null-day exploit`);
  }
}

export function colosseumRoundTurn(): void {
  colosseumRoundPrep();
  if (have($familiar`Patriotic Eagle`) && get("screechCombats", 0) > 0 && have(cmoi)) {
    useFamiliar($familiar`Patriotic Eagle`);
  } else if (have($familiar`Foul Ball`)) {
    useFamiliar($familiar`Foul Ball`);
  }
  const pieces = ["+equip Mer-kin gladiator mask", "+equip Mer-kin gladiator tailpiece"];
  if (have(cmoi)) pieces.push("+equip Congressional Medal of Insanity");
  const policy = currentPolicy();
  if (
    policy.allowClubEmBackInTime &&
    get("_clubEmTimeUsed", 0) < 5 &&
    have($item`legendary seal-clubbing club`)
  ) {
    pieces.push("+equip legendary seal-clubbing club");
  }
  if (!policy.conserveFreeFights) {
    if (get("_batWingsFreeFights", 0) < 5 && have($item`bat wings`)) {
      pieces.push("+equip bat wings");
    } else if (have($item`unwrapped knock-off retro superhero cape`)) {
      cliExecute("retrocape heck kill");
      pieces.push("+equip unwrapped knock-off retro superhero cape");
    }
  }
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) pieces.push(`+equip ${famBreather.name}`);
  applyEffects(combineMoods(colosseumEffects(), survivalEffects()), "Colosseum round");
  if (!get("_lyleFavored")) cliExecute("monorail buff");
  const coeff =
    (60 + myBuffedstat($stat`Mysticality`) / 2.5) / (numericModifier("Spell Damage Percent") + 1);
  const terms = [`${coeff.toFixed(2)} spell damage percent`, "mys", ...pieces];
  const sea = seaKeyword();
  if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
    maximize(terms.join(", "), false);
  }
  ensureHelperBreathing("the Mer-kin Colosseum");
  recover(myMaxhp());
  adv1($location`Mer-kin Colosseum`, -1, gladiatorFilter());
  if (get("lastEncounter") === "Been There, Won That") {
    set("lastColosseumRoundWon", 15);
    set("isMerkinGladiatorChampion", true);
  }
}

export function colosseumQuest(): Quest {
  return {
    name: "Colosseum",
    tasks: [
      {
        name: "Fifteen Rounds",
        ready: () =>
          (availableAmount($item`Mer-kin gladiator mask`) > 0 &&
            availableAmount($item`Mer-kin gladiator tailpiece`) > 0) ||
          get("isMerkinGladiatorChampion"),
        completed: () => get("lastColosseumRoundWon", 0) >= 15 || get("isMerkinGladiatorChampion"),
        do: colosseumRoundTurn,
        underwater: true,
        limit: {
          soft: 25,
          message: "Colosseum rounds are not being won; inspect the gladiator filter.",
        },
      },
    ],
  };
}
