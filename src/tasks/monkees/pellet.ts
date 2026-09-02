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
const sword = $familiar`Sword of S Words`;

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
        name: "Flytrap Imprint",
        ready: () => laneOpen() && !imprinted(),
        completed: () => imprinted() || have(pellet) || monkeesStep() >= 0,
        do: garden,
        peridot: flytrap,
        combat: new CombatStrategy()
          .macro(() => openerOnce(Macro.trySkill($skill`%fn, kill a lot of these guys`)), flytrap)
          .killFree(flytrap)
          .kill(),
        outfit: { modifier: "item", familiar: sword },
        effects: itemDropEffects,
        choices: { 298: 2 },
        prepare: () => recover(),
        limit: { tries: 3, message: "The Sword of S Words would not imprint on the flytrap." },
      },
      {
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
        name: "Spade Digs",
        ready: () =>
          laneOpen() &&
          imprinted() &&
          get("skeletonStoreAvailable", false) &&
          spadeAimed() &&
          get("_archSpadeDigs", 0) < 11,
        completed: () => have(pellet) || get("_archSpadeDigs", 0) >= 11 || monkeesStep() >= 0,
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
        name: "Garden Pellet",
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

function spadeAimed(): boolean {
  return get("lastAdventure") === store && itemAmount(spade) > 0;
}
