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

/**
 * Per-round regimen (ash colosseumRound(), UTS:2165-2224): 11 unguents +
 * 5 sea gels (10-round stall stock + Yog-Urt's reserves, CCS:288-303);
 * Up To 11 from round 4 on (the twice-fixed gate's FINAL form,
 * UTS:2200-2202: lastRoundWon >= 3 && effect down && skill known);
 * null-day at >= 6 while shavings are short for Shub.
 */
export function colosseumRoundPrep(): void {
  if (itemAmount(unguent) < 11) retrieveItem(11, unguent);
  while (itemAmount(gel) < 5 && itemAmount($item`sand penny`) >= 10) {
    // Both loop conditions only move on a successful buy (ash UTS:2183-2188).
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

/** Self-dressing helper: burn.ts's ladder calls this from inside other tasks'
 * `do()`s, outside task machinery, so `outfit.familiar` and a declared outfit
 * cannot reach it — hence the useFamiliar/maximize pair below.
 *
 * One colosseum round (UTS:2165-2224 + CCS:1220-1228: full-HP recovery,
 * eagle-recharge familiar, spell-damage coefficient outfit, free-fight
 * riders per tier policy; never the saber, never free runs). */
export function colosseumRoundTurn(): void {
  colosseumRoundPrep();
  if (have($familiar`Patriotic Eagle`) && get("screechCombats", 0) > 0 && have(cmoi)) {
    // Worthless-for-screech fights tick the recharge down (940514c; recharge
    // counts only plain wins, UTS:1647-1650).
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
      // `+equip` never switches a Modeable's mode, so the mode must be set
      // first or the free fight is silently lost (ash sets modes alongside the
      // cape, UTS:2192-2196) — same dance as gym.ts's parka.
      cliExecute("retrocape heck kill");
      // items.txt spells it lowercase-u (eslint-plugin-libram normalizes it).
      pieces.push("+equip unwrapped knock-off retro superhero cape");
    }
  }
  // Familiar breathing: the Mer-kin outfit mafia forces for this zone covers
  // the PLAYER, but every Sea zone still refuses a familiar that can't breathe
  // (KoLAdventure.java:2867-2884). The eagle and Foul Ball are both non-aquatic
  // (familiars.txt:330,353); reading myFamiliar() (useFamiliar has already run)
  // also covers a non-aquatic familiar left up by an earlier task.
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) pieces.push(`+equip ${famBreather.name}`);
  // The ash's own order (colosseumRound(), UTS:2317-2318): mood("colosseum")
  // THEN the coefficient, so Ultraheart's +50/+50% mysticality is already in
  // my_buffedstat when the spell-damage weight is priced. survivalEffects()
  // rides along — these fifteen rounds are the longest sustained damage the
  // route takes. This wrapper dresses itself, so the engine's acquireEffects()
  // never runs for it; recover() below restores the MP these casts spend.
  applyEffects(combineMoods(colosseumEffects(), survivalEffects()), "Colosseum round");
  // Favored by Lyle, the ash's way (mood():158-168 casts it through the same
  // fail-silent cli_execute): the monorail buff has no "is it reachable"
  // predicate, only the once-a-day pref (MonorailCommand:15-18), so it cannot
  // ride in an ensureEffect list without risking a mid-colosseum throw. Free,
  // and a no-op when it does not land.
  if (!get("_lyleFavored")) cliExecute("monorail buff");
  // Diminishing-returns coefficient (UTS:2216-2217): weight spell damage %
  // against mys by the current multiplier.
  const coeff =
    (60 + myBuffedstat($stat`Mysticality`) / 2.5) / (numericModifier("Spell Damage Percent") + 1);
  // Audit item 4, deliberately NOT applied here: engine customize() pins sea
  // cowboy hat + sea chaps for this underwater task and this maximize strips
  // them, but the Colosseum is an outfit-required zone — mafia wears the
  // Gladiatorial Gear regardless (KoLAdventure.java:2339) and `pieces` above
  // already claims both of those slots with the gladiator mask (hat) and
  // tailpiece (pants), which the round cannot be fought without. Re-pinning the
  // lasso gear here would fight the zone's own outfit for no gain.
  // ...seaKeyword(): mafia forces the Mer-kin outfit for this zone, which already
  // breathes, but the keyword costs nothing there and keeps every self-dressing
  // Sea helper on the same rule (omitted under a breathing effect).
  const terms = [`${coeff.toFixed(2)} spell damage percent`, "mys", ...pieces];
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
  ensureHelperBreathing("the Mer-kin Colosseum");
  recover(myMaxhp()); // colosseum floor is FULL HP (setRecoveryTargets UTS:219-220)
  adv1($location`Mer-kin Colosseum`, -1, gladiatorFilter());
  if (get("lastEncounter") === "Been There, Won That") {
    // Belt and suspenders — mafia parses this too (SeaMerkinRequest.java:57-66).
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
        // availableAmount, NOT itemAmount: mafia WEARS the Gladiatorial Gear
        // for this outfit-required zone (KoLAdventure.java:2339) and
        // itemAmount() excludes equipped items — after round 1 both counts are
        // 0 and the grind would stall. Matches gearQuest.completed.
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
