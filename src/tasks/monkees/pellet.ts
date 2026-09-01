import { handlingChoice, itemAmount, runChoice, use, visitUrl } from "kolmafia";
import { $familiar, $item, $location, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy, openerOnce } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";

const pellet = $item`wriggling flytrap pellet`;
const flytrap = $monster`Neptune flytrap`;
const garden = $location`An Octopus's Garden`;
const store = $location`The Skeleton Store`;
const spade = $item`Archaeologist's Spade`;
// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const sword = $familiar`Sword of S Words`;

/**
 * THE SWORD LANE (ash `flytrap()`, UnderTheSea.ash:1148-1180).
 *
 * The `wriggling flytrap pellet` is the rare drop; the plain `flytrap pellet`
 * is the common one, and only the wriggling one starts the Sea Monkees. The
 * ash never farms the garden for it. It imprints the Sword of S Words on the
 * Neptune flytrap (id 740) in ONE peridot-forced garden fight, then walks away
 * to The Skeleton Store and digs with the Archaeologist's Spade: every kill
 * anywhere then drops "one more Neptune flytrap's worth of loot", and the
 * spade's digs are FREE FIGHTS.
 *
 * Gold, turn 6, start to finish (docs/gold-star-run.txt:1570-1690): one garden
 * adventure (peridot 1557 -> flytrap, imprint, Shattering Punch — free), the
 * meatsmith talk, one Skeleton Store NC, one spade dig, and the very first
 * remaindered skeleton handed over `flytrap pellet` + `wriggling flytrap
 * pellet`. Zero paid turns and ZERO banishes.
 *
 * The 08-31 run had no imprint (guild.ts's Sword Imprint targets the sea
 * cowboy and is correctly gated off in mid tier) and ground the garden
 * instead: NINE Octopus's Garden visits, four banishes and a curveball spent
 * on Black Crayon Flowers, stranglin' algae and a sponge, one paid turn, and
 * five plain pellets before the wriggling one. The banishes were the ones the
 * gymnasium later wanted.
 *
 * Tier gate is the ash's own `!highShiny()`: high spends the sword on the sea
 * cowboy instead (guild.ts's Sword Imprint / SWordLasso, UTS:1090-1097), and
 * `_swordOfSWordsMonsterChanged` allows only so many re-imprints a day.
 */
function swordLaneReady(swordLane: boolean): boolean {
  return swordLane && have(sword) && have(spade);
}

function imprinted(): boolean {
  return get("swordOfSWordsMonster") === flytrap;
}

export function pelletQuest(opts: { swordLane: boolean }): Quest {
  const laneOpen = (): boolean => swordLaneReady(opts.swordLane) && !have(pellet);
  return {
    name: "Pellet",
    tasks: [
      {
        // Ash flytrap():1151-1156 — `while (swordOfSWordsMonster != "740")`
        // adventure the garden with the sword out, item drop, the peridot and
        // a free kill. The peridot forces the flytrap so the imprint lands on
        // the first fight; the free kill keeps the turn.
        name: "Flytrap Imprint",
        ready: () => laneOpen() && !imprinted(),
        completed: () => imprinted() || have(pellet) || monkeesStep() >= 0,
        do: garden,
        peridot: flytrap,
        // No `.banish()`: with the peridot forcing the flytrap there is
        // nothing else in the fight to banish, and gold spends none here.
        combat: new CombatStrategy()
          .macro(
            () =>
              openerOnce(
                // eslint-disable-next-line libram/verify-constants -- Sword of S Words skill, plugin data lags (classskills.txt:1170)
                Macro.trySkill($skill`%fn, kill a lot of these guys`),
              ),
            flytrap,
          )
          .killFree(flytrap)
          .kill(),
        outfit: { modifier: "item", familiar: sword },
        effects: itemDropEffects,
        choices: { 298: 2 },
        prepare: () => recover(),
        limit: { tries: 3, message: "The Sword of S Words would not imprint on the flytrap." },
      },
      {
        // Ash flytrap():1157-1165. The meatsmith talk leaves choice 1059
        // PENDING and nothing submits it: a bare visitUrl is not an adventure,
        // and grimoire's `choices` only pre-registers an answer for choices
        // mafia resolves while adventuring. The ash runs it inline
        // (`if (handling_choice()) run_choice(1)`) and so must we — live
        // 2026-09-01 this task visited twice, left 1059 sitting, never flipped
        // skeletonStoreAvailable, and died on its own tries limit.
        name: "Skeleton Store Unlock",
        ready: () => laneOpen() && imprinted() && !get("skeletonStoreAvailable", false),
        completed: () => get("skeletonStoreAvailable", false) || have(pellet) || monkeesStep() >= 0,
        do: (): void => {
          visitUrl("shop.php?whichshop=meatsmith&action=talk");
          if (handlingChoice()) runChoice(1);
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Ash flytrap():1157-1166 — one Skeleton Store adventure, which is
        // what aims the spade (it digs at the SERVER's last-adventured zone,
        // per the ash's own note at :1170-1176). Gold's visit was the
        // "Skeletons In Store" NC and cost no turn (G:1645, still `[6]`).
        name: "Skeleton Store",
        ready: () =>
          laneOpen() && imprinted() && get("skeletonStoreAvailable", false) && !spadeAimed(),
        completed: () => spadeAimed() || have(pellet) || monkeesStep() >= 0,
        do: store,
        outfit: { modifier: "item", familiar: sword },
        effects: itemDropEffects,
        prepare: () => recover(),
        limit: { tries: 3 },
      },
      {
        // Ash flytrap():1167-1180 — dig until the wriggling pellet drops or
        // the day's 11 digs are gone. Each dig is choice 1596 -> a free
        // skeleton fight, and the imprint pays flytrap loot off every kill.
        // A dig that offered no skeleton leaves the counter untouched (the
        // ash backs out via "I'm done digging"), so "Skeleton Store" above
        // re-aims the spade before the next try — hence the shared `ready`
        // on spadeAimed().
        name: "Spade Digs",
        ready: () =>
          laneOpen() &&
          imprinted() &&
          get("skeletonStoreAvailable", false) &&
          spadeAimed() &&
          get("_archSpadeDigs", 0) < 11,
        completed: () => have(pellet) || get("_archSpadeDigs", 0) >= 11 || monkeesStep() >= 0,
        // Same shape as the unlock above: `use()` is not an adventure, so the
        // 1596 pending choice is submitted here. `choices` stays as well —
        // harmless, and it covers the path where mafia resolves 1596 itself.
        do: (): void => {
          use(spade);
          if (handlingChoice()) runChoice(3);
        },
        choices: { 1596: 3 },
        outfit: { modifier: "item", familiar: sword },
        effects: itemDropEffects,
        combat: new CombatStrategy().kill(),
        prepare: () => recover(),
        limit: { tries: 12, message: "The spade dug out its day and no wriggling pellet fell." },
      },
      {
        // FALLBACK, for a day the sword lane cannot run (no sword, no spade,
        // or high shiny, which spends the imprint on the sea cowboy). The
        // pellet is a 50% drop from the flytrap (monsters.txt:470); the
        // peridot forces the flytrap and forceItems guarantees the drop,
        // replacing the ash's three escalating loops (UTS:1783-1843) with one
        // guaranteed-drop fight per day-of-resource. The banish stays HERE
        // and only here: without the sword there is no free source of flytrap
        // loot, so the zone has to be thinned the hard way.
        name: "Garden Pellet",
        // Also the backstop when the lane RAN and came up short: without this
        // second disjunct, a day whose 11 digs produce no wriggling pellet
        // leaves every sword-lane task not-ready or completed, "Use Pellet"
        // not ready, and "Little Brother" not completed — grimoire would have
        // no task at all and main.ts would exit on a bare "N tasks remaining".
        ready: () => !swordLaneReady(opts.swordLane) || get("_archSpadeDigs", 0) >= 11,
        completed: () => monkeesStep() >= 0 || have(pellet),
        do: garden,
        peridot: flytrap,
        combat: new CombatStrategy().forceItems(flytrap).banish(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        choices: { 298: 2 },
        prepare: () => recover(),
        limit: {
          soft: 15,
          message: "The flytrap would not die with its pellet; check drops and rerun.",
        },
      },
      {
        name: "Use Pellet",
        ready: () => have(pellet),
        completed: () => monkeesStep() >= 0,
        do: () => void use(pellet),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Little Brother",
        completed: () => monkeesStep() >= 1,
        do: () => void visitUrl("monkeycastle.php?who=1"),
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
    ],
  };
}

/** The spade digs at the SERVER's last-adventured zone (ash flytrap():1170-
 * 1176), so it only produces a skeleton once the Skeleton Store is where we
 * last adventured. */
function spadeAimed(): boolean {
  return get("lastAdventure") === store && itemAmount(spade) > 0;
}
