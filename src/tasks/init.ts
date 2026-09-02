import {
  abort,
  availableAmount,
  buy,
  cliExecute,
  getWorkshed,
  handlingChoice,
  itemAmount,
  retrieveItem,
  runChoice,
  storageAmount,
  turnsPlayed,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $familiar,
  $item,
  $items,
  $skill,
  AprilingBandHelmet,
  EternityCodpiece,
  get,
  have,
  Leprecondo,
  MayamCalendar,
  set,
} from "libram";

import { Quest } from "../engine/task";
import { bangPotions } from "../resources/bangpotions";
import { currentPolicy } from "../resources/policy";
import { discretionaryPull } from "../resources/pulls";

const pearl = $item`unblemished pearl`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const catalog = $item`2002 Mr. Store Catalog`;
const vhs = $item`Spooky VHS Tape`;
const worksheds = $items`Asdon Martin keyfob (on ring), portable Mayo Clinic, model train set, TakerSpace letter of Marque`;

const seaGearPulls = $items`Mer-kin sneakmask, shark jumper, scale-mail underwear, Elf Guard SCUBA tank, Flash Liquidizer Ultra Dousing Accessory`;

export function initQuest(): Quest {
  const policy = currentPolicy();
  return {
    name: "Init",
    tasks: [
      {
        name: "Pearl Guard",
        completed: () => get("_subaqua_pearls_checked", false),
        do: (): void => {
          const mounted = EternityCodpiece.have()
            ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
            : 0;
          const total = mounted + availableAmount(pearl);
          if (total < 5 && turnsPlayed() === 0) {
            abort(
              `Only ${total} unblemished pearls found (codpiece + inventory); the finale needs 5. ` +
                "Load pearls into the Eternity Codpiece before ascending, or continue at your own risk " +
                "by setting _subaqua_pearls_checked = true.",
            );
          }
          set("_subaqua_pearls_checked", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Old Guy Quest",
        completed: () => get("questS01OldGuy") !== "unstarted",
        do: () => void visitUrl("place.php?whichplace=sea_oldman&action=oldman_oldman"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Sea Jelly",
        ready: () => have($familiar`Space Jellyfish`) && get("questS01OldGuy") !== "unstarted",
        completed: () =>
          !have($familiar`Space Jellyfish`) ||
          get("_seaJellyHarvested") ||
          get("_subaqua_sea_jelly_visited", false),
        do: (): void => {
          visitUrl("place.php?whichplace=thesea&action=thesea_left2");
          if (handlingChoice()) runChoice(1);
          set("_subaqua_sea_jelly_visited", true);
        },
        choices: { 1219: 1 },
        outfit: () =>
          have($familiar`Space Jellyfish`) ? { familiar: $familiar`Space Jellyfish` } : {},
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Toot",
        completed: () => get("questM05Toot") !== "started" || get("_subaqua_toot_visited", false),
        do: (): void => {
          visitUrl("council.php");
          if (handlingChoice()) runChoice(1);
          visitUrl("tutorial.php?action=toot");
          if (handlingChoice()) runChoice(1);
          visitUrl("council.php");
          if (handlingChoice()) runChoice(1);
          visitUrl("questlog.php?which=1");
          set("_subaqua_toot_visited", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Daily Items",
        completed: () =>
          [$item`letter from King Ralph XI`, $item`pork elf goodies sack`].every(
            (it) => !have(it),
          ) &&
          (!have($item`sushi-rolling mat`) || get("hasSushiMat")) &&
          (!have(catalog) || get("_2002MrStoreCreditsCollected")),
        do: (): void => {
          for (const it of [$item`letter from King Ralph XI`, $item`pork elf goodies sack`]) {
            if (have(it)) use(it);
          }
          if (have($item`sushi-rolling mat`) && !get("hasSushiMat")) use($item`sushi-rolling mat`);
          if (have(catalog) && !get("_2002MrStoreCreditsCollected")) use(catalog);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Photobooth",
        completed: () =>
          get("_photoBoothEquipment", 0) >= 3 || sheriffOutfit.every((it) => have(it)),
        do: (): void => {
          for (const piece of sheriffOutfit) {
            if (!have(piece)) cliExecute(`photobooth item ${piece.name}`);
          }
          if (!sheriffOutfit.every((it) => have(it)) && get("_photoBoothEquipment", 0) >= 3) {
            abort(
              "Your clan's photobooth handed out something other than the Sheriff kit — " +
                "it may be incomplete. Join a clan with a full photobooth (e.g. BAFH) and rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Saber Upgrade",
        completed: () => !have($item`Fourth of May Cosplay Saber`) || get("_saberMod") !== 0,
        do: () => void cliExecute("saber familiar"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Mayam",
        completed: () => !MayamCalendar.have() || get("_mayamSymbolsUsed") !== "",
        do: (): void => {
          cliExecute("mayam rings vessel yam cheese explosion");
          cliExecute("mayam rings fur lightning eyepatch yam");
          cliExecute("mayam rings eye meat yam clock");
        },
        outfit: () => (have($familiar`Chest Mimic`) ? { familiar: $familiar`Chest Mimic` } : {}),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Leprecondo",
        completed: () => !have($item`Leprecondo`) || get("leprecondoInstalled") !== "0,0,0,0",
        do: (): void => {
          const discovered = Leprecondo.discoveredFurniture();
          const picks = policy.leprecondoLayout
            .map((id) => Leprecondo.FURNITURE_PIECES[id])
            .filter((piece) => piece !== undefined && discovered.includes(piece))
            .slice(0, 4);
          if (picks.length === 4) {
            Leprecondo.setFurniture(picks[0], picks[1], picks[2], picks[3]);
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Apriling",
        completed: () =>
          !AprilingBandHelmet.have() ||
          get("_aprilBandInstruments", 0) >= 2 ||
          (policy.aprilingSecond === "piccolo" &&
            !have($familiar`Chest Mimic`) &&
            have($item`Apriling band tuba`)),
        do: (): void => {
          AprilingBandHelmet.joinSection($item`Apriling band tuba`);
          if (policy.aprilingSecond === "quad tom") {
            AprilingBandHelmet.joinSection($item`Apriling band quad tom`);
          } else if (have($familiar`Chest Mimic`)) {
            AprilingBandHelmet.joinSection($item`Apriling band piccolo`);
            for (let i = 0; i < 3; i++) AprilingBandHelmet.play($item`Apriling band piccolo`);
          }
        },
        outfit: () =>
          policy.aprilingSecond !== "quad tom" && have($familiar`Chest Mimic`)
            ? { familiar: $familiar`Chest Mimic` }
            : {},
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Duffel and Shower",
        completed: () =>
          (!have($item`McHugeLarge duffel bag`) || have($item`McHugeLarge left ski`)) &&
          (!have($item`April Shower Thoughts shield`) || get("_aprilShowerGlobsCollected")),
        do: (): void => {
          if (have($item`McHugeLarge duffel bag`) && !have($item`McHugeLarge left ski`)) {
            visitUrl("inventory.php?action=skiduffel&pwd");
          }
          if (have($item`April Shower Thoughts shield`) && !get("_aprilShowerGlobsCollected")) {
            visitUrl("inventory.php?action=shower&pwd");
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "2002 Credits",
        completed: () => !have(catalog) || get("availableMrStore2002Credits", 0) === 0,
        do: (): void => {
          const store = $coinmaster`Mr. Store 2002`;
          if (policy.catalogCredits === "skateboard+vhs2" && !have($item`pro skateboard`)) {
            buy(store, 1, $item`pro skateboard`);
          }
          while (get("availableMrStore2002Credits", 0) > 0) buy(store, 1, vhs);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Septapus Charms",
        ready: () => have($item`Sept-Ember Censer`),
        completed: () =>
          !have($item`Sept-Ember Censer`) ||
          itemAmount($item`Septapus summoning charm`) >= 3 ||
          get("_subaqua_censer_done", false),
        do: (): void => {
          if (!get("_septEmberBalanceChecked", false)) visitUrl("shop.php?whichshop=september");
          const wanted = Math.min(
            3 - itemAmount($item`Septapus summoning charm`),
            Math.floor(get("availableSeptEmbers", 0) / 2),
          );
          if (wanted > 0) {
            buy($coinmaster`Sept-Ember Censer`, wanted, $item`Septapus summoning charm`);
          }
          set("_subaqua_censer_done", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Workshed",
        completed: () => get("_workshedItemUsed") || getWorkshed() !== $item.none,
        do: (): void => {
          const shed = worksheds.find((it) => have(it));
          if (shed) use(shed);
          if (getWorkshed() === $item`TakerSpace letter of Marque` && !have($item`anchor bomb`)) {
            retrieveItem($item`anchor bomb`);
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Sea Gear Pulls",
        completed: () => get("_subaqua_gear_pulled", false),
        do: (): void => {
          for (const it of seaGearPulls) {
            if (have(it)) continue;
            if (it === $item`scale-mail underwear` && have($item`Kramco Sausage-o-Matic™`))
              continue;
            discretionaryPull(it);
          }
          const cmoi = $item`Congressional Medal of Insanity`;
          if (!have(cmoi) && storageAmount(cmoi) > 0) discretionaryPull(cmoi);
          set("_subaqua_gear_pulled", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Bang Potions",
        completed: () => get("_subaqua_bang_pulled", false),
        do: (): void => {
          const box = $item`blessed large box`;
          if (!have(box) && !bangPotions.some((potion) => have(potion))) {
            if (!have($item`ten-leaf clover`)) discretionaryPull($item`ten-leaf clover`);
            if (!have($item`large box`)) discretionaryPull($item`large box`);
            if (have($item`ten-leaf clover`) && have($item`large box`)) retrieveItem(box);
          }
          if (have(box)) use(box);
          set("_subaqua_bang_pulled", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Waffle Day",
        ready: () =>
          policy.castWaffleDay &&
          have($skill`Aug. 24th: Waffle Day!`) &&
          !get("_aug24Cast", false) &&
          get("_augSkillsCast", 0) < 5,
        completed: () =>
          get("_aug24Cast", false) ||
          !policy.castWaffleDay ||
          !have($skill`Aug. 24th: Waffle Day!`) ||
          get("_augSkillsCast", 0) >= 5,
        do: () => void useSkill($skill`Aug. 24th: Waffle Day!`),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
