import { Item, toInt } from "kolmafia";
import { $items, $monster, $skill, get, have, Macro } from "libram";

/**
 * The nine bang potions (items.txt ids 819-827, one of each from a blessed
 * large box). Their identities are a dreadscroll-seed criterion
 * (seedfinder SeedCriteria.ash:80-143; lib/dreadscroll.ts playerCriteria()),
 * which is why the ash pulls a ten-leaf clover + large box at init
 * (UTS:594-619) and throws every unidentified potion in its first ordinary
 * fights (CCS:485-495). Same seahorse name, 08-21 vs 08-28: 2 candidates
 * with the potions known, 23 without.
 */
export const bangPotions = $items`milky potion, swirly potion, bubbly potion, smoky potion, cloudy potion, effervescent potion, fizzy potion, dark potion, murky potion`;

/** mafia records a thrown/used potion's effect in lastBangPotion<id>. */
export function bangPotionIdentified(potion: Item): boolean {
  return get(`lastBangPotion${toInt(potion)}`, "") !== "";
}

/** Potions in inventory whose identity mafia has not recorded yet. */
export function unidentifiedBangPotions(): Item[] {
  return bangPotions.filter((potion) => have(potion) && !bangPotionIdentified(potion));
}

/** The nine identities as one string ("?" = unknown) — the seed scan's memo
 * key needs it so a newly identified potion re-filters the candidate list. */
export function bangPotionCriteriaKey(): string {
  return bangPotions
    .map((potion) => get(`lastBangPotion${toInt(potion)}`, "").charAt(0) || "?")
    .join("");
}

/** Fights that must never be spent identifying potions: the ash skips the
 * sea cowboy (CCS:485, its lasso drop wants the round-1 imprint/free kill)
 * and the wild seahorse is a boss the tamer must reach on round 1. */
export const bangPotionNever = [$monster`sea cowboy`, $monster`wild seahorse`];

/**
 * Throw every unidentified potion, funkslinging pairs when the skill is
 * known (ash bangA()/bangB(), CCS:379-395). Each throw is guarded on its
 * own round so the batch stops after round 4 like the ash's `current_round() < 5`
 * loop — a throw is a round, and a long potion volley on a hard fight is a
 * lost fight. Guard is `!pastround 5` because KoL's `pastround N` is already
 * true on round N, so "through round 4" compiles to `!pastround 5` (combat.ts openerOnce()).
 */
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
