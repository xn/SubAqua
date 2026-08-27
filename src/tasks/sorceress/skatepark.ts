import {
  adv1,
  availableAmount,
  booleanModifier,
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
  hasBreathingEffect,
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
    if (!booleanModifier("Adventure Underwater")) equip($item`really, really nice swimming trunks`);
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
    equip($item`really, really nice swimming trunks`);
    cliExecute("unequip Peridot of Peril");
    if (itemAmount(blade) > 0) equip($slot`weapon`, blade);
  } else {
    // ...seaKeyword() makes the breather the maximizer's job (Evaluator.java:
    // 396-404) instead of the explicit trunks below, which stay as the fallback.
    const terms = ["-combat", "-equip Peridot of Peril"];
    const sea = seaKeyword();
    // A `sea` maximize can FAIL outright — the keyword masks Underwater Familiar
    // too (Evaluator.java:396-401) and getScore() fails any candidate missing
    // either boolean (Evaluator.java:980-984), which no familiar out cannot
    // satisfy (Modifiers.java:1228-1231). A failed maximize applies NOTHING, so
    // the objectives above would be silently dropped: re-run them without the
    // keyword and let ensureHelperBreathing() below breathe (or stop loudly).
    if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
      maximize(terms.join(", "), false);
    }
    // The Skate Park is NOT an outfit zone, so mafia supplies no breathing here
    // (KoLAdventure.java:2867-2884): the sea keyword above is the primary, and
    // this is the fallback for when it was skipped or found nothing. Same rule
    // as the engine's enforcement, not a second one; the item name's commas
    // keep it out of the maximizer string.
    if (!hasBreathingEffect() && !booleanModifier("Adventure Underwater")) {
      equip($item`really, really nice swimming trunks`);
    }
    if (availableAmount(blade) > 0) equip($slot`weapon`, blade);
  }
  // Both branches: the forcer branch's trunks equip is just as capable of
  // leaving us unable to breathe (trunkless account, lasso-pinned pants), and
  // this zone has no engine dress() pass behind it.
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
