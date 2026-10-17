import { Item, print, use } from "kolmafia";

import { Task } from "../engine/task";
import { drinkPlan } from "../lib/bangplan";
import { candidateBangStrings } from "../lib/dreadscroll";

import { bangHeld, bangKnown, bangPotionByIndex } from "./bangpotions";

/**
 * Bang potions worth drinking now (lib/bangplan): the Object Detection one if it is known
 * and still held, and every unidentified potion that cannot be booze or teleportitis.
 */
export function potionsToDrink(): Item[] {
  return drinkPlan(bangKnown(), bangHeld(), candidateBangStrings())
    .map(bangPotionByIndex)
    .filter((potion): potion is Item => potion !== undefined);
}

/**
 * A free task that drinks them. The Teflon quest runs it before the dig so Object Detection is
 * up for the wall; the Library runs it again so a potion the throws had not settled by the
 * mine still becomes a seed constraint before the dreadscroll lane needs it.
 */
export function drinkPotionsTask(ready: () => boolean, done: () => boolean): Task {
  return {
    name: "Drink Potions",
    ready,
    completed: () => done() || potionsToDrink().length === 0,
    do: (): void => {
      for (const potion of potionsToDrink()) {
        print(
          `Drink Potions: ${potion.name} (bang potion identification / Object Detection)`,
          "blue",
        );
        use(potion);
      }
    },
    freeaction: true,
    limit: {
      tries: 2,
      message:
        "Bang potions did not identify on use (lastBangPotion prefs unchanged); use the remaining potions by hand, then rerun.",
    },
  };
}
