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

/**
 * The `sea` maximizer keyword, or nothing when an effect already breathes for
 * us. `sea` forces the "Adventure Underwater" and "Underwater Familiar"
 * booleans (Evaluator.java:396-404), so the maximizer picks the breathing gear
 * itself instead of the script pinning a slot. User rule (2026-08-27): add it
 * ONLY while Driving Waterproofly / Wet Willied is down — under the effect the
 * keyword would spend a slot on gear the effect already provides.
 *
 * Spread into a maximize term list: `maximize([..., ...seaKeyword()].join(", "))`.
 */
export function seaKeyword(): string[] {
  return hasBreathingEffect() ? [] : ["sea"];
}

/**
 * Post-maximize breathing fallback + loud stop for the SELF-DRESSING Sea
 * helpers (gym, colosseum, skate park), which call `maximize()` by hand and so
 * never see the engine `dress()` last-chance pass.
 *
 * Needed because a `sea` maximize can fail for any reason (no candidate scores,
 * nothing on hand fits a free slot): `sea` masks Underwater Familiar as well as
 * Adventure Underwater (Evaluator.java:396-401) and getScore() fails any
 * candidate that misses either (Evaluator.java:980-984). Note that fielding no
 * familiar is NOT one of those reasons — modifiers.txt:4832 gives `(none)` the
 * Underwater Familiar bit and lookupFamiliarModifiers adds it (Modifiers.java
 * :1218) before its raceData == null early return (:1228-1231). A failed
 * maximize is also not a no-op: Maximizer still emits every slot of its best
 * (failing) candidate (Maximizer.java:211-225), so the helpers' retry without
 * `sea` re-maximizes from whatever that pass left, and this is the last check
 * that the result actually breathes.
 *
 * Same rule as the engine's enforcement, not a second one: nothing to do when
 * an effect or the zone's forced outfit already breathes; otherwise the same
 * `preferredBreathingGear()` pick `dress()` makes — a superset of the ash's
 * bare trunks equip, since it also covers lasso training and trunkless
 * accounts.
 */
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

/** Kramco rides the off-hand on +item farm fights when a sausage goblin is
 * GUARANTEED (ash delay() pattern, G:497) — the goblin is a free fight AND
 * the free lastCopyableMonster that seeds backup:{targets:"free"} chains
 * (C F3: 08-30's backup charges sat at 8/11 all day with no goblin to
 * copy). Guaranteed-only so ordinary fights keep their +item off-hand. */
export function kramcoIfDue(): Item[] {
  return have($item`Kramco Sausage-o-Matic™`) && getKramcoWandererChance() >= 1
    ? $items`Kramco Sausage-o-Matic™`
    : [];
}

/** Default item familiar for +item tasks that name none (B F2: the whole
 * 08-30 B slice ran on the Patriotic Eagle because nothing picked an item
 * familiar — 2/11 pristine scales vs gold's 16/16). Ash UTS:878-879:
 * Jill-of-All-Trades first, else mafia's "itdrop" pick; here the fallback
 * ranks fairy-family familiars by their Item Drop at underwater-viable
 * weight, mirroring chooseFamiliar() above. */
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

/** Ash use_familiar("-combat") (UTS:349-355): Peace Turkey else Disgeist. */
export function sneakFamiliar(): Familiar | undefined {
  if (have($familiar`Peace Turkey`)) return $familiar`Peace Turkey`;
  if (have($familiar`Disgeist`)) return $familiar`Disgeist`;
  return undefined;
}

/** Ash use_familiar("exp") (UTS:29-37 at 89982f5): a familiar that never
 * attacks, so a boss soaks its experience instead. Chest Mimic -> Cooler Yeti
 * -> Cookbookbat -> none. Used for the sorceress bosses (Yog-Urt, Shub).
 * The terminal rung is $familiar.none, NOT undefined: grimoire treats an
 * undefined `familiar` as "leave whatever is out" (outfit.js:312), which on an
 * account owning none of the three would send an attacking familiar into
 * Shub's doubling retaliation — the exact thing this pick exists to prevent. */
export function expFamiliar(): Familiar {
  if (have($familiar`Chest Mimic`)) return $familiar`Chest Mimic`;
  if (have($familiar`Cooler Yeti`)) return $familiar`Cooler Yeti`;
  if (have($familiar`Cookbookbat`)) return $familiar`Cookbookbat`;
  return $familiar.none;
}
