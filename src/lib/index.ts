import { Item, print, storageAmount } from "kolmafia";
import { get, have } from "libram";

import { args } from "../args";

export * from "./tier";

export function debug(message: string): void {
  print(`[subaqua] ${message}`, "gray");
}

/** Spec §4: the ash's autoBuyPriceLimit user_confirm becomes an arg with the
 * user's own mafia preference as the default. */
export function buyLimit(): number {
  return args.buyLimit ?? get("autoBuyPriceLimit");
}

/** Ash have_item(): owned anywhere useful — inventory/equipped (libram have)
 * or still in Hagnk's. The resource ladders and sim share this definition. */
export function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}
