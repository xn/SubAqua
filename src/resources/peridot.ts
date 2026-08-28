import { appearanceRates, Location, Monster } from "kolmafia";
import { get, set } from "libram";

const PROPERTY = "_subaqua_peridot_target";

/**
 * Whether `location` is CURRENTLY offering `monster` at all — the guard the
 * peridot equip/choice-set must pass before ever targeting it. mafia's
 * appearanceRates(location) wraps AreaCombatData.getMonsterData(stateful),
 * which only calls AreaCombatData.recalculate() — the pass that reapplies
 * conditional zone weighting like the Wreck's hatch-window rule
 * (AreaCombatData.java:1950-1961, adjustConditionalWeighting()) — when
 * `stateful` is true. recalculate() otherwise has exactly one caller in all
 * of mafia (AreaCombatData.java:510, inside getSummary(), i.e. only when
 * something prints the area's combat summary), so the single-arg
 * `appearanceRates(location)` can read a stale snapshot from whenever that
 * last happened this session — potentially from before today's hatch state
 * was even known. Passing `true` (RuntimeLibrary.java appearance_rates(),
 * includeQueue) forces a fresh recalculate() every call, so this always
 * reflects the monster table KoL is offering right now.
 */
export function peridotTargetOffered(location: Location, monster: Monster): boolean {
  return (appearanceRates(location, true)[monster.name] ?? 0) > 0;
}

/**
 * The Peridot of Peril target the engine is CURRENTLY committed to forcing
 * (engine.ts customize(): equipped only once appearanceRates() confirms the
 * zone is offering it), shared with the standalone choice script for choice
 * 1557 (Peering Through Your Peridot).
 *
 * The two scripts are separate Rhino executions with no shared JS state —
 * rollup.config.ts bundles src/standalone/choice.ts to its own
 * subaqua_choice.js, invoked by mafia's ChoiceManager.invokeChoiceAdventureScript
 * as a fresh interpreter run — so a mafia property is the only channel.
 * engine.ts writes this on every customize() call (clearing it when no
 * peridot is being equipped this task, so a stale target never survives past
 * the task that wanted it); choice.ts's 1557 handler reads it as a
 * defense-in-depth check should the peridot ever open that menu without the
 * engine having pre-registered a `choiceAdventure1557` answer.
 */
export function setPeridotTargetId(monster: Monster | undefined): void {
  set(PROPERTY, monster ? `${monster.id}` : "");
}

export function peridotTargetId(): number | undefined {
  const raw = get(PROPERTY, "");
  return raw === "" ? undefined : Number(raw);
}
