import { use } from "kolmafia";
import { $item, get, have } from "libram";

import { haveAnywhere } from "../lib";

import { currentPolicy } from "./policy";
import { pullSequence } from "./pulls";

const pyec = $item`Platinum Yendorian Express Card`;

/** The card is owned (inventory or Hagnk's), unused today, and the policy spends it. */
export function pyecAvailable(): boolean {
  return currentPolicy().usePyec && haveAnywhere(pyec) && !get("expressCardUsed", false);
}

/**
 * Pulls the card from Hagnk's if needed and uses it (+5 turns to every active effect); the
 * `expressCardUsed` check keeps the Fishy ladder and the Sorceress Dailies task to one use a day.
 */
export function usePyec(): boolean {
  if (!pyecAvailable()) return false;
  if (!have(pyec)) pullSequence(pyec);
  if (have(pyec)) use(pyec);
  return get("expressCardUsed", false);
}
