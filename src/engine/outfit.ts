import { OutfitSpec } from "grimoire-kolmafia";
import {
  cliExecute,
  equippedItem,
  Familiar,
  Item,
  Monster,
  myInebriety,
  inebrietyLimit,
  numericModifier,
  print,
} from "kolmafia";
import {
  $effect,
  $familiar,
  get,
  $item,
  $items,
  findLeprechaunMultiplier,
  have,
  maxBy,
  $skill,
  $slot,
  totalFamiliarWeight,
} from "libram";

export function bestFamUnderwaterGear(fam: Familiar): Item {
  // When the familiar can already breathe underwater (or buffs cover it), pick general meat gear.
  // Otherwise das boot / bathysphere (matches garbo yachtzee familiar.ts).
  return fam.underwater || have($effect`Driving Waterproofly`) || have($effect`Wet Willied`)
    ? have($item`amulet coin`)
      ? $item`amulet coin`
      : $item`filthy child leash`
    : have($item`das boot`)
      ? $item`das boot`
      : $item`little bitty bathysphere`;
}
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;

export function bestFamiliarGear(_fam: Familiar): Item {
  return have($item`amulet coin`) ? $item`amulet coin` : $item`filthy child leash`;
}
function equipmentlessFamiliarWeight(fam: Familiar): number {
  return (
    totalFamiliarWeight(fam, true) -
    numericModifier(equippedItem($slot`familiar`), "Familiar Weight")
  );
}
export function parka(): boolean {
  if (!have($item`Jurassic Parka`) || !have($skill`Torso Awareness`)) return false;
  if (get("parkaMode") !== "spikolodon") cliExecute("parka spikolodon");
  return true;
}

export function chooseFamiliar(_allowAttackingFamiliars = true): Familiar {
  const haveUnderwaterFamEquipment = familiarWaterBreathingEquipment.some((item) => have(item));
  const availableUnderwaterFamiliars = Familiar.all()
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

  print(`Familiar bonus meat%:`, "blue");
  availableUnderwaterFamiliars.forEach(({ familiar, meat }) => {
    print(`${familiar} (${meat.toFixed(2)}%)`, "blue");
  });

  if (availableUnderwaterFamiliars.length === 0) return $familiar.none;
  const best = maxBy(availableUnderwaterFamiliars, "meat").familiar;
  print(`Best Familiar: ${best}`, "blue");
  return best;
}

export function baseOutfit(
  _allowAttackingFamiliars = true,
  _avoidGarbageShirt = false,
  _medianMonster?: Monster,
): OutfitSpec {
  const spec: OutfitSpec & { equip: Item[]; avoid: Item[] } = {
    equip: [],
    avoid: [],
  };
  const overdrunk = myInebriety() > inebrietyLimit();
  const familiar = chooseFamiliar();
  if (!(familiar.underwater || have($effect`Driving Waterproofly`) || have($effect`Wet Willied`))) {
    spec.modifier = "underwater familiar";
  }

  spec.equip.push(bestFamUnderwaterGear(familiar));
  if (get("lassoTraining") !== "expertly" &&
      get("lassoTrainingCount") < 20 &&
      have($item`sea lasso`)) {
    spec.equip.push($item`sea cowboy hat`);
    spec.equip.push($item`sea chaps`);
  }
  if (overdrunk) spec.equip.push($item`Drunkula's wineglass`);
  spec.avoid.push(
    ...$items`anemoney clip, cursed magnifying glass, Kramco Sausage-o-Matic™, cheap sunglasses`,
  );

  spec.familiar = familiar;

  return spec;
}
