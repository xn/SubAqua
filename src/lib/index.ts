import { print } from "kolmafia";
import { get } from "libram";

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
