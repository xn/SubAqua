import {
  adv1,
  availableAmount,
  cliExecute,
  equip,
  Item,
  itemAmount,
  mallPrice,
  maximize,
  pullsRemaining,
  storageAmount,
  turnsPlayed,
  visitUrl,
} from "kolmafia";
import { $item, $items, $location, $slot, get, have } from "libram";

import { killMacro } from "../../engine/combat";
import {
  ensureHelperBreathing,
  isTrainingLasso,
  requiredFamiliarBreather,
  seaKeyword,
} from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { buyLimit, recover } from "../../lib";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";

const blade = $item`skate blade`;
const parasol = $item`peppermint parasol`;
const latePullOrder = $items`peppermint parasol, ink bladder, Mer-kin pinkslip, stuffed yam stinkbomb, anchor bomb`;

function latePullable(it: Item): boolean {
  if (pulledToday(it)) return false;
  if (
    it === parasol &&
    (have($item`navel ring of navel gazing`) || have($item`Greatest American Pants`))
  ) {
    return false;
  }
  if (storageAmount(it) === 0 && mallPrice(it) > buyLimit()) return false;
  return pullBudgetAllows(it);
}

function latePullsDone(): boolean {
  return pullsRemaining() === 0 || !latePullOrder.some(latePullable);
}

function latePulls(): void {
  for (const it of latePullOrder) {
    if (pullsRemaining() === 0) return;
    if (latePullable(it)) pullSequence(it);
  }
}

let lastRefreshedTurn = -1;

export function skateWarOpen(): boolean {
  if (!get("mapToTheSkateParkPurchased")) return false;
  const now = turnsPlayed();
  if (lastRefreshedTurn !== now) {
    lastRefreshedTurn = now;
    visitUrl("sea_skatepark.php");
  }
  return get("skateParkStatus") === "war";
}

export function claimIceBuff(): void {
  if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
    ensureHelperBreathing("the Skate Park ice buff");
    visitUrl("sea_skatepark.php?action=state2buff1");
  }
}

export function skateParkTurn(): void {
  if (availableAmount(blade) === 0 && pullBudgetAllows(blade)) pullSequence(blade);
  forceNextNoncombat();
  if (get("noncombatForcerActive")) {
    cliExecute("unequip Peridot of Peril");
    if (itemAmount(blade) > 0) equip($slot`weapon`, blade);
  } else {
    const terms = ["-combat", "-equip Peridot of Peril", "-equip bat wings"];
    if (isTrainingLasso()) {
      if (have($item`sea cowboy hat`)) terms.push("+equip sea cowboy hat");
      if (have($item`sea chaps`)) terms.push("+equip sea chaps");
    }
    const sea = seaKeyword();
    if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
      maximize(terms.join(", "), false);
    }
    if (availableAmount(blade) > 0) equip($slot`weapon`, blade);
  }
  ensureHelperBreathing("The Skate Park");
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
  recover();
  adv1($location`The Skate Park`, -1, () => killMacro(false).toString());
  claimIceBuff();
}

export function skateParkQuest(): Quest {
  return {
    name: "Skate Park",
    tasks: [
      {
        name: "War Resolution",
        ready: skateWarOpen,
        completed: () => !skateWarOpen(),
        do: skateParkTurn,
        choices: { 403: 1 },
        underwater: true,
        limit: {
          soft: 8,
          message: "The skate-park war is not resolving; check NC forcers and the skate blade.",
        },
      },
      {
        name: "Late Pulls",
        ready: () => get("yogUrtDefeated", false) && !skateWarOpen(),
        completed: latePullsDone,
        do: latePulls,
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
