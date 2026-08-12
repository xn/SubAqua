import {
  booleanModifier,
  canEquip,
  equippedItem,
  Familiar,
  Item,
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

/** Single source of truth (spec §1: the old repo carried three copies of these). */
export const waterBreathingEquipment = $items`The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;

/** Effects that grant breathing without gear (Driving Waterproofly covers familiar too). */
export function hasBreathingEffect(): boolean {
  return (
    have($effect`Driving Waterproofly`) ||
    have($effect`Wet Willied`) ||
    booleanModifier("Adventure Underwater")
  );
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

export function preferredBreathingGear(): Item[] {
  const gear = isTrainingLasso()
    ? [...scubaTanks, ...waterBreathingEquipment]
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
