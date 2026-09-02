import { Item, toInt } from "kolmafia";
import { $items, $monster, $skill, get, have, Macro } from "libram";

export const bangPotions = $items`milky potion, swirly potion, bubbly potion, smoky potion, cloudy potion, effervescent potion, fizzy potion, dark potion, murky potion`;

export function bangPotionIdentified(potion: Item): boolean {
  return get(`lastBangPotion${toInt(potion)}`, "") !== "";
}

export function unidentifiedBangPotions(): Item[] {
  return bangPotions.filter((potion) => have(potion) && !bangPotionIdentified(potion));
}

export function bangPotionCriteriaKey(): string {
  return bangPotions
    .map((potion) => get(`lastBangPotion${toInt(potion)}`, "").charAt(0) || "?")
    .join("");
}

export const bangPotionNever = [$monster`sea cowboy`, $monster`wild seahorse`];

export function bangPotionMacro(): Macro {
  const potions = unidentifiedBangPotions();
  const macro = new Macro();
  const throws: (Item | [Item, Item])[] = [];
  if (have($skill`Ambidextrous Funkslinging`)) {
    for (let i = 0; i + 1 < potions.length; i += 2) throws.push([potions[i], potions[i + 1]]);
    if (potions.length % 2 === 1) throws.push(potions[potions.length - 1]);
  } else {
    throws.push(...potions);
  }
  for (const item of throws) macro.step(Macro.ifNot("pastround 5", Macro.tryItem(item)));
  return macro;
}

export function bangPotionRounds(): number {
  const unidentified = unidentifiedBangPotions().length;
  if (unidentified === 0) return 0;
  const perRound = have($skill`Ambidextrous Funkslinging`) ? 2 : 1;
  return Math.min(4, Math.ceil(unidentified / perRound));
}
