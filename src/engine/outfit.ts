import {
  abort,
  booleanModifier,
  canEquip,
  equip,
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
  findFairyMultiplier,
  findLeprechaunMultiplier,
  get,
  getKramcoWandererChance,
  have,
  maxBy,
  totalFamiliarWeight,
} from "libram";

export const waterBreathingEquipment = $items`really\, really nice swimming trunks, The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;

export function hasBreathingEffect(): boolean {
  return have($effect`Driving Waterproofly`) || have($effect`Wet Willied`);
}

export function seaKeyword(): string[] {
  return hasBreathingEffect() ? [] : ["sea"];
}

export function ensureHelperBreathing(where: string): void {
  if (booleanModifier("Adventure Underwater")) return;
  if (!hasBreathingEffect()) {
    const breather = preferredBreathingGear().find((item) => have(item) && canEquip(item));
    if (breather) equip(breather);
  }
  if (!booleanModifier("Adventure Underwater")) {
    abort(
      `Unable to establish water breathing for ${where}: the maximizer could not place a breather and no owned piece would equip. Acquire or pull breathing gear (really, really nice swimming trunks, an Elf Guard SCUBA tank, a Mer-kin mask), or get Driving Waterproofly up, then rerun.`,
    );
  }
}

export function canBreatheUnderwater(): boolean {
  return (
    booleanModifier("Adventure Underwater") ||
    waterBreathingEquipment.some((item) => have(item) && canEquip(item))
  );
}

export function isTrainingLasso(): boolean {
  return (
    !lassoExpert() &&
    have($item`sea lasso`) &&
    have($item`sea cowboy hat`) &&
    have($item`sea chaps`)
  );
}

export function lassoExpert(): boolean {
  return get("lassoTraining") === "expertly" || get("lassoTrainingCount", 0) >= 20;
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
  return fam.underwater || have($effect`Driving Waterproofly`) || have($effect`Wet Willied`)
    ? have($item`amulet coin`)
      ? $item`amulet coin`
      : $item`filthy child leash`
    : have($item`das boot`)
      ? $item`das boot`
      : $item`little bitty bathysphere`;
}

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

export function kramcoIfDue(): Item[] {
  return have($item`Kramco Sausage-o-Matic™`) && getKramcoWandererChance() >= 1
    ? $items`Kramco Sausage-o-Matic™`
    : [];
}

export function chooseItemFamiliar(): Familiar {
  const jill = $familiar`Jill-of-All-Trades`;
  const haveUnderwaterFamEquipment = familiarWaterBreathingEquipment.some((item) => have(item));
  if (have(jill) && (jill.underwater || haveUnderwaterFamEquipment)) return jill;
  const candidates = Familiar.all()
    .filter(
      (fam) =>
        have(fam) && findFairyMultiplier(fam) > 0 && (fam.underwater || haveUnderwaterFamEquipment),
    )
    .map((familiar) => ({
      familiar,
      item: numericModifier(
        familiar,
        "Item Drop",
        equipmentlessFamiliarWeight(familiar),
        bestFamUnderwaterGear(familiar),
      ),
    }));
  if (candidates.length === 0) return $familiar.none;
  const best = maxBy(candidates, "item").familiar;
  print(`Best item familiar underwater: ${best}`, "blue");
  return best;
}

export function sneakFamiliar(): Familiar | undefined {
  if (have($familiar`Peace Turkey`)) return $familiar`Peace Turkey`;
  if (have($familiar`Disgeist`)) return $familiar`Disgeist`;
  return undefined;
}

export function expFamiliar(): Familiar {
  if (have($familiar`Chest Mimic`)) return $familiar`Chest Mimic`;
  if (have($familiar`Cooler Yeti`)) return $familiar`Cooler Yeti`;
  if (have($familiar`Cookbookbat`)) return $familiar`Cookbookbat`;
  return $familiar.none;
}
