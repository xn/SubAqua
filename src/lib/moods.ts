import { Effect } from "kolmafia";
import { $effect, $skill, get, have } from "libram";

/**
 * Ports the ash mood() regimes (UTS:392-499) as castable-effect lists for
 * grimoire's task.effects (the engine acquireEffects each via ensureEffect).
 * Only effects whose source the account owns are returned — an effect we
 * cannot obtain would make ensureEffect abort.
 */

/** "-combat" mood (UTS:466-486 subset that is skill/equipment castable). */
export function sneakEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`The Sonata of Sneakiness`)) effects.push($effect`The Sonata of Sneakiness`);
  if (have($skill`Smooth Movement`)) effects.push($effect`Smooth Movements`);
  if (have($skill`Feel Lonely`) && get("_feelLonelyUsed") < 3)
    effects.push($effect`Feeling Lonely`);
  return effects;
}

/** "itdrop" mood subset (UTS:392-440): AT songs and self-buffs only. */
export function itemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Fat Leon's Phat Loot Lyric`)) effects.push($effect`Fat Leon's Phat Loot Lyric`);
  if (have($skill`Singer's Faithful Ocelot`)) effects.push($effect`Singer's Faithful Ocelot`);
  if (have($skill`The Polka of Plenty`)) effects.push($effect`Polka of Plenty`);
  if (have($skill`Donho's Bubbly Ballad`)) effects.push($effect`Donho's Bubbly Ballad`);
  if (have($skill`Leash of Linguini`)) effects.push($effect`Leash of Linguini`);
  if (have($skill`Empathy of the Newt`)) effects.push($effect`Empathy`);
  return effects;
}

/** Elemental-resistance mood for the pearl zones (UTS:466-486): the generic
 * multi-element buffs; per-element gear comes from the task maximizer string. */
export function resEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Astral Shell`)) effects.push($effect`Astral Shell`);
  if (have($skill`Elemental Saucesphere`)) effects.push($effect`Elemental Saucesphere`);
  return effects;
}
