import {
  abort,
  availableAmount,
  buy,
  cliExecute,
  getWorkshed,
  handlingChoice,
  retrieveItem,
  runChoice,
  storageAmount,
  turnsPlayed,
  use,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $familiar,
  $item,
  $items,
  AprilingBandHelmet,
  EternityCodpiece,
  get,
  have,
  Leprecondo,
  MayamCalendar,
  set,
} from "libram";

import { Quest } from "../engine/task";
import { currentPolicy } from "../resources/policy";
import { discretionaryPull } from "../resources/pulls";
import { summonsAvailable } from "../resources/summon";

const pearl = $item`unblemished pearl`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const catalog = $item`2002 Mr. Store Catalog`;
const vhs = $item`Spooky VHS Tape`;
const worksheds = $items`Asdon Martin keyfob (on ring), portable Mayo Clinic, model train set, TakerSpace letter of Marque`;

/** Sea-gear storage pulls (ash UTS:1122-1143), all policy-gated through
 * discretionaryPull (low shiny farms instead, spec §3/§4). The CMOI is
 * never bought — ash aborts "Get yer own CMOI" (UTS:1137-1138); we simply
 * skip it unless it is already in Hagnk's. */
// Elf Guard SCUBA tank is pullable in-path (not on InventoryManager.pullableInSeaPath's
// blocklist, unlike the other diver-payoff items — see resources/saber.ts diverHuntActive());
// spec §3/§4's softcore exceptions list confirms it.
// The FLUDA is deliberately absent: the ash equips it only in the shadow-rift
// outfits and douses the shadow slab (UTS:866-885, 2379; CCS:543-546 at
// 89982f5) — a subsystem SubAqua dropped — and upstream itself now skips the
// pull without a pay phone (9eb5cd7). For us it is a dead pull slot.
const seaGearPulls = $items`Mer-kin sneakmask, sea lasso, shark jumper, scale-mail underwear, Elf Guard SCUBA tank`;
// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const swordOfSWords = $familiar`Sword of S Words`;

export function initQuest(): Quest {
  const policy = currentPolicy();
  return {
    name: "Init",
    tasks: [
      {
        name: "Pearl Guard",
        // Spec §9 init guard: five pearls must arrive codpiece-smuggled or
        // in inventory; abort at turn 0 beats the ash's silent wall at the
        // center door. Checked once per day (re-entrancy).
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
        name: "Toot",
        completed: () => get("questM05Toot") !== "started" || get("_subaqua_toot_visited", false),
        do: (): void => {
          // On the Sea path the Toot/council pages open a one-option
          // acknowledgement dialog ("Right, okay") that mafia leaves
          // pending; nothing downstream can act (e.g. the next task's
          // `use` calls) until it is answered. Drain after each visit
          // rather than once at the end so a second dialog can't stack.
          visitUrl("council.php");
          if (handlingChoice()) runChoice(1);
          visitUrl("tutorial.php?action=toot");
          if (handlingChoice()) runChoice(1);
          visitUrl("council.php");
          if (handlingChoice()) runChoice(1);
          // On the overworld the item drops from the Toot Oriole page, so
          // TutorialRequest's own flip fires there — it sets Quest.TOOT to
          // FINISHED when its response contains "You acquire an item:" or
          // "You've learned everything I can teach you"
          // (TutorialRequest.java:24-29). On the Sea path the item comes
          // from council.php instead, so that flip never fires. Re-visiting
          // the quest log lets the other flip site catch it on paths where
          // it can: QuestLogRequest's which=1 parse sets Quest.TOOT to
          // FINISHED once the log no longer mentions "Toot!"
          // (QuestLogRequest.java:121-123).
          visitUrl("questlog.php?which=1");
          // But on the Sea path the quest log keeps listing "Toot!" even
          // after the letter has been handed over, so questM05Toot never
          // flips — the ash likewise just re-visits every day without
          // checking the pref (UnderTheSea.ash:465-469). Completion is
          // therefore the daily marker, same pattern as Pearl Guard's
          // _subaqua_pearls_checked.
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
          // Ash UTS:995-1002.
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
        // Sheriff pieces fuel the Assert your Authority free kill
        // (UTS:967-974); the abort essay is the ash's, verbatim in spirit.
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
        // +10 familiar weight (choice 1386 option 4, ash UTS:1026-1042: the
        // resistance chip only matters for pearl farming, and pearls are
        // codpiece-smuggled). Spec §8: mafia's saber CLI, no raw may4 URL.
        do: () => void cliExecute("saber familiar"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Mayam",
        completed: () => !MayamCalendar.have() || get("_mayamSymbolsUsed") !== "",
        do: (): void => {
          // Ash ring picks (UTS:1051-1059).
          cliExecute("mayam rings vessel yam cheese explosion");
          cliExecute("mayam rings fur lightning eyepatch yam");
          cliExecute("mayam rings eye meat yam clock");
        },
        // The chest mimic soaks the yam4 xp; declared rather than hand-fielded
        // (audit item 10). The `have()` gate stays in the delay: createOutfit()
        // maps an unowned familiar to $familiar.none, which would actively put
        // away whatever familiar is out — the current code leaves it alone.
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
          // Tuba always (the NC forcer); second instrument per policy
          // (UTS:1076-1084). Piccolo plays feed the mimic 3x40 exp.
          AprilingBandHelmet.joinSection($item`Apriling band tuba`);
          if (policy.aprilingSecond === "quad tom") {
            AprilingBandHelmet.joinSection($item`Apriling band quad tom`);
          } else if (have($familiar`Chest Mimic`)) {
            AprilingBandHelmet.joinSection($item`Apriling band piccolo`);
            for (let i = 0; i < 3; i++) AprilingBandHelmet.play($item`Apriling band piccolo`);
          }
        },
        // Piccolo lane only, and only when the mimic is owned — the same two
        // gates the do() had (audit item 10). Both stay in the delay:
        // createOutfit() maps an unowned familiar to $familiar.none, which would
        // put away whatever familiar is out instead of leaving it alone, and
        // the quad-tom lane never wanted the mimic fielded at all.
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
          // UTS:1093-1102; skateboard first for non-high (corral McTwist).
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
        name: "Workshed",
        completed: () => get("_workshedItemUsed") || getWorkshed() !== $item.none,
        do: (): void => {
          // Priority ladder UTS:1104-1120.
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
        // Once-per-day marker pref: completion cannot key off the pulls
        // themselves — discretionaryPull legitimately refuses at low shiny,
        // which would loop the task into its limit.
        completed: () => get("_subaqua_gear_pulled", false),
        do: (): void => {
          // UTS:1122-1143 with gates: scale-mail skipped under Kramco
          // (kramcoCoversScaleMail, IOTM:318-320); CMOI storage-only.
          for (const it of seaGearPulls) {
            if (have(it)) continue;
            if (it === $item`scale-mail underwear` && have($item`Kramco Sausage-o-Matic™`))
              continue;
            if (it === $item`sea lasso` && summonsAvailable() >= 3 && have(swordOfSWords)) continue;
            discretionaryPull(it);
          }
          const cmoi = $item`Congressional Medal of Insanity`;
          if (!have(cmoi) && storageAmount(cmoi) > 0) discretionaryPull(cmoi);
          set("_subaqua_gear_pulled", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
