import {
  abort,
  booleanModifier,
  canEquip,
  equippedItem,
  Familiar,
  Item,
  myFamiliar,
  numericModifier,
  print,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $slot,
  findLeprechaunMultiplier,
  get,
  have,
  maxBy,
  totalFamiliarWeight,
} from "libram";

/** Single source of truth (spec §1: the old repo carried three copies of these).
 * Path 55's default breather is the pants slot — really, really nice swimming
 * trunks (ash swimmingTrunks() UTS:74-84) — leaving hat/back free. Trunks lead
 * the list; the hat/back pieces matter while lasso-training pins the pants. */
export const waterBreathingEquipment = $items`really\, really nice swimming trunks, The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;

/** Effects that grant breathing without gear (Driving Waterproofly covers familiar too). */
export function hasBreathingEffect(): boolean {
  return have($effect`Driving Waterproofly`) || have($effect`Wet Willied`);
}

export function canBreatheUnderwater(): boolean {
  return (
    booleanModifier("Adventure Underwater") ||
    waterBreathingEquipment.some((item) => have(item) && canEquip(item))
  );
}

/** Wiki §9: hat+pants must stay free for sea cowboy hat + sea chaps while lasso training,
 * so back-slot SCUBA tanks jump the breathing-preference queue. */
export function isTrainingLasso(): boolean {
  return (
    get("lassoTraining") !== "expertly" && get("lassoTrainingCount") < 20 && have($item`sea lasso`)
  );
}

const scubaTanks = $items`old SCUBA tank, Elf Guard SCUBA tank`;
const trainingBlockedGear = $items`really\, really nice swimming trunks`;

export function preferredBreathingGear(): Item[] {
  const gear = isTrainingLasso()
    ? [...scubaTanks, ...waterBreathingEquipment.filter((it) => !trainingBlockedGear.includes(it))]
    : [...waterBreathingEquipment];
  return gear.filter((item, idx, arr) => arr.indexOf(item) === idx);
}

export function bestFamUnderwaterGear(fam: Familiar): Item {
  // Underwater-capable (or effect-covered) familiars take general meat gear;
  // otherwise das boot / bathysphere (idiom from garbo yachtzee familiar.ts).
  return fam.underwater || have($effect`Driving Waterproofly`) || have($effect`Wet Willied`)
    ? have($item`amulet coin`)
      ? $item`amulet coin`
      : $item`filthy child leash`
    : have($item`das boot`)
      ? $item`das boot`
      : $item`little bitty bathysphere`;
}

/**
 * The familiar-slot breather a SELF-DRESSING helper must add before a Sea
 * zone, or `$item.none` when none is needed (no familiar, an aquatic one, or a
 * breathing effect). The engine's own enforcement (engine.ts:240-246) only
 * covers tasks that declare an `outfit` with a familiar; function-`do` tasks
 * get a bare Outfit whose `familiar` is undefined, so their helpers must ask
 * here. Aborts loudly when a breather IS needed and the account owns neither —
 * mafia would otherwise refuse the zone outright
 * (KoLAdventure.java:2867-2884), exactly as engine.ts:245 does.
 */
export function requiredFamiliarBreather(familiar: Familiar = myFamiliar()): Item {
  if (familiar === $familiar.none || familiar.underwater || hasBreathingEffect()) return $item.none;
  const breather = bestFamUnderwaterGear(familiar);
  if (!have(breather)) {
    abort(
      `${familiar} cannot breathe underwater and no familiar breather is on hand — pull or acquire a das boot or a little bitty bathysphere (or take an aquatic familiar), then rerun.`,
    );
  }
  return breather;
}

function equipmentlessFamiliarWeight(fam: Familiar): number {
  return (
    totalFamiliarWeight(fam, true) -
    numericModifier(equippedItem($slot`familiar`), "Familiar Weight")
  );
}

export function chooseFamiliar(): Familiar {
  const haveUnderwaterFamEquipment = familiarWaterBreathingEquipment.some((item) => have(item));
  const candidates = Familiar.all()
    .filter(
      (fam) =>
        have(fam) &&
        findLeprechaunMultiplier(fam) > 0 &&
        fam !== $familiar`Ghost of Crimbo Commerce` &&
        fam !== $familiar`Robortender` &&
        (fam.underwater || haveUnderwaterFamEquipment),
    )
    .map((familiar) => ({
      familiar,
      meat: numericModifier(
        familiar,
        "Meat Drop",
        equipmentlessFamiliarWeight(familiar),
        bestFamUnderwaterGear(familiar),
      ),
    }));

  if (candidates.length === 0) return $familiar.none;
  const best = maxBy(candidates, "meat").familiar;
  print(`Best meat familiar underwater: ${best}`, "blue");
  return best;
}

/** Ash use_familiar("-combat") (UTS:349-355): Peace Turkey else Disgeist. */
export function sneakFamiliar(): Familiar | undefined {
  if (have($familiar`Peace Turkey`)) return $familiar`Peace Turkey`;
  if (have($familiar`Disgeist`)) return $familiar`Disgeist`;
  return undefined;
}
