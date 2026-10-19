import { Item, toInt } from "kolmafia";
import { $items, $monster, get, have, Macro } from "libram";

import { BangKnown, throwWanted } from "../lib/bangplan";

/** Item id order 819..827; lib/bangplan's letters and the seed scan index the same way. */
export const bangPotions = $items`milky potion, swirly potion, bubbly potion, smoky potion, cloudy potion, effervescent potion, fizzy potion, dark potion, murky potion`;

const FIRST_ID = 819;

export function bangPotionIdentified(potion: Item): boolean {
  return get(`lastBangPotion${toInt(potion)}`, "") !== "";
}

export function unidentifiedBangPotions(): Item[] {
  return bangPotions.filter((potion) => have(potion) && !bangPotionIdentified(potion));
}

/** The nine lastBangPotion prefs in item id order ("" = unidentified). */
export function bangKnown(): BangKnown {
  const known: BangKnown = Array(bangPotions.length).fill("");
  for (const potion of bangPotions) {
    known[toInt(potion) - FIRST_ID] = get(`lastBangPotion${toInt(potion)}`, "");
  }
  return known;
}

/** Which of the nine are still in inventory, item id order. */
export function bangHeld(): boolean[] {
  const held: boolean[] = Array(bangPotions.length).fill(false);
  for (const potion of bangPotions) held[toInt(potion) - FIRST_ID] = have(potion);
  return held;
}

export function bangPotionByIndex(index: number): Item | undefined {
  return bangPotions.find((potion) => toInt(potion) - FIRST_ID === index);
}

export function bangPotionCriteriaKey(): string {
  return bangPotions
    .map((potion) => get(`lastBangPotion${toInt(potion)}`, "").charAt(0) || "?")
    .join("");
}

/**
 * Throws stop once the booze and teleportitis potions are known (lib/bangplan): the other
 * seven are identified by drinking before the teflon dig, where Object Detection lights the
 * whole mine wall. Throwing past that point only destroys a potion the dig could use.
 */
export function bangThrowWanted(): boolean {
  return unidentifiedBangPotions().length > 0 && throwWanted(bangKnown());
}

export const bangPotionNever = [$monster`sea cowboy`, $monster`wild seahorse`];

/** One potion per fight, so the throws stop on the fight that finds the last costly one. */
export function bangPotionMacro(): Macro {
  const potions = unidentifiedBangPotions();
  if (potions.length === 0 || !bangThrowWanted()) return new Macro();
  return Macro.ifNot("pastround 5", Macro.tryItem(potions[0]));
}

export function bangPotionRounds(): number {
  return bangThrowWanted() ? 1 : 0;
}
