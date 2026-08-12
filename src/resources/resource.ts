import { CombatResource as BaseCombatResource, OutfitSpec } from "grimoire-kolmafia";
import { Familiar, Item } from "kolmafia";

/**
 * Shared vocabulary for every resources/ ladder. Salvaged from the old repo's
 * src/engine/resource.ts (a8c4168): `remaining` is promoted into the base
 * interface so each ladder stops bolting it on locally; the unused
 * `effect`/`chance` fields are dropped.
 */
export interface Resource {
  name: string;
  available: () => boolean;
  remaining: () => number;
  prepare?: () => void;
  equip?: Item | Familiar | OutfitSpec | OutfitSpec[];
}

/** A Resource grimoire can splice into a combat macro via resources.provide(). */
export type CombatResource = Resource & BaseCombatResource;
