import {
  adv1,
  availableAmount,
  cliExecute,
  equip,
  itemAmount,
  maximize,
  turnsPlayed,
  visitUrl,
} from "kolmafia";
import { $item, $location, $slot, get } from "libram";

import { killMacro } from "../../engine/combat";
import {
  ensureHelperBreathing,
  isTrainingLasso,
  requiredFamiliarBreather,
  seaKeyword,
} from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const blade = $item`skate blade`;

/** Turn count of the last `sea_skatepark.php` refresh, so the page load below
 * happens at most once per turn (see skateWarOpen). */
let lastRefreshedTurn = -1;

/** War-open test. Upstream 2026-08-26 (`c8e98d6`): the pref can be stale,
 * so refresh it from the zone page and drop the Holey Rollers queue proxy
 * (UTS:668-673 at 89982f5). A page load is free.
 *
 * Grimoire calls task `ready()`/`completed()` on every selection pass, so the
 * refresh is memoized per `turnsPlayed()`: the war state can only change on a
 * spent turn, and one page load per turn is the ash's own cadence. */
export function skateWarOpen(): boolean {
  // No map, no zone, no war. KoLAdventure.java:2317-2318 refuses The Skate
  // Park without mapToTheSkateParkPurchased, while skateParkStatus sits at its
  // defaults.txt:1598 value of "war" forever on a map-less account:
  // ensureUpdatedSkatePark() resets the pref each ascension and parseResponse
  // only writes it when the page carries a state image, which a map-less page
  // has none of. Without this gate War Resolution burns its whole soft:8 on
  // turnless passes, skateParkTurn arms a forcer and pulls a skate blade for
  // nothing, and burn.ts's first rung reports a turn it never spent.
  if (!get("mapToTheSkateParkPurchased")) return false;
  const now = turnsPlayed();
  if (lastRefreshedTurn !== now) {
    lastRefreshedTurn = now;
    visitUrl("sea_skatepark.php");
  }
  return get("skateParkStatus") === "war";
}

/** Lutz = the daily 30-turn Fishy, ice state only (SkateParkRequest.java:35-76;
 * statuseffects.txt:552). Called outside any task outfit, so it dresses
 * itself: the buff visit needs breathing gear (upstream `equipSwimTrunks()`
 * before every state2buff1 visit, UTS:2350-2353 at 89982f5). */
export function claimIceBuff(): void {
  if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
    // Self-dressing: no task outfit stands behind this visit, and the buff page
    // is a Sea page. One breathing rule for the whole file — the same
    // preferredBreathingGear() pick dress() would make, lasso- and
    // Waterproofly-aware, instead of the ash's bare trunks (audit item 9).
    ensureHelperBreathing("the Skate Park ice buff");
    visitUrl("sea_skatepark.php?action=state2buff1");
  }
}

/**
 * One war-resolution attempt (ash skatePark(), UTS:643-671): Holey Rollers
 * only fires with a skate blade EQUIPPED — bladeless serves Picking Sides
 * instead, costing an extra turn and forcer (G:213-221). Peridot must come
 * off: choice 1557 would hijack the forced NC into a fight.
 */
export function skateParkTurn(): void {
  if (availableAmount(blade) === 0 && pullBudgetAllows(blade)) pullSequence(blade);
  forceNextNoncombat();
  if (get("noncombatForcerActive")) {
    // No breathing gear here: this branch runs no maximize, and the single
    // ensureHelperBreathing() below covers both branches (audit item 1). The
    // old unconditional trunks equip ignored Driving Waterproofly and stripped
    // the sea chaps the engine pins for lasso training.
    cliExecute("unequip Peridot of Peril");
    if (itemAmount(blade) > 0) equip($slot`weapon`, blade);
  } else {
    // ...seaKeyword() makes the breather the maximizer's job (Evaluator.java:
    // 396-404); ensureHelperBreathing() below is the one fallback behind it.
    const terms = ["-combat", "-equip Peridot of Peril"];
    // Re-pin the lasso gear (audit item 4), same as gym.ts: `War Resolution` is
    // `underwater: true` and non-`freeaction`, so engine customize() pinned sea
    // cowboy hat + sea chaps and dress() wore them — this maximize runs after
    // dress() and would strip both. Only the maximizing branch needs this; the
    // forcer branch above maximizes nothing, so the engine's pins survive it.
    // In `terms`, so the no-`sea` retry below keeps them too.
    if (isTrainingLasso()) terms.push("+equip sea cowboy hat", "+equip sea chaps");
    const sea = seaKeyword();
    // A `sea` maximize can FAIL — the keyword masks Underwater Familiar too
    // (Evaluator.java:396-401) and getScore() fails any candidate missing
    // either boolean (Evaluator.java:980-984). Fielding no familiar is not what
    // breaks it (modifiers.txt:4832 gives `(none)` the Underwater Familiar bit
    // and Modifiers.java:1218 adds it before the raceData == null return at
    // :1228-1231); it fails when nothing on hand can satisfy the mask in a free
    // slot. A failing pass still emits its best candidate's slots (Maximizer
    // .java:211-225) rather than the objectives above, so re-run them without
    // the keyword and let ensureHelperBreathing() below breathe (or stop
    // loudly).
    if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
      maximize(terms.join(", "), false);
    }
    if (availableAmount(blade) > 0) equip($slot`weapon`, blade);
  }
  // The ONE breathing fallback for both branches (audit items 1 + 9). The Skate
  // Park is not an outfit zone, so mafia supplies no breathing (KoLAdventure
  // .java:2867-2884): the `sea` keyword above is the primary and this is the
  // fallback for when it was skipped, found nothing, or never ran (the forcer
  // branch maximizes nothing). Same rule as the engine's enforcement, not a
  // second one, and a superset of the ash's bare trunks equip — it honors
  // Driving Waterproofly, keeps the lasso-pinned pants, and aborts loudly.
  ensureHelperBreathing("The Skate Park");
  // Familiar breathing, BOTH branches (and after the maximize, which may fill
  // the familiar slot itself): no `outfit` on the wrapper task means the
  // engine's enforcement never runs, and a non-aquatic familiar left up by an
  // earlier task makes mafia refuse the zone (KoLAdventure.java:2867-2884).
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
  recover();
  adv1($location`The Skate Park`, -1, () => killMacro(false).toString());
  claimIceBuff();
}

export function skateParkQuest(): Quest {
  return {
    name: "Skate Park",
    tasks: [
      {
        // Ash resolves the war before Yog-Urt (cleanup loop UTS:2727-2731);
        // burns during Deep-Tainted waits usually finish it earlier for free.
        name: "War Resolution",
        ready: skateWarOpen,
        // Map-less accounts report complete rather than stuck-incomplete:
        // skateWarOpen()'s mapToTheSkateParkPurchased gate makes this true.
        completed: () => !skateWarOpen(),
        do: skateParkTurn,
        underwater: true,
        limit: {
          soft: 8,
          message: "The skate-park war is not resolving; check NC forcers and the skate blade.",
        },
      },
    ],
  };
}
