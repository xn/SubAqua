import { CombatResource as BaseCombatResource, OutfitSpec } from "grimoire-kolmafia";
import { Familiar, Item } from "kolmafia";

export interface Resource {
  name: string;
  available: () => boolean;
  remaining: () => number;
  prepare?: () => void;
  equip?: Item | Familiar | OutfitSpec | OutfitSpec[];
}

export type CombatResource = Resource & BaseCombatResource;
